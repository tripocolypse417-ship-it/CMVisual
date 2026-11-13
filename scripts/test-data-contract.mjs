import assert from 'node:assert/strict';
import { normalizeObservation, normalizePrediction, normalizeState, DATA_STATE, EVIDENCE_CLASS } from '../src/lib/dataContract.js';

const now = Date.parse('2026-10-09T18:00:00.000Z');
const oldIso = '2020-01-02T03:04:05.000Z';
const currentIso = '2026-10-09T17:59:59.000Z';

// ISO timestamps are preserved and stale evidence remains stale.
const stale = normalizeObservation({ modality: 'CAMERA', observedAt: oldIso }, { now });
assert.equal(stale.timestamp, Date.parse(oldIso));
assert.equal(stale.observedAt, new Date(oldIso).toISOString());
assert.equal(stale.state, DATA_STATE.STALE);
assert.equal(stale.evidenceClass, EVIDENCE_CLASS.MEASURED);

// ISO timestamps and numeric milliseconds normalize consistently.
const current = normalizeObservation({ modality: 'CAMERA', observedAt: currentIso }, { now });
assert.equal(current.timestamp, Date.parse(currentIso));
assert.equal(current.state, DATA_STATE.CURRENT);
assert.equal(normalizeObservation({ modality: 'IMU', timestamp: now }, { now }).timestamp, now);

// Epoch seconds and numeric strings are converted to milliseconds.
const seconds = 1700000000;
assert.equal(normalizeObservation({ modality: 'IMU', timestamp: seconds }, { now }).timestamp, seconds * 1000);
assert.equal(normalizeObservation({ modality: 'IMU', timestamp: String(seconds) }, { now }).timestamp, seconds * 1000);

// Canonical state and the quality gate must use the same default freshness
// policy. Source/task overrides remain explicit and are never treated as accuracy.
const tenSecondsOld = new Date(now - 10000).toISOString();
const withinDefaultWindow = normalizeObservation({ modality: 'CAMERA', observedAt: tenSecondsOld }, { now });
assert.equal(withinDefaultWindow.state, DATA_STATE.CURRENT);
const beyondTaskWindow = normalizeObservation({
  modality: 'CAMERA',
  observedAt: tenSecondsOld,
  freshnessWindowMs: 5000,
}, { now });
assert.equal(beyondTaskWindow.state, DATA_STATE.STALE);
assert.equal(normalizeState({
  observedAt: tenSecondsOld,
  freshnessWindowMs: 5000,
}, { now }), DATA_STATE.STALE);
assert.equal(normalizeState({
  observedAt: tenSecondsOld,
  freshnessWindowMs: 15000,
}, { now }), DATA_STATE.CURRENT);

// Invalid explicit timestamps must not be silently replaced with the current time,
// even when legacy input explicitly claims CURRENT.
const invalid = normalizeObservation({ modality: 'CAMERA', observedAt: 'not-a-date', state: 'CURRENT' }, { now });
assert.equal(invalid.timestamp, null);
assert.equal(invalid.observedAt, null);
assert.equal(invalid.state, DATA_STATE.UNKNOWN);
assert.equal(normalizeState({ observedAt: 'not-a-date', state: 'CURRENT' }, { now }), DATA_STATE.UNKNOWN);

// Missing source timestamps are not replaced with processing time, even when
// legacy input claims CURRENT. Receive time is not measurement time.
const missingTime = normalizeObservation({ modality: 'CAMERA', state: 'CURRENT', bbox: { x: 0, y: 0, width: 10, height: 10 } }, { now });
assert.equal(missingTime.timestamp, null);
assert.equal(missingTime.observedAt, null);
assert.equal(missingTime.state, DATA_STATE.UNKNOWN);
assert.equal(normalizeState({ state: 'CURRENT' }, { now }), DATA_STATE.UNKNOWN);

// An explicit CURRENT label cannot override stale or future timestamp evidence.
const forcedCurrentStale = normalizeObservation({ modality: 'CAMERA', observedAt: oldIso, state: 'CURRENT' }, { now });
assert.equal(forcedCurrentStale.state, DATA_STATE.STALE);
const futureIso = '2026-10-09T18:01:00.000Z';
const futureCurrent = normalizeObservation({ modality: 'CAMERA', observedAt: futureIso, state: 'CURRENT' }, { now });
assert.equal(futureCurrent.state, DATA_STATE.UNKNOWN);

// Model forecasts remain predictions; camera observations remain measured.
const prediction = normalizePrediction({ id: 'forecast-1', observedAt: currentIso }, { now });
assert.equal(prediction.evidenceClass, EVIDENCE_CLASS.PREDICTED);
assert.equal(current.evidenceClass, EVIDENCE_CLASS.MEASURED);

console.log('WaveRadar timestamp/evidence regression tests: PASS');
