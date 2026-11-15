import assert from 'node:assert/strict';
import { buildIncidentReplay } from '../src/lib/incidentReplayPolicy.js';

const incidentId = 'incident-1';
const records = [
  { id: 'early', incidentId, eventTime: '2026-11-02T14:00:00Z', receivedAt: '2026-11-02T14:00:01Z', evidenceClass: 'MEASURED' },
  { id: 'late-arrival', incidentId, eventTime: '2026-11-02T14:01:00Z', receivedAt: '2026-11-02T14:05:00Z', evidenceClass: 'MEASURED' },
  { id: 'future-event', incidentId, eventTime: '2026-11-02T14:06:00Z', receivedAt: '2026-11-02T14:06:01Z', evidenceClass: 'MEASURED' },
  { id: 'other-incident', incidentId: 'incident-2', eventTime: '2026-11-02T14:00:30Z', receivedAt: '2026-11-02T14:00:31Z' },
];

const known = buildIncidentReplay(records, {
  incidentId, mode: 'AS_KNOWN_THEN',
  asOf: '2026-11-02T14:03:00Z',
  eventThrough: '2026-11-02T14:03:00Z',
});
assert.deepEqual(known.records.map((item) => item.id), ['early']);
assert.deepEqual(known.excluded, [
  { evidenceId: 'late-arrival', reason: 'RECEIVED_AFTER_REVIEW_CUTOFF' },
  { evidenceId: 'future-event', reason: 'EVENT_AFTER_SELECTED_TIME' },
  { evidenceId: 'other-incident', reason: 'DIFFERENT_INCIDENT' },
]);

// Best-evidence-now uses a later review cutoff but retains the historical event window.
const hindsight = buildIncidentReplay(records, {
  incidentId, mode: 'BEST_EVIDENCE_NOW',
  asOf: '2026-11-02T14:10:00Z',
  eventThrough: '2026-11-02T14:03:00Z',
});
assert.deepEqual(hindsight.records.map((item) => item.id), ['early', 'late-arrival']);
assert.equal(hindsight.records[1].replay.hindsightOnly, true);
assert.equal(hindsight.records[1].replay.arrivedAfterAsKnownCutoff, true);
assert.equal(hindsight.records[0].replay.hindsightOnly, false);
assert.equal(hindsight.excluded[0].reason, 'EVENT_AFTER_SELECTED_TIME');

// Evidence received after the review cutoff must never leak into either replay mode.
const notYetReceived = buildIncidentReplay(records, {
  incidentId, mode: 'BEST_EVIDENCE_NOW',
  asOf: '2026-11-02T14:04:00Z',
  eventThrough: '2026-11-02T14:03:00Z',
});
assert.equal(notYetReceived.records.some((item) => item.id === 'late-arrival'), false);

// Supports the canonical envelope's nested event_time.timestamp shape.
const canonical = buildIncidentReplay([{
  observation_id: 'canonical-1', incident_id: incidentId,
  event_time: { timestamp: '2026-11-02T14:00:00Z', uncertainty_ms: 25 },
  received_at: '2026-11-02T14:00:02Z',
}], {
  incidentId, mode: 'AS_KNOWN_THEN',
  asOf: '2026-11-02T14:03:00Z',
  eventThrough: '2026-11-02T14:03:00Z',
});
assert.equal(canonical.records.length, 1);

// Sorting is deterministic and does not mutate the caller's array.
assert.deepEqual(records.map((item) => item.id), ['early', 'late-arrival', 'future-event', 'other-incident']);
const unordered = [...records].reverse();
const ordered = buildIncidentReplay(unordered, {
  incidentId, mode: 'BEST_EVIDENCE_NOW',
  asOf: '2026-11-02T14:10:00Z',
  eventThrough: '2026-11-02T14:10:00Z',
});
assert.deepEqual(ordered.records.map((item) => item.id), ['early', 'late-arrival', 'future-event']);

assert.throws(() => buildIncidentReplay(records, { incidentId, mode: 'UNKNOWN', asOf: '2026-11-02T14:03:00Z' }), /mode/);
assert.throws(() => buildIncidentReplay(records, { mode: 'AS_KNOWN_THEN', asOf: '2026-11-02T14:03:00Z' }), /incidentId/);
assert.throws(() => buildIncidentReplay([{ ...records[0], id: '' }], {
  incidentId, mode: 'AS_KNOWN_THEN', asOf: '2026-11-02T14:03:00Z',
}), /stable ID/);
assert.throws(() => buildIncidentReplay([{ ...records[0], incidentId: undefined }], {
  incidentId, mode: 'AS_KNOWN_THEN', asOf: '2026-11-02T14:03:00Z',
}), /incident ID/);
assert.throws(() => buildIncidentReplay([records[0], records[0]], {
  incidentId, mode: 'AS_KNOWN_THEN', asOf: '2026-11-02T14:03:00Z',
}), /Duplicate evidence ID/);

console.log('Incident replay policy checks passed. These are deterministic policy tests, not sensor or field validation.');
