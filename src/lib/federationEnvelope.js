/**
 * WaveRadar federated observation envelope.
 *
 * This is a transport-neutral contract, not a network transport or security layer.
 * It lets independently built devices share observations without confusing
 * sender identity, observation time, sequence order, or evidence class.
 */
import {
  DATA_CONTRACT_VERSION,
  EVIDENCE_CLASS,
  normalizeObservation,
  parseTimestamp,
} from './dataContract.js';

export const FEDERATION_PROTOCOL_VERSION = 'waveradar-federation-v1.0';

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const positiveSafeInteger = (value) => Number.isSafeInteger(value) && value >= 1;

/**
 * Create a versioned, idempotently identifiable envelope.
 * sentAt is transport time; observation.timestamp remains source measurement time.
 * No signature or sender authentication is implied by this envelope.
 */
export function createFederationEnvelope({
  incidentId,
  teamId,
  deviceId,
  sequence,
  sentAt,
  sessionId = null,
  observation,
} = {}) {
  if (!nonEmpty(incidentId)) throw new TypeError('incidentId is required');
  if (!nonEmpty(teamId)) throw new TypeError('teamId is required');
  if (!nonEmpty(deviceId)) throw new TypeError('deviceId is required');
  if (!positiveSafeInteger(sequence)) throw new TypeError('sequence must be a positive safe integer');

  const sentAtMs = parseTimestamp(sentAt);
  if (sentAtMs == null) throw new TypeError('sentAt must be a valid timestamp');

  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
    throw new TypeError('observation must be an object');
  }

  const normalized = normalizeObservation(observation, {
    deviceId,
    sessionId,
    now: sentAtMs,
  });

  // A missing or malformed source time is retained as unknown, never replaced by sentAt.
  const sourceTimestampValid = normalized.timestamp != null;
  const eventId = nonEmpty(observation.eventId)
    ? observation.eventId.trim()
    : nonEmpty(observation.observationId)
      ? observation.observationId.trim()
      : `obs-${deviceId}-${sequence}`;

  const canonicalObservation = {
    ...normalized,
    eventId,
    observationId: nonEmpty(normalized.observationId) ? normalized.observationId : eventId,
    deviceId,
    evidenceClass: normalized.evidenceClass || EVIDENCE_CLASS.UNKNOWN,
    provenance: {
      ...(normalized.provenance || {}),
      deviceId,
      incidentId,
      teamId,
      federationProtocol: FEDERATION_PROTOCOL_VERSION,
      sourceContract: DATA_CONTRACT_VERSION,
    },
  };

  return {
    protocolVersion: FEDERATION_PROTOCOL_VERSION,
    envelopeId: `${incidentId}:${deviceId}:${sequence}`,
    incidentId,
    teamId,
    sender: { deviceId, sessionId: nonEmpty(sessionId) ? sessionId : null },
    sequence,
    sentAt: new Date(sentAtMs).toISOString(),
    observationTime: canonicalObservation.observedAt,
    sourceTimestampValid,
    transportClass: 'FEDERATED',
    observation: canonicalObservation,
  };
}

/**
 * Validate the envelope's structural and temporal invariants before ingestion.
 * Authentication, authorization, signatures, replay windows and encryption must
 * be enforced by the transport/backend, not inferred from this structural check.
 */
export function validateFederationEnvelope(envelope) {
  const errors = [];
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, errors: ['envelope must be an object'] };
  }
  if (envelope.protocolVersion !== FEDERATION_PROTOCOL_VERSION) errors.push('unsupported protocolVersion');
  if (!nonEmpty(envelope.incidentId)) errors.push('incidentId is required');
  if (!nonEmpty(envelope.teamId)) errors.push('teamId is required');
  if (!nonEmpty(envelope.sender?.deviceId)) errors.push('sender.deviceId is required');
  if (!positiveSafeInteger(envelope.sequence)) errors.push('sequence must be a positive safe integer');
  if (parseTimestamp(envelope.sentAt) == null) errors.push('sentAt must be a valid timestamp');
  if (envelope.transportClass !== 'FEDERATED') errors.push('transportClass must be FEDERATED');

  const expectedId = nonEmpty(envelope.incidentId) && nonEmpty(envelope.sender?.deviceId) &&
    positiveSafeInteger(envelope.sequence)
    ? `${envelope.incidentId}:${envelope.sender.deviceId}:${envelope.sequence}`
    : null;
  if (expectedId && envelope.envelopeId !== expectedId) errors.push('envelopeId does not match incident/device/sequence');

  if (!envelope.observation || typeof envelope.observation !== 'object' || Array.isArray(envelope.observation)) {
    errors.push('observation must be an object');
  } else {
    const observation = envelope.observation;
    if (!nonEmpty(observation.eventId ?? observation.observationId)) errors.push('observation event ID is required');
    if (observation.deviceId !== envelope.sender?.deviceId) errors.push('observation deviceId must match sender');
    if (observation.timestamp != null && parseTimestamp(observation.timestamp) == null) errors.push('observation timestamp is invalid');
    if (envelope.observationTime !== (observation.observedAt ?? null)) errors.push('observationTime must match source observedAt');
  }
  return { valid: errors.length === 0, errors };
}
