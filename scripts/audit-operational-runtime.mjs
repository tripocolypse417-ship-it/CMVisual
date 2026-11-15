import assert from 'node:assert/strict';
import { buildOperationalRuntime } from '../src/lib/operationalRuntime.js';

const cases = [
  {
    name: 'phone camera + imu',
    input: { camera: true, imu: true, evidence: ['CAMERA', 'IMU'] },
    expect: 'CAMERA_IMU',
  },
  {
    name: 'camera + unvalidated experimental sensor',
    input: { camera: true, imu: true, mmwave: true, evidence: ['CAMERA', 'IMU', 'MMWAVE'] },
    expect: 'CAMERA_IMU',
  },
  {
    name: 'no live measurements',
    input: { map: true, evidence: [] },
    expect: 'MAP_2D',
  },
];

for (const test of cases) {
  const result = buildOperationalRuntime(test.input);
  assert.equal(result.mode, test.expect, test.name);
}

const experimentalIds = [
  ['WIFI_RTT', 'wifi-rtt-range'],
  ['AR_DEPTH', 'depth-mapping'],
  ['THERMAL', 'thermal-mapping'],
  ['MMWAVE', 'mmwave-range-motion'],
];

for (const [evidence, id] of experimentalIds) {
  const result = buildOperationalRuntime({
    camera: true,
    mmwave: evidence === 'MMWAVE',
    evidence: ['CAMERA', evidence],
    validation: { validatedCapabilities: [id] },
  });
  const state = result.capabilityState[id];
  assert.equal(state.operational, false, `Client claim must not operationalize ${id}`);
  assert.equal(state.validationPassed, false, `Client claim must not validate ${id}`);
  assert.equal(state.validationClaimIgnored, true, `Client claim should be explicitly ignored for ${id}`);
  assert.notEqual(result.mode, 'FULL_MULTIMODAL', `Unvalidated ${id} must not promote runtime mode`);
}

const stale = buildOperationalRuntime({
  camera: true,
  imu: true,
  evidence: ['CAMERA', 'IMU'],
  measuredCount: 10,
  staleCount: 7,
});
if (stale.integrity !== 'STALE') {
  throw new Error('Stale evidence must be surfaced as STALE.');
}

console.log('WaveRadar operational runtime trust-boundary checks: PASS');
