import { EVIDENCE_CLASS } from '@/lib/dataContract';

/**
 * Build a mixed physical-validation sample without assigning one evidence class
 * to every field. Raw axes, derived motion features, and inferred movement are
 * represented separately. This function deliberately makes no accuracy claim.
 */
export function buildPhysicalValidationSample({
  elapsedMs,
  capturedAt,
  deviceId,
  heading,
  moving,
  motion,
  nativeSnapshot,
}) {
  const nativeMeasurements = nativeSnapshot?.measurements ?? null;
  const hasNativeMeasurements = !!nativeMeasurements &&
    typeof nativeMeasurements === 'object' &&
    Object.keys(nativeMeasurements).length > 0;
  const hasMotionAxes = !!motion?.timestamp &&
    Number.isFinite(Number(motion.timestamp)) &&
    [motion.x, motion.y, motion.z].every(value => typeof value === 'number' && Number.isFinite(value));
  const hasMotionMagnitude = hasMotionAxes &&
    typeof motion.magnitude === 'number' &&
    Number.isFinite(motion.magnitude);
  const hasMotionJerk = hasMotionMagnitude &&
    typeof motion.jerk === 'number' &&
    Number.isFinite(motion.jerk);
  const hasHeading = heading != null && Number.isFinite(Number(heading));

  return {
    t: Math.max(0, Number(elapsedMs) || 0),
    // Keep the legacy "at" key while making its capture-time meaning explicit.
    at: capturedAt,
    capturedAt,
    deviceId,
    // The envelope combines multiple evidence types; field-level labels govern.
    evidenceClass: EVIDENCE_CLASS.UNKNOWN,
    heading,
    moving,
    motion,
    nativeSensors: nativeMeasurements,
    nativeSensorAt: nativeSnapshot?.lastSensorAt ?? null,
    evidenceByField: {
      heading: {
        value: heading,
        evidenceClass: hasHeading ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN,
        modality: 'MODEL',
        source: 'DeviceOrientationEvent heading normalized by useDeviceSensors',
        note: 'Platform-provided orientation may itself be fused; not an independently calibrated bearing.',
      },
      motionAxes: {
        value: hasMotionAxes ? { x: motion.x, y: motion.y, z: motion.z } : null,
        evidenceClass: hasMotionAxes ? EVIDENCE_CLASS.MEASURED : EVIDENCE_CLASS.UNKNOWN,
        modality: 'IMU',
        source: 'DeviceMotionEvent accelerationIncludingGravity or acceleration',
        observedAt: hasMotionAxes ? new Date(Number(motion.timestamp)).toISOString() : null,
      },
      motionMagnitude: {
        value: hasMotionMagnitude ? motion.magnitude : null,
        evidenceClass: hasMotionMagnitude ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN,
        modality: 'MODEL',
        derivedFrom: ['motionAxes'],
        note: 'Computed from changes between successive acceleration samples.',
      },
      motionJerk: {
        value: hasMotionJerk ? motion.jerk : null,
        evidenceClass: hasMotionJerk ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN,
        modality: 'MODEL',
        derivedFrom: ['motionMagnitude'],
      },
      moving: {
        value: hasMotionMagnitude ? Boolean(moving) : null,
        evidenceClass: hasMotionMagnitude ? EVIDENCE_CLASS.INFERRED : EVIDENCE_CLASS.UNKNOWN,
        modality: 'MODEL',
        derivedFrom: ['motionMagnitude'],
        source: 'Motion-threshold heuristic; not ground-truth movement.',
      },
      nativeSensors: {
        value: nativeMeasurements,
        evidenceClass: hasNativeMeasurements ? EVIDENCE_CLASS.MEASURED : EVIDENCE_CLASS.UNKNOWN,
        modality: 'IMU',
        source: 'WaveRadar native Android sensor bridge',
        observedAt: nativeSnapshot?.lastSensorAt ?? null,
        accuracy: nativeSnapshot?.accuracy ?? null,
      },
    },
  };
}
