/**
 * Build a v1 event envelope from an authorized native collector snapshot.
 *
 * This helper preserves the original snapshot as payload data and hashes its
 * canonical JSON serialization. A hash is not durable raw-evidence storage:
 * raw_payload_ref remains null until an append-only evidence store is wired.
 */
const CLOCK_DOMAINS = Object.freeze({
  UTC_UNIX: 'UTC_UNIX',
  UNIX_EPOCH_MILLISECONDS: 'UTC_UNIX',
  ANDROID_ELAPSED_REALTIME_NANOS: 'DEVICE_MONOTONIC',
  DEVICE_MONOTONIC: 'DEVICE_MONOTONIC',
  SENSOR_HARDWARE: 'SENSOR_HARDWARE',
  REMOTE_CLOCK: 'REMOTE_CLOCK',
  UNKNOWN: 'UNKNOWN',
});

const EVIDENCE_CLASSES = new Set([
  'MEASURED', 'DERIVED', 'INFERRED', 'PREDICTED', 'SIMULATED',
  'UNKNOWN', 'UNAVAILABLE', 'ENVIRONMENTAL',
  'GROUND_TRUTH_OPERATOR_MARKER', 'FEDERATED_MEASURED', 'CONFLICT',
]);

function toIso(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ':' + stableJson(value[key])
    ).join(',') + '}';
  }
  return JSON.stringify(value);
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {object} input
 * @param {object} input.snapshot Original, unmodified native snapshot.
 * @param {object} input.source Stable authorized collector identity.
 * @param {string} input.source.sourceId
 * @param {string} input.source.sourceType
 * @param {string} input.source.adapterId
 * @param {string} input.source.adapterVersion
 * @param {string} [input.source.deviceId]
 * @param {string} [input.source.capabilityId]
 * @param {string} [input.source.authorizationScopeId]
 * @param {string} [input.observedAt] Source UTC timestamp only; never pass a monotonic estimate.
 * @param {number} [input.observedMonotonicNs] Source monotonic timestamp.
 * @param {string} [input.observedClockDomain]
 * @param {string|Date|number} [input.receivedAt]
 * @param {string} [input.evidenceClass]
 * @param {string} [input.collectionMethod]
 * @param {string} [input.retentionClass]
 * @param {string} [input.eventId]
 */
export async function createWaveRadarEventEnvelope(input = {}) {
  const snapshot = input.snapshot;
  const source = input.source || {};
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('snapshot must be the original object payload');
  }
  for (const key of ['sourceId', 'sourceType', 'adapterId', 'adapterVersion']) {
    if (typeof source[key] !== 'string' || !source[key].trim()) {
      throw new TypeError('source.' + key + ' is required');
    }
  }

  const observedClockDomain = CLOCK_DOMAINS[input.observedClockDomain] || 'UNKNOWN';
  const observedAt = observedClockDomain === 'UTC_UNIX' ? toIso(input.observedAt) : null;
  const monotonic = Number.isSafeInteger(input.observedMonotonicNs) && input.observedMonotonicNs >= 0
    ? input.observedMonotonicNs : null;
  const evidenceClass = EVIDENCE_CLASSES.has(input.evidenceClass) ? input.evidenceClass : 'UNKNOWN';
  const receivedAt = toIso(input.receivedAt ?? new Date());
  if (!receivedAt) throw new TypeError('receivedAt must be a valid timestamp');

  const rawSerialized = stableJson(snapshot);
  const digest = await sha256Hex(rawSerialized);
  const eventId = input.eventId || globalThis.crypto?.randomUUID?.();
  if (!eventId) throw new Error('crypto.randomUUID is required to create event IDs');

  return {
    event_id: eventId,
    schema_version: '1.0.0',
    event_type: 'OBSERVATION',
    source: {
      source_id: source.sourceId,
      source_type: source.sourceType,
      adapter_id: source.adapterId,
      adapter_version: source.adapterVersion,
      device_id: source.deviceId ?? null,
      capability_id: source.capabilityId ?? null,
      authorization_scope_id: source.authorizationScopeId ?? null,
    },
    timing: {
      observed_at: observedAt,
      observed_clock_domain: observedClockDomain,
      observed_monotonic_ns: monotonic,
      received_at: receivedAt,
      clock_uncertainty_ms: null,
      measurement_age_ms: Number.isFinite(input.measurementAgeMs) && input.measurementAgeMs >= 0
        ? input.measurementAgeMs : null,
    },
    provenance: {
      evidence_class: evidenceClass,
      integrity_state: digest ? 'CHECKSUMMED' : 'UNASSESSED',
      collection_method: input.collectionMethod || 'NATIVE_ADAPTER_SNAPSHOT',
      parent_event_ids: [],
      validation_reference_ids: [],
      limitations: [
        'Raw payload reference is null until append-only evidence storage is integrated.',
        ...(digest ? [] : ['SHA-256 unavailable in this runtime; integrity remains unassessed.']),
      ],
    },
    payload: {
      payload_schema: input.payloadSchema || 'waveradar.native-snapshot.v1',
      data: snapshot,
    },
    evidence: {
      raw_payload_ref: null,
      raw_payload_sha256: digest,
      content_type: 'application/json',
      byte_length: new TextEncoder().encode(rawSerialized).length,
      retention_class: input.retentionClass || 'DIAGNOSTIC',
      redaction_applied: false,
    },
  };
}
