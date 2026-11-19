/**
 * Lossless, explicitly gated projection from the native event-envelope v1
 * into the temporal replay ledger v1. Never modifies source evidence.
 * A monotonic source timestamp is NOT an absolute wall-clock timestamp.
 */
const TYPES = Object.freeze({
  OBSERVATION: 'OBSERVATION',
  DEVICE_STATUS: 'OBSERVATION',
  DISCOVERY_CANDIDATE: 'OBSERVATION',
  PREDICTION: 'HYPOTHESIS',
  ANNOTATION: 'DERIVATION',
  VALIDATION_RESULT: 'OBSERVATION',
});
const isText = value => typeof value === 'string' && value.trim().length > 0;
const utc = value => isText(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

/**
 * @returns {{accepted:boolean, event?:object, reason?:string}}
 * Non-replayable events are rejected explicitly, never silently discarded.
 */
export function projectNativeEnvelopeToLedger(envelope, incidentId) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return { accepted: false, reason: 'INVALID_ENVELOPE' };
  if (envelope.schema_version !== '1.0.0') return { accepted: false, reason: 'UNSUPPORTED_SCHEMA_VERSION' };
  if (!isText(incidentId)) return { accepted: false, reason: 'INCIDENT_SCOPE_REQUIRED' };
  if (!isText(envelope.event_id) || !isText(envelope.source?.source_id)) return { accepted: false, reason: 'IDENTITY_REQUIRED' };
  const eventType = TYPES[envelope.event_type];
  if (!eventType) return { accepted: false, reason: 'UNSUPPORTED_EVENT_TYPE' };
  const receipt = utc(envelope.timing?.received_at);
  if (!receipt) return { accepted: false, reason: 'RECEIPT_TIME_REQUIRED' };
  const clockDomain = envelope.timing?.observed_clock_domain;
  const captured = clockDomain === 'UTC_UNIX' ? utc(envelope.timing?.observed_at) : null;
  const provenance = envelope.provenance || {};
  const original = JSON.parse(JSON.stringify(envelope));
  return {
    accepted: true,
    event: {
      eventId: envelope.event_id,
      incidentId: incidentId.trim(),
      eventType,
      sourceId: envelope.source.source_id,
      capturedAt: captured,
      receivedAt: receipt,
      clockDomain: clockDomain || 'UNKNOWN',
      evidenceClass: provenance.evidence_class || 'UNKNOWN',
      integrityState: 'UNASSESSED',
      rawEvidenceRef: envelope.evidence?.raw_payload_ref || null,
      rawEvidenceHash: envelope.evidence?.raw_payload_sha256 || null,
      sourceEventIds: Array.isArray(provenance.parent_event_ids) ? provenance.parent_event_ids : [],
      hypothesisGroupId: eventType === 'HYPOTHESIS' ? envelope.event_id : null,
      payload: { originalEnvelope: original },
      provenance: {
        sourceSchema: 'waveradar-event-envelope-v1',
        sourceIntegrityState: provenance.integrity_state || 'UNASSESSED',
        sourceClockDomain: clockDomain || 'UNKNOWN',
        sourceMonotonicNs: envelope.timing?.observed_monotonic_ns ?? null,
        independentValidation: false,
        conversionLimitations: [
          'Projection is not independent validation or cryptographic verification.',
          ...(captured ? [] : ['Absolute capture time unavailable; monotonic clocks were not aligned.']),
        ],
      },
    },
  };
}
