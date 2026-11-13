import assert from 'node:assert/strict';
import { buildOperationalRuntime } from '../src/lib/operationalRuntime.js';

const cases = [
  {
    name: 'client claims cannot validate Wi-Fi RTT',
    input: { evidence: ['WIFI_RTT'], validation: { validatedCapabilities: ['wifi-rtt-range'] } },
    id: 'wifi-rtt-range',
  },
  {
    name: 'client claims cannot validate depth mapping',
    input: { evidence: ['AR_DEPTH'], validation: { validatedCapabilities: ['depth-mapping'] } },
    id: 'depth-mapping',
  },
  {
    name: 'client claims cannot validate thermal mapping',
    input: { evidence: ['THERMAL'], validation: { validatedCapabilities: ['thermal-mapping'] } },
    id: 'thermal-mapping',
  },
  {
    name: 'client claims cannot validate mmWave',
    input: { evidence: ['MMWAVE'], validation: { validatedCapabilities: ['mmwave-range-motion'] } },
    id: 'mmwave-range-motion',
  },
];

for (const item of cases) {
  const runtime = buildOperationalRuntime(item.input);
  const state = runtime.capabilityState[item.id];
  assert.equal(state.validationPassed, false, item.name);
  assert.equal(state.operational, false, item.name);
  assert.equal(state.validationClaimIgnored, true, item.name);
}

const ordinaryVisual = buildOperationalRuntime({ evidence: ['CAMERA'] });
assert.equal(ordinaryVisual.capabilityState['visual-detection'].operational, true);
assert.equal(ordinaryVisual.capabilityState['visual-detection'].validationPassed, false);

const experimentalVisible = buildOperationalRuntime({ evidence: ['MMWAVE'] });
assert.equal(experimentalVisible.advancedEvidencePresent, true);
assert.equal(experimentalVisible.safeToExposeAdvancedSensing, false);

console.log('Operational runtime trust-gate regression checks passed.');
