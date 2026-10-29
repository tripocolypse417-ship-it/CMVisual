import assert from 'node:assert/strict';
import { createFederationEnvelope, validateFederationEnvelope, FEDERATION_PROTOCOL_VERSION } from '../src/lib/federationEnvelope.js';
import { EVIDENCE_CLASS, DATA_STATE } from '../src/lib/dataContract.js';

const sentAt = '2026-10-28T12:00:00.000Z';
const observedAt = '2026-10-28T11:59:59.000Z';

const envelope = createFederationEnvelope({
  incidentId: 'incident-42',
  teamId: 'team-alpha',
  deviceId: 'device-7',
  sequence: 1,
  sentAt,
  sessionId: 'session-9',
  observation: {
    eventId: 'camera-event-11',
    modality: 'CAMERA',
    observedAt,
    confidence: 0.91,
    position: { x: 1, y: 2, z: 3 },
    evidenceClass: EVIDENCE_CLASS.MEASURED,
  },
});

assert.equal(envelope.protocolVersion, FEDERATION_PROTOCOL_VERSION);
assert.equal(envelope.envelopeId, 'incident-42:device-7:1');
assert.equal(envelope.sentAt, sentAt);
assert.equal(envelope.observation.observedAt, observedAt);
assert.equal(envelope.observation.deviceId, 'device-7');
assert.equal(envelope.observation.evidenceClass, EVIDENCE_CLASS.MEASURED);
assert.equal(validateFederationEnvelope(envelope).valid, true);

const untimed = createFederationEnvelope({
  incidentId: 'incident-42',
  teamId: 'team-alpha',
  deviceId: 'device-7',
  sequence: 2,
  sentAt,
  observation: { modality: 'CAMERA', evidenceClass: EVIDENCE_CLASS.MEASURED },
});
assert.equal(untimed.sourceTimestampValid, false);
assert.equal(untimed.observation.timestamp, null);
assert.equal(untimed.observation.state, DATA_STATE.UNKNOWN);
assert.equal(untimed.sentAt, sentAt);
assert.equal(validateFederationEnvelope(untimed).valid, true);

assert.equal(validateFederationEnvelope({ ...envelope, envelopeId: 'forged' }).valid, false);
assert.equal(validateFederationEnvelope({
  ...envelope,
  observation: { ...envelope.observation, deviceId: 'other-device' },
}).valid, false);
assert.equal(validateFederationEnvelope({ ...envelope, sequence: 0 }).valid, false);

const malformedTime = createFederationEnvelope({
  incidentId: 'incident-42',
  teamId: 'team-alpha',
  deviceId: 'device-7',
  sequence: 3,
  sentAt,
  observation: { modality: 'IMU', observedAt: 'not-a-date' },
});
assert.equal(malformedTime.observation.timestamp, null);
assert.equal(malformedTime.sourceTimestampValid, false);

const invalidSequenceInput = {
  incidentId: 'incident-42',
  teamId: 'team-alpha',
  deviceId: 'device-7',
  sequence: 0,
  sentAt,
  observation: { modality: 'IMU', observedAt },
};
assert.throws(() => createFederationEnvelope(invalidSequenceInput), /sequence/);
assert.throws(() => createFederationEnvelope({
  ...invalidSequenceInput,
  deviceId: '',
  sequence: 4,
}), /deviceId/);

console.log('WaveRadar federated observation envelope tests: PASS');
