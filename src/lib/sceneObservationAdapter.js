/**
 * Converts existing WaveRadar observations into the canonical incident scene
 * event stream. It never invents timestamps, bearings, positions or identities.
 */
import { normalizeEvidenceClass, parseTimestamp } from './dataContract.js';
import { prepareSceneReplay, buildSceneSnapshot, projectSceneView } from './sceneReplay.js';

const finite = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const clean = value => typeof value === 'string' && value.trim() ? value.trim() : null;

function explicitPosition(value) {
  if (!value || typeof value !== 'object') return null;
  const x = finite(value.x), y = finite(value.y), z = finite(value.z);
  if (x == null || y == null || z == null) return null;
  const coordinateFrame = clean(value.coordinateFrame ?? value.frameId);
  return {
    x, y, z,
    coordinateFrame,
    floorId: clean(value.floorId),
    alignmentState: value.alignmentState === 'ALIGNED' && coordinateFrame ? 'ALIGNED' : 'UNVERIFIED'
  };
}

/**
 * A sensor observation without a registered 3D position remains a valid
 * unlocated observation entity. The renderer must keep it in an unlocated
 * rail rather than placing it at the origin.
 */
export function observationsToSceneEvents(observations, options = {}) {
  const incidentId = clean(options.incidentId);
  const defaultSourceId = clean(options.sourceId);
  const sessionId = clean(options.sessionId);
  const items = Array.isArray(observations) ? observations : [];
  const events = [];
  const rejected = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      rejected.push({ index, reason: 'OBSERVATION_NOT_OBJECT' });
      continue;
    }
    const entityId = clean(item.entityId ?? item.trackId ?? item.targetId ?? item.id);
    if (!entityId) {
      rejected.push({ index, reason: 'STABLE_ENTITY_ID_MISSING' });
      continue;
    }
    const sourceId = clean(item.sourceId ?? item.deviceId ?? item.source) ?? defaultSourceId;
    const capturedAt = parseTimestamp(item.observedAt ?? item.measuredAt ?? item.timestamp);
    const eventId = clean(item.eventId ?? item.observationId) ??
      (capturedAt == null ? null : [incidentId ?? 'incident-unassigned', sourceId ?? 'source-unknown', entityId, capturedAt].join(':'));
    const evidenceClass = normalizeEvidenceClass(item.evidenceClass ?? item.evidence_class, 'UNKNOWN');
    const position = explicitPosition(item.worldPosition ?? item.position);
    const confidence = finite(item.confidence);
    const uncertaintyM = finite(item.uncertaintyM ?? item.uncertainty);
    const evidenceRefs = Array.isArray(item.evidenceRefs)
      ? [...new Set(item.evidenceRefs.filter(value => typeof value === 'string' && value.trim()))]
      : (clean(item.evidenceRef) ? [clean(item.evidenceRef)] : []);
    events.push({
      eventId: eventId ?? `quarantined:${sessionId ?? 'session'}:${index}`,
      incidentId: incidentId ?? clean(item.incidentId),
      eventType: 'ENTITY_UPSERT',
      capturedAt,
      sequence: finite(item.sequence) ?? index,
      sourceId,
      evidenceClass,
      provenance: {
        ...(item.provenance && typeof item.provenance === 'object' ? item.provenance : {}),
        deviceId: clean(item.deviceId),
        modality: clean(item.modality ?? item.sensorType ?? item.sensorFamily),
        sessionId: clean(item.sessionId) ?? sessionId,
        rawObservationId: clean(item.observationId ?? item.eventId),
        ingestion: 'WAVERADAR_OBSERVATION_ADAPTER_V1'
      },
      entity: {
        entityId,
        entityType: clean(item.entityType) ?? 'OBSERVATION_TRACK',
        label: clean(item.displayLabel ?? item.label),
        position,
        spatialRegistration: position?.alignmentState === 'ALIGNED' ? 'ALIGNED' : 'UNREGISTERED',
        coordinateFrame: position?.coordinateFrame ?? null,
        floorId: position?.floorId ?? null,
        evidenceClass,
        confidence: confidence == null ? null : Math.max(0, Math.min(1, confidence)),
        uncertaintyM,
        sourceId,
        evidenceRefs,
        dataState: clean(item.state) ?? 'UNKNOWN',
        modality: clean(item.modality ?? item.sensorType ?? item.sensorFamily),
        measuredValue: item.value ?? null,
        units: clean(item.units ?? item.unit)
      }
    });
  }
  return { events, rejected, acceptedCandidateCount: events.length, rejectedCount: rejected.length };
}

/** Both role projections are generated from one immutable cursor snapshot. */
export function buildSynchronizedSceneViews(rawEvents, options = {}) {
  const replay = prepareSceneReplay(rawEvents, { incidentId: options.incidentId });
  const snapshot = buildSceneSnapshot(replay, options.cursorMs);
  const chief = projectSceneView(snapshot, options.chief ?? {});
  const helmet = projectSceneView(snapshot, options.helmet ?? {});
  return {
    replay,
    snapshot,
    chief,
    helmet,
    synchronized: chief.synchronizationKey === helmet.synchronizationKey,
    unregisteredEntityCount: snapshot.entities.filter(entity => entity.spatialRegistration === 'UNREGISTERED').length,
    quarantinedEventCount: replay.quarantined.length,
    physicalAccuracy: 'NOT_ESTABLISHED'
  };
}
