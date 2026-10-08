/**
 * WaveRadar Canonical Data Contract
 *
 * Single semantic contract for observations, derived values, predictions,
 * hazards, tracks, federation packets, and future sensor modalities.
 *
 * Design rule:
 *   availability != measurement != derivation != inference != prediction
 *
 * This module is deliberately dependency-free so every surface can use the
 * same normalization rules without introducing a second data store.
 */

export const DATA_CONTRACT_VERSION = 'waveradar-data-contract-v1.0';

export const EVIDENCE_CLASS = Object.freeze({
  MEASURED: 'MEASURED',
  DERIVED: 'DERIVED',
  INFERRED: 'INFERRED',
  PREDICTED: 'PREDICTED',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  GROUND_TRUTH: 'GROUND_TRUTH_OPERATOR_MARKER',
  FEDERATED_MEASURED: 'FEDERATED_MEASURED',
  CONFLICT: 'CONFLICT',
  UNKNOWN: 'UNKNOWN',
});

export const DATA_STATE = Object.freeze({
  CURRENT: 'CURRENT',
  STALE: 'STALE',
  HISTORICAL: 'HISTORICAL',
  QUARANTINED: 'QUARANTINED',
  CONFLICT: 'CONFLICT',
  UNVALIDATED: 'UNVALIDATED',
  UNKNOWN: 'UNKNOWN',
});

export const SENSOR_FAMILY = Object.freeze({
  CAMERA: 'CAMERA',
  IMU: 'IMU',
  GNSS: 'GNSS',
  BAROMETER: 'BAROMETER',
  LIGHT: 'LIGHT',
  PROXIMITY: 'PROXIMITY',
  MICROPHONE: 'MICROPHONE',
  WIFI: 'WIFI',
  WIFI_RTT: 'WIFI_RTT',
  BLUETOOTH: 'BLUETOOTH',
  UWB: 'UWB',
  AR_DEPTH: 'AR_DEPTH',
  THERMAL: 'THERMAL',
  MMWAVE: 'MMWAVE',
  PHYSIOLOGY: 'PHYSIOLOGY',
  EXTERNAL_RANGING: 'EXTERNAL_RANGING',
  OPERATOR: 'OPERATOR',
  MODEL: 'MODEL',
});

const MODALITY_REGISTRY = Object.freeze({
  CAMERA: { family: SENSOR_FAMILY.CAMERA, direct: true, spatial: true, supports: ['detection','bbox','pose'] },
  IMU: { family: SENSOR_FAMILY.IMU, direct: true, spatial: false, supports: ['motion','orientation'] },
  GNSS: { family: SENSOR_FAMILY.GNSS, direct: true, spatial: true, supports: ['position'] },
  BAROMETER: { family: SENSOR_FAMILY.BAROMETER, direct: true, spatial: false, supports: ['altitude','pressure'] },
  LIGHT: { family: SENSOR_FAMILY.LIGHT, direct: true, spatial: false, supports: ['ambient_light'] },
  PROXIMITY: { family: SENSOR_FAMILY.PROXIMITY, direct: true, spatial: false, supports: ['proximity'] },
  MICROPHONE: { family: SENSOR_FAMILY.MICROPHONE, direct: true, spatial: false, supports: ['acoustic'] },
  WIFI: { family: SENSOR_FAMILY.WIFI, direct: true, spatial: false, supports: ['network_context'] },
  WIFI_RTT: { family: SENSOR_FAMILY.WIFI_RTT, direct: true, spatial: true, supports: ['range'] },
  BLUETOOTH: { family: SENSOR_FAMILY.BLUETOOTH, direct: true, spatial: false, supports: ['proximity','network_context'] },
  UWB: { family: SENSOR_FAMILY.UWB, direct: true, spatial: true, supports: ['range','bearing'] },
  AR_DEPTH: { family: SENSOR_FAMILY.AR_DEPTH, direct: true, spatial: true, supports: ['depth','surface'] },
  THERMAL: { family: SENSOR_FAMILY.THERMAL, direct: true, spatial: true, supports: ['thermal_field'] },
  MMWAVE: { family: SENSOR_FAMILY.MMWAVE, direct: true, spatial: true, supports: ['range','motion'] },
  PHYSIOLOGY: { family: SENSOR_FAMILY.PHYSIOLOGY, direct: true, spatial: false, supports: ['heart_rate','respiration','other_biometrics'] },
  EXTERNAL_RANGING: { family: SENSOR_FAMILY.EXTERNAL_RANGING, direct: true, spatial: true, supports: ['range','bearing'] },
  OPERATOR: { family: SENSOR_FAMILY.OPERATOR, direct: false, spatial: false, supports: ['ground_truth'] },
  MODEL: { family: SENSOR_FAMILY.MODEL, direct: false, spatial: true, supports: ['derivation','inference','prediction'] },
});

