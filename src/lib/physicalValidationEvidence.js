import { DATA_STATE, EVIDENCE_CLASS, parseTimestamp } from './dataContract.js';

const SENSOR_STALE_MS = 5000;
const NON_MEASUREMENT_KEYS = new Set([
  'timestamp', 'observedat', 'measuredat', 'accuracy', 'status', 'state',
  'sensortype', 'modality', 'source', 'available', 'enabled', 'supported',
  'samplecount', 'frequency', 'frequencyhz', 'samplerate', 'sampleratehz',
  'elapsedrealtimenanos',
]);

function hasFiniteMeasurement(value, key = '') {
  if (NON_MEASUREMENT_KEYS.has(String(key).toLowerCase())) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(item => hasFiniteMeasurement(item));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([childKey, childValue]) =>
      hasFiniteMeasurement(childValue, childKey)
    );
  }
  return false;
}

function hasFiniteValue(value) {
  return value != null &&
    !(typeof value === 'string' && value.trim() === '') &&
    Number.isFinite(Number(value));
}

function classifyFreshness(observedAtMs, capturedAtMs) {
  if (observedAtMs == null || capturedAtMs == null) {
    return { state: DATA_STATE.UNKNOWN, ageMs: null };
  }
  const ageMs = capturedAtMs - observedAtMs;
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    // A future sensor timestamp is suspicious; do not present it as current.
    return { state: DATA_STATE.UNKNOWN, ageMs: null };
  }
  return {
    state: ageMs > SENSOR_STALE_MS ? DATA_STATE.STALE : DATA_STATE.CURRENT,
    ageMs,
  };
}

/**
 * Build a mixed physical-validation sample without assigning one evidence class
 * to every field. Raw axes, derived motion features, and inferred movement are
 * represented separately. This function deliberately makes no accuracy claim.
 *
 * Sensor evidence class and freshness are independent: a stale observation
 * remains measured, but its state must not be presented as current.
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
  const hasNativeMeasurements = hasFiniteMeasurement(nativeMeasurements);
  const capturedAtMs = parseTimestamp(capturedAt);
  const nativeSensorAtMs = parseTimestamp(nativeSnapshot?.lastSensorAt);
  const nativeFreshness = classifyFreshness(nativeSensorAtMs, capturedAtMs);
  const nativeSensorObservedAt = nativeSensorAtMs == null
    ? null
    : new Date(nativeSensorAtMs).toISOString();

  const motionTimestamp = parseTimestamp(motion?.timestamp);
  const motionFreshness = classifyFreshness(motionTimestamp, capturedAtMs);
  const hasMotionAxes = motionTimestamp != null &&
    [motion.x, motion.y, motion.z].every(value => typeof value === 'number' && Number.isFinite(value));
  const hasMotionMagnitude = hasMotionAxes &&
    typeof motion.magnitude === 'number' &&
    Number.isFinite(motion.magnitude);
  const hasMotionJerk = hasMotionMagnitude &&
    typeof motion.jerk === 'number' &&
    Number.isFinite(motion.jerk);
  const hasHeading = hasFiniteValue(heading);

  return {
    t: Math.max(0, Number(elapsedMs) || 0),
    // Keep the legacy "at" key while making its capture-time meaning explicit.
    at: capturedAt,
    capturedAt,
    deviceId,
    // The envelope combines multiple evidence types; field-level labels govern.
    evidenceClass: EVIDENCE_CLASS.UNKNOWN,
    heading: hasHeading ? Number(heading) : null,
    moving,
    motion,
    nativeSensors: nativeMeasurements,
    nativeSensorAt: nativeSnapshot?.lastSensorAt ?? null,
    nativeSensorObservedAt,
    nativeSensorAgeMs: nativeFreshness.ageMs,
    nativeSensorState: nativeFreshness.state,
    motionObservedAt: motionTimestamp == null ? null : new Date(motionTimestamp).toISOString(),
    motionAgeMs: motionFreshness.ageMs,
    motionState: motionFreshness.state,
    evidenceByField: {
      heading: {
        value: hasHeading ? Number(heading) : null,
        evidenceClass: hasHeading ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN,
        modality: 'MODEL',
        source: 'DeviceOrientationEvent heading normalized by useDeviceSensors',
        note: 'Platform-provided orientation may itself be fused; not an independently calibrated bearing.',
      },
      motionAxes: {
        value: hasMotionAxes ? { x: motion.x, y: motion.y, z: motion.z } : null,
        evidenceClass: hasMotionAxes ? EVIDENCE_CLASS.MEASURED : EVIDENCE_CLASS.UNKNOWN,
        state: hasMotionAxes ? motionFreshness.state : DATA_STATE.UNKNOWN,
        ageMs: hasMotionAxes ? motionFreshness.ageMs : null,
        modality: 'IMU',
        source: 'DeviceMotionEvent accelerationIncludingGravity or acceleration',
        observedAt: hasMotionAxes ? new Date(motionTimestamp).toISOString() : null,
      },
      motionMagnitude: {
        value: hasMotionMagnitude ? motion.magnitude : null,
        evidenceClass: hasMotionMagnitude ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN,
        state: hasMotionMagnitude ? motionFreshness.state : DATA_STATE.UNKNOWN,
        ageMs: hasMotionMagnitude ? motionFreshness.ageMs : null,
        modality: 'MODEL',
        derivedFrom: ['motionAxes'],
        note: 'Computed from changes between successive acceleration samples.',
      },
      motionJerk: {
        value: hasMotionJerk ? motion.jerk : null,
        evidenceClass: hasMotionJerk ? EVIDENCE_CLASS.DERIVED : EVIDENCE_CLASS.UNKNOWN,
        state: hasMotionJerk ? motionFreshness.state : DATA_STATE.UNKNOWN,
        ageMs: hasMotionJerk ? motionFreshness.ageMs : null,
        modality: 'MODEL',
        derivedFrom: ['motionMagnitude'],
      },
      moving: {
        value: hasMotionMagnitude ? Boolean(moving) : null,
        evidenceClass: hasMotionMagnitude ? EVIDENCE_CLASS.INFERRED : EVIDENCE_CLASS.UNKNOWN,
        state: hasMotionMagnitude ? motionFreshness.state : DATA_STATE.UNKNOWN,
        ageMs: hasMotionMagnitude ? motionFreshness.ageMs : null,
        modality: 'MODEL',
        derivedFrom: ['motionMagnitude'],
        source: 'Motion-threshold heuristic; not ground-truth movement.',
      },
      nativeSensors: {
        value: nativeMeasurements,
        evidenceClass: hasNativeMeasurements ? EVIDENCE_CLASS.MEASURED : EVIDENCE_CLASS.UNKNOWN,
        state: nativeFreshness.state,
        ageMs: nativeFreshness.ageMs,
        modality: 'IMU',
        source: 'WaveRadar native Android sensor bridge',
        observedAt: nativeSensorObservedAt,
        accuracy: nativeSnapshot?.accuracy ?? null,
        note: hasNativeMeasurements
          ? 'At least one finite numeric measurement was present; freshness is classified separately.'
          : 'No finite numeric measurement was present in the native snapshot.',
      },
    },
  };
}
