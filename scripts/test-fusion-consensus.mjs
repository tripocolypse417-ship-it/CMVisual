import assert from 'node:assert/strict';
import { fusePositionObservations } from '../src/lib/fusion/consensus.js';

const nowMs = 10_000;
const observation = (sourceId, x, overrides = {}) => ({
  sourceId,
  evidenceClass: 'MEASURED',
  position: { x, y: 2, z: 0 },
  coordinateFrame: 'building-A/local-v1',
  units: 'm',
  timestampMs: nowMs - 50,
  uncertainty: 0.2,
  ...overrides,
});

const fused = fusePositionObservations([
  observation('uwb-anchor-set', 1.0),
  observation('surveyed-visual-odometry', 1.1, { uncertainty: 0.3 }),
], { nowMs });
assert.equal(fused.status, 'CANDIDATE');
assert.equal(fused.evidenceClass, 'DERIVED');
assert.equal(fused.uncertaintyKind, 'HEURISTIC_NOT_CALIBRATED');
assert.equal(fused.sourceIds.length, 2);
assert.ok(fused.position.x > 1 && fused.position.x < 1.1);
assert.ok(fused.uncertainty > 0);

const blocked = fusePositionObservations([
  observation('source-a', 1),
  observation('source-b', 1.1, { coordinateFrame: 'unknown-frame' }),
], { nowMs });
assert.equal(blocked.status, 'UNAVAILABLE');
assert.equal(blocked.reason, 'INSUFFICIENT_COMPATIBLE_SOURCES');

const stale = fusePositionObservations([
  observation('fresh-a', 1),
  observation('stale-b', 1.1, { timestampMs: nowMs - 5000 }),
], { nowMs, maxAgeMs: 1000 });
assert.equal(stale.status, 'UNAVAILABLE');
assert.ok(stale.rejected.some((item) => item.reason === 'STALE'));

const skewed = fusePositionObservations([
  observation('clock-a', 1),
  observation('clock-b', 1.1, { timestampMs: nowMs - 1000 }),
], { nowMs, maxSkewMs: 100 });
assert.equal(skewed.reason, 'TIME_ALIGNMENT_OUTSIDE_LIMIT');

const duplicate = fusePositionObservations([
  observation('same-source', 1),
  observation('same-source', 1.1),
], { nowMs });
assert.equal(duplicate.status, 'UNAVAILABLE');
assert.ok(duplicate.rejected.some((item) => item.reason === 'DUPLICATE_SOURCE'));

const badEvidence = fusePositionObservations([
  observation('camera-label', 1, { evidenceClass: 'camera' }),
  observation('measured', 1.1),
], { nowMs });
assert.equal(badEvidence.status, 'UNAVAILABLE');
assert.ok(badEvidence.rejected.some((item) => item.reason === 'UNTRUSTED_EVIDENCE_CLASS'));

const outlier = fusePositionObservations([
  observation('source-1', 1),
  observation('source-2', 1.05),
  observation('bad-source', 100),
], { nowMs });
assert.equal(outlier.status, 'CANDIDATE');
assert.ok(outlier.rejected.some((item) => item.sourceId === 'bad-source' && item.reason === 'ROBUST_OUTLIER'));
assert.equal(outlier.sourceIds.length, 2);

assert.throws(() => fusePositionObservations({}, { nowMs }), /array/);
assert.throws(() => fusePositionObservations([], {}), /nowMs/);

console.log('Fusion consensus contract passed: 9 scenarios.');
