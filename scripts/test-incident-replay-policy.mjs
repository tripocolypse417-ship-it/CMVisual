import assert from 'node:assert/strict';
import { buildIncidentReplay } from '../src/lib/incidentReplayPolicy.js';

const records = [
  { id: 'early', eventTime: '2026-11-02T14:00:00Z', receivedAt: '2026-11-02T14:00:01Z', evidenceClass: 'MEASURED' },
  { id: 'late-arrival', eventTime: '2026-11-02T14:01:00Z', receivedAt: '2026-11-02T14:05:00Z', evidenceClass: 'MEASURED' },
  { id: 'future-event', eventTime: '2026-11-02T14:06:00Z', receivedAt: '2026-11-02T14:06:01Z', evidenceClass: 'MEASURED' },
];

const known = buildIncidentReplay(records, {
  mode: 'AS_KNOWN_THEN',
  asOf: '2026-11-02T14:03:00Z',
  eventThrough: '2026-11-02T14:03:00Z',
});
assert.deepEqual(known.records.map((item) => item.id), ['early']);
assert.deepEqual(known.excluded, [
  { evidenceId: 'late-arrival', reason: 'RECEIVED_AFTER_AS_KNOWN_CUTOFF' },
  { evidenceId: 'future-event', reason: 'EVENT_AFTER_SELECTED_TIME' },
]);

const hindsight = buildIncidentReplay(records, {
  mode: 'BEST_EVIDENCE_NOW',
  asOf: '2026-11-02T14:03:00Z',
  eventThrough: '2026-11-02T14:03:00Z',
});
assert.deepEqual(hindsight.records.map((item) => item.id), ['early', 'late-arrival']);
assert.equal(hindsight.records[1].replay.hindsightOnly, true);
assert.equal(hindsight.records[1].replay.arrivedAfterAsKnownCutoff, true);
assert.equal(hindsight.records[0].replay.hindsightOnly, false);
assert.equal(hindsight.excluded[0].reason, 'EVENT_AFTER_SELECTED_TIME');

// Sorting is deterministic and does not mutate the caller's array.
assert.deepEqual(records.map((item) => item.id), ['early', 'late-arrival', 'future-event']);
const unordered = [...records].reverse();
const ordered = buildIncidentReplay(unordered, {
  mode: 'BEST_EVIDENCE_NOW',
  asOf: '2026-11-02T14:10:00Z',
  eventThrough: '2026-11-02T14:10:00Z',
});
assert.deepEqual(ordered.records.map((item) => item.id), ['early', 'late-arrival', 'future-event']);

assert.throws(() => buildIncidentReplay(records, { mode: 'UNKNOWN', asOf: '2026-11-02T14:03:00Z' }), /mode/);
assert.throws(() => buildIncidentReplay([{ ...records[0], id: '' }], {
  mode: 'AS_KNOWN_THEN', asOf: '2026-11-02T14:03:00Z',
}), /stable ID/);
assert.throws(() => buildIncidentReplay([records[0], records[0]], {
  mode: 'AS_KNOWN_THEN', asOf: '2026-11-02T14:03:00Z',
}), /Duplicate evidence ID/);

console.log('Incident replay policy checks passed. These are deterministic policy tests, not sensor or field validation.');
