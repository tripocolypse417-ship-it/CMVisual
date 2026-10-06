export const VISION_EVIDENCE = 'MEASURED';

export function normalizeVisionDetections(detections = [], { timestamp = Date.now(), frameId = null, source = 'phone-camera' } = {}) {
  return detections.filter(Boolean).map((detection, index) => {
    const bbox = detection.bbox || detection.boundingBox || {};
    const score = Number(detection.score ?? detection.confidence ?? 0);
    return {
      observationId: detection.id || String(frameId || timestamp) + '-' + index,
      frameId,
      timestamp,
      source,
      evidenceClass: VISION_EVIDENCE,
      className: detection.class || detection.label || 'unknown',
      confidence: Math.max(0, Math.min(1, score)),
      bbox: {
        x: Number(bbox.x ?? 0),
        y: Number(bbox.y ?? 0),
        width: Number(bbox.width ?? 0),
        height: Number(bbox.height ?? 0),
      },
      depthMeters: Number.isFinite(detection.depthMeters) ? detection.depthMeters : null,
    };
  });
}

export function toWorldObservation(observation, { cameraPose = null, depthMeters = null } = {}) {
  const depth = Number.isFinite(depthMeters) ? depthMeters : observation.depthMeters;
  return {
    ...observation,
    coordinateFrame: depth == null ? 'IMAGE_NORMALIZED' : 'CAMERA_DEPTH',
    cameraPose: cameraPose || null,
    depthMeters: depth,
    spatialConfidence: depth == null ? null : observation.confidence,
  };
}
