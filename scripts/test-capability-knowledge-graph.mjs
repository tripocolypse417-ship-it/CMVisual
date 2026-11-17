import assert from 'node:assert/strict';
import { CAPABILITY_KNOWLEDGE, searchCapabilityKnowledge, classifyBleAdvertisement, getCapabilityKnowledge } from '../src/lib/capabilityKnowledgeGraph.js';

assert.ok(CAPABILITY_KNOWLEDGE.length >= 20);
assert.equal(getCapabilityKnowledge('DISCOVERY.MDNS').family, 'LAN_DISCOVERY');
assert.ok(searchCapabilityKnowledge('cellular signal').some(item => item.id === 'RADIO.CELLULAR'));
assert.ok(searchCapabilityKnowledge('Matter fabric').some(item => item.id === 'IOT.MATTER'));
const env = classifyBleAdvertisement({ serviceUuids: ['0000181a-0000-1000-8000-00805f9b34fb'], manufacturerIds: [76] });
assert.equal(env.interpretationState, 'CANDIDATE_ONLY');
assert.ok(env.capabilities.includes('temperature'));
const sensitive = classifyBleAdvertisement({ serviceUuids: ['00001809-0000-1000-8000-00805f9b34fb'] });
assert.equal(sensitive.interpretationState, 'UNKNOWN');
assert.deepEqual(sensitive.capabilities, []);
const unknown = classifyBleAdvertisement({ serviceUuids: ['0000ffff-0000-1000-8000-00805f9b34fb'] });
assert.equal(unknown.classification[0], 'UNCLASSIFIED_ADVERTISEMENT');
console.log('Capability knowledge graph and BLE candidate classification checks passed.');
