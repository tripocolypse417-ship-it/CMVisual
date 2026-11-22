/**
 * WaveRadar OS DFR analysis PLANNER v1.
 *
 * Pure, read-only, resource-bounded orchestration contract. It never opens
 * media, connects to a drone, calls AI, writes evidence, controls a drone, or
 * asserts a person/target position. It consumes the existing v1 envelopes via
 * dfrEvidencePolicy and external *trusted-by-Core* media attestations.
 *
 * Expensive inference jobs are planned ONLY for explicitly authorized sources
 * with currently attributable frames and independently supplied immutable
 * media references/digests; others remain visible in the admission record.
 *
 * "Verified digest" means gateway/Core byte integrity only, never validation
 * of scene semantics, flight authorization, image interpretation or accuracy.
 */
import { prepareDfrReadOnlyBatch } from './dfrEvidencePolicy.js';

const MEDIA_KINDS = new Set(['RGB_FRAME', 'THERMAL_FRAME', 'VIDEO_FRAME']);
const validText = v => typeof v === 'string' && v.trim().length > 0;
const digest = v => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v) ? v.toLowerCase() : null;
const integer = (v, fallback) => Number.isInteger(v) && v >= 0 && v <= 500 ? v : fallback;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}
const stable = value => JSON.stringify(canonical(value));

/**
 * Caller MUST have already authorized source/incident scope and independently
 * checked trustedMediaByEventId against actual stored bytes. This pure helper
 * cannot authenticate client-supplied policy or attestations.
 *
 * @param {object} args
 * @param {object[]} args.envelopes native canonical originals
 * @param {object} args.admissionPolicy authorized source/scope from trusted Core
 * @param {object} args.trustedMediaByEventId Core records:
 *   eventId => {sha256, ref} with ref an authorized internal evidence handle.
 * @param {string} args.modelVersion pinned, reviewed model artifact version
 * @param {string} args.preprocessorVersion pinned input transform version
 * @param {string} args.policyVersion reviewed evaluation/eligibility version
 * @param {string[]} args.previousCacheKeys keys from an actual trusted cache
 * @param {number} args.maxJobs local *proposal* limit for compute scheduler
 */
