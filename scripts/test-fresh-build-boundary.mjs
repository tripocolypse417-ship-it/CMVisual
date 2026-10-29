import assert from 'node:assert/strict';
import {
  FRESH_BUILD_GENERATION,
  assessFreshBuildRecord,
  partitionFreshBuildRecords,
} from '../src/lib/freshBuildBoundary.js';

const valid = {
  id: 'new-measurement-1',
  buildGeneration: FRESH_BUILD_GENERATION,
  source: 'android-sensor-manager',
  deviceId: 'device-001',
  observedAt: '2026-10-29T18:00:00.000Z',
  evidenceClass: 'MEASURED',
  integrityVerified: true,
  datasetType: 'live-measurement',
};
assert.equal(assessFreshBuildRecord(valid).eligible, true);

// Old data is rejected even if it has a plausible timestamp and calls itself measured.
const legacy = { ...valid, buildGeneration: undefined, id: 'old-record' };
assert.equal(assessFreshBuildRecord(legacy).eligible, false);
assert.ok(assessFreshBuildRecord(legacy).reasons.includes('NOT_FROM_FRESH_BUILD_GENERATION'));

// Timestamp alone never proves a real measurement.
const noIntegrity = { ...valid, integrityVerified: false, integrity: undefined };
assert.ok(assessFreshBuildRecord(noIntegrity).reasons.includes('INTEGRITY_NOT_VERIFIED'));

// Simulated/demo inputs and predictions cannot enter the trusted measured layer.
for (const source of ['demo-camera', 'simulated-sensor', 'fixture-feed', 'legacy-import']) {
  assert.equal(assessFreshBuildRecord({ ...valid, source }).eligible, false, source);
}
assert.equal(assessFreshBuildRecord({ ...valid, evidenceClass: 'PREDICTED' }).eligible, false);
assert.equal(assessFreshBuildRecord({ ...valid, observedAt: 'not-a-time' }).eligible, false);

// Invalid/empty input remains empty; rejected records are retained for audit.
assert.deepEqual(partitionFreshBuildRecords([]).eligible, []);
const partition = partitionFreshBuildRecords([legacy, valid]);
assert.equal(partition.inputCount, 2);
assert.equal(partition.eligible.length, 1);
assert.equal(partition.quarantined.length, 1);
assert.equal(partition.quarantined[0].id, 'old-record');

console.log('WaveRadar fresh-build zero-trust boundary tests: PASS');
