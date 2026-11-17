import assert from 'node:assert/strict';
import { prepareSceneReplay, buildSceneSnapshot, projectSceneView, normalizeSceneEvent } from '../src/lib/sceneReplay.js';

const t0 = Date.parse('2026-11-17T12:00:00.000Z');
const events = [
  { eventId:'e2', incidentId:'inc-1', eventType:'ENTITY_UPSERT', capturedAt:t0+2000, sequence:2, evidenceClass:'MEASURED', sourceId:'imu-1', entity:{entityId:'responder-object-1',entityType:'RESPONDER_MARKER',position:{x:2,y:0,z:3,coordinateFrame:'building-local-v1',floorId:'floor-1',alignmentState:'ALIGNED'},evidenceRefs:['ev-2']} },
  { eventId:'e1', incidentId:'inc-1', eventType:'ENTITY_UPSERT', capturedAt:t0, sequence:1, evidenceClass:'MEASURED', sourceId:'camera-1', entity:{entityId:'hazard-1',entityType:'HAZARD_MARKER',position:{x:1,y:0,z:1,coordinateFrame:'building-local-v1',floorId:'floor-1',alignmentState:'ALIGNED'},confidence:0.7,uncertaintyM:1.2} },
  { eventId:'e3', incidentId:'inc-1', eventType:'EVIDENCE_LINK', capturedAt:t0+2500, sequence:3, entityId:'hazard-1', evidenceRef:'ev-3' },
  { eventId:'e4', incidentId:'inc-1', eventType:'ENTITY_REMOVE', capturedAt:t0+4000, sequence:4, entityId:'responder-object-1' },
  { eventId:'bad-time', incidentId:'inc-1', eventType:'ENTITY_UPSERT', capturedAt:null, entity:{entityId:'ghost',entityType:'UNKNOWN'} },
  { eventId:'bad-incident', eventType:'ENTITY_REMOVE', capturedAt:t0, entityId:'x' }
];
const replay = prepareSceneReplay(events,{incidentId:'inc-1'});
assert.equal(replay.eventCount,4);
assert.equal(replay.quarantined.length,1);
assert.deepEqual(replay.events.map(e=>e.eventId),['e1','e2','e3','e4']);
const early = buildSceneSnapshot(replay,t0+1000);
assert.equal(early.entities.length,1);
assert.equal(early.entities[0].entityId,'hazard-1');
const later = buildSceneSnapshot(replay,t0+3000);
assert.equal(later.entities.length,2);
assert.deepEqual(later.entities.find(e=>e.entityId==='hazard-1').evidenceRefs,['ev-3']);
const final = buildSceneSnapshot(replay,t0+5000);
assert.equal(final.entities.length,1);
const chief = projectSceneView(later);
const helmet = projectSceneView(later,{allowedEntityTypes:['HAZARD_MARKER','RESPONDER_MARKER']});
assert.equal(chief.synchronizationKey,helmet.synchronizationKey);
assert.deepEqual(chief.appliedEventIds,helmet.appliedEventIds);
assert.equal(normalizeSceneEvent({...events[0],capturedAt:null}).accepted,false);
assert.equal(buildSceneSnapshot(replay,null).state,'TIME_UNAVAILABLE');
assert.equal(replay.physicalAccuracy,'NOT_ESTABLISHED');
console.log('WaveRadar scene replay determinism tests: PASS');
