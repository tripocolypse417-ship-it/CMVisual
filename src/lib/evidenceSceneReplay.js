/**
 * Incident replay projection over the canonical evidence ledger.
 * It retains untimed, unaligned, conflicting and competing evidence separately.
 * No position, clock alignment, identity or scene object is synthesized.
 */
import { eventsKnownAt } from './evidenceLedger.js';
import { parseTimestamp } from './dataContract.js';

const clean = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const finite = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;

function normalizeSceneEntity(value, event) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entityId = clean(value.entityId);
  const entityType = clean(value.entityType);
  if (!entityId || !entityType) return null;
  const position = value.position && typeof value.position === 'object' ? value.position : null;
  const x = finite(position?.x), y = finite(position?.y), z = finite(position?.z);
  const hasPosition = x != null && y != null && z != null;
  const coordinateFrame = clean(position?.coordinateFrame);
  const calibrationRef = clean(position?.calibrationRef);
  const validationRef = clean(position?.validationRef);
  const validatorId = clean(position?.validatorId);
  const units = clean(position?.units);
  const transformVersion = clean(position?.transformVersion);
  const independentlyValidated = hasPosition && coordinateFrame && calibrationRef && validationRef && validatorId &&
    units === 'm' && transformVersion && position?.alignmentState === 'ALIGNED' &&
    position?.validationState === 'INDEPENDENTLY_VALIDATED';
  return {
    ...value,
    entityId,
    entityType,
    position: hasPosition ? {
      x, y, z,
      coordinateFrame,
      calibrationRef,
      validationRef,
      validatorId,
      units,
      transformVersion,
      validationState: clean(position.validationState) ?? 'UNVERIFIED',
      floorId: clean(position.floorId),
      alignmentState: independentlyValidated ? 'ALIGNED' : 'UNVERIFIED',
    } : null,
    spatialRegistration: independentlyValidated ? 'VALIDATION_REFERENCED' : (hasPosition ? 'CALIBRATION_UNVERIFIED' : 'UNREGISTERED'),
    evidenceClass: event.evidenceClass,
    sourceId: event.sourceId,
    lastEventId: event.eventId,
    capturedAt: event.capturedAt,
  };
}

function compareCapture(a, b) {
  return a.capturedAt - b.capturedAt ||
    (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER) ||
    a.eventId.localeCompare(b.eventId);
}

export function prepareEvidenceSceneReplay(ledger, {
  incidentId,
  knowledgeTime = null,
  clockDomain = null,
} = {}) {
  if (!ledger || !Array.isArray(ledger.events)) throw new TypeError('valid evidence ledger is required');
  const incident = clean(incidentId);
  if (!incident) throw new TypeError('incidentId is required');
  const known = knowledgeTime == null ? ledger.events : eventsKnownAt(ledger, knowledgeTime);
  const allIncidentEvents = ledger.events.filter(event => event.incidentId === incident);
  const incidentEvents = known.filter(event => event.incidentId === incident);
  const unknownReceiptEvents = knowledgeTime == null ? [] : allIncidentEvents.filter(event => event.receivedAt == null);
  const domain = clean(clockDomain);
  const timed = incidentEvents.filter(event => event.capturedAt != null);
  if (timed.length && !domain) throw new TypeError('clockDomain is required for timed scene replay');
  const alignedClockEvents = timed.filter(event => event.clockDomain === domain).slice().sort(compareCapture);
  const unalignedClockEvents = timed.filter(event => event.clockDomain !== domain);
  const untimedEvents = incidentEvents.filter(event => event.capturedAt == null);
  const knowledgeTimeline = incidentEvents.slice().sort((a, b) =>
    (a.receivedAt ?? Number.MAX_SAFE_INTEGER) - (b.receivedAt ?? Number.MAX_SAFE_INTEGER) ||
    (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER) ||
    a.eventId.localeCompare(b.eventId)
  );
  return Object.freeze({
    incidentId: incident,
    knowledgeTime: knowledgeTime == null ? null : parseTimestamp(knowledgeTime),
    clockDomain: domain,
    sceneEvents: alignedClockEvents,
    knowledgeTimeline,
    unalignedClockEvents,
    untimedEvents,
    unknownReceiptEvents,
    replayIntegrity: 'DETERMINISTIC_WITHIN_DECLARED_CLOCK_DOMAIN',
    physicalAccuracy: 'NOT_ESTABLISHED',
  });
}

