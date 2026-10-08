import { normalizeDetection, EVIDENCE_CLASS, DATA_CONTRACT_VERSION } from './dataContract';

export const VISION_EVIDENCE = EVIDENCE_CLASS.MEASURED;

export function normalizeVisionDetections(detections = [], { timestamp = Date.now(), frameId = null, source = 'phone-camera', deviceId = null, sessionId = null } = {}) {
  return detections.filter(Boolean).map((detection, index) => normalizeDetection({
    ...detection,
    observationId: detection.id || String(frameId || timestamp) + '-' + index,
    frameId, timestamp, observedAt: timestamp, source,
    modality: 'CAMERA', sensorFamily: 'CAMERA', evidenceClass: EVIDENCE_CLASS.MEASURED,
    confidence: Number(detection.score ?? detection.confidence ?? 0), deviceId, sessionId,
  }, { deviceId, sessionId, timestamp }));
}

export function toWorldObservation(observation, { cameraPose = null, depthMeters = null } = {}) {
  const depth = Number.isFinite(depthMeters) ? depthMeters : observation?.depthMeters;
  return {
    ...observation,
    schemaVersion: DATA_CONTRACT_VERSION,
    coordinateFrame: depth == null ? 'IMAGE_NORMALIZED' : 'CAMERA_DEPTH',
    cameraPose: cameraPose || null,
    depthMeters: depth,
    spatialConfidence: depth == null ? null : observation.confidence,
    spatialEvidenceClass: depth == null ? EVIDENCE_CLASS.UNKNOWN : EVIDENCE_CLASS.DERIVED,
  };
}
