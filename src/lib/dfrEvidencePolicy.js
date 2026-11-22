/**
 * Drone-as-First-Responder evidence admission policy for WaveRadar OS.
 *
 * This is a PURE, READ-ONLY research/contract helper over the EXISTING
 * waveradar-event-envelope-v1, NOT a new event format, data store, live drone
 * connection, flight controller, auth provider or claim of certified safety.
 *
 * Input permissions MUST come from an independently authenticated, scoped
 * Core/gateway context. Device-asserted scope strings cannot authorize a
 * device. A caller-supplied authorizedSources list is not proof by itself.
 */
const validText = v => typeof v === 'string' && v.trim().length > 0;
const utc = v => validText(v) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) &&
  Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
const clone = v => JSON.parse(JSON.stringify(v));
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  return v;
}
const fingerprint = v => JSON.stringify(canonical(v));
const isFiniteNonnegative = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;

const OBSERVATION_TYPES = new Set(['OBSERVATION', 'DEVICE_STATUS']);
const DRONE_TYPES = new Set(['DRONE', 'GROUND_ROBOT', 'ROBOT', 'AERIAL_ROBOT']);
const EVIDENCE_CLASSES = new Set([
  'MEASURED', 'FEDERATED_MEASURED', 'DERIVED', 'INFERRED',
  'PREDICTED', 'SIMULATED', 'UNKNOWN', 'UNAVAILABLE',
]);
const allowedIntegrity = new Set(['UNASSESSED', 'CHECKSUMMED', 'VERIFIED']);

/**
 * Determines whether evidence from an explicitly *authorized* drone/robot can
 * be shown as an attributed observation. "ADMITTED_READ_ONLY" is NOT
 * approval for mission control, spatial localization or life-safety guidance.
 *
 * @param {object} envelope immutable-source event envelope v1
 * @param {object} policy independently authenticated context (not user data)
 * @param {string} policy.incidentId
 * @param {string[]} policy.authorizedSourceIds granted by Core/operator
 * @param {string[]} policy.authorizedScopeIds granted by Core/operator
 * @param {string} policy.referenceTime UTC time of evaluation, never device time
 * @param {number} policy.maxFreshnessMs threshold for UI recency warning
 * @param {string[]} policy.validatedSpatialFrames trusted, independently checked
 *
 * @returns status, reason codes, original event record, segregated asset/sensor
 *          location claims and explicit advisory-only projection permissions.
 */
