import assert from 'node:assert/strict';
import { EVIDENCE_CLASS } from '../src/lib/dataContract.js';
import { buildPhysicalValidationSample } from '../src/lib/physicalValidationEvidence.js';

const capturedAt = '2026-10-24T18:00:00.000Z';
const sample = buildPhysicalValidationSample({
  elapsedMs: 1250,
  capturedAt,
  deviceId: 'local-test-device',
  heading: 90,
  moving: true,
  motion: { x: 1, y: 2, z: 3, magnitude: 0.75, jerk: 0.25, timestamp: Date.parse(capturedAt) },
  nativeSnapshot: {
    measurements: { accelerometer: { x: 1, y: 2, z: 3 } },
    lastSensorAt: capturedAt,
    accuracy: 'medium',
  },
});

assert.equal(sample.at, capturedAt, 'legacy capture timestamp field remains available');
assert.equal(sample.capturedAt, capturedAt);
assert.equal(sample.evidenceClass, EVIDENCE_CLASS.UNKNOWN, 'mixed envelope must not be labeled measured');
assert.equal(sample.evidenceByField.motionAxes.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.deepEqual(sample.evidenceByField.motionAxes.value, { x: 1, y: 2, z: 3 });
assert.equal(sample.evidenceByField.motionMagnitude.evidenceClass, EVIDENCE_CLASS.DERIVED);
assert.equal(sample.evidenceByField.motionJerk.evidenceClass, EVIDENCE_CLASS.DERIVED);
assert.equal(sample.evidenceByField.moving.evidenceClass, EVIDENCE_CLASS.INFERRED);
assert.equal(sample.evidenceByField.heading.evidenceClass, EVIDENCE_CLASS.DERIVED);
assert.equal(sample.evidenceByField.nativeSensors.evidenceClass, EVIDENCE_CLASS.MEASURED);

const incomplete = buildPhysicalValidationSample({
  elapsedMs: 250,
  capturedAt,
  deviceId: 'local-test-device',
  heading: null,
  moving: true,
  motion: { x: 1, y: null, z: 3, magnitude: null, jerk: null, timestamp: Date.parse(capturedAt) },
  nativeSnapshot: { measurements: {}, lastSensorAt: capturedAt },
});
assert.equal(incomplete.evidenceByField.motionAxes.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.motionMagnitude.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.motionMagnitude.value, null);
assert.equal(incomplete.evidenceByField.moving.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.moving.value, null);
assert.equal(incomplete.evidenceByField.heading.evidenceClass, EVIDENCE_CLASS.UNKNOWN);
assert.equal(incomplete.evidenceByField.nativeSensors.evidenceClass, EVIDENCE_CLASS.UNKNOWN);

console.log('WaveRadar physical-validation evidence provenance tests: PASS');