export function buildEvidenceSceneSnapshot(replay, cursorMs) {
  const cursor = finite(cursorMs);
  if (!replay || !Array.isArray(replay.sceneEvents)) throw new TypeError('valid replay is required');
  if (cursor == null) return {
    incidentId: replay.incidentId, clockDomain: replay.clockDomain, cursorMs: null,
    entities: [], hypotheses: [], conflicts: [], appliedEventIds: [],
    untimedEvents: replay.untimedEvents, unalignedClockEvents: replay.unalignedClockEvents,
    unknownReceiptEvents: replay.unknownReceiptEvents,
    state: 'TIME_UNAVAILABLE', physicalAccuracy: 'NOT_ESTABLISHED',
  };
  const entities = new Map();
  const hypotheses = [];
  const conflicts = [];
  const appliedEventIds = [];
  for (const event of replay.sceneEvents) {
    if (event.capturedAt > cursor) break;
    appliedEventIds.push(event.eventId);
    const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
    const entity = normalizeSceneEntity(payload.sceneEntity, event);
    if (entity) entities.set(entity.entityId, entity);
    if (event.eventType === 'HYPOTHESIS') {
      hypotheses.push({
        eventId: event.eventId,
        groupId: event.hypothesisGroupId,
        status: event.hypothesisStatus,
        evidenceClass: event.evidenceClass,
        sourceId: event.sourceId,
        payload,
        capturedAt: event.capturedAt,
      });
    }
    if (event.eventType === 'CONFLICT') {
      conflicts.push({
        eventId: event.eventId,
        sourceEventIds: event.sourceEventIds,
        payload,
        capturedAt: event.capturedAt,
      });
    }
    if (event.eventType === 'RETRACTION') {
      const targetEntityId = clean(payload.targetEntityId);
      if (targetEntityId) entities.delete(targetEntityId);
    }
  }
  const groups = new Map();
  for (const hypothesis of hypotheses) {
    if (!hypothesis.groupId) continue;
    const members = groups.get(hypothesis.groupId) || [];
    members.push(hypothesis.eventId);
    groups.set(hypothesis.groupId, members);
  }
  return Object.freeze({
    incidentId: replay.incidentId,
    clockDomain: replay.clockDomain,
    cursorMs: cursor,
    entities: [...entities.values()],
    hypotheses,
    hypothesisGroups: [...groups.entries()].map(([groupId, eventIds]) => ({ groupId, eventIds })),
    conflicts,
    appliedEventIds,
    untimedEvents: replay.untimedEvents,
    unalignedClockEvents: replay.unalignedClockEvents,
    unknownReceiptEvents: replay.unknownReceiptEvents,
    state: 'RECONSTRUCTED_FROM_EVIDENCE_LEDGER',
    replayIntegrity: replay.replayIntegrity,
    physicalAccuracy: 'NOT_ESTABLISHED',
  });
}

/** Command and helmet are filtered projections of exactly the same snapshot. */
export function projectEvidenceSceneView(snapshot, options = {}) {
  const allowedTypes = Array.isArray(options.allowedEntityTypes) ? new Set(options.allowedEntityTypes) : null;
  const floorId = clean(options.floorId);
  const entities = snapshot.entities.filter(entity =>
    (!floorId || entity.position?.floorId === floorId) &&
    (!allowedTypes || allowedTypes.has(entity.entityType))
  );
  const synchronizationKey = [
    snapshot.incidentId,
    snapshot.clockDomain,
    snapshot.cursorMs,
    snapshot.appliedEventIds.join(','),
  ].join('|');
  return {
    incidentId: snapshot.incidentId,
    clockDomain: snapshot.clockDomain,
    cursorMs: snapshot.cursorMs,
    synchronizationKey,
    sourceState: snapshot.state,
    appliedEventIds: snapshot.appliedEventIds,
    entities,
    hypotheses: snapshot.hypotheses,
    conflicts: snapshot.conflicts,
    unlocatedEntityCount: snapshot.entities.filter(entity => entity.spatialRegistration !== 'VALIDATION_REFERENCED').length,
    untimedEvidenceCount: snapshot.untimedEvents.length,
    unalignedClockEvidenceCount: snapshot.unalignedClockEvents.length,
    unknownReceiptEvidenceCount: snapshot.unknownReceiptEvents.length,
  };
}

export function buildSynchronizedEvidenceScene(ledger, options = {}) {
  const replay = prepareEvidenceSceneReplay(ledger, options);
  const snapshot = buildEvidenceSceneSnapshot(replay, options.cursorMs);
  const command = projectEvidenceSceneView(snapshot, options.command ?? {});
  const helmet = projectEvidenceSceneView(snapshot, options.helmet ?? {});
  return {
    replay,
    snapshot,
    command,
    helmet,
    synchronized: command.synchronizationKey === helmet.synchronizationKey,
    physicalAccuracy: 'NOT_ESTABLISHED',
  };
}
