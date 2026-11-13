import assert from 'node:assert/strict';
import { classifySpatialMeasurement, normalizeFrameTimestamp } from '../src/lib/sensorFrameContract.js';

assert.deepEqual(
  classifySpatialMeasurement({ angle: null, distance: 4.2 }),
  { status: 'RANGE_ONLY', reason: 'BEARING_UNAVAILABLE', angle: null, distance: 4.2 },
  'range-only measurements must not be assigned a zero-degree bearing'
);
assert.equal(
  classifySpatialMeasurement({ angle: 0, distance: 4.2 }).status,
  'SPATIALLY_ALIGNED',
  'a real zero-degree bearing is valid'
);
assert.equal(
  classifySpatialMeasurement({ bearing: 90, distanceM: 2 }).status,
  'SPATIALLY_ALIGNED',
  'supported bearing/range aliases should normalize'
);
assert.equal(
  classifySpatialMeasurement({ angle: null, distance: null }).status,
  'INVALID'
);
assert.equal(
  classifySpatialMeasurement({ angle: 361, distance: 2 }).status,
  'INVALID'
);
assert.equal(normalizeFrameTimestamp(null), null, 'missing capture time must remain unknown');
assert.equal(normalizeFrameTimestamp('not-a-date'), null, 'invalid capture time must remain unknown');
assert.equal(normalizeFrameTimestamp('2026-11-13T12:00:00.000Z'), Date.parse('2026-11-13T12:00:00.000Z'));
assert.equal(normalizeFrameTimestamp(1700000000), 1700000000000);

console.log('WaveRadar sensor-frame boundary tests: PASS');
