import assert from 'node:assert/strict';
import { toPhysicalValidationEvidenceEvent } from '../src/lib/physicalValidationJournal.js';

const sample = {
  capturedAt: '2026-11-17T12:00:00.250Z',
  evidenceClass: 'UNKNOWN',
  evidenceByField: {
    motionAxes: { evidenceClass: 'MEASURED', value: { x: 1, y: 2, z: 3 } },
    motionMagnitude: { evidenceClass: 'DERIVED', value: 0.2 },
    moving: { evidenceClass: 'INFERRED', value: true },
  },
};
const event = toPhysicalValidationEvidenceEvent({
  sample, deviceId: 'device-local-1', sessionId: 'session-1', sequence: 1,
  receivedAt: '2026-11-17T12:00:00.300Z',
});
assert.equal(event.eventType, 'OBSERVATION');
assert.equal(event.evidenceClass, 'UNKNOWN');
assert.equal(event.capturedAt, Date.parse(sample.capturedAt));
assert.equal(event.receivedAt, Date.parse('2026-11-17T12:00:00.300Z'));
assert.notEqual(event.capturedAt, event.receivedAt);
assert.equal(event.clockDomain, 'UNIX_EPOCH_MILLISECONDS');
assert.equal(event.payload.evidenceByField.motionAxes.evidenceClass, 'MEASURED');
assert.equal(event.payload.evidenceByField.motionMagnitude.evidenceClass, 'DERIVED');
assert.equal(event.payload.evidenceByField.moving.evidenceClass, 'INFERRED');
assert.equal(event.provenance.localSequence, 1);
const unknownTime = toPhysicalValidationEvidenceEvent({
  sample: { capturedAt: null }, deviceId: 'd', sessionId: 's', sequence: 2,
  receivedAt: null,
});
assert.equal(unknownTime.capturedAt, null);
assert.equal(unknownTime.receivedAt, null);
assert.throws(() => toPhysicalValidationEvidenceEvent({ sample, deviceId: '', sessionId: 's', sequence: 1 }), /deviceId/);
assert.throws(() => toPhysicalValidationEvidenceEvent({ sample, deviceId: 'd', sessionId: 's', sequence: 0 }), /positive integer/);
console.log('WaveRadar physical-validation evidence journal mapping: PASS');
