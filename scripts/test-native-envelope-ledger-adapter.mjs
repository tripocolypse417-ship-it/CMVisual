import assert from 'node:assert/strict';
import { projectNativeEnvelopeToLedger } from '../src/lib/nativeEnvelopeLedgerAdapter.js';

const envelope = {
  schema_version: '1.0.0', event_id: 'sample-1', event_type: 'OBSERVATION',
  source: { source_id: 'authorized-phone' },
  timing: { observed_clock_domain: 'DEVICE_MONOTONIC', observed_at: '2026-11-19T10:00:00Z', observed_monotonic_ns: 123456, received_at: '2026-11-19T10:00:02Z' },
  provenance: { evidence_class: 'MEASURED', integrity_state: 'CHECKSUMMED', parent_event_ids: [] },
  evidence: { raw_payload_sha256: 'sample-hash', raw_payload_ref: null },
  payload: { data: { x: 12 } },
};
const original = JSON.stringify(envelope);
const result = projectNativeEnvelopeToLedger(envelope, 'incident-test');
assert.equal(result.accepted, true);
assert.equal(result.event.eventId, 'sample-1');
assert.equal(result.event.incidentId, 'incident-test');
assert.equal(result.event.capturedAt, null, 'monotonic time must not be invented as UTC');
assert.equal(result.event.clockDomain, 'DEVICE_MONOTONIC');
assert.equal(result.event.integrityState, 'UNASSESSED', 'checksum is not verification');
assert.equal(result.event.provenance.independentValidation, false);
assert.deepEqual(result.event.payload.originalEnvelope, envelope);
assert.equal(JSON.stringify(envelope), original, 'input must remain unchanged');

const utc = structuredClone(envelope);
utc.timing.observed_clock_domain = 'UTC_UNIX';
assert.equal(projectNativeEnvelopeToLedger(utc, 'incident-test').event.capturedAt, '2026-11-19T10:00:00.000Z');

const predicted = structuredClone(envelope);
predicted.event_type = 'PREDICTION';
assert.equal(projectNativeEnvelopeToLedger(predicted, 'incident-test').event.eventType, 'HYPOTHESIS');

const unsupported = structuredClone(envelope);
unsupported.event_type = 'SCENE_ENTITY_DELETE';
assert.deepEqual(projectNativeEnvelopeToLedger(unsupported, 'incident-test'), { accepted: false, reason: 'UNSUPPORTED_EVENT_TYPE' });
assert.equal(projectNativeEnvelopeToLedger(envelope, '').reason, 'INCIDENT_SCOPE_REQUIRED');
assert.equal(projectNativeEnvelopeToLedger({ ...envelope, schema_version: '2.0.0' }, 'incident-test').reason, 'UNSUPPORTED_SCHEMA_VERSION');
assert.equal(projectNativeEnvelopeToLedger({ ...envelope, timing: { received_at: 'not-a-date' } }, 'incident-test').reason, 'RECEIPT_TIME_REQUIRED');
console.log('native-envelope-ledger adapter: 12 assertions passed');
