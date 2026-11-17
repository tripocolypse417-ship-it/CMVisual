import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createWaveRadarEventEnvelope } from '../src/lib/eventEnvelope.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const snapshot = {
  capturedAt: 1763400000000,
  clockDomain: 'UNIX_EPOCH_MILLISECONDS',
  measurements: {
    accelerometer: {
      values: [0.1, -0.2, 9.7],
      sourceTimestampNs: 9876543210,
      sourceClockDomain: 'ANDROID_ELAPSED_REALTIME_NANOS',
      timestampEstimateMs: 1763400000000,
      sampleReceivedAt: 1763400000001,
    },
  },
};
const event = await createWaveRadarEventEnvelope({
  eventId: '2c5e8a9a-ccf4-4dcb-9b0a-52d3d1ed81ab',
  snapshot,
  source: {
    sourceId: 'android-device-01',
    sourceType: 'ANDROID_SENSOR_MANAGER',
    adapterId: 'waveradar-android-sensors',
    adapterVersion: '1.0.0',
    deviceId: 'device-01',
    capabilityId: 'imu.accelerometer',
    authorizationScopeId: 'local-device-permission',
  },
  observedClockDomain: 'ANDROID_ELAPSED_REALTIME_NANOS',
  observedMonotonicNs: 9876543210,
  receivedAt: '2026-11-17T23:00:00.000Z',
  evidenceClass: 'MEASURED',
});

assert.equal(event.schema_version, '1.0.0');
assert.equal(event.event_type, 'OBSERVATION');
assert.equal(event.timing.observed_at, null);
assert.equal(event.timing.observed_clock_domain, 'DEVICE_MONOTONIC');
assert.equal(event.timing.observed_monotonic_ns, 9876543210);
assert.equal(event.timing.received_at, '2026-11-17T23:00:00.000Z');
assert.equal(event.provenance.evidence_class, 'MEASURED');
assert.equal(event.provenance.integrity_state, 'CHECKSUMMED');
assert.equal(event.evidence.raw_payload_ref, null);
assert.match(event.evidence.raw_payload_sha256, /^[a-f0-9]{64}$/);
assert.deepEqual(event.payload.data, snapshot);
assert.equal(snapshot.measurements.accelerometer.timestampEstimateMs, 1763400000000);

const unknownClock = await createWaveRadarEventEnvelope({
  eventId: 'c46a1f1c-3e75-4b92-9d63-85d8eaf7e3a2',
  snapshot: { value: 1 },
  source: { sourceId: 's', sourceType: 'test', adapterId: 'test', adapterVersion: '1' },
  observedClockDomain: 'UNRECOGNIZED_CLOCK',
  observedAt: '2026-11-17T23:00:00.000Z',
  receivedAt: '2026-11-17T23:00:01.000Z',
});
assert.equal(unknownClock.timing.observed_clock_domain, 'UNKNOWN');
assert.equal(unknownClock.timing.observed_at, null);
assert.equal(unknownClock.provenance.evidence_class, 'UNKNOWN');

await assert.rejects(() => createWaveRadarEventEnvelope({
  snapshot: {}, source: { sourceId: 's' },
}), /source.sourceType is required/);

console.log('WaveRadar event envelope adapter tests: PASS');
