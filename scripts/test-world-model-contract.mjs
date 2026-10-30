import assert from 'node:assert/strict';
import {
  WORLD_EVIDENCE_CLASS as E,
  WORLD_OBSERVATION_STATE as S,
  WORLD_MODEL_SCHEMA_VERSION,
  validateWorldEntity,
  validateWorldObservation,
} from '../src/lib/worldModelContract.js';

const base = {
  eventId: 'evt-001',
  sourceId: 'sensor-camera-01',
  modality: 'CAMERA',
  observedAt: '2026-10-30T18:00:00.000Z',
  receivedAt: '2026-10-30T18:00:00.100Z',
  evidenceClass: E.MEASURED,
  state: S.CURRENT,
  spatial: true,
  coordinateFrame: 'device-local-v1',
  value: 0.8,
  unit: 'normalized-confidence',
  confidence: 0.8,
  uncertainty: 0.1,
  rawDataRef: 'evidence://sha256/abc',
  provenance: { methodVersion: 'camera-adapter-1.0', parentEventIds: [] },
};

assert.equal(validateWorldObservation(base).ok, true);
assert.equal(validateWorldObservation(base).schemaVersion, WORLD_MODEL_SCHEMA_VERSION);

// Inferred/predicted observations remain distinct from measured evidence.
assert.equal(validateWorldObservation({
  ...base, eventId: 'evt-inferred', evidenceClass: E.INFERRED,
}).ok, true);
assert.equal(validateWorldObservation({
  ...base, eventId: 'evt-predicted', evidenceClass: E.PREDICTED,
}).ok, true);

// Preserve existing evidence classes from the canonical WaveRadar contract.
for (const evidenceClass of [E.ENVIRONMENTAL, E.GROUND_TRUTH, E.FEDERATED_MEASURED]) {
  assert.equal(validateWorldObservation({
    ...base, eventId: 'evt-' + evidenceClass.toLowerCase(), evidenceClass,
  }).ok, true);
}
assert.ok(validateWorldObservation({
  ...base, eventId: 'evt-conflict', evidenceClass: E.CONFLICT, state: S.CONFLICT,
}).ok);
assert.ok(validateWorldObservation({
  ...base, eventId: 'evt-conflict-invalid', evidenceClass: E.CONFLICT, state: S.CURRENT,
}).errors.includes('CONFLICT_STATE_REQUIRED'));

// Simulated observations are accepted as simulated, with a warning if marked CURRENT.
const simulated = validateWorldObservation({
  ...base, eventId: 'evt-simulated', evidenceClass: E.SIMULATED,
});
assert.equal(simulated.ok, true);
assert.ok(simulated.warnings.includes('SIMULATED_DATA_MUST_NOT_BE_PRESENTED_AS_LIVE_MEASUREMENT'));

// Unavailable is an explicit state, not a zero-valued sensor measurement.
const unavailable = validateWorldObservation({
  ...base,
  eventId: 'evt-unavailable',
  observedAt: null,
  value: null,
  evidenceClass: E.UNAVAILABLE,
  state: S.UNAVAILABLE,
  unavailableReason: 'HARDWARE_NOT_PRESENT',
});
assert.equal(unavailable.ok, true);
assert.ok(validateWorldObservation({
  ...base, eventId: 'evt-bad-unavailable', evidenceClass: E.UNAVAILABLE,
  state: S.CURRENT, unavailableReason: 'NOT_PRESENT',
}).errors.includes('UNAVAILABLE_STATE_REQUIRED'));

// Reject fabricated defaults, malformed timestamps, invalid uncertainty and unitless values.
const invalid = validateWorldObservation({
  ...base,
  eventId: '',
  receivedAt: 'not-a-date',
  observedAt: 'not-a-date',
  confidence: 1.2,
  uncertainty: -1,
  value: 4,
  unit: '',
  coordinateFrame: '',
  provenance: null,
});
for (const code of [
  'EVENT_ID_REQUIRED',
  'RECEIVED_AT_REQUIRED_OR_INVALID',
  'OBSERVED_AT_INVALID',
  'CONFIDENCE_OUT_OF_RANGE',
  'UNCERTAINTY_INVALID',
  'NUMERIC_VALUE_UNIT_REQUIRED',
  'PROVENANCE_REQUIRED',
]) assert.ok(invalid.errors.includes(code), code);

// Spatial data without a coordinate frame must never enter the shared model.
const noFrame = validateWorldObservation({ ...base, coordinateFrame: null });
assert.ok(noFrame.errors.includes('SPATIAL_COORDINATE_FRAME_REQUIRED'));

// A measured sample cannot borrow receive-time as measurement-time.
const noObservedAt = validateWorldObservation({ ...base, observedAt: null });
assert.ok(noObservedAt.errors.includes('MEASURED_OBSERVED_AT_REQUIRED'));

// World Model entities require stable versioning and traceable source observations.
assert.equal(validateWorldEntity({
  entityId: 'room-1',
  entityType: 'ROOM',
  version: 1,
  updatedAt: '2026-10-30T18:01:00.000Z',
  sourceEventIds: ['evt-001'],
}).ok, true);
assert.ok(validateWorldEntity({
  entityId: 'room-2', entityType: 'ROOM', version: 0,
  updatedAt: 'invalid', sourceEventIds: [],
}).errors.includes('SOURCE_EVENT_LINEAGE_REQUIRED'));

console.log('WaveRadar World Model contract tests: PASS');
