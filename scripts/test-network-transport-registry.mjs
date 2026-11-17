import assert from 'node:assert/strict';
import { normalizeTransportReport, selectEligibleTransport, buildConnectivitySnapshot } from '../src/lib/connectivity/transportRegistry.js';
const nowMs = Date.parse('2026-11-17T21:00:00.000Z');
const base = {
  transportId: 'wifi-0', kind: 'WIFI', supported: true, authorized: true, permissionGranted: true,
  configured: true, linkState: 'CONNECTED', observedAt: nowMs, signalQuality: 0.8, packetLossPct: 0,
  latencyMs: 12, encrypted: true, authenticatedPeer: true, acknowledgementSupported: true,
  operationalUseValidated: false, supportedMessageClasses: ['telemetry','status']
};
assert.equal(normalizeTransportReport(null, { nowMs }).state, 'UNKNOWN');
assert.equal(normalizeTransportReport(base, { nowMs }).state, 'CONNECTED');
assert.equal(normalizeTransportReport({...base,supported:false}, {nowMs}).state, 'UNAVAILABLE');
assert.equal(normalizeTransportReport({...base,permissionGranted:false}, {nowMs}).state, 'UNAUTHORIZED');
assert.equal(normalizeTransportReport({...base,configured:false}, {nowMs}).state, 'NOT_CONFIGURED');
assert.equal(normalizeTransportReport({...base,linkState:'DISCONNECTED'}, {nowMs}).state, 'DISCONNECTED');
assert.equal(normalizeTransportReport({...base,observedAt:nowMs-20000}, {nowMs}).state, 'STALE');
assert.equal(normalizeTransportReport({...base,observedAt:null}, {nowMs}).state, 'STALE');
assert.equal(normalizeTransportReport({...base,packetLossPct:20}, {nowMs}).state, 'DEGRADED');
assert.equal(selectEligibleTransport([base],{preferenceOrder:['wifi-0'],messageClass:'telemetry'},{nowMs}).selectedTransportId,'wifi-0');
assert.equal(selectEligibleTransport([base],{preferenceOrder:['wifi-0'],messageClass:'voice'},{nowMs}).selectedTransportId,null);
assert.equal(selectEligibleTransport([base],{preferenceOrder:['wifi-0'],messageClass:'status',safetyCritical:true},{nowMs}).selectedTransportId,null);
assert.equal(selectEligibleTransport([{...base,operationalUseValidated:true}],{preferenceOrder:['wifi-0'],messageClass:'status',safetyCritical:true},{nowMs}).selectedTransportId,'wifi-0');
const snapshot=buildConnectivitySnapshot([base,{...base,transportId:'old',observedAt:nowMs-30000}],{nowMs});
assert.equal(snapshot.connectedCount,1);
assert.equal(snapshot.unknownCount,1);
assert.equal(snapshot.operationalReadiness,'NOT_ESTABLISHED');
console.log('WaveRadar transport registry tests: PASS');
