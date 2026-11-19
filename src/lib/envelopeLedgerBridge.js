/**
 * Lossless compatibility boundary between the shared event-envelope v1
 * (PR #97) and append-only evidence ledger (PR #96).
 * No clock conversion, inferred incident identity, or validation promotion.
 */
const requiredText = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' required');
  return value.trim();
};
const EVENT_TYPES = Object.freeze({
  OBSERVATION: 'OBSERVATION',
  DEVICE_STATUS: 'OBSERVATION',
  DISCOVERY_CANDIDATE: 'OBSERVATION',
  SCENE_ENTITY_UPSERT: 'OBSERVATION',
  SCENE_ENTITY_DELETE: 'OBSERVATION',
  SCENE_RELATION: 'OBSERVATION',
  PREDICTION: 'HYPOTHESIS',
  ANNOTATION: 'OBSERVATION',
  VALIDATION_RESULT: 'OBSERVATION',
});
const clone = value => JSON.parse(JSON.stringify(value));

export function mapEnvelopeV1ToLedgerEvent(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new TypeError('envelope object required');
  if (envelope.schema_version !== '1.0.0') throw new TypeError('unsupported envelope version');
  const originalType = requiredText(envelope.event_type, 'event_type');
  if (!Object.hasOwn(EVENT_TYPES, originalType)) throw new TypeError('unsupported event type');
  const incidentId = requiredText(envelope.incident_id, 'incident_id');
  const clockDomain = requiredText(envelope.timing?.observed_clock_domain, 'clock domain');
  const capturedAt = clockDomain === 'UTC_UNIX' ? envelope.timing.observed_at ?? null : null;
  if (capturedAt != null && !Number.isFinite(Date.parse(capturedAt))) throw new TypeError('invalid capture timestamp');
  const receivedAt = requiredText(envelope.timing?.received_at, 'received_at');
  if (!Number.isFinite(Date.parse(receivedAt))) throw new TypeError('invalid receive timestamp');
  const raw = clone(envelope); // preserve original envelope including monotonic nanoseconds
  return {
    eventId: requiredText(envelope.event_id, 'event_id'),
    incidentId,
    eventType: EVENT_TYPES[originalType],
    sourceId: requiredText(envelope.source?.source_id, 'source_id'),
    capturedAt,
    receivedAt,
    clockDomain,
    evidenceClass: envelope.provenance?.evidence_class || 'UNKNOWN',
    integrityState: envelope.provenance?.integrity_state || 'UNASSESSED',
    coordinateFrame: envelope.spatial?.frame_id || null,
    rawEvidenceRef: envelope.evidence?.raw_payload_ref || null,
    rawEvidenceHash: envelope.evidence?.raw_payload_sha256 || null,
    sourceEventIds: envelope.provenance?.parent_event_ids || [],
    payload: { originalEnvelope: raw },
    provenance: {
      envelopeSchemaVersion: envelope.schema_version,
      originalEventType: originalType,
      sessionId: envelope.session_id ?? null,
      observedMonotonicNs: envelope.timing.observed_monotonic_ns ?? null,
      validationReferences: envelope.provenance?.validation_reference_ids || [],
      mapping: 'COMPATIBILITY_ONLY_NOT_VERIFIED',
    },
  };
}
