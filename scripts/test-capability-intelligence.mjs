import assert from 'node:assert/strict';
import { CAPABILITIES, getCapability, normalizeNetworkSnapshot, correlateAcrossPositions } from '../src/lib/capabilityIntelligence.js';

assert.ok(CAPABILITIES.length >= 10);
assert.equal(getCapability('WIFI.NETWORK.BSSID').family, 'WIFI');
assert.equal(getCapability('NOT.A.REAL.CAPABILITY'), null);

const normalized = normalizeNetworkSnapshot({
  bluetooth: { observations: [{ serviceUuids: ['00001809-0000-1000-8000-00805f9b34fb'], manufacturerIds: [76], rssiDbm: -72, classification: 'POSSIBLE_SENSOR' }] },
  wifi: { status: 'AVAILABLE', networks: [{ bssid: 'aa:bb:cc:dd:ee:ff', ssid: 'Station-Network', rssiDbm: -61, frequencyMhz: 5180, ageMs: 1000, timestampMicros: 123456 }] },
  cellular: { status: 'AVAILABLE', operatorCode: '310260', cells: [{ cellId: '12345', technology: 'LTE', registered: true, signalDbm: -97, ageMs: 2000, timestampNanos: 123456789 }] }
}, { receivedAt: Date.now(), position: { latitude: 37, longitude: -92 }, positionAccuracyM: 8, deviceId: 'test-device' });

assert.equal(normalized.observations.find((o) => o.capabilityId === 'WIFI.SIGNAL.RSSI').value, -61);
assert.equal(normalized.observations.find((o) => o.capabilityId === 'CELLULAR.SIGNAL.DBM').value, -97);
assert.equal(normalized.observations.every((o) => o.integrityState === 'UNASSESSED'), true);
assert.ok(normalized.observations.some((o) => o.capabilityId === 'BLUETOOTH.SERVICE.UUID' && o.value === '00001809-0000-1000-8000-00805f9b34fb'));
assert.ok(normalized.observations.some((o) => o.capabilityId === 'BLUETOOTH.MANUFACTURER.ID' && o.value === 76));
assert.equal(normalizeNetworkSnapshot({ wifi: { networks: [{ bssid: 'aa', ageMs: null }] } }).observations[0].state, 'UNKNOWN');

const now = Date.now();
const make = (id, lat, lon) => ({
  observationId: id, family: 'WIFI', state: 'CURRENT', receivedAt: now,
  position: { latitude: lat, longitude: lon }, positionAccuracyM: 5,
  network: { bssid: 'aa:bb:cc:dd:ee:ff' }
});
const links = correlateAcrossPositions([make('a', 37, -92), make('b', 37.001, -92)]);
assert.equal(links.length, 1);
assert.equal(links[0].evidenceState, 'INFERRED');
assert.equal(correlateAcrossPositions([make('a', 37, -92), { ...make('b', 37.001, -92), positionAccuracyM: 100 }]).length, 0);
assert.equal(correlateAcrossPositions([make('a', 37, -92)]).length, 0);

console.log('Capability registry, observation normalization, and spatial correlation checks passed.');
