/**
 * WIS incident event contract: dependency-free client-side validation helpers.
 *
 * This module validates envelopes and deterministic replay inputs. It is not
 * an authoritative server, durable journal, cryptographic verifier, or transport.
 */
export const INCIDENT_EVENT_SCHEMA = 'waveradar.incident-event';
export const INCIDENT_EVENT_SCHEMA_VERSION = 1;

export const INCIDENT_PROVENANCE = Object.freeze([
  'MEASURED', 'DERIVED', 'INFERRED', 'PREDICTED', 'SIMULATED', 'UNKNOWN', 'UNAVAILABLE'
]);
export const INCIDENT_INTEGRITY = Object.freeze([
  'PENDING', 'VERIFIED', 'FAILED', 'NOT_CHECKED'
]);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const byteLength = (value) => new TextEncoder().encode(value).length;

function safeJson(value) {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === 'string' ? encoded : null;
  } catch {
    return null;
  }
}

/**
 * Validate an event without filling missing capture time, provenance, identity,
 * or source information from the receiver's clock or environment.
 */
export function validateIncidentEvent(event, options = {}) {
  const maxPayloadBytes = Number.isFinite(options.maxPayloadBytes) ? options.maxPayloadBytes : 65536;
  const errors = [];
  if (!isRecord(event)) return { valid: false, errors: ['EVENT_MUST_BE_OBJECT'] };

  if (event.schema !== INCIDENT_EVENT_SCHEMA) errors.push('SCHEMA_UNSUPPORTED');
  if (event.schemaVersion !== INCIDENT_EVENT_SCHEMA_VERSION) errors.push('SCHEMA_VERSION_UNSUPPORTED');
  if (!nonEmpty(event.eventId)) errors.push('EVENT_ID_REQUIRED');
  if (!nonEmpty(event.incidentId)) errors.push('INCIDENT_ID_REQUIRED');
  if (!nonEmpty(event.eventType) || !event.eventType.includes('.')) errors.push('EVENT_TYPE_MUST_BE_NAMESPACED');

  if (!isRecord(event.eventTime)) errors.push('EVENT_TIME_REQUIRED');
  else {
    if (!Object.prototype.hasOwnProperty.call(event.eventTime, 'capturedAt')) errors.push('CAPTURE_TIME_FIELD_REQUIRED');
    if (!nonEmpty(event.eventTime.clockDomain)) errors.push('CLOCK_DOMAIN_REQUIRED');
    if (event.eventTime.capturedAt != null && !Number.isFinite(Date.parse(event.eventTime.capturedAt))) {
      errors.push('CAPTURE_TIME_INVALID');
    }
    if (event.eventTime.receivedAt != null && !Number.isFinite(Date.parse(event.eventTime.receivedAt))) {
      errors.push('RECEIVE_TIME_INVALID');
    }
  }

  if (!isRecord(event.source)) errors.push('SOURCE_REQUIRED');
  else {
    if (!nonEmpty(event.source.sourceId)) errors.push('SOURCE_ID_REQUIRED');
    if (!nonEmpty(event.source.authorizationScope)) errors.push('AUTHORIZATION_SCOPE_REQUIRED');
  }

  if (!isRecord(event.evidence)) errors.push('EVIDENCE_REQUIRED');
  else {
    if (!INCIDENT_PROVENANCE.includes(event.evidence.provenance)) errors.push('PROVENANCE_INVALID');
    if (!INCIDENT_INTEGRITY.includes(event.evidence.integrity)) errors.push('INTEGRITY_INVALID');
  }

  if (!isRecord(event.payload)) errors.push('PAYLOAD_MUST_BE_OBJECT');
  else {
    const encoded = safeJson(event.payload);
    if (encoded === null) errors.push('PAYLOAD_NOT_JSON_SERIALIZABLE');
    else if (byteLength(encoded) > maxPayloadBytes) errors.push('PAYLOAD_TOO_LARGE');
  }

  if (event.incidentVersion != null && (!Number.isSafeInteger(event.incidentVersion) || event.incidentVersion < 1)) {
    errors.push('INCIDENT_VERSION_INVALID');
  }
  if (event.deliveryState === 'LOCAL_PENDING' && event.incidentVersion != null) {
    errors.push('LOCAL_PENDING_MUST_NOT_CLAIM_AUTHORITATIVE_VERSION');
  }
  if (event.spatial != null && !isRecord(event.spatial)) errors.push('SPATIAL_MUST_BE_OBJECT');

  return { valid: errors.length === 0, errors };
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (isRecord(value)) {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

/**
 * Analyze a batch for duplicate IDs, altered duplicate content, and missing
 * authoritative sequence numbers. It never resolves conflicts by arrival order.
 */
export function analyzeIncidentEventBatch(events = []) {
  const byId = new Map();
  const byVersion = new Map();
  const conflicts = [];
  const duplicates = [];
  const accepted = [];

  for (const event of Array.isArray(events) ? events : []) {
    const validation = validateIncidentEvent(event);
    if (!validation.valid) {
      conflicts.push({ reason: 'INVALID_EVENT', eventId: event?.eventId ?? null, errors: validation.errors });
      continue;
    }
    const encoded = canonical(event);
    const previous = byId.get(event.eventId);
    if (previous) {
      if (previous.encoded === encoded) duplicates.push(event.eventId);
      else conflicts.push({ reason: 'EVENT_ID_CONTENT_MISMATCH', eventId: event.eventId });
      continue;
    }
    byId.set(event.eventId, { encoded, event });
    if (Number.isSafeInteger(event.incidentVersion)) {
      const versionPrevious = byVersion.get(event.incidentVersion);
      if (versionPrevious && versionPrevious.eventId !== event.eventId) {
        conflicts.push({ reason: 'INCIDENT_VERSION_COLLISION', version: event.incidentVersion, eventIds: [versionPrevious.eventId, event.eventId] });
        continue;
      }
      byVersion.set(event.incidentVersion, event);
    }
    accepted.push(event);
  }

  const versions = [...byVersion.keys()].sort((a, b) => a - b);
  const gaps = [];
  for (let index = 1; index < versions.length; index += 1) {
    if (versions[index] > versions[index - 1] + 1) {
      gaps.push({ after: versions[index - 1], before: versions[index] });
    }
  }

  return {
    accepted: accepted.sort((a, b) => (a.incidentVersion ?? Number.MAX_SAFE_INTEGER) - (b.incidentVersion ?? Number.MAX_SAFE_INTEGER) || a.eventId.localeCompare(b.eventId)),
    duplicates: [...new Set(duplicates)].sort(),
    conflicts,
    gaps,
    contiguous: conflicts.length === 0 && gaps.length === 0
  };
}
