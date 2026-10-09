import assert from 'node:assert/strict';
import { normalizeObservation, DATA_STATE } from '../src/lib/dataContract.js';
const now = '2026-10-09T18:00:00.000Z';
const old = '2020-01-02T03:04:05.000Z';
const value = normalizeObservation({ modality: 'CAMERA', observedAt: old }, { now });
assert.equal(value.timestamp, Date.parse(old));
assert.equal(value.state, DATA_STATE.STALE);
console.log('WaveRadar timestamp regression: PASS');
