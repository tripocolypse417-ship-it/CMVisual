/**
 * Provider-neutral incident evidence repository boundary.
 *
 * The adapter owns durable persistence (for example PostgreSQL + object
 * storage). This module validates and scopes records before they cross that
 * boundary; it is not itself a database and must not be mistaken for one.
 */
const EVIDENCE_CLASSES = new Set([
  'MEASURED', 'DERIVED', 'INFERRED', 'PREDICTED',
  'SIMULATED', 'UNKNOWN', 'UNAVAILABLE',
]);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const validTime = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function validateIncidentEvidence(record) {
  if (!isObject(record)) throw new TypeError('Evidence envelope must be an object');
  if (record.schema_version !== '1.0.0') throw new TypeError('Unsupported evidence schema_version');
  for (const field of ['observation_id', 'incident_id']) {
    if (typeof record[field] !== 'string' || !record[field].trim()) {
      throw new TypeError(`Evidence envelope requires ${field}`);
    }
  }
  if (!isObject(record.source) ||
      typeof record.source.source_type !== 'string' || !record.source.source_type.trim() ||
      typeof record.source.source_id !== 'string' || !record.source.source_id.trim()) {
    throw new TypeError('Evidence envelope requires source.source_type and source.source_id');
  }
  if (!isObject(record.event_time) || !validTime(record.event_time.timestamp)) {
    throw new TypeError('Evidence envelope requires a valid event_time.timestamp');
  }
  if (!validTime(record.received_at)) throw new TypeError('Evidence envelope requires a valid received_at');
  if (!EVIDENCE_CLASSES.has(record.evidence_class)) throw new TypeError('Evidence envelope has an invalid evidence_class');
  if (!isObject(record.payload)) throw new TypeError('Evidence envelope payload must be an object');
  if (!isObject(record.provenance) ||
      typeof record.provenance.capture_method !== 'string' ||
      !record.provenance.capture_method.trim()) {
    throw new TypeError('Evidence envelope requires provenance.capture_method');
  }
  return record;
}

const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const compareRecords = (a, b) =>
  Date.parse(a.event_time.timestamp) - Date.parse(b.event_time.timestamp) ||
  Date.parse(a.received_at) - Date.parse(b.received_at) ||
  a.observation_id.localeCompare(b.observation_id);

/**
 * Adapter contract:
 * - append(record): atomic insert; unique observation_id; never overwrite.
 * - get(incidentId, observationId): return one record or null.
 * - list(incidentId): return records for exactly that incident.
 *
 * Implementations must enforce tenant/incident authorization server-side,
 * immutable accepted records, idempotency, and durable transaction semantics.
 */
export function createIncidentEvidenceRepository(adapter) {
  for (const method of ['append', 'get', 'list']) {
    if (typeof adapter?.[method] !== 'function') {
      throw new TypeError(`Evidence adapter must implement ${method}()`);
    }
  }

  return Object.freeze({
    async append(record) {
      const valid = validateIncidentEvidence(record);
      // Never allow callers to mutate the submitted object after acceptance.
      return adapter.append(cloneJson(valid));
    },

    async get(incidentId, observationId) {
      if (!incidentId || !observationId) throw new TypeError('incidentId and observationId are required');
      const result = await adapter.get(String(incidentId), String(observationId));
      if (result == null) return null;
      const valid = validateIncidentEvidence(result);
      if (valid.incident_id !== String(incidentId) || valid.observation_id !== String(observationId)) {
        throw new Error('Evidence adapter returned a record outside the requested identity scope');
      }
      return cloneJson(valid);
    },

    async list(incidentId) {
      if (!incidentId) throw new TypeError('incidentId is required');
      const results = await adapter.list(String(incidentId));
      if (!Array.isArray(results)) throw new TypeError('Evidence adapter list() must return an array');
      const scoped = results.map(validateIncidentEvidence);
      if (scoped.some((item) => item.incident_id !== String(incidentId))) {
        throw new Error('Evidence adapter returned records outside the requested incident scope');
      }
      return scoped.map(cloneJson).sort(compareRecords);
    },
  });
}
