import assert from 'node:assert/strict';
import { planDfrFrameAnalysis } from '../src/lib/dfrAnalysisPlanner.js';

const SHA = 'a'.repeat(64);
const OTHER_SHA = 'b'.repeat(64);
const policy = {
  incidentId: 'dfr-research-1',
  authorizedSourceIds: ['drone-a', 'drone-b', 'drone-c'],
  authorizedScopeIds: ['agency-approved-incident-1'],
  referenceTime: '2026-11-22T12:00:05Z',
  maxFreshnessMs: 10_000,
  validatedSpatialFrames: [],
};
function make(id, source, time = '2026-11-22T12:00:00Z') {
  return {
    schema_version: '1.0.0', event_id: id, incident_id: 'dfr-research-1',
    event_type: 'OBSERVATION',
    source: {
      source_id: source, source_type: 'DRONE', adapter_id: 'test-fixture',
      adapter_version: '1', authorization_scope_id: 'agency-approved-incident-1',
    },
    timing: {
      observed_at: time, observed_clock_domain: 'UTC_UNIX',
      received_at: '2026-11-22T12:00:01Z', clock_uncertainty_ms: 20,
    },
    provenance: {
      evidence_class: 'MEASURED', integrity_state: 'VERIFIED',
      collection_method: 'SYNTHETIC_DATA_WITH_FAKE_CORE_ATTESTATION',
    },
    payload: {
      payload_schema: 'waveradar.dfr.frame.v1',
      data: { media_kind: 'THERMAL_FRAME', camera_pose: { yaw: 0 } },
    },
    quality: { calibration_reference: 'test-not-a-real-calibration' },
    spatial: { frame_id: null, position: null, pose_status: 'UNAVAILABLE', uncertainty_m: null },
    evidence: {
      raw_payload_sha256: SHA, raw_payload_ref: null, redaction_applied: true,
      retention_class: 'RESEARCH',
    },
  };
}
const originals = [
  make('a1', 'drone-a'),
  make('a2', 'drone-a', '2026-11-22T12:00:01Z'),
  make('b1', 'drone-b'),
  make('c1', 'drone-c'),
];
const snapshot = JSON.stringify(originals);
const verified = Object.fromEntries(originals.map(v => [
  v.event_id, { sha256: SHA, ref: 'core-evidence://synthetic/' + v.event_id },
]));

const base = {
  envelopes: originals,
  admissionPolicy: policy, trustedMediaByEventId: verified,
  modelVersion: 'test-model-v1', preprocessorVersion: 'test-preprocessor-v1',
  policyVersion: 'test-policy-v1', maxJobs: 2,
};
const plan = planDfrFrameAnalysis(base);
assert.equal(plan.ok, true);
assert.equal(plan.jobs.length, 2);
assert.deepEqual(plan.jobs.map(j => j.sourceId), ['drone-a', 'drone-b'],
  'fair scheduling uses source round robin rather than only the first drone');
assert.equal(plan.deferred.length, 2);
assert.equal(plan.counts.distinctAdmitted, 4);
assert.equal(plan.jobs[0].outputPolicy.noAutomaticTargetMap, true);
assert.equal(plan.jobs[0].outputPolicy.noFlightControl, true);
assert.equal(plan.status, 'SYNTHETIC_OR_AUTHORIZED_READ_ONLY_PLANNING_ONLY');
assert.equal(JSON.stringify(originals), snapshot, 'no original event mutation');

// Exact immutable context + same pinned versions may reuse computation.
// Reuse never means independently validated inference.
const reused = planDfrFrameAnalysis({ ...base, previousCacheKeys: [plan.jobs[0].cacheKey] });
assert.equal(reused.counts.exactContextReuse, 1);
assert.equal(reused.jobs[0].sourceId, 'drone-b');
assert.equal(reused.reused[0].eventId, 'a1');

