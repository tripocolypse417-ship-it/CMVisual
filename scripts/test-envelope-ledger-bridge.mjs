import assert from 'node:assert/strict';
import { mapEnvelopeV1ToLedgerEvent } from '../src/lib/envelopeLedgerBridge.js';

const sample = {
  schema_version: '1.0.0', event_id: 'evt-1', incident_id: 'incident-1',
  event_type: 'OBSERVATION',
  source: { source_id: 'android-sensor' },
  timing: { observed_clock_domain: 'DEVICE_MONOTONIC', observed_at: null,
    observed_monotonic_ns: 123456789, received_at: '2026-11-19T15:00:00Z' },
  provenance: { evidence_class: 'MEASURED', integrity_state: 'UNASSESSED',
    parent_event_ids: [] },
  payload: { data: { x: 1 } },
  evidence: { raw_payload_sha256: null, raw_payload_ref: null },
};
const mapped = mapEnvelopeV1ToLedgerEvent(sample);
assert.equal(mapped.capturedAt, null, 'monotonic timestamp must not become UTC');
assert.equal(mapped.provenance.observedMonotonicNs, 123456789);
assert.deepEqual(mapped.payload.originalEnvelope, sample);
sample.payload.data.x = 9;
assert.equal(mapped.payload.originalEnvelope.payload.data.x, 1, 'snapshot must be copied');
assert.equal(mapped.integrityState, 'UNASSESSED');
assert.throws(() => mapEnvelopeV1ToLedgerEvent({ ...sample, incident_id: null }), /incident_id/);
assert.throws(() => mapEnvelopeV1ToLedgerEvent({ ...sample, schema_version: '2.0.0' }), /version/);
assert.throws(() => mapEnvelopeV1ToLedgerEvent({ ...sample, event_type: 'UNSUPPORTED' }), /event type/);
const utc = mapEnvelopeV1ToLedgerEvent({
  ...sample, timing: { ...sample.timing, observed_clock_domain: 'UTC_UNIX',
    observed_at: '2026-11-19T14:59:00Z' },
});
assert.equal(utc.capturedAt, '2026-11-19T14:59:00Z');
console.log('Envelope ledger compatibility contract: 9 assertions passed');
