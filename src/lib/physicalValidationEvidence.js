import { DATA_STATE, EVIDENCE_CLASS, parseTimestamp } from './dataContract.js';

const SENSOR_STALE_MS = 5000;
const NON_MEASUREMENT_KEYS = new Set([
  'timestamp', 'observedat', 'measuredat', 'agems', 'accuracy', 'status', 'state',
  'sensortype', 'sensor_type', 'modality', 'source', 'available', 'enabled',
  'supported', 'samplecount', 'frequency', 'frequencyhz', 'samplerate',
  'sampleratehz', 'elapsedrealtimenanos',
]);

function toIso(timestampMs) {
  if (timestampMs == null || !Number.isFinite(Number(timestampMs))) return null;
  const date = new Date(Number(timestampMs));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

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

// Known Android sensor types have known value shapes. A vector measurement
// requires all three axes; a single surviving axis is not a complete vector.
function hasValidSensorMeasurement(sensorName, measurement) {
  if (!measurement || typeof measurement !== 'object' || Array.isArray(measurement)) return false;
  const name = String(sensorName).toLowerCase();
  const vectorSensors = new Set(['accelerometer', 'gyroscope', 'magnetometer', 'rotationvector', 'gravity']);
  const scalarSensors = new Set(['barometer', 'ambientlight', 'proximity']);
  const values = measurement.values;

  if (vectorSensors.has(name)) {
    if (Array.isArray(values)) {
      return values.length >= 3 &&
        values.slice(0, 3).every(value => typeof value === 'number' && Number.isFinite(value));
    }
    return ['x', 'y', 'z'].every(axis =>
      typeof measurement[axis] === 'number' && Number.isFinite(measurement[axis])
    );
  }

  if (scalarSensors.has(name)) {
    if (Array.isArray(values)) {
      return values.length >= 1 && typeof values[0] === 'number' && Number.isFinite(values[0]);
    }
    const scalar = measurement.value ?? measurement.pressure ?? measurement.lux ?? measurement.distance;
    return typeof scalar === 'number' && Number.isFinite(scalar);
  }

  return hasFiniteMeasurement(measurement, sensorName);
}

function freshnessFromAge(ageValue) {
  if (ageValue == null || ageValue === '' || !Number.isFinite(Number(ageValue)) || Number(ageValue) < 0) {
    return { state: DATA_STATE.UNKNOWN, ageMs: null };
  }
  const ageMs = Number(ageValue);
  return { state: ageMs > SENSOR_STALE_MS ? DATA_STATE.STALE : DATA_STATE.CURRENT, ageMs };
}

function classifyFreshness(observedAtMs, capturedAtMs) {
  if (toIso(observedAtMs) == null || toIso(capturedAtMs) == null) {
    return { state: DATA_STATE.UNKNOWN, ageMs: null };
  }
  const ageMs = capturedAtMs - observedAtMs;
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return { state: DATA_STATE.UNKNOWN, ageMs: null };
  }
  return {
    state: ageMs > SENSOR_STALE_MS ? DATA_STATE.STALE : DATA_STATE.CURRENT,
    ageMs,
  };
}

function classifySensorFreshness(measurement, capturedAtMs) {
  if (!measurement || typeof measurement !== 'object' || Array.isArray(measurement)) {
    return { ...freshnessFromAge(null), observedAt: null };
  }
  const hasTimestamp = Object.prototype.hasOwnProperty.call(measurement, 'timestamp') &&
    measurement.timestamp != null && measurement.timestamp !== '';
  if (hasTimestamp) {
    const timestampMs = parseTimestamp(measurement.timestamp);
    const observedAt = toIso(timestampMs);
    const freshness = observedAt == null
      ? { state: DATA_STATE.UNKNOWN, ageMs: null }
      : classifyFreshness(timestampMs, capturedAtMs);
    return { ...freshness, observedAt };
  }
  return { ...freshnessFromAge(measurement.ageMs), observedAt: null };
}