const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const text = (v, fallback = null) => v == null || v === '' ? fallback : String(v);

export function getModalityDefinition(modality) {
  const key = String(modality || '').toUpperCase();
  return MODALITY_REGISTRY[key] || {
    family: SENSOR_FAMILY.MODEL,
    direct: false,
    spatial: false,
    supports: [],
    unknownModality: true,
  };
}

export function normalizeEvidenceClass(value, fallback = EVIDENCE_CLASS.UNKNOWN) {
  const raw = String(value || '').toUpperCase().trim();
  const aliases = {
    GROUND_TRUTH: EVIDENCE_CLASS.GROUND_TRUTH,
    GROUND_TRUTH_OPERATOR_MARKER: EVIDENCE_CLASS.GROUND_TRUTH,
    FEDERATED: EVIDENCE_CLASS.FEDERATED_MEASURED,
    FEDERATED_MEASURED: EVIDENCE_CLASS.FEDERATED_MEASURED,
    ENVIRONMENTAL: EVIDENCE_CLASS.ENVIRONMENTAL,
    INFERENCE: EVIDENCE_CLASS.INFERRED,
    INFERRED: EVIDENCE_CLASS.INFERRED,
    PREDICTION: EVIDENCE_CLASS.PREDICTED,
    PREDICTED: EVIDENCE_CLASS.PREDICTED,
    DERIVED: EVIDENCE_CLASS.DERIVED,
    MEASURED: EVIDENCE_CLASS.MEASURED,
    CONFLICT: EVIDENCE_CLASS.CONFLICT,
    UNKNOWN: EVIDENCE_CLASS.UNKNOWN,
  };
  return aliases[raw] || fallback;
}

export function normalizeObservation(input = {}, context = {}) {
  const source = input || {};
  const timestamp = finite(source.observedAt ?? source.measuredAt ?? source.timestamp ?? context.timestamp) ?? Date.now();
  const modality = text(source.modality ?? source.sensorType ?? source.sensorFamily ?? context.modality, 'UNKNOWN');
  const modalityDef = getModalityDefinition(modality);
  const evidenceClass = normalizeEvidenceClass(source.evidenceClass ?? source.evidence_class, modalityDef.direct ? EVIDENCE_CLASS.MEASURED : EVIDENCE_CLASS.UNKNOWN);
  const id = text(source.eventId ?? source.observationId ?? source.id) ||
    `obs-${text(context.sessionId, 'session')}-${timestamp}-${text(source.trackId, 'untracked')}`;
  const confidence = finite(source.confidence);
  const uncertaintyM = finite(source.uncertaintyM ?? source.uncertainty);
  const ageMs = finite(source.ageMs ?? context.now) == null ? null : Math.max(0, (finite(context.now) ?? Date.now()) - timestamp);

  return {
    ...source,
    schemaVersion: DATA_CONTRACT_VERSION,
    eventId: id,
    observationId: text(source.observationId, id),
    sessionId: text(source.sessionId ?? context.sessionId),
    deviceId: text(source.deviceId ?? source.provenance?.deviceId ?? context.deviceId),
    source: text(source.source ?? source.sensorType ?? modality, 'UNKNOWN'),
    modality,
    sensorFamily: text(source.sensorFamily, modalityDef.family),
    observedAt: new Date(timestamp).toISOString(),
    timestamp,
    evidenceClass,
    state: normalizeState(source, { ageMs, now: context.now }),
    confidence: confidence == null ? null : Math.max(0, Math.min(1, confidence)),
    uncertaintyM,
    ageMs,
    provenance: {
      ...(source.provenance || {}),
      source: text(source.provenance?.source ?? source.source, 'UNKNOWN'),
      modality,
      contractVersion: DATA_CONTRACT_VERSION,
    },
  };
}

