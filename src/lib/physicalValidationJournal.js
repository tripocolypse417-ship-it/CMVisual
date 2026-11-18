import { parseTimestamp } from './dataContract.js';

/**
 * Wrap one mixed physical-validation sample as an UNKNOWN-envelope observation.
 * Per-field classifications remain authoritative inside payload.evidenceByField.
 */
export function toPhysicalValidationEvidenceEvent({
  sample,
  deviceId,
  sessionId,
  sequence,
  receivedAt = Date.now(),
}) {
  if (!sample || typeof sample !== 'object' || Array.isArray(sample)) throw new TypeError('sample is required');
  if (typeof deviceId !== 'string' || !deviceId.trim()) throw new TypeError('deviceId is required');
  if (typeof sessionId !== 'string' || !sessionId.trim()) throw new TypeError('sessionId is required');
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new TypeError('sequence must be a positive integer');
  const capturedAt = parseTimestamp(sample.capturedAt ?? sample.at);
  const received = parseTimestamp(receivedAt);
  return {
    schemaVersion: 'waveradar-evidence-event-v1',
    eventId: `physical-validation:${sessionId}:${sequence}`,
    incidentId: `validation:${sessionId}`,
    eventType: 'OBSERVATION',
    sourceId: deviceId,
    capturedAt,
    receivedAt: received,
    clockDomain: 'UNIX_EPOCH_MILLISECONDS',
    sequence,
    evidenceClass: 'UNKNOWN',
    integrityState: 'UNASSESSED',
    coordinateFrame: null,
    calibrationRef: null,
    rawEvidenceRef: null,
    rawEvidenceHash: null,
    sourceEventIds: [],
    hypothesisGroupId: null,
    hypothesisStatus: null,
    payload: sample,
    provenance: {
      source: 'WaveRadar PhysicalValidation',
      sessionId,
      deviceId,
      localSequence: sequence,
      timestampSemantics: 'capture and receipt are separately recorded; neither is a spatial ground-truth timebase',
    },
  };
}