// Frame changes, time shifts, camera changes and model updates must invalidate.
const changedModel = planDfrFrameAnalysis({ ...base, modelVersion: 'test-model-v2', previousCacheKeys: [plan.jobs[0].cacheKey] });
assert.equal(changedModel.counts.exactContextReuse, 0);
const changedPose = structuredClone(originals[0]);
changedPose.payload.data.camera_pose.yaw = 22;
assert.equal(planDfrFrameAnalysis({
  ...base, envelopes: [changedPose], previousCacheKeys: [plan.jobs[0].cacheKey],
}).counts.exactContextReuse, 0);

// Exact duplicate event ID/content should have one work item, while malicious
// collision of ID/content must quarantine that ID entirely.
const duplicate = planDfrFrameAnalysis({ ...base, envelopes: [originals[0], structuredClone(originals[0])] });
assert.equal(duplicate.counts.input, 2);
assert.equal(duplicate.counts.distinctAdmitted, 1);
assert.equal(duplicate.jobs.length, 1);
const forged = structuredClone(originals[0]);
forged.payload.data.camera_pose.yaw = 99;
const collision = planDfrFrameAnalysis({ ...base, envelopes: [originals[0], forged] });
assert.equal(collision.jobs.length, 0);
assert.equal(collision.quarantine[0].reasonCodes[0], 'EVENT_ID_CONTENT_COLLISION');

// A duplicate video frame from a *different drone* is not equivalent context.
const independentDrone = make('b2', 'drone-b');
assert.equal(planDfrFrameAnalysis({
  ...base, envelopes: [originals[0], independentDrone],
}).counts.eligibleUniqueComputations, 2);

// Safety/evidence gates: failed permission, invalid hash, non-verified bytes,
// stale or unknown clock and simulated clips never trigger costly inference.
const noScope = planDfrFrameAnalysis({ ...base, admissionPolicy: { ...policy, authorizedSourceIds: [] } });
assert.equal(noScope.jobs.length, 0);
assert.equal(noScope.quarantine.length, 4);
const noAttestation = planDfrFrameAnalysis({ ...base, trustedMediaByEventId: {} });
assert.equal(noAttestation.jobs.length, 0);
assert.equal(noAttestation.skipped[0].reason, 'INDEPENDENT_MEDIA_ATTESTATION_REQUIRED');
const fakeAttestation = planDfrFrameAnalysis({
  ...base, trustedMediaByEventId: { a1: { sha256: OTHER_SHA, ref: 'core-evidence://wrong' } },
});
assert.equal(fakeAttestation.jobs.length, 0);
const simulated = structuredClone(originals[0]);
simulated.provenance.evidence_class = 'SIMULATED';
assert.equal(planDfrFrameAnalysis({ ...base, envelopes: [simulated] }).jobs.length, 0);
const badClock = structuredClone(originals[0]);
badClock.timing.observed_clock_domain = 'REMOTE_CLOCK';
assert.equal(planDfrFrameAnalysis({ ...base, envelopes: [badClock] }).jobs.length, 0);
const stale = planDfrFrameAnalysis({ ...base, admissionPolicy: { ...policy, referenceTime: '2026-11-22T13:00:00Z' } });
assert.equal(stale.jobs.length, 0);
const unknownMedia = structuredClone(originals[0]);
unknownMedia.payload.data.media_kind = 'UNKNOWN';
assert.equal(planDfrFrameAnalysis({ ...base, envelopes: [unknownMedia] }).jobs.length, 0);
const zeroBudget = planDfrFrameAnalysis({ ...base, maxJobs: 0 });
assert.equal(zeroBudget.jobs.length, 0);
assert.equal(zeroBudget.deferred.length, 4);
assert.equal(planDfrFrameAnalysis({ ...base, modelVersion: '' }).ok, false);

console.log(JSON.stringify({
  result: 'PASS', evidence: 'SYNTHETIC_FIXTURE_ONLY',
  sourceIsolation: true, noDuplicateHeavyProcessing: true,
  contentConflictQuarantine: true, fairMultiSourceScheduling: true,
  staleTimeAndUnauthorizedInputDenied: true,
  noPersonLocationOrFlightControl: true,
  liveVendorFeeds: 'NOT_CONNECTED',
  coreAttestations: 'SIMULATED_NOT_VERIFIED',
  physicalPerformance: 'UNTESTED',
}, null, 2));
