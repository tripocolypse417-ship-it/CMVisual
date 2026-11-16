import assert from 'node:assert/strict';
import { normalizeEvidenceClass } from '../src/lib/evidenceClass.js';

const cases = [
  ['MEASURED', 'MEASURED'],
  ['derived', 'DERIVED'],
  [' inferred ', 'INFERRED'],
  ['PREDICTED', 'PREDICTED'],
  ['SIMULATED', 'SIMULATED'],
  ['DEMO', 'DEMO'],
  ['UNKNOWN', 'UNKNOWN'],
  ['UNAVAILABLE', 'UNAVAILABLE'],
  [undefined, 'UNKNOWN'],
  [null, 'UNKNOWN'],
  ['', 'UNKNOWN'],
  ['camera', 'UNKNOWN'],
  ['external-sensor', 'UNKNOWN'],
  ['observed', 'UNKNOWN'],
  ['detected', 'UNKNOWN'],
];

for (const [input, expected] of cases) {
  assert.equal(normalizeEvidenceClass(input), expected, `unexpected classification for ${String(input)}`);
}

console.log(`Evidence-class contract passed: ${cases.length} cases.`);