export function normalizeState(source = {}, { ageMs = null, now = Date.now(), staleMs = 5000 } = {}) {
  const explicit = String(source.state || '').toUpperCase();
  if (Object.values(DATA_STATE).includes(explicit)) return explicit;
  const observedAt = finite(source.observedAt ?? source.measuredAt ?? source.timestamp);
  if (source.quarantined) return DATA_STATE.QUARANTINED;
  if (source.conflict || source.disagreement || source.sensorConflict) return DATA_STATE.CONFLICT;
  if (observedAt != null && now - observedAt > staleMs) return DATA_STATE.STALE;
  if (observedAt != null) return DATA_STATE.CURRENT;
  return DATA_STATE.UNKNOWN;
}

export function normalizeDetection(input = {}, context = {}) {
  const observation = normalizeObservation({
    ...input,
    modality: input.modality || input.sensorFamily || (String(input.source || '').toLowerCase().includes('camera') ? 'CAMERA' : input.sensorType),
  }, context);
  const bbox = input.bbox || input.boundingBox || null;
  return {
    ...observation,
    kind: 'DETECTION',
    trackId: text(input.trackId ?? input.id),
    type: text(input.type ?? input.className ?? input.class ?? input.label, 'unknown'),
    position: input.position || null,
    distanceM: finite(input.distanceM ?? input.distance),
    angleDeg: finite(input.angleDeg ?? input.angle),
    speedMps: finite(input.speedMps ?? input.speed),
    headingDeg: finite(input.headingDeg),
    moving: typeof input.moving === 'boolean' ? input.moving : null,
    bbox: bbox ? {
      x: finite(bbox.x) ?? 0, y: finite(bbox.y) ?? 0,
      width: finite(bbox.width) ?? 0, height: finite(bbox.height) ?? 0,
    } : null,
    attributes: { ...(input.attributes || {}) },
  };
}

export function normalizePrediction(input = {}, context = {}) {
  const base = normalizeObservation({
    ...input,
    modality: 'MODEL',
    evidenceClass: EVIDENCE_CLASS.PREDICTED,
  }, context);
  return {
    ...base,
    kind: 'PREDICTION',
    trackId: text(input.trackId ?? input.id),
    horizonMs: finite(input.horizonMs ?? (finite(input.horizonSec) != null ? Number(input.horizonSec) * 1000 : null)),
    position: input.position || input.currentPosition || null,
    predictionModel: text(input.modelVersion ?? input.predictionModel, 'UNKNOWN'),
  };
}

export function normalizeHazard(input = {}, context = {}) {
  return normalizeObservation({
    ...input,
    modality: input.modality || 'MODEL',
    evidenceClass: input.evidenceClass || (input.validated ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN),
  }, context);
}

function stableKey(item) {
  return text(item?.eventId ?? item?.observationId ?? item?.id) ||
    [item?.deviceId, item?.sensorFamily, item?.timestamp, item?.trackId, item?.type].map(v => text(v, '')).join('|');
}