export function assessDfrEvidence(envelope, policy = {}) {
  const reasons = [];
  const incidentId = policy.incidentId;
  const source = envelope?.source;
  if (!validText(incidentId) || envelope?.incident_id !== incidentId) reasons.push('INCIDENT_SCOPE_MISMATCH');
  if (envelope?.schema_version !== '1.0.0') reasons.push('UNSUPPORTED_ENVELOPE_VERSION');
  if (!validText(envelope?.event_id)) reasons.push('EVENT_ID_REQUIRED');
  if (!DRONE_TYPES.has(source?.source_type)) reasons.push('UNSUPPORTED_ASSET_TYPE');
  if (!OBSERVATION_TYPES.has(envelope?.event_type)) reasons.push('READ_ONLY_OBSERVATION_ONLY');
  if (!validText(source?.source_id) || !Array.isArray(policy.authorizedSourceIds) ||
      !policy.authorizedSourceIds.includes(source?.source_id)) reasons.push('SOURCE_NOT_AUTHORIZED');
  if (!validText(source?.authorization_scope_id) || !Array.isArray(policy.authorizedScopeIds) ||
      !policy.authorizedScopeIds.includes(source?.authorization_scope_id)) reasons.push('SCOPE_NOT_AUTHORIZED');
  if (!validText(source?.adapter_id) || !validText(source?.adapter_version)) reasons.push('ADAPTER_IDENTITY_REQUIRED');
  if (!validText(envelope?.payload?.payload_schema) || !envelope?.payload?.data ||
      typeof envelope.payload.data !== 'object' || Array.isArray(envelope.payload.data)) reasons.push('PAYLOAD_SCHEMA_REQUIRED');
  if (!EVIDENCE_CLASSES.has(envelope?.provenance?.evidence_class)) reasons.push('UNSUPPORTED_EVIDENCE_CLASS');
  if (!allowedIntegrity.has(envelope?.provenance?.integrity_state)) reasons.push('INTEGRITY_FAILED_OR_UNASSESSED_TYPE');

  const sourceReceived = utc(envelope?.timing?.received_at);
  if (!sourceReceived) reasons.push('SOURCE_RECEIPT_TIME_REQUIRED');
  const referenceTime = utc(policy.referenceTime);
  if (!referenceTime) reasons.push('REFERENCE_TIME_REQUIRED');

  // No invented freshness from unknown/monotonic or poorly synced clock.
  const clock = envelope?.timing?.observed_clock_domain;
  const sourceObserved = clock === 'UTC_UNIX' ? utc(envelope?.timing?.observed_at) : null;
  const uncertainty = envelope?.timing?.clock_uncertainty_ms;
  const clockAligned = sourceObserved !== null && isFiniteNonnegative(uncertainty);
  const threshold = isFiniteNonnegative(policy.maxFreshnessMs) ? policy.maxFreshnessMs : 10000;
  const ageMs = clockAligned && referenceTime ? Date.parse(referenceTime) - Date.parse(sourceObserved) : null;
  const freshness = ageMs === null ? 'UNKNOWN' :
    ageMs < -uncertainty ? 'CLOCK_CONFLICT' :
    ageMs > threshold + uncertainty ? 'STALE' : 'CURRENT_AS_REPORTED';
  const pose = envelope?.spatial;
  const frameTrusted = Array.isArray(policy.validatedSpatialFrames) &&
    validText(pose?.frame_id) && policy.validatedSpatialFrames.includes(pose.frame_id);
  const hasSpatial = pose?.pose_status === 'AVAILABLE' &&
    pose?.position && ['m', 'cm', 'mm'].includes(pose.position.unit) &&
    ['x','y','z'].every(k => typeof pose.position[k] === 'number' && Number.isFinite(pose.position[k])) &&
    isFiniteNonnegative(pose.uncertainty_m);
  const quality = envelope?.quality;
  const calibrationReported = validText(quality?.calibration_reference);

  // Source coordinate data is not a mapped person or a verified world-frame pose.
  const isMeasured = ['MEASURED', 'FEDERATED_MEASURED'].includes(envelope?.provenance?.evidence_class);
  const integrityVerified = envelope?.provenance?.integrity_state === 'VERIFIED';
  const canDisplaySourceReportedAssetPose = reasons.length === 0 && hasSpatial &&
    freshness === 'CURRENT_AS_REPORTED' && isMeasured;
  // Only after a trusted upstream reference frame/calibration review may WIS
  // map the aircraft/robot ASSET. Never infer any person location.
  const canProjectAssetInValidatedFrame = canDisplaySourceReportedAssetPose &&
    frameTrusted && calibrationReported && integrityVerified;
  const data = envelope?.payload?.data || {};
  const isAuthorized = reasons.length === 0;
  let original = null;
  try { original = clone(envelope); }
  catch { reasons.push('NON_SERIALIZABLE_SOURCE'); }
  const admitted = reasons.length === 0;
  return {
    status: admitted ? 'ADMITTED_READ_ONLY' : 'QUARANTINED',
    eventId: validText(envelope?.event_id) ? envelope.event_id : null,
    incidentId: validText(incidentId) ? incidentId : null,
    sourceId: source?.source_id || null,
    reasonCodes: reasons,
    observedAt: sourceObserved,
    sourceReceivedAt: sourceReceived,
    ageMs,
    freshness,
    evidenceClass: envelope?.provenance?.evidence_class || 'UNKNOWN',
    integrityState: envelope?.provenance?.integrity_state || 'UNASSESSED',
    // These are SEPARATE claims; never synthesize target geography from
    // vehicle GPS or camera pointing without a validated transform chain.
    sourceReportedAssetPose: admitted && hasSpatial ? clone(pose) : null,
    cameraPoseEvidence: admitted && data.camera_pose ? clone(data.camera_pose) : null,
    targetCandidateEvidence: admitted && data.target_candidate ? clone(data.target_candidate) : null,
    permissions: {
      showAttribution: admitted,
      showSourceReportedAssetPose: canDisplaySourceReportedAssetPose,
      mapAssetInReviewedFrame: Boolean(canProjectAssetInValidatedFrame),
      mapTargetPerson: false,
      publishSafetyCriticalHazard: false,
      autonomousFlightOrActuation: false,
    },
    quality: {
      authenticatedUpstream: 'REQUIRED_NOT_ATTESTED_BY_HELPER',
      clockAligned,
      calibrationReferenceReported: Boolean(calibrationReported),
      independentlyValidated: false,
      modelValidated: false,
    },
    original,
    limits: [
      'No drone control or unauthorized sensor access.',
      'Asset pose, camera pose, and target candidate are different typed claims.',
      'Reported data is not independently calibrated or life-safety verified.',
      'Source event time and real Core server acceptance time must remain separate.',
    ],
  };
}

/**
 * One-pass content-identity gate. Same event ID + canonical JSON = one work
 * item; same event ID + differing content = quarantined entire ID. No
 * prioritizing a "more confident" model output over original evidence.
 *
 * This is not cryptographic verification. Core still enforces SHA-256 and
 * trusted scope/authentication. No original event is rewritten or deleted.
 */
export function prepareDfrReadOnlyBatch(envelopes, policy = {}) {
  if (!Array.isArray(envelopes)) return { ok: false, reason: 'ARRAY_REQUIRED' };
  const indexed = new Map();
  const conflicting = new Set();
  const quarantine = [];
  for (const [index, envelope] of envelopes.entries()) {
    const result = assessDfrEvidence(envelope, policy);
    if (result.status !== 'ADMITTED_READ_ONLY') {
      quarantine.push({ index, eventId: result.eventId, reasonCodes: result.reasonCodes });
      continue;
    }
    let signature;
    try { signature = fingerprint(envelope); } catch {
      quarantine.push({ index, eventId: result.eventId, reasonCodes: ['NON_SERIALIZABLE_SOURCE'] });
      continue;
    }
    const previous = indexed.get(result.eventId);
    if (conflicting.has(result.eventId)) continue;
    if (previous && previous.signature !== signature) {
      indexed.delete(result.eventId);
      conflicting.add(result.eventId);
      quarantine.push({ index, eventId: result.eventId, reasonCodes: ['EVENT_ID_CONTENT_COLLISION'] });
    } else if (!previous) {
      indexed.set(result.eventId, { signature, result });
    }
  }
  return {
    ok: true,
    contract: 'waveradar-event-envelope-v1',
    status: 'RESEARCH_ONLY_PURE_PROJECTION',
    projected: [...indexed.values()].map(entry => entry.result),
    quarantine,
    counts: {
      supplied: envelopes.length, independentlyAdmitted: indexed.size,
      conflictingIds: conflicting.size, quarantinedRows: quarantine.length,
    },
  };
}
