/**
 * Event-sourced incident scene reconstruction.
 * Raw evidence is immutable input; this module builds deterministic replay state.
 * It does not infer missing geometry, identities, timestamps or sensor coverage.
 */
import { parseTimestamp, normalizeEvidenceClass } from './dataContract.js';

export const SCENE_EVENT_TYPES = Object.freeze([
  'ENTITY_UPSERT',
  'ENTITY_REMOVE',
  'EVIDENCE_LINK',
  'SCENE_METADATA'
]);

const finite = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;

function normalizePosition(position) {
  if (!position || typeof position !== 'object') return null;
  const x = finite(position.x), y = finite(position.y), z = finite(position.z);
  if (x == null || y == null || z == null) return null;
  return {
    x, y, z,
    coordinateFrame: text(position.coordinateFrame),
    floorId: text(position.floorId),
    alignmentState: position.alignmentState === 'ALIGNED' ? 'ALIGNED' : 'UNVERIFIED'
  };
}

export function normalizeSceneEvent(input, arrivalIndex = 0) {
  const event = input && typeof input === 'object' ? input : {};
  const eventType = SCENE_EVENT_TYPES.includes(event.eventType) ? event.eventType : null;
  const eventId = text(event.eventId);
  const capturedAt = parseTimestamp(event.capturedAt ?? event.observedAt ?? event.timestamp);
  const sequence = finite(event.sequence);
  const base = {
    eventId,
    eventType,
    capturedAt,
    sequence,
    arrivalIndex,
    incidentId: text(event.incidentId),
    sourceId: text(event.sourceId),
    evidenceClass: normalizeEvidenceClass(event.evidenceClass, 'UNKNOWN'),
    provenance: event.provenance && typeof event.provenance === 'object' ? { ...event.provenance } : null
  };
  if (!eventId || !eventType || capturedAt == null || !base.incidentId) {
    return { ...base, accepted: false, quarantineReason: !eventId ? 'EVENT_ID_MISSING'
      : !eventType ? 'UNSUPPORTED_EVENT_TYPE'
      : capturedAt == null ? 'CAPTURE_TIME_UNKNOWN_OR_INVALID'
      : 'INCIDENT_ID_MISSING' };
  }
  if (eventType === 'ENTITY_UPSERT') {
    const entity = event.entity && typeof event.entity === 'object' ? event.entity : {};
    const entityId = text(entity.entityId);
    const entityType = text(entity.entityType);
    if (!entityId || !entityType) return { ...base, accepted: false, quarantineReason: 'ENTITY_ID_OR_TYPE_MISSING' };
    return {
      ...base, accepted: true, entity: {
        ...entity,
        entityId,
        entityType,
        position: normalizePosition(entity.position),
        evidenceClass: normalizeEvidenceClass(entity.evidenceClass ?? event.evidenceClass, 'UNKNOWN'),
        confidence: finite(entity.confidence) == null ? null : Math.max(0, Math.min(1, finite(entity.confidence))),
        uncertaintyM: finite(entity.uncertaintyM),
        sourceId: text(entity.sourceId ?? event.sourceId),
        evidenceRefs: Array.isArray(entity.evidenceRefs) ? [...new Set(entity.evidenceRefs.filter(v => typeof v === 'string' && v.trim()))] : []
      }
    };
  }
  if (eventType === 'ENTITY_REMOVE' && !text(event.entityId)) {
    return { ...base, accepted: false, quarantineReason: 'ENTITY_ID_MISSING' };
  }
  if (eventType === 'EVIDENCE_LINK' && (!text(event.entityId) || !text(event.evidenceRef))) {
    return { ...base, accepted: false, quarantineReason: 'ENTITY_OR_EVIDENCE_REFERENCE_MISSING' };
  }
  return { ...base, accepted: true, entityId: text(event.entityId), evidenceRef: text(event.evidenceRef), metadata: event.metadata ?? null };
}

