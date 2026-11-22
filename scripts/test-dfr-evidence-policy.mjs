import assert from 'node:assert/strict';
import { assessDfrEvidence, prepareDfrReadOnlyBatch } from '../src/lib/dfrEvidencePolicy.js';

const policy = {
  incidentId: 'research-incident-1',
  authorizedSourceIds: ['authorized-uav-01'],
  authorizedScopeIds: ['agency-incident-read-only'],
  referenceTime: '2026-11-22T12:00:05Z',
  maxFreshnessMs: 10_000,
  validatedSpatialFrames: [],
};
const fixture = () => ({
  schema_version: '1.0.0',
  event_id: '00000000-0000-4000-8000-000000000001',
  incident_id: 'research-incident-1',
  event_type: 'OBSERVATION',
  source: {
    source_id: 'authorized-uav-01', source_type: 'DRONE', device_id: 'synthetic-drone',
    adapter_id: 'unit-test', adapter_version: '1',
    authorization_scope_id: 'agency-incident-read-only',
  },
  timing: {
    observed_at: '2026-11-22T12:00:00Z',
    observed_clock_domain: 'UTC_UNIX', received_at: '2026-11-22T12:00:01Z',
    clock_uncertainty_ms: 25,
  },
  provenance: {
    evidence_class: 'SIMULATED', integrity_state: 'UNASSESSED',
    collection_method: 'SYNTHETIC_FIXTURE', parent_event_ids: [],
  },
  spatial: {
    frame_id: 'world-surveyed-a', pose_status: 'AVAILABLE',
    position: { x: 1, y: 2, z: 3, unit: 'm' }, uncertainty_m: 0.5,
  },
  quality: { calibration_reference: null },
  payload: {
    payload_schema: 'waveradar.dfr.observation.v1',
    data: {
      modality: 'THERMAL',
      camera_pose: { unknown: 'does not establish georegistration' },
      target_candidate: { kind: 'unverified possible human', x: 3, y: 9 },
    },
  },
  evidence: {
    raw_payload_ref: null, raw_payload_sha256: null,
    retention_class: 'RESEARCH', redaction_applied: true,
  },
});

const input = fixture();
const pristine = JSON.stringify(input);
const accepted = assessDfrEvidence(input, policy);
assert.equal(accepted.status, 'ADMITTED_READ_ONLY');
assert.equal(accepted.evidenceClass, 'SIMULATED');
assert.equal(accepted.freshness, 'CURRENT_AS_REPORTED');
assert.equal(accepted.permissions.mapTargetPerson, false);
assert.equal(accepted.permissions.autonomousFlightOrActuation, false);
assert.equal(accepted.permissions.publishSafetyCriticalHazard, false);
assert.equal(accepted.permissions.mapAssetInReviewedFrame, false);
assert.equal(accepted.permissions.showSourceReportedAssetPose, false,
  'synthetic visualized telemetry must not be promoted to measured asset pose');
assert.deepEqual(accepted.targetCandidateEvidence, input.payload.data.target_candidate);
assert.equal(accepted.quality.independentlyValidated, false);
accepted.original.payload.data.modality = 'modified';
assert.equal(JSON.stringify(input), pristine, 'helper must not mutate source records');

// Device claims cannot authorize themselves.
assert.equal(assessDfrEvidence(input, { ...policy, authorizedSourceIds: [] }).reasonCodes.includes('SOURCE_NOT_AUTHORIZED'), true);
assert.equal(assessDfrEvidence(input, { ...policy, authorizedScopeIds: [] }).reasonCodes.includes('SCOPE_NOT_AUTHORIZED'), true);
assert.equal(assessDfrEvidence({ ...input, incident_id: 'other-incident' }, policy).status, 'QUARANTINED');
assert.equal(assessDfrEvidence({ ...input, event_type: 'ARM_DRONE' }, policy).status, 'QUARANTINED');
assert.equal(assessDfrEvidence({ ...input, source: { ...input.source, source_type: 'PHONE' } }, policy).status, 'QUARANTINED');
assert.equal(assessDfrEvidence({ ...input, provenance: { ...input.provenance, integrity_state: 'FAILED' } }, policy).status, 'QUARANTINED');

