import { parseTimestamp } from './dataContract.js';

// Numeric zero is valid; null, undefined and empty strings are missing.
// This distinction prevents a range-only sensor (e.g. Wi-Fi RTT) from being
// silently assigned a zero-degree bearing.
export function finiteMeasurement(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeFrameTimestamp(value) {
  return parseTimestamp(value);
}

export function classifySpatialMeasurement(detection = {}) {
  const rawAngle = detection.angle ?? detection.bearing ?? detection.bearingDeg;
  const rawDistance = detection.distance ?? detection.distanceM ?? detection.rangeM;
  const angle = finiteMeasurement(rawAngle);
  const distance = finiteMeasurement(rawDistance);

  if (distance == null || distance < 0) {
    return { status: 'INVALID', reason: 'MISSING_OR_INVALID_RANGE', angle, distance };
  }
  if (angle == null) {
    return { status: 'RANGE_ONLY', reason: 'BEARING_UNAVAILABLE', angle: null, distance };
  }
  if (angle < -360 || angle > 360) {
    return { status: 'INVALID', reason: 'BEARING_OUT_OF_RANGE', angle, distance };
  }
  return { status: 'SPATIALLY_ALIGNED', reason: null, angle, distance };
}
