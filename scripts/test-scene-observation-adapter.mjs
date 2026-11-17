import assert from 'node:assert/strict';
import { observationsToSceneEvents, buildSynchronizedSceneViews } from '../src/lib/sceneObservationAdapter.js';

const t0 = Date.parse('2026-11-17T12:00:00.000Z');
const result = observationsToSceneEvents([
  { eventId:'obs-1', trackId:'track-1', observedAt:t0, source:'camera-1', modality:'CAMERA', evidenceClass:'MEASURED', position:{x:1,y:0,z:2,coordinateFrame:'building-local-v1',floorId:'f1',alignmentState:'ALIGNED'}, confidence:0.8, uncertaintyM:0.4, evidenceRef:'raw:1' },
  { eventId:'obs-2', trackId:'track-2', observedAt:t0+1000, source:'wifi-rtt-1', modality:'WIFI_RTT', evidenceClass:'MEASURED', distanceM:4.2 },
  { eventId:'bad-time', trackId:'track-3', observedAt:'not-a-time', source:'imu-1' },
  { observedAt:t0, source:'camera-2' },
  null
], { incidentId:'incident-1', sessionId:'session-1' });

assert.equal(result.acceptedCandidateCount, 3);
assert.equal(result.rejectedCount, 2);
assert.equal(result.events[0].entity.position.alignmentState, 'ALIGNED');
assert.equal(result.events[1].entity.position, null);
assert.equal(result.events[1].entity.spatialRegistration, 'UNREGISTERED');
assert.equal(result.events[1].entity.evidenceClass, 'MEASURED');
assert.equal(result.events[2].capturedAt, null);
const views = buildSynchronizedSceneViews(result.events, {
  incidentId:'incident-1',
  cursorMs:t0+2000,
  chief:{},
  helmet:{allowedEntityTypes:['OBSERVATION_TRACK']}
});
assert.equal(views.synchronized, true);
assert.equal(views.snapshot.entities.length, 2);
assert.equal(views.unregisteredEntityCount, 1);
assert.equal(views.quarantinedEventCount, 1);
assert.equal(views.physicalAccuracy, 'NOT_ESTABLISHED');
console.log('WaveRadar sensor-to-scene adapter tests: PASS');
