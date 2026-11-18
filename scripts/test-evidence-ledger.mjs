import assert from 'node:assert/strict';
import { createEvidenceLedger, eventsAtCaptureTime, eventsKnownAt, normalizeEvidenceEvent } from '../src/lib/evidenceLedger.js';

const events = [
  { eventId: 'obs-a', incidentId: 'incident-1', eventType: 'OBSERVATION', sourceId: 'phone-1', capturedAt: '2026-11-17T10:00:00Z', receivedAt: '2026-11-17T10:00:02Z', clockDomain: 'device-monotonic-a', evidenceClass: 'MEASURED', payload: { value: 4 } },
  { eventId: 'obs-b', incidentId: 'incident-1', eventType: 'OBSERVATION', sourceId: 'phone-2', capturedAt: '2026-11-17T10:00:01Z', receivedAt: '2026-11-17T10:00:03Z', clockDomain: 'device-monotonic-b', evidenceClass: 'MEASURED', payload: { value: 5 } },
  { eventId: 'hyp-a', incidentId: 'incident-1', eventType: 'HYPOTHESIS', sourceId: 'model-v1', capturedAt: '2026-11-17T10:00:04Z', receivedAt: '2026-11-17T10:00:05Z', clockDomain: 'server-utc', evidenceClass: 'INFERRED', sourceEventIds: ['obs-a', 'obs-b'], hypothesisGroupId: 'location-room-choice', payload: { room: 'A' } },
  { eventId: 'hyp-b', incidentId: 'incident-1', eventType: 'HYPOTHESIS', sourceId: 'model-v1', capturedAt: '2026-11-17T10:00:04Z', receivedAt: '2026-11-17T10:00:05Z', clockDomain: 'server-utc', evidenceClass: 'INFERRED', hypothesisGroupId: 'location-room-choice', payload: { room: 'B' } },
  { eventId: 'no-receipt', incidentId: 'incident-1', eventType: 'OBSERVATION', sourceId: 'offline-device', capturedAt: '2026-11-17T09:59:00Z', receivedAt: null, clockDomain: 'device-monotonic-c', evidenceClass: 'MEASURED' },
];

const ledger = createEvidenceLedger(events);
assert.equal(ledger.counts.accepted, 5);
assert.equal(ledger.counts.rejected, 0);
assert.equal(ledger.edges.length, 2);
assert.deepEqual(ledger.hypothesisGroups[0].hypotheses, ['hyp-a', 'hyp-b']);
assert.equal(ledger.hypothesisGroups[0].status, 'MULTIPLE_OR_OPEN');
assert.equal(eventsKnownAt(ledger, '2026-11-17T10:00:03Z').length, 2);
assert.equal(eventsKnownAt(ledger, '2026-11-17T10:00:06Z').length, 4);
assert.equal(eventsAtCaptureTime(ledger, { clockDomain: 'device-monotonic-a' }).length, 1);
assert.equal(eventsAtCaptureTime(ledger, { clockDomain: 'device-monotonic-b' }).length, 1);
assert.throws(() => eventsAtCaptureTime(ledger), /clockDomain is required/);
assert.equal(eventsAtCaptureTime(ledger, { clockDomain: 'device-monotonic-a' }).length, 1);

// No implicit arrival-time substitution; the original input remains unchanged.
assert.equal(ledger.events.find(event => event.eventId === 'no-receipt').receivedAt, null);
assert.equal(events[0].schemaVersion, undefined);

// Conflicting event IDs are rejected rather than silently overwriting evidence.
const duplicateLedger = createEvidenceLedger([events[0], { ...events[0], payload: { value: 999 } }, events[0]]);
assert.equal(duplicateLedger.counts.accepted, 1);
assert.equal(duplicateLedger.rejected[0].reason, 'EVENT_ID_COLLISION');
assert.equal(duplicateLedger.rejected[1].reason, 'DUPLICATE_IDEMPOTENT_EVENT');

// Invalid events are quarantined in the rejection report.
const invalidLedger = createEvidenceLedger([{ eventId: 'bad', eventType: 'OBSERVATION' }]);
assert.equal(invalidLedger.counts.accepted, 0);
assert.equal(invalidLedger.rejected[0].reason, 'INVALID_EVENT');

// Frozen ledger prevents mutation through returned references.
assert.equal(Object.isFrozen(ledger), true);
assert.equal(Object.isFrozen(ledger.events[0].payload), true);
assert.throws(() => normalizeEvidenceEvent({ eventId: 'x', incidentId: 'i', eventType: 'UNKNOWN' }), /unsupported eventType/);

console.log('WaveRadar append-only temporal evidence ledger: PASS');