export function planDfrFrameAnalysis({
  envelopes,
  admissionPolicy,
  trustedMediaByEventId = {},
  modelVersion,
  preprocessorVersion,
  policyVersion,
  previousCacheKeys = [],
  maxJobs = 5,
} = {}) {
  if (!validText(modelVersion) || !validText(preprocessorVersion) || !validText(policyVersion)) {
    return { ok: false, reason: 'PINNED_MODEL_PREPROCESSOR_POLICY_REQUIRED' };
  }
  if (!trustedMediaByEventId || typeof trustedMediaByEventId !== 'object' ||
      Array.isArray(trustedMediaByEventId) || !Array.isArray(previousCacheKeys) ||
      !previousCacheKeys.every(validText)) {
    return { ok: false, reason: 'INVALID_TRUSTED_ATTESTATION_OR_CACHE' };
  }
  const admitted = prepareDfrReadOnlyBatch(envelopes, admissionPolicy);
  if (!admitted.ok) return admitted;
  const accepted = new Map(admitted.projected.map(v => [v.eventId, v]));
  const originals = new Map();
  for (const item of envelopes) {
    if (accepted.has(item?.event_id) && !originals.has(item.event_id)) originals.set(item.event_id, item);
  }

  const skipping = [];
  const candidates = [];
  const reused = [];
  const found = new Set(previousCacheKeys);
  for (const acceptedObservation of admitted.projected) {
    const original = originals.get(acceptedObservation.eventId);
    const observationId = acceptedObservation.eventId;
    const reportedDigest = digest(original?.evidence?.raw_payload_sha256);
    const attestation = trustedMediaByEventId[observationId];
    const verifiedDigest = digest(attestation?.sha256);
    const approvedRef = attestation?.ref;
    const mediaKind = original?.payload?.data?.media_kind;
    const observedAt = acceptedObservation.observedAt;
    const freshness = acceptedObservation.freshness;
    let reason = null;
    if (!MEDIA_KINDS.has(mediaKind)) reason = 'NOT_ANALYZABLE_MEDIA_FRAME';
    else if (original?.provenance?.evidence_class !== 'MEASURED' &&
             original?.provenance?.evidence_class !== 'FEDERATED_MEASURED') reason = 'NOT_DIRECT_MEASURED_MEDIA';
    else if (original?.provenance?.integrity_state !== 'VERIFIED') reason = 'SOURCE_DIGEST_NOT_MARKED_VERIFIED';
    else if (!reportedDigest || !verifiedDigest || reportedDigest !== verifiedDigest ||
             !validText(approvedRef)) reason = 'INDEPENDENT_MEDIA_ATTESTATION_REQUIRED';
    else if (freshness !== 'CURRENT_AS_REPORTED' || !observedAt) reason = 'CLOCK_NOT_FRESH_OR_ALIGNED';
    if (reason) {
      skipping.push({ eventId: observationId, reason });
      continue;
    }
    // Same immutable bytes at a different time, calibration or camera pose
    // may have different meaning. Keep the full context in the cache key.
    const key = stable({
      incident: original.incident_id,
      source: original.source.source_id,
      mediaDigest: reportedDigest,
      observedAt,
      sourceClockUncertaintyMs: original.timing?.clock_uncertainty_ms,
      assetPose: original.spatial || null,
      cameraPose: original.payload.data.camera_pose || null,
      mediaKind,
      calibration: original.quality?.calibration_reference || null,
      modelVersion, preprocessorVersion, policyVersion,
    });
    const proposal = {
      eventId: observationId,
      cacheKey: key,
      sourceId: original.source.source_id,
      mediaRef: approvedRef,
      observedAt,
      evidenceClass: 'MEASURED_SOURCE_FOR_UNVALIDATED_INFERENCE',
      analysisStatus: 'PROPOSED_ONLY',
      outputPolicy: {
        inferredOnly: true, noAutomaticTargetMap: true,
        noFlightControl: true, notSafetyValidated: true,
      },
    };
    if (found.has(key)) {
      reused.push({ eventId: observationId, cacheKey: key, reason: 'EXACT_CONTEXT_CACHE_CANDIDATE' });
      continue;
    }
    found.add(key);
    candidates.push(proposal);
  }

  // Fair bounded work queue: round robin over authorized source IDs.
  // An unverified AI alert must never outrank another drone on safety grounds.
  const sourceQueues = new Map();
  for (const candidate of candidates) {
    if (!sourceQueues.has(candidate.sourceId)) sourceQueues.set(candidate.sourceId, []);
    sourceQueues.get(candidate.sourceId).push(candidate);
  }
  for (const queue of sourceQueues.values()) {
    queue.sort((a,b) => a.observedAt.localeCompare(b.observedAt) || a.eventId.localeCompare(b.eventId));
  }
  const ordered = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const source of [...sourceQueues.keys()].sort()) {
      const item = sourceQueues.get(source).shift();
      if (item) {
        ordered.push(item);
        remaining = true;
      }
    }
  }
  const limit = integer(maxJobs, 5);
  const jobs = ordered.slice(0, limit);
  const deferred = ordered.slice(limit).map(item => ({
    eventId: item.eventId, cacheKey: item.cacheKey, reason: 'BOUNDED_COMPUTE_CAPACITY',
  }));
  return {
    ok: true,
    status: 'SYNTHETIC_OR_AUTHORIZED_READ_ONLY_PLANNING_ONLY',
    dataContract: 'waveradar-event-envelope-v1',
    jobs,
    reused,
    deferred,
    skipped: skipping,
    quarantine: admitted.quarantine,
    counts: {
      input: admitted.counts.supplied,
      distinctAdmitted: admitted.counts.independentlyAdmitted,
      eligibleUniqueComputations: ordered.length,
      queued: jobs.length, deferred: deferred.length,
      exactContextReuse: reused.length, metadataOnly: skipping.length,
      quarantined: admitted.quarantine.length,
    },
    limitations: [
      'No vendor API connection, media decoding, AI inference, flight control or drone credential use.',
      'Attestation and access rights MUST be validated by Core or an authorized gateway upstream.',
      'Cache reuse is merely proposed; cached inference remains unverified until separately evaluated.',
      'All original observations remain independent and immutable, including cached or skipped ones.',
      'No detections, victim positions, hazards or live safety guidance are produced here.',
    ],
  };
}
