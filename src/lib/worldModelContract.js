import { parseTimestamp } from './dataContract.js';

export const WORLD_MODEL_SCHEMA_VERSION = 'waveradar-world-model-v1';

export const WORLD_EVIDENCE_CLASS = Object.freeze({
  MEASURED: 'MEASURED',
  DERIVED: 'DERIVED',
  INFERRED: 'INFERRED',
  PREDICTED: 'PREDICTED',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  GROUND_TRUTH: 'GROUND_TRUTH_OPERATOR_MARKER',
  FEDERATED_MEASURED: 'FEDERATED_MEASURED',
  CONFLICT: 'CONFLICT',
  SIMULATED: 'SIMULATED',
  UNKNOWN: 'UNKNOWN',
  UNAVAILABLE: 'UNAVAILABLE',
});

export const WORLD_OBSERVATION_STATE = Object.freeze({
  CURRENT: 'CURRENT',
  STALE: 'STALE',
  HISTORICAL: 'HISTORICAL',
  QUARANTINED: 'QUARANTINED',
  CONFLICT: 'CONFLICT',
  UNVALIDATED: 'UNVALIDATED',
  UNKNOWN: 'UNKNOWN',
  UNAVAILABLE: 'UNAVAILABLE',
});

const evidenceClasses = new Set(Object.values(WORLD_EVIDENCE_CLASS));
const observationStates = new Set(Object.values(WORLD_OBSERVATION_STATE));
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const finite = value => typeof value === 'number' && Number.isFinite(value);

function validTimestamp(value) {
  return value != null && parseTimestamp(value) != null;
}

/**
 * Validate an observation before it can update the shared World Model.
 * This is an additive gate; it does not mutate the existing canonical contract
 * or silently fill missing timestamps, units, coordinate frames, or provenance.
 */
export function validateWorldObservation(input = {}) {
  const errors = [];
  const warnings = [];
  const value = input && typeof input === 'object' ? input : {};

  if (!nonEmpty(value.eventId)) errors.push('EVENT_ID_REQUIRED');
  if (!nonEmpty(value.sourceId)) errors.push('SOURCE_ID_REQUIRED');
  if (!nonEmpty(value.modality)) errors.push('MODALITY_REQUIRED');
  if (!evidenceClasses.has(value.evidenceClass)) errors.push('EVIDENCE_CLASS_INVALID');
  if (!observationStates.has(value.state)) errors.push('STATE_INVALID');
  if (!validTimestamp(value.receivedAt)) errors.push('RECEIVED_AT_REQUIRED_OR_INVALID');

  if (value.observedAt != null && !validTimestamp(value.observedAt)) {
    errors.push('OBSERVED_AT_INVALID');
  }
  if (value.evidenceClass === WORLD_EVIDENCE_CLASS.UNAVAILABLE) {
    if (value.state !== WORLD_OBSERVATION_STATE.UNAVAILABLE) errors.push('UNAVAILABLE_STATE_REQUIRED');
    if (!nonEmpty(value.unavailableReason)) errors.push('UNAVAILABLE_REASON_REQUIRED');
    if (value.value != null) errors.push('UNAVAILABLE_VALUE_MUST_BE_NULL');
  }
  if (value.state === WORLD_OBSERVATION_STATE.UNAVAILABLE &&
      value.evidenceClass !== WORLD_EVIDENCE_CLASS.UNAVAILABLE) {
    errors.push('UNAVAILABLE_EVIDENCE_CLASS_REQUIRED');
  }
  if ([WORLD_EVIDENCE_CLASS.MEASURED, WORLD_EVIDENCE_CLASS.ENVIRONMENTAL,
    WORLD_EVIDENCE_CLASS.GROUND_TRUTH, WORLD_EVIDENCE_CLASS.FEDERATED_MEASURED].includes(value.evidenceClass) &&
      value.observedAt == null) {
    errors.push('MEASURED_OBSERVED_AT_REQUIRED');
  }
  if (value.evidenceClass === WORLD_EVIDENCE_CLASS.CONFLICT && value.state !== WORLD_OBSERVATION_STATE.CONFLICT) {
    errors.push('CONFLICT_STATE_REQUIRED');
  }
  if (value.evidenceClass === WORLD_EVIDENCE_CLASS.SIMULATED &&
      value.state === WORLD_OBSERVATION_STATE.CURRENT) {
    warnings.push('SIMULATED_DATA_MUST_NOT_BE_PRESENTED_AS_LIVE_MEASUREMENT');
  }
  if (value.confidence != null && (!finite(value.confidence) || value.confidence < 0 || value.confidence > 1)) {
    errors.push('CONFIDENCE_OUT_OF_RANGE');
  }
  if (value.uncertainty != null && (!finite(value.uncertainty) || value.uncertainty < 0)) {
    errors.push('UNCERTAINTY_INVALID');
  }
  if (value.value != null && typeof value.value === 'number' && !nonEmpty(value.unit)) {
    errors.push('NUMERIC_VALUE_UNIT_REQUIRED');
  }
  if (value.coordinateFrame != null && !nonEmpty(value.coordinateFrame)) {
    errors.push('COORDINATE_FRAME_INVALID');
  }
  if (value.spatial === true && !nonEmpty(value.coordinateFrame)) {
    errors.push('SPATIAL_COORDINATE_FRAME_REQUIRED');
  }
  if (!value.provenance || typeof value.provenance !== 'object') {
    errors.push('PROVENANCE_REQUIRED');
  } else {
    if (!nonEmpty(value.provenance.methodVersion)) warnings.push('METHOD_VERSION_MISSING');
    if (!Array.isArray(value.provenance.parentEventIds)) warnings.push('PARENT_EVENT_IDS_MISSING');
  }
  if (value.evidenceClass === WORLD_EVIDENCE_CLASS.MEASURED &&
      !nonEmpty(value.rawDataRef) && !/^[a-f0-9]{64}$/i.test(value.payloadSha256 || '')) {
    warnings.push('RAW_EVIDENCE_REFERENCE_OR_DIGEST_MISSING');
  }

  return {
    ok: errors.length === 0,
    schemaVersion: WORLD_MODEL_SCHEMA_VERSION,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

/** Validate a materialized World Model entity and its observation lineage. */
export function validateWorldEntity(input = {}) {
  const errors = [];
  const value = input && typeof input === 'object' ? input : {};
  if (!nonEmpty(value.entityId)) errors.push('ENTITY_ID_REQUIRED');
  if (!nonEmpty(value.entityType)) errors.push('ENTITY_TYPE_REQUIRED');
  if (!Number.isInteger(value.version) || value.version < 1) errors.push('ENTITY_VERSION_INVALID');
  if (!validTimestamp(value.updatedAt)) errors.push('UPDATED_AT_REQUIRED_OR_INVALID');
  if (!Array.isArray(value.sourceEventIds) || value.sourceEventIds.length === 0 ||
      value.sourceEventIds.some(id => !nonEmpty(id))) {
    errors.push('SOURCE_EVENT_LINEAGE_REQUIRED');
  }
  return {
    ok: errors.length === 0,
    schemaVersion: WORLD_MODEL_SCHEMA_VERSION,
    errors: [...new Set(errors)],
  };
}
