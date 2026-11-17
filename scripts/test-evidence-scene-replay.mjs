import assert from 'node:assert/strict';
import { createEvidenceLedger } from '../src/lib/evidenceLedger.js';
import { buildSynchronizedEvidenceScene, prepareEvidenceSceneReplay } from '../src/lib/evidenceSceneReplay.js';

const base = '2026-11-17T10:00:00Z';
const ms = value => Date.parse(value);
const ledger = createEvidenceLedger([
  { eventId: 'entity-1', incidentId: 'incident-a', eventType: 'OBSERVATION', sourceId: 'cam-a', capturedAt: ms(base), receivedAt: ms(base) + 100, clockDomain: 'UTC', evidenceClass: 'MEASURED', payload: { sceneEntity: { entityId: 'door-1', entityType: 'DOOR', label: 'Door A' } } },
  { eventId: 'hyp-a', incidentId: 'incident-a', eventType: 'HYPOTHESIS', sourceId: 'model-a', capturedAt: ms(base) + 1000, receivedAt: ms(base) + 1100, clockDomain: 'UTC', evidenceClass: 'INFERRED', hypothesisGroupId: 'room-location', payload: { sceneEntity: { entityId: 'possible-room-a', entityType: 'ROOM_HYPOTHESIS', position: { x: 1, y: 2, z: 0, coordinateFrame: 'building-local', calibrationRef: 'survey-transform-v1', validationRef: 'validation-report-01', validatorId: 'independent-lab-01', units: 'm', transformVersion: 'survey-transform-v1', validationState: 'INDEPENDENTLY_VALIDATED', alignmentState: 'ALIGNED' } }, room: 'A' } },
  { eventId: 'hyp-b', incidentId: 'incident-a', eventType: 'HYPOTHESIS', sourceId: 'model-a', capturedAt: ms(base) + 1000, receivedAt: ms(base) + 1100, clockDomain: 'UTC', evidenceClass: 'INFERRED', hypothesisGroupId: 'room-location', payload: { sceneEntity: { entityId: 'possible-room-b', entityType: 'ROOM_HYPOTHESIS' }, room: 'B' } },
  { eventId: 'conflict-1', incidentId: 'incident-a', eventType: 'CONFLICT', sourceId: 'integrity-check', capturedAt: ms(base) + 1500, receivedAt: ms(base) + 1600, clockDomain: 'UTC', evidenceClass: 'CONFLICT', sourceEventIds: ['hyp-a', 'hyp-b'], payload: { reason: 'COMPETING_ROOM_HYPOTHESES' } },
  { eventId: 'late-event', incidentId: 'incident-a', eventType: 'OBSERVATION', sourceId: 'phone-b', capturedAt: ms(base) + 500, receivedAt: ms(base) + 5000, clockDomain: 'UTC', evidenceClass: 'MEASURED', payload: { note: 'arrived later' } },
  { eventId: 'other-clock', incidentId: 'incident-a', eventType: 'OBSERVATION', sourceId: 'phone-c', capturedAt: ms(base) + 2000, receivedAt: ms(base) + 2100, clockDomain: 'ANDROID_ELAPSED_REALTIME_NANOS', evidenceClass: 'MEASURED', payload: {} },
  { eventId: 'untimed', incidentId: 'incident-a', eventType: 'OBSERVATION', sourceId: 'sensor-d', capturedAt: null, receivedAt: ms(base) + 2200, clockDomain: null, evidenceClass: 'UNKNOWN', payload: {} },
  { eventId: 'unknown-receipt', incidentId: 'incident-a', eventType: 'OBSERVATION', sourceId: 'offline-device', capturedAt: ms(base) + 2500, receivedAt: null, clockDomain: 'UTC', evidenceClass: 'MEASURED', payload: {} },
  { eventId: 'other-incident', incidentId: 'incident-b', eventType: 'OBSERVATION', sourceId: 'x', capturedAt: ms(base), receivedAt: ms(base), clockDomain: 'UTC', evidenceClass: 'MEASURED', payload: {} },
]);
assert.throws(() => prepareEvidenceSceneReplay(ledger, { incidentId: 'incident-a' }), /clockDomain is required/);
const replay = prepareEvidenceSceneReplay(ledger, { incidentId: 'incident-a', clockDomain: 'UTC', knowledgeTime: ms(base) + 3000 });
assert.equal(replay.sceneEvents.some(event => event.eventId === 'late-event'), false);
assert.equal(replay.unalignedClockEvents.length, 1);
assert.equal(replay.untimedEvents.length, 1);
const scene = buildSynchronizedEvidenceScene(ledger, {
  incidentId: 'incident-a',
  clockDomain: 'UTC',
  knowledgeTime: ms(base) + 6000,
  cursorMs: ms(base) + 2500,
  command: {},
  helmet: { allowedEntityTypes: ['DOOR', 'ROOM_HYPOTHESIS'] },
});
assert.equal(scene.synchronized, true);
assert.equal(scene.replay.knowledgeTime, ms(base) + 6000);
assert.equal(scene.snapshot.entities.length, 3);
assert.equal(scene.snapshot.entities.find(entity => entity.entityId === 'door-1').spatialRegistration, 'UNREGISTERED');
assert.equal(scene.snapshot.entities.find(entity => entity.entityId === 'possible-room-a').spatialRegistration, 'VALIDATION_REFERENCED');
assert.equal(scene.snapshot.entities.find(entity => entity.entityId === 'possible-room-b').position, null);
assert.equal(scene.snapshot.hypotheses.length, 2);
assert.equal(scene.snapshot.hypothesisGroups[0].eventIds.length, 2);
assert.equal(scene.snapshot.conflicts.length, 1);
assert.equal(scene.command.synchronizationKey, scene.helmet.synchronizationKey);
assert.equal(scene.helmet.entities.length, 3);
assert.equal(scene.command.untimedEvidenceCount, 1);
assert.equal(scene.command.unalignedClockEvidenceCount, 1);
console.log('WaveRadar evidence-ledger scene replay and shared command/helmet projection: PASS');
