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
  if (result.mode !== test.expect) {
    throw new Error(`[${test.name}] expected ${test.expect}, got ${result.mode}`);
  }
}

const experimental = buildOperationalRuntime({
  camera: true,
  mmwave: true,
  evidence: ['CAMERA', 'MMWAVE'],
});
if (experimental.capabilityState['mmwave-range-motion'].operational) {
  throw new Error('Experimental mmWave capability must remain non-operational until validated.');
}

if (experimental.mode === 'FULL_MULTIMODAL') {
  throw new Error('Unvalidated experimental hardware must not promote the runtime to FULL_MULTIMODAL.');
}

const validatedSpatial = buildOperationalRuntime({
  camera: true,
  imu: true,
  wifiRtt: true,
  evidence: ['CAMERA', 'IMU', 'WIFI_RTT'],
  validation: { validatedCapabilities: ['wifi-rtt-range'] },
});
if (validatedSpatial.mode !== 'FULL_MULTIMODAL') {
  throw new Error('A capability with eligible evidence and an explicit validation gate should enable FULL_MULTIMODAL.');
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

console.log('WaveRadar operational runtime checks: PASS');