function compareEvents(a, b) {
  return a.capturedAt - b.capturedAt
    || (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER)
    || a.arrivalIndex - b.arrivalIndex
    || a.eventId.localeCompare(b.eventId);
}

export function prepareSceneReplay(rawEvents, options = {}) {
  const incidentId = text(options.incidentId);
  const normalized = (Array.isArray(rawEvents) ? rawEvents : []).map(normalizeSceneEvent);
  const matching = normalized.filter(event => !incidentId || event.incidentId === incidentId);
  const accepted = matching.filter(event => event.accepted).sort(compareEvents);
  const quarantined = matching.filter(event => !event.accepted);
  return {
    incidentId,
    events: accepted,
    quarantined,
    eventCount: accepted.length,
    timeRange: accepted.length ? { start: accepted[0].capturedAt, end: accepted[accepted.length - 1].capturedAt } : null,
    replayIntegrity: 'DETERMINISTIC_ORDERING_ONLY',
    physicalAccuracy: 'NOT_ESTABLISHED'
  };
}

export function buildSceneSnapshot(replay, cursorMs) {
  const cursor = parseTimestamp(cursorMs);
  const entities = new Map();
  const evidenceLinks = new Map();
  const appliedEventIds = [];
  const metadata = {};
  if (cursor == null) {
    return { cursorMs: null, entities: [], evidenceLinks: [], appliedEventIds, metadata, state: 'TIME_UNAVAILABLE', quarantinedCount: replay?.quarantined?.length ?? 0 };
  }
  for (const event of replay?.events ?? []) {
    if (event.capturedAt > cursor) break;
    appliedEventIds.push(event.eventId);
    if (event.eventType === 'ENTITY_UPSERT') {
      entities.set(event.entity.entityId, { ...event.entity, lastEventId: event.eventId, lastUpdatedAt: event.capturedAt });
    } else if (event.eventType === 'ENTITY_REMOVE') {
      entities.delete(event.entityId);
    } else if (event.eventType === 'EVIDENCE_LINK') {
      const refs = evidenceLinks.get(event.entityId) ?? new Set();
      refs.add(event.evidenceRef);
      evidenceLinks.set(event.entityId, refs);
    } else if (event.eventType === 'SCENE_METADATA') {
      Object.assign(metadata, event.metadata && typeof event.metadata === 'object' ? event.metadata : {});
    }
  }
  const entityList = [...entities.values()].map(entity => ({
    ...entity,
    evidenceRefs: [...new Set([...(entity.evidenceRefs ?? []), ...(evidenceLinks.get(entity.entityId) ?? [])])]
  }));
  return {
    incidentId: replay?.incidentId ?? null,
    cursorMs: cursor,
    entities: entityList,
    evidenceLinks: [...evidenceLinks.entries()].map(([entityId, refs]) => ({ entityId, evidenceRefs: [...refs] })),
    appliedEventIds,
    metadata,
    state: 'RECONSTRUCTED_FROM_ACCEPTED_EVENTS',
    quarantinedCount: replay?.quarantined?.length ?? 0,
    eventCount: replay?.eventCount ?? 0
  };
}

/** Chief and helmet views are projections of the same snapshot, never separate simulations. */
export function projectSceneView(snapshot, options = {}) {
  const floorId = text(options.floorId);
  const allowedTypes = Array.isArray(options.allowedEntityTypes) ? new Set(options.allowedEntityTypes) : null;
  const entities = snapshot.entities.filter(entity => {
    if (floorId && entity.position?.floorId !== floorId) return false;
    if (allowedTypes && !allowedTypes.has(entity.entityType)) return false;
    return true;
  });
  return {
    incidentId: snapshot.incidentId,
    cursorMs: snapshot.cursorMs,
    sourceState: snapshot.state,
    appliedEventIds: snapshot.appliedEventIds,
    entities,
    hiddenEntityCount: snapshot.entities.length - entities.length,
    synchronizationKey: [snapshot.incidentId, snapshot.cursorMs, snapshot.appliedEventIds.join(',')].join('|')
  };
}
