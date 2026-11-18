import assert from 'node:assert/strict';
import {
  INCIDENT_EVENT_SCHEMA,
  INCIDENT_EVENT_SCHEMA_VERSION,
  analyzeIncidentEventBatch,
  validateIncidentEvent
} from '../src/lib/incidentEventContract.js';

const makeEvent = (overrides = {}) => ({
  schema: INCIDENT_EVENT_SCHEMA,
  schemaVersion: INCIDENT_EVENT_SCHEMA_VERSION,
  eventId: 'event-1',
  incidentId: 'incident-1',
  incidentVersion: 1,
  eventType: 'hazard.observed',
  eventTime: { capturedAt: '2026-11-17T12:00:00.000Z', clockDomain: 'device.elapsedRealtime', receivedAt: '2026-11-17T12:00:01.000Z' },
  source: { sourceId: 'sensor-1', authorizationScope: 'incident:incident-1:write' },
  evidence: { provenance: 'MEASURED', integrity: 'PENDING' },
  payload: { hazardClass: 'HEAT', value: 72, unit: 'C' },
  ...overrides
});

assert.equal(validateIncidentEvent(makeEvent()).valid, true);
assert.equal(validateIncidentEvent(makeEvent({ incidentVersion: 0 })).errors.includes('INCIDENT_VERSION_INVALID'), true);
assert.equal(validateIncidentEvent(makeEvent({ eventTime: { capturedAt: null, clockDomain: 'unknown' } })).valid, true);
assert.equal(validateIncidentEvent(makeEvent({ eventTime: { capturedAt: 'not-a-time', clockDomain: 'wall' } })).errors.includes('CAPTURE_TIME_INVALID'), true);
assert.equal(validateIncidentEvent(makeEvent({ source: { sourceId: 'sensor-1' } })).errors.includes('AUTHORIZATION_SCOPE_REQUIRED'), true);
assert.equal(validateIncidentEvent(makeEvent({ evidence: { provenance: 'PREDICTED', integrity: 'VERIFIED' } })).valid, true);
assert.equal(validateIncidentEvent(makeEvent({ evidence: { provenance: 'MAGIC', integrity: 'VERIFIED' } })).valid, false);
assert.equal(validateIncidentEvent(makeEvent({ payload: { blob: 'x'.repeat(100) } }), { maxPayloadBytes: 32 }).errors.includes('PAYLOAD_TOO_LARGE'), true);
assert.equal(validateIncidentEvent(makeEvent({ deliveryState: 'LOCAL_PENDING', incidentVersion: 1 })).errors.includes('LOCAL_PENDING_MUST_NOT_CLAIM_AUTHORITATIVE_VERSION'), true);

const batch = analyzeIncidentEventBatch([
  makeEvent({ eventId: 'e1', incidentVersion: 1 }),
  makeEvent({ eventId: 'e1', incidentVersion: 1 }),
  makeEvent({ eventId: 'e3', incidentVersion: 3 }),
]);
assert.deepEqual(batch.duplicates, ['e1']);
assert.deepEqual(batch.gaps, [{ after: 1, before: 3 }]);
assert.equal(batch.contiguous, false);

const alteredDuplicate = analyzeIncidentEventBatch([
  makeEvent({ eventId: 'same', incidentVersion: 1, payload: { value: 1 } }),
  makeEvent({ eventId: 'same', incidentVersion: 1, payload: { value: 2 } }),
]);
assert.equal(alteredDuplicate.conflicts[0].reason, 'EVENT_ID_CONTENT_MISMATCH');

const versionCollision = analyzeIncidentEventBatch([
  makeEvent({ eventId: 'one', incidentVersion: 1 }),
  makeEvent({ eventId: 'two', incidentVersion: 1 }),
]);
assert.equal(versionCollision.conflicts.some((item) => item.reason === 'INCIDENT_VERSION_COLLISION'), true);

console.log('WIS incident event contract checks: PASS');