export function mergeObservations(streams = [], context = {}) {
  const byKey = new Map();
  for (const stream of Array.isArray(streams) ? streams : []) {
    for (const item of Array.isArray(stream) ? stream : []) {
      if (!item) continue;
      const normalized = normalizeObservation(item, context);
      const key = stableKey(normalized);
      const prior = byKey.get(key);
      if (!prior) {
        byKey.set(key, normalized);
        continue;
      }
      // Merge metadata without allowing a weaker stream to overwrite measured data.
      const priority = {
        [EVIDENCE_CLASS.MEASURED]: 6,
        [EVIDENCE_CLASS.FEDERATED_MEASURED]: 5,
        [EVIDENCE_CLASS.GROUND_TRUTH]: 5,
        [EVIDENCE_CLASS.DERIVED]: 4,
        [EVIDENCE_CLASS.INFERRED]: 3,
        [EVIDENCE_CLASS.PREDICTED]: 2,
        [EVIDENCE_CLASS.ENVIRONMENTAL]: 1,
        [EVIDENCE_CLASS.UNKNOWN]: 0,
        [EVIDENCE_CLASS.CONFLICT]: -1,
      };
      const a = priority[prior.evidenceClass] ?? 0;
      const b = priority[normalized.evidenceClass] ?? 0;
      const winner = b > a ? normalized : prior;
      const loser = winner === normalized ? prior : normalized;
      byKey.set(key, {
        ...loser,
        ...winner,
        provenance: {
          ...(loser.provenance || {}),
          ...(winner.provenance || {}),
          mergedSources: [...new Set([
            ...(loser.provenance?.mergedSources || []),
            loser.source, winner.source,
          ].filter(Boolean))],
        },
        conflict: Boolean(prior.conflict || normalized.conflict ||
          (prior.distanceM != null && normalized.distanceM != null && Math.abs(prior.distanceM - normalized.distanceM) > Math.max(1, prior.distanceM * 0.3))),
      });
    }
  }
  return [...byKey.values()].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

export function auditDataCompleteness(item = {}, { required = [], expectedByModality = true } = {}) {
  const missing = [];
  const warnings = [];
  for (const field of required) if (item[field] == null || item[field] === '') missing.push(field);

  const modality = getModalityDefinition(item.modality ?? item.sensorFamily);
  if (expectedByModality) {
    if (!item.eventId) missing.push('eventId');
    if (!item.observedAt && item.timestamp == null) missing.push('observedAt');
    if (!item.evidenceClass) missing.push('evidenceClass');
    if (modality.direct && !item.provenance) warnings.push('provenance');
    if (item.confidence == null) warnings.push('confidence');
    if (item.uncertaintyM == null && modality.spatial) warnings.push('uncertaintyM');
  }
  return {
    complete: missing.length === 0,
    missing: [...new Set(missing)],
    warnings: [...new Set(warnings)],
    modality: modality.family,
    contractVersion: DATA_CONTRACT_VERSION,
  };
}

export function buildDataEnvelope({
  sessionId = null, deviceId = null, observations = [], derived = [], inferences = [], predictions = [], hazards = [], groundTruth = [], metadata = {},
} = {}) {
  const context = { sessionId, deviceId };
  const measured = mergeObservations([observations], context);
  const derivedRows = mergeObservations([derived], context).map(v => ({ ...v, evidenceClass: EVIDENCE_CLASS.DERIVED }));
  const inferenceRows = mergeObservations([inferences], context).map(v => ({ ...v, evidenceClass: EVIDENCE_CLASS.INFERRED }));
  const predictionRows = (Array.isArray(predictions) ? predictions : []).map(v => normalizePrediction(v, context));
  const hazardRows = (Array.isArray(hazards) ? hazards : []).map(v => normalizeHazard(v, context));
  const gtRows = mergeObservations([groundTruth], context).map(v => ({ ...v, evidenceClass: EVIDENCE_CLASS.GROUND_TRUTH }));
  return {
    schemaVersion: DATA_CONTRACT_VERSION,
    sessionId,
    deviceId,
    generatedAt: new Date().toISOString(),
    metadata,
    streams: {
      measured,
      derived: derivedRows,
      inferred: inferenceRows,
      predicted: predictionRows,
      hazards: hazardRows,
      groundTruth: gtRows,
    },
    counts: {
      measured: measured.length,
      derived: derivedRows.length,
      inferred: inferenceRows.length,
      predicted: predictionRows.length,
      hazards: hazardRows.length,
      groundTruth: gtRows.length,
    },
    policy: {
      measuredCannotBecomeInferredByMerge: true,
      inferredCannotBecomeMeasured: true,
      predictedCannotBecomeMeasured: true,
      capabilityDoesNotEqualValidation: true,
      unknownRemainsUnknown: true,
      conflictsAreRetained: true,
    },
  };
}

export const MODALITIES = MODALITY_REGISTRY;
