import assert from 'node:assert/strict';
import { solveRangeOnlyPosition2D } from '../src/lib/fusion/range-multilateration.js';

const nowMs = 50_000;
const target = { x: 3, y: 4 };
const anchors = [
  { anchorId: 'A', anchor: { x: 0, y: 0 } },
  { anchorId: 'B', anchor: { x: 10, y: 0 } },
  { anchorId: 'C', anchor: { x: 0, y: 10 } },
  { anchorId: 'D', anchor: { x: 10, y: 10 } },
];
const obs = (item, index, overrides = {}) => ({
  sourceId: `rtt-${item.anchorId}-${index}`,
  evidenceClass: 'MEASURED',
  anchorId: item.anchorId,
  anchor: item.anchor,
  rangeM: Math.hypot(target.x - item.anchor.x, target.y - item.anchor.y),
  uncertaintyM: 0.05,
  timestampMs: nowMs - 10,
  coordinateFrame: 'surveyed-floor-A-v1',
  clockDomain: 'monotonic:session-1',
  ...overrides,
});

const exact = solveRangeOnlyPosition2D(anchors.slice(0, 3).map(obs), { nowMs });
assert.equal(exact.status, 'CANDIDATE');
assert.equal(exact.evidenceClass, 'DERIVED');
assert.ok(Math.abs(exact.position.x - target.x) < 1e-8);
assert.ok(Math.abs(exact.position.y - target.y) < 1e-8);
assert.equal(exact.dimensions, 2);
assert.equal(exact.sourceCorrelation, 'UNKNOWN_NOT_ESTIMATED');
assert.equal(exact.clockDomain, 'monotonic:session-1');

const redundant = solveRangeOnlyPosition2D(anchors.map(obs), { nowMs });
assert.equal(redundant.status, 'CANDIDATE');
assert.equal(redundant.anchorIds.length, 4);
assert.ok(redundant.rmsResidualM < 1e-6);

const insufficient = solveRangeOnlyPosition2D(anchors.slice(0, 2).map(obs), { nowMs });
assert.equal(insufficient.reason, 'INSUFFICIENT_ANCHORS');

const stale = solveRangeOnlyPosition2D(anchors.map((a, i) => obs(a, i, { timestampMs: nowMs - 10_000 })), { nowMs, maxAgeMs: 1000 });
assert.equal(stale.reason, 'INSUFFICIENT_ANCHORS');
assert.ok(stale.rejected.every((item) => item.reason === 'STALE'));

const mixedFrames = solveRangeOnlyPosition2D(anchors.slice(0, 3).map((a, i) => obs(a, i, { coordinateFrame: i === 2 ? 'other-frame' : 'surveyed-floor-A-v1' })), { nowMs });
assert.equal(mixedFrames.reason, 'INCOMPATIBLE_COORDINATE_FRAMES');

const mixedClockDomains = solveRangeOnlyPosition2D([
  obs(anchors[0], 0),
  obs(anchors[1], 1),
  obs(anchors[2], 2, { clockDomain: 'monotonic:session-2' }),
], { nowMs });
assert.equal(mixedClockDomains.status, 'UNAVAILABLE');
assert.equal(mixedClockDomains.reason, 'INCOMPATIBLE_CLOCK_DOMAINS');
assert.ok(mixedClockDomains.rejected.every((item) => item.reason === 'CLOCK_DOMAIN_MISMATCH'));

const missingClockDomain = solveRangeOnlyPosition2D([
  obs(anchors[0], 0, { clockDomain: undefined }),
  obs(anchors[1], 1),
  obs(anchors[2], 2),
], { nowMs });
assert.equal(missingClockDomain.reason, 'INSUFFICIENT_ANCHORS');
assert.ok(missingClockDomain.rejected.some((item) => item.reason === 'MISSING_CLOCK_DOMAIN'));

const duplicateAnchor = solveRangeOnlyPosition2D([obs(anchors[0], 0), obs(anchors[0], 1), obs(anchors[1], 2)], { nowMs });
assert.equal(duplicateAnchor.reason, 'INSUFFICIENT_ANCHORS');
assert.ok(duplicateAnchor.rejected.some((item) => item.reason === 'DUPLICATE_ANCHOR'));

const collinear = [0, 1, 2].map((i) => obs({ anchorId: `L${i}`, anchor: { x: i * 5, y: 0 } }, i));
const badGeometry = solveRangeOnlyPosition2D(collinear, { nowMs });
assert.equal(badGeometry.reason, 'NO_GEOMETRICALLY_CONSISTENT_ANCHOR_SET');

const outlierObs = anchors.map((a, i) => obs(a, i, i === 3 ? { rangeM: 30 } : {}));
const robust = solveRangeOnlyPosition2D(outlierObs, { nowMs });
assert.equal(robust.status, 'CANDIDATE');
assert.ok(robust.rejected.some((item) => item.reason === 'RANGE_OUTLIER'));
assert.ok(Math.abs(robust.position.x - target.x) < 1e-6);
assert.ok(Math.abs(robust.position.y - target.y) < 1e-6);

assert.throws(() => solveRangeOnlyPosition2D({}, { nowMs }), /array/);
assert.throws(() => solveRangeOnlyPosition2D([], {}), /nowMs/);
console.log('Range-only multilateration contract passed: 11 scenarios.');