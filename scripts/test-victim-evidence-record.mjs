import assert from 'node:assert/strict';
import {
  appendVictimObservation,
  buildVictimHandoff,
  captureVictimScanReference,
  createVictimRecord,
  summarizeVictimRecord,
  VICTIM_CATEGORIES,
} from '../src/lib/victimEvidence.js';

const selected = {
  id: 'track-17',
  trackId: 'track-17',
  type: 'human',
  displayId: 'PERSON 01',
  source: 'camera+sensor-corroborated',
  evidenceClass: 'MEASURED',
  distance: 2.4,
  angle: 91,
  confidence: 0.82,
  uncertaintyM: 0.3,
  corroborated: true,
  sensorSources: ['depth-camera', 'radar'],
};

const record = createVictimRecord({
  incidentId: 'incident-test',
  selectedTrack: selected,
  now: '2026-11-13T10:00:00.000Z',
});
assert.equal(record.trackId, 'track-17');
assert.equal(record.events.length, 1);
assert.equal(record.events[0].evidenceClass, 'HUMAN_ENTERED');

const withScan = captureVictimScanReference(record, selected, { sensorConflicts: { conflicts: [{ trackId: 'track-17', sensorCount: 2, rangeSpread: 0.9, bearingSpread: 35, reason: 'MEASUREMENT_DISAGREEMENT' }] } }, '2026-11-13T10:00:01.000Z');
assert.equal(withScan.events.length, 2);
assert.equal(withScan.events[1].eventType, 'SCAN_REFERENCE');
assert.equal(withScan.events[1].confidence, 0.82);
assert.equal(withScan.events[1].sensorConflicts[0].reason, 'MEASUREMENT_DISAGREEMENT');
assert.equal(withScan.events[1].sensorConflicts[0].rangeSpreadM, 0.9);
assert.ok(!('image' in withScan.events[1]));
assert.throws(() => captureVictimScanReference(record, { ...selected, trackId: 'other' }));

const first = appendVictimObservation(withScan, {
  category: 'VISIBLE_BLEEDING',
  status: 'OBSERVED',
  note: 'Visible bleeding at left forearm.',
}, '2026-11-13T10:01:00.000Z');
assert.equal(first.events.length, 3);
assert.equal(first.events[2].evidenceClass, 'HUMAN_ENTERED');
assert.equal(first.events[2].note, 'Visible bleeding at left forearm.');

const conflicting = appendVictimObservation(first, {
  category: 'VISIBLE_BLEEDING',
  status: 'NOT_OBSERVED',
  note: 'Second responder cannot see bleeding from current position.',
}, '2026-11-13T10:02:00.000Z');
const summary = summarizeVictimRecord(conflicting);
assert.equal(summary.observationCount, 2);
assert.equal(summary.scanReferenceCount, 1);
assert.equal(summary.conflicts.length, 1);
assert.equal(summary.conflicts[0].category, 'VISIBLE_BLEEDING');
const later = appendVictimObservation(first, { category: 'VISIBLE_BLEEDING', status: 'NOT_OBSERVED', note: 'Later reassessment from another location.' }, '2026-11-13T10:20:00.000Z');
assert.equal(summarizeVictimRecord(later).conflicts.length, 0, 'Observations outside the five-minute review window are not flagged as concurrent disagreement.');
assert.equal(summary.notAssessed.length, VICTIM_CATEGORIES.length - 1);

const handoff = buildVictimHandoff(conflicting);
assert.equal(handoff.events.length, 4);
assert.ok(handoff.limitations.some((item) => item.includes('not a diagnosis')));
assert.equal(record.events.length, 1, 'Appending events must not mutate the original record.');
assert.throws(() => appendVictimObservation(record, { category: 'UNSUPPORTED', status: 'OBSERVED', note: 'x' }));
assert.throws(() => appendVictimObservation(record, { category: 'OTHER', status: 'OBSERVED', note: '' }));

console.log('PASS: victim evidence record, append-only events, scan linking, conflict preservation, and handoff contract.');