function aggregateSensorFreshness(sensorFields) {
  const measured = Object.values(sensorFields).filter(field =>
    field.evidenceClass === EVIDENCE_CLASS.MEASURED
  );
  if (!measured.length) return { state: DATA_STATE.UNKNOWN, ageMs: null, observedAt: null };
  const states = new Set(measured.map(field => field.state));
  if (states.size !== 1 || states.has(DATA_STATE.UNKNOWN)) {
    return { state: DATA_STATE.UNKNOWN, ageMs: null, observedAt: null };
  }
  const ages = measured.map(field => field.ageMs);
  const ageMs = ages.every(age => age != null) ? Math.max(...ages) : null;
  const timestamps = measured.map(field => parseTimestamp(field.observedAt));
  const observedAt = timestamps.every(timestamp => timestamp != null)
    ? toIso(Math.min(...timestamps))
    : null;
  return { state: measured[0].state, ageMs, observedAt };
}

/**
 * Build a mixed physical-validation sample without assigning one evidence class
 * to every field. Raw axes, derived motion features, and inferred movement are
 * represented separately. This function deliberately makes no accuracy claim.
 *
 * Native freshness is evaluated per sensor because a bridge-wide last-event
 * timestamp can be recent while an individual sensor's last reading is old.
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
  const capturedAtMs = parseTimestamp(capturedAt);
  const nativeSnapshotAtMs = parseTimestamp(nativeSnapshot?.lastSensorAt);
  const nativeSnapshotObservedAt = toIso(nativeSnapshotAtMs);
  const nativeSnapshotFreshness = classifyFreshness(nativeSnapshotAtMs, capturedAtMs);

  const nativeSensorFields = {};
  if (nativeMeasurements && typeof nativeMeasurements === 'object' && !Array.isArray(nativeMeasurements)) {
    for (const [sensorName, measurement] of Object.entries(nativeMeasurements)) {
      const hasMeasurement = hasValidSensorMeasurement(sensorName, measurement);
      const freshness = classifySensorFreshness(measurement, capturedAtMs);
      nativeSensorFields[sensorName] = {
        value: measurement,
        evidenceClass: hasMeasurement ? EVIDENCE_CLASS.MEASURED : EVIDENCE_CLASS.UNKNOWN,
        state: hasMeasurement ? freshness.state : DATA_STATE.UNKNOWN,
        ageMs: hasMeasurement ? freshness.ageMs : null,
        observedAt: hasMeasurement ? freshness.observedAt : null,
        sensorType: measurement?.sensorType ?? null,
        accuracy: measurement?.accuracy ?? null,
      };
    }
  }
  const nativeFreshness = aggregateSensorFreshness(nativeSensorFields);
  const hasNativeMeasurements = Object.values(nativeSensorFields).some(field =>
    field.evidenceClass === EVIDENCE_CLASS.MEASURED
  );

  const motionTimestamp = parseTimestamp(motion?.timestamp);
  const motionObservedAt = toIso(motionTimestamp);
  const motionFreshness = classifyFreshness(
    motionObservedAt == null ? null : motionTimestamp,
    capturedAtMs
  );
  const hasMotionAxes = motionObservedAt != null &&
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
    at: capturedAt,
    capturedAt,
    deviceId,
    evidenceClass: EVIDENCE_CLASS.UNKNOWN,
    heading: hasHeading ? Number(heading) : null,
    moving,
    motion,
    nativeSensors: nativeMeasurements,
    nativeSensorAt: nativeSnapshot?.lastSensorAt ?? null,
    nativeSensorObservedAt: nativeFreshness.observedAt,
    nativeSensorAgeMs: nativeFreshness.ageMs,
    nativeSensorState: nativeFreshness.state,
    nativeSnapshotObservedAt,
    nativeSnapshotAgeMs: nativeSnapshotFreshness.ageMs,
    nativeSnapshotState: nativeSnapshotFreshness.state,
    motionObservedAt,
    motionAgeMs: hasMotionAxes ? motionFreshness.ageMs : null,
    motionState: hasMotionAxes ? motionFreshness.state : DATA_STATE.UNKNOWN,
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
        observedAt: hasMotionAxes ? motionObservedAt : null,
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
        observedAt: nativeFreshness.observedAt,
        sensorFields: nativeSensorFields,
        modality: 'IMU',
        source: 'WaveRadar native Android sensor bridge',
        snapshotObservedAt: nativeSnapshotObservedAt,
        snapshotState: nativeSnapshotFreshness.state,
        note: hasNativeMeasurements
          ? 'Per-sensor freshness is recorded in sensorFields; a recent bridge-wide timestamp does not make every sensor current.'
          : 'No finite numeric measurement was present in the native snapshot.',
      },
    },
  };
}
