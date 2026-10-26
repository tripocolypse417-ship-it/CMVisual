import assert from 'node:assert/strict';
import { DATA_STATE, EVIDENCE_CLASS } from '../src/lib/dataContract.js';
import { buildPhysicalValidationSample } from '../src/lib/physicalValidationEvidence.js';

const capturedAt = '2026-10-24T18:00:00.000Z';
const capturedAtMs = Date.parse(capturedAt);
const sample = buildPhysicalValidationSample({
  elapsedMs: 1250,
  capturedAt,
  deviceId: 'local-test-device',
  heading: 90,
  moving: true,
  motion: { x: 1, y: 2, z: 3, magnitude: 0.75, jerk: 0.25, timestamp: capturedAtMs },
  nativeSnapshot: {
    measurements: {
      accelerometer: { values: [1, 2, 3], timestamp: capturedAt, ageMs: 0, sensorType: 1, accuracy: 3 },
    },
    lastSensorAt: capturedAt,
    accuracy: 'medium',
  },
});

assert.equal(sample.at, capturedAt, 'legacy capture timestamp field remains available');
assert.equal(sample.capturedAt, capturedAt);
assert.equal(sample.evidenceClass, EVIDENCE_CLASS.UNKNOWN, 'mixed envelope must not be labeled measured');
assert.equal(sample.evidenceByField.motionAxes.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.equal(sample.evidenceByField.motionAxes.state, DATA_STATE.CURRENT);
assert.deepEqual(sample.evidenceByField.motionAxes.value, { x: 1, y: 2, z: 3 });
assert.equal(sample.evidenceByField.motionMagnitude.evidenceClass, EVIDENCE_CLASS.DERIVED);
assert.equal(sample.evidenceByField.motionMagnitude.state, DATA_STATE.CURRENT);
assert.equal(sample.evidenceByField.motionJerk.evidenceClass, EVIDENCE_CLASS.DERIVED);
assert.equal(sample.evidenceByField.moving.evidenceClass, EVIDENCE_CLASS.INFERRED);
assert.equal(sample.evidenceByField.heading.evidenceClass, EVIDENCE_CLASS.DERIVED);
assert.equal(sample.evidenceByField.nativeSensors.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.equal(sample.evidenceByField.nativeSensors.state, DATA_STATE.CURRENT);
assert.equal(sample.evidenceByField.nativeSensors.sensorFields.accelerometer.state, DATA_STATE.CURRENT);
assert.equal(sample.nativeSensorAgeMs, 0);
assert.equal(sample.motionAgeMs, 0);

const incomplete = buildPhysicalValidationSample({
  elapsedMs: 250,
  capturedAt,
  deviceId: 'local-test-device',
  heading: null,
  moving: true,
  motion: { x: 1, y: null, z: 3, magnitude: null, jerk: null, timestamp: capturedAtMs },
  nativeSnapshot: { measurements: {}, lastSensorAt: capturedAt },
});
assert.equal(incomplete.evidenceByField.motionAxes.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.motionMagnitude.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.motionMagnitude.value, null);
assert.equal(incomplete.evidenceByField.moving.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.moving.value, null);
assert.equal(incomplete.evidenceByField.heading.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.nativeSensors.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.nativeSensors.state, DATA_STATE.UNKNOWN);

// Staleness does not rewrite provenance: each sensor is checked against its own
// timestamp/age, not the bridge-wide last-event timestamp.
const stale = buildPhysicalValidationSample({
  elapsedMs: 7000,
  capturedAt,
  deviceId: 'local-test-device',
  heading: '',
  moving: true,
  motion: { x: 1, y: 2, z: 3, magnitude: 0.75, jerk: 0.25, timestamp: capturedAtMs - 6001 },
  nativeSnapshot: {
    measurements: {
      accelerometer: { values: [1, 2, 3], timestamp: capturedAtMs - 6001, ageMs: 6001, sensorType: 1, accuracy: 3 },
    },
    lastSensorAt: capturedAt,
  },
});
assert.equal(stale.evidenceByField.motionAxes.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.equal(stale.evidenceByField.motionAxes.state, DATA_STATE.STALE);
assert.equal(stale.evidenceByField.motionMagnitude.state, DATA_STATE.STALE);
assert.equal(stale.evidenceByField.nativeSensors.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.equal(stale.evidenceByField.nativeSensors.state, DATA_STATE.STALE);
assert.equal(stale.evidenceByField.nativeSensors.sensorFields.accelerometer.state, DATA_STATE.STALE);
assert.equal(stale.nativeSensorAgeMs, 6001);
assert.equal(stale.nativeSnapshotState, DATA_STATE.CURRENT, 'bridge-level event may be recent even when this sensor is stale');
assert.equal(stale.evidenceByField.heading.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(stale.evidenceByField.heading.value, null);

// Mixed per-sensor freshness is not collapsed into a false CURRENT claim.
const mixed = buildPhysicalValidationSample({
  elapsedMs: 100,
  capturedAt,
  deviceId: 'local-test-device',
  heading: null,
  moving: false,
  motion: null,
  nativeSnapshot: {
    measurements: {
      accelerometer: { values: [1, 2, 3], timestamp: capturedAt, ageMs: 0, sensorType: 1 },
      gyroscope: { values: [0.1, 0.2, 0.3], timestamp: capturedAtMs - 6001, ageMs: 6001, sensorType: 4 },
    },
    lastSensorAt: capturedAt,
  },
});
assert.equal(mixed.evidenceByField.nativeSensors.sensorFields.accelerometer.state, DATA_STATE.CURRENT);
assert.equal(mixed.evidenceByField.nativeSensors.sensorFields.gyroscope.state, DATA_STATE.STALE);
assert.equal(mixed.evidenceByField.nativeSensors.state, DATA_STATE.UNKNOWN);
assert.equal(mixed.nativeSensorState, DATA_STATE.UNKNOWN);
assert.equal(mixed.nativeSensorAgeMs, null);
assert.equal(mixed.nativeSensorObservedAt, null);

// Future or malformed timestamps are UNKNOWN, not fresh/current.
const future = buildPhysicalValidationSample({
  elapsedMs: 0,
  capturedAt,
  deviceId: 'local-test-device',
  heading: 0,
  moving: false,
  motion: { x: 1, y: 2, z: 3, magnitude: 0, jerk: 0, timestamp: capturedAtMs + 1000 },
  nativeSnapshot: {
    measurements: { accelerometer: { values: [1, 2, 3], timestamp: 'not-a-date', ageMs: 0 } },
    lastSensorAt: 'not-a-date',
  },
});
assert.equal(future.evidenceByField.motionAxes.state, DATA_STATE.UNKNOWN);
assert.equal(future.motionAgeMs, null);
assert.equal(future.evidenceByField.nativeSensors.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.equal(future.evidenceByField.nativeSensors.state, DATA_STATE.UNKNOWN);
assert.equal(future.nativeSensorAgeMs, null);

// Non-empty sensor objects containing only null/invalid values are not
// sufficient evidence that a sensor measurement was actually captured.
const emptyValues = buildPhysicalValidationSample({
  elapsedMs: 500,
  capturedAt,
  deviceId: 'local-test-device',
  heading: null,
  moving: false,
  motion: null,
  nativeSnapshot: {
    measurements: {
      accelerometer: { values: [null, undefined, Number.NaN], timestamp: capturedAt, ageMs: 0, accuracy: 3 },
      status: 'ready',
      timestamp: capturedAtMs,
    },
    lastSensorAt: capturedAt,
  },
});
assert.equal(emptyValues.evidenceByField.nativeSensors.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(emptyValues.evidenceByField.nativeSensors.state, DATA_STATE.UNKNOWN);

// Epoch zero is a valid timestamp, not a missing value; its age is stale.
const epochZero = buildPhysicalValidationSample({
  elapsedMs: 10,
  capturedAt,
  deviceId: 'local-test-device',
  heading: null,
  moving: false,
  motion: { x: 1, y: 2, z: 3, magnitude: 0, jerk: 0, timestamp: 0 },
  nativeSnapshot: null,
});
assert.equal(epochZero.evidenceByField.motionAxes.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.equal(epochZero.evidenceByField.motionAxes.state, DATA_STATE.STALE);
assert.equal(epochZero.motionObservedAt, new Date(0).toISOString());

// Finite but out-of-range timestamps must not throw or be accepted as measured
// motion observations merely because Number.isFinite() is true.
const outOfRange = buildPhysicalValidationSample({
  elapsedMs: 1,
  capturedAt,
  deviceId: 'local-test-device',
  heading: null,
  moving: false,
  motion: { x: 1, y: 2, z: 3, magnitude: 0, jerk: 0, timestamp: 1e30 },
  nativeSnapshot: {
    measurements: { accelerometer: { values: [1, 2, 3], timestamp: 1e30, ageMs: 0 } },
    lastSensorAt: 1e30,
  },
});
assert.equal(outOfRange.evidenceByField.motionAxes.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(outOfRange.motionObservedAt, null);
assert.equal(outOfRange.evidenceByField.nativeSensors.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.equal(outOfRange.evidenceByField.nativeSensors.state, DATA_STATE.UNKNOWN);
assert.equal(outOfRange.nativeSensorObservedAt, null);
assert.equal(outOfRange.nativeSensorAgeMs, null);

console.log('WaveRadar physical-validation evidence provenance/freshness tests: PASS');