// Source-reported asset location is not a validated target/patient location.
const measured = fixture();
measured.provenance.evidence_class = 'MEASURED';
measured.provenance.integrity_state = 'VERIFIED';
measured.quality.calibration_reference = 'reference-checked-externally';
const reported = assessDfrEvidence(measured, policy);
assert.equal(reported.permissions.showSourceReportedAssetPose, true);
assert.equal(reported.permissions.mapAssetInReviewedFrame, false);
assert.equal(reported.permissions.mapTargetPerson, false);
const frameReviewed = assessDfrEvidence(measured, {
  ...policy, validatedSpatialFrames: ['world-surveyed-a'],
});
assert.equal(frameReviewed.permissions.mapAssetInReviewedFrame, true,
  'upstream-reviewed frame is still NOT evidence of person position');
assert.equal(frameReviewed.permissions.mapTargetPerson, false);
assert.equal(frameReviewed.quality.independentlyValidated, false,
  'trusted frame membership is not independent validation of an entire sensor');

// Timestamp controls prevent stale or clock-domain invalid reports.
const stale = assessDfrEvidence(input, { ...policy, referenceTime: '2026-11-22T13:00:00Z' });
assert.equal(stale.freshness, 'STALE');
assert.equal(stale.permissions.showSourceReportedAssetPose, false);
const remoteTime = fixture();
remoteTime.timing.observed_clock_domain = 'REMOTE_CLOCK';
assert.equal(assessDfrEvidence(remoteTime, policy).freshness, 'UNKNOWN');
const unknownClockError = fixture();
unknownClockError.timing.clock_uncertainty_ms = null;
assert.equal(assessDfrEvidence(unknownClockError, policy).freshness, 'UNKNOWN');
const future = fixture();
future.timing.observed_at = '2026-11-22T15:00:00Z';
assert.equal(assessDfrEvidence(future, policy).freshness, 'CLOCK_CONFLICT');
const invalidTimestamp = fixture();
invalidTimestamp.timing.received_at = 'not-UTC';
assert.equal(assessDfrEvidence(invalidTimestamp, policy).status, 'QUARANTINED');

// One-pass idempotency, content collision quarantine. Key order alone
// does not turn identical evidence into a conflict.
const duplicate = JSON.parse(JSON.stringify(input));
const batch = prepareDfrReadOnlyBatch([input, duplicate], policy);
assert.equal(batch.ok, true);
assert.equal(batch.projected.length, 1);
assert.equal(batch.counts.supplied, 2);
assert.equal(batch.counts.conflictingIds, 0);
const collision = fixture();
collision.payload.data.target_candidate.kind = 'altered';
const conflicted = prepareDfrReadOnlyBatch([input, collision], policy);
assert.equal(conflicted.projected.length, 0);
assert.equal(conflicted.counts.conflictingIds, 1);
assert.equal(conflicted.quarantine[0].reasonCodes[0], 'EVENT_ID_CONTENT_COLLISION');
const crossScope = prepareDfrReadOnlyBatch([input, { ...input, incident_id: 'outside-scope' }], policy);
assert.equal(crossScope.projected.length, 1);
assert.equal(crossScope.quarantine.length, 1);
assert.equal(prepareDfrReadOnlyBatch('not-array', policy).ok, false);

console.log(JSON.stringify({
  result: 'PASS', fixture: 'SYNTHETIC_DFR_EVIDENCE_ONLY',
  policyScopeChecked: true, deniedUnauthorizedSources: true,
  idempotentWithoutDuplicateProcessing: true,
  conflictingSameIdQuarantined: true, noFabricatedTargetLocation: true,
  deviceAuthenticityVerified: false, actualDroneDataReceived: false,
  independentAccuracyValidated: false, autonomousFlightAllowed: false,
}, null, 2));
