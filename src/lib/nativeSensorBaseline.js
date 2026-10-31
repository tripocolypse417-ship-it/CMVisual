export const NATIVE_SENSOR_BASELINE_SCHEMA = 'waveradar-android-native-baseline-v1';
export const NATIVE_SENSOR_STALE_MS = 5000;

export const NATIVE_SENSOR_NAMES = Object.freeze([
  'accelerometer', 'gyroscope', 'magnetometer', 'rotationVector',
  'gravity', 'barometer', 'ambientLight', 'proximity',
]);

const CAPABILITY_STATES = new Set(['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN']);
const REGISTRATION_STATES = new Set([
  'REGISTERED', 'NOT_REGISTERED', 'REGISTRATION_FAILED', 'UNSUPPORTED', 'UNKNOWN',
]);
const POSE_STATES = new Set(['AVAILABLE', 'UNAVAILABLE', 'NOT_INSTRUMENTED', 'UNKNOWN']);

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteNonNegative(value) {
  return finiteNumber(value) && value >= 0;
}

function normalizeIso(value) {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function inferCapabilityState(entry, managerState) {
  if (CAPABILITY_STATES.has(entry?.capabilityState)) return entry.capabilityState;
  if (typeof entry?.supported === 'boolean') {
    return entry.supported ? 'SUPPORTED' : managerState === 'AVAILABLE' ? 'UNSUPPORTED' : 'UNKNOWN';
  }
  return 'UNKNOWN';
}

function inferRegistrationState(entry, capabilityState) {
  if (REGISTRATION_STATES.has(entry?.registrationState)) return entry.registrationState;
  if (entry?.registered === true) return 'REGISTERED';
  if (entry?.registered === false && capabilityState === 'SUPPORTED') return 'NOT_REGISTERED';
  if (capabilityState === 'UNSUPPORTED') return 'UNSUPPORTED';
  return 'UNKNOWN';
}

function isValidSensorSample(name, measurement) {
  if (!measurement || typeof measurement !== 'object' || Array.isArray(measurement)) return false;
  const values = measurement.values;
  const key = String(name).toLowerCase();
  const vector = ['accelerometer', 'gyroscope', 'magnetometer', 'rotationvector', 'gravity'].includes(key);
  const scalar = ['barometer', 'ambientlight', 'proximity'].includes(key);
  if (vector) {
    return Array.isArray(values)
      ? values.length >= 3 && values.slice(0, 3).every(finiteNumber)
      : ['x', 'y', 'z'].every(axis => finiteNumber(measurement[axis]));
  }
  if (scalar) {
    return Array.isArray(values)
      ? values.length >= 1 && finiteNumber(values[0])
      : finiteNumber(measurement.value ?? measurement.pressure ?? measurement.lux ?? measurement.distance);
  }
  return Array.isArray(values) && values.length > 0 && values.every(finiteNumber);
}

function normalizeSpatialPose(pose) {
  if (POSE_STATES.has(pose?.state)) {
    return {
      state: pose.state,
      source: typeof pose.source === 'string' ? pose.source : null,
      observedAt: normalizeIso(pose.observedAt),
      ageMs: finiteNonNegative(pose.ageMs) ? pose.ageMs : null,
      note: typeof pose.note === 'string' ? pose.note : null,
    };
  }
  return {
    state: 'NOT_INSTRUMENTED',
    source: null,
    observedAt: null,
    ageMs: null,
    note: 'This baseline does not query a spatial-pose provider. Availability has not been tested.',
  };
}

function normalizeWebMotionStatus(permission = {}) {
  const denied = permission.denied === true;
  const promptRequired = permission.needsPermission === true;
  return {
    permissionState: denied ? 'DENIED' : promptRequired ? 'PROMPT_REQUIRED' : 'UNKNOWN',
    eventsObserved: permission.hasSensors === true ? 'OBSERVED' : 'NOT_OBSERVED',
    permissionApi: typeof permission.permissionApi === 'string' ? permission.permissionApi : 'NOT_REPORTED',
    source: 'useDeviceSensors',
  };
}

function normalizeMeasurement(name, measurement, capability, registration) {
  const valid = isValidSensorSample(name, measurement);
  const hasHistory = capability?.hasSampleHistory === true;
  const sequence = finiteNonNegative(measurement?.sampleSequence)
    ? Math.floor(measurement.sampleSequence)
    : null;
  const receivedAt = normalizeIso(measurement?.receivedAt);
  const rawElapsedNs = finiteNonNegative(measurement?.timestampElapsedRealtimeNanos)
    ? String(measurement.timestampElapsedRealtimeNanos)
    : null;
  const measurementTimestamp = normalizeIso(measurement?.timestamp);
  const ageMs = finiteNonNegative(measurement?.ageMs) ? measurement.ageMs : null;
  const freshness = ageMs == null
    ? 'UNKNOWN'
    : ageMs > NATIVE_SENSOR_STALE_MS ? 'STALE' : 'FRESH';

  let arrivalState = 'UNKNOWN';
  if (valid) arrivalState = 'ARRIVED';
  else if (hasHistory) arrivalState = 'HISTORY_ONLY';
  else if (registration.state === 'REGISTERED') arrivalState = 'NOT_ARRIVED';

  return {
    state: arrivalState,
    evidenceClass: valid ? 'MEASURED' : 'UNKNOWN',
    hasValidNumericSample: valid,
    sampleSequence: sequence,
    receivedAt,
    measurementTimestamp,
    timestampBasis: typeof measurement?.timestampClock === 'string'
      ? measurement.timestampClock
      : rawElapsedNs != null
        ? 'ANDROID_ELAPSED_REALTIME_NANOS'
        : measurement?.timestamp != null
          ? 'WALL_CLOCK_OR_ESTIMATE_UNDECLARED'
          : 'UNKNOWN',
    timestampElapsedRealtimeNanos: rawElapsedNs,
    ageMs,
    freshness,
    accuracy: finiteNumber(measurement?.accuracy) ? measurement.accuracy : null,
    sensorType: finiteNumber(measurement?.sensorType) ? measurement.sensorType : null,
    value: valid ? measurement.values ?? {
      x: measurement.x, y: measurement.y, z: measurement.z,
    } : null,
  };
}

/**
 * One capture-time record. Capability, registration, sample arrival,
 * permission, and spatial-pose availability are independent fields.
 * This is evidence instrumentation, not a calibration or accuracy claim.
 */
export function buildNativeSensorBaseline({
  capabilities = null,
  snapshot = null,
  bridgeCallState = 'UNKNOWN',
  capturedAt = null,
  sessionId = null,
  sampleIndex = null,
  webMotionPermission = {},
  spatialPose = null,
} = {}) {
  const source = capabilities ?? snapshot;
  const managerState = source?.androidSensorManager === true
    ? 'AVAILABLE'
    : source?.androidSensorManager === false ? 'UNAVAILABLE' : 'UNKNOWN';
  const registrationMap = source?.sensorRegistration && typeof source.sensorRegistration === 'object'
    ? source.sensorRegistration : {};
  const measurementMap = snapshot?.measurements && typeof snapshot.measurements === 'object'
    ? snapshot.measurements : {};
  const sensors = {};

  for (const name of NATIVE_SENSOR_NAMES) {
    const entry = registrationMap[name] ?? {};
    const capabilityState = inferCapabilityState(entry, managerState);
    const registrationState = inferRegistrationState(entry, capabilityState);
    sensors[name] = {
      capability: {
        state: capabilityState,
        supported: capabilityState === 'SUPPORTED' ? true
          : capabilityState === 'UNSUPPORTED' ? false : null,
      },
      registration: {
        state: registrationState,
        registered: registrationState === 'REGISTERED' ? true
          : ['NOT_REGISTERED', 'REGISTRATION_FAILED', 'UNSUPPORTED'].includes(registrationState) ? false : null,
      },
      sampleArrival: normalizeMeasurement(name, measurementMap[name] ?? null, entry, { state: registrationState }),
    };
  }

  const managerPresent = source?.androidSensorManager === true;
  return {
    schema: NATIVE_SENSOR_BASELINE_SCHEMA,
    capturedAt: normalizeIso(capturedAt),
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    sampleIndex: finiteNonNegative(sampleIndex) ? Math.floor(sampleIndex) : null,
    bridgeCallState: ['OK', 'CALL_FAILED', 'INVALID_RESPONSE', 'NOT_AVAILABLE', 'UNKNOWN'].includes(bridgeCallState)
      ? bridgeCallState : 'UNKNOWN',
    nativeSensorManager: {
      state: managerState,
      sensorCount: finiteNonNegative(source?.sensorCount) ? source.sensorCount : null,
      registeredSensorCount: finiteNonNegative(source?.registeredSensorCount) ? source.registeredSensorCount : null,
      nativeBridgeVersion: typeof source?.nativeBridgeVersion === 'string' ? source.nativeBridgeVersion : null,
    },
    platform: {
      packageName: typeof source?.appPackageName === 'string' ? source.appPackageName : null,
      appVersionName: typeof source?.appVersionName === 'string' ? source.appVersionName : null,
      appVersionCode: finiteNonNegative(source?.appVersionCode) ? source.appVersionCode : null,
      androidRelease: typeof source?.androidRelease === 'string' ? source.androidRelease : null,
      androidSdkInt: finiteNonNegative(source?.androidSdkInt) ? source.androidSdkInt : null,
      manufacturer: typeof source?.manufacturer === 'string' ? source.manufacturer : null,
      model: typeof source?.model === 'string' ? source.model : null,
    },
    permissions: {
      nativeAndroidSensorRuntime: {
        state: managerPresent ? 'NOT_REQUIRED' : 'UNKNOWN',
        source: 'Android SensorManager standard motion/environment sensors; this plugin requests no runtime permission.',
      },
      webMotion: normalizeWebMotionStatus(webMotionPermission),
    },
    spatialPose: normalizeSpatialPose(spatialPose),
    sensors,
    note: 'MEASURED applies only to a finite native numeric sample. No accuracy, calibration, absolute position, or operational readiness is asserted.',
  };
}

function newest(items) {
  return items.length ? items[items.length - 1] : null;
}

function sequenceRange(records) {
  const sequences = records.map(record => record?.sampleArrival?.sampleSequence).filter(finiteNonNegative);
  if (!sequences.length) return { first: null, last: null, observedSpan: null };
  const first = sequences[0];
  const last = sequences[sequences.length - 1];
  return { first, last, observedSpan: Math.max(0, last - first) };
}

/**
 * Summarizes saved polling captures. It does not estimate the native event
 * rate or events missed between polling reads.
 */
export function summarizeNativeSensorBaseline({
  capabilities = null,
  samples = [],
  bridgeCallStates = [],
  webMotionPermission = {},
  spatialPose = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const records = Array.isArray(samples)
    ? samples.map(sample => sample?.nativeSensorBaseline)
      .filter(record => record?.schema === NATIVE_SENSOR_BASELINE_SCHEMA)
    : [];
  const latestRecord = newest(records);
  const lastKnownCapabilityRecord = newest(records.filter(record =>
    record?.nativeSensorManager?.state && record.nativeSensorManager.state !== 'UNKNOWN'
  ));
  const latestBridgeCallState = newest(Array.isArray(bridgeCallStates) ? bridgeCallStates : []) ?? 'UNKNOWN';
  const sensors = {};

  for (const name of NATIVE_SENSOR_NAMES) {
    const captures = records.map(record => record.sensors?.[name]).filter(Boolean);
    const arrived = captures.filter(record => record.sampleArrival?.state === 'ARRIVED');
    const arrivalRecords = arrived.map(record => record.sampleArrival);
    const seq = sequenceRange(arrivalRecords);
    const capability = newest(captures.filter(record => record.capability?.state !== 'UNKNOWN').map(record => record.capability));
    const registration = newest(captures.filter(record => record.registration?.state !== 'UNKNOWN').map(record => record.registration));
    const latestCapture = newest(captures);
    const first = arrivalRecords.length ? arrivalRecords[0] : null;
    const last = newest(arrivalRecords);
    sensors[name] = {
      capabilityState: capability?.state ?? 'UNKNOWN',
      registrationState: registration?.state ?? 'UNKNOWN',
      latestSampleArrivalState: latestCapture?.sampleArrival?.state ?? 'UNKNOWN',
      capturedSampleCount: arrived.length,
      firstEventReceivedAt: first?.receivedAt ?? null,
      lastEventReceivedAt: last?.receivedAt ?? null,
      firstMeasurementTimestamp: first?.measurementTimestamp ?? null,
      lastMeasurementTimestamp: last?.measurementTimestamp ?? null,
      firstSequence: seq.first,
      lastSequence: seq.last,
      observedSequenceSpan: seq.observedSpan,
      latestFreshness: last?.freshness ?? 'UNKNOWN',
      latestAgeMs: last?.ageMs ?? null,
      latestAccuracy: last?.accuracy ?? null,
    };
  }

  return {
    schema: NATIVE_SENSOR_BASELINE_SCHEMA,
    generatedAt: normalizeIso(generatedAt),
    captureCount: records.length,
    bridgeCallStates: Array.isArray(bridgeCallStates) ? bridgeCallStates : [],
    latestBridgeCallState,
    lastKnownCapabilityCapturedAt: lastKnownCapabilityRecord?.capturedAt ?? null,
    nativeSensorManager: lastKnownCapabilityRecord?.nativeSensorManager ?? {
      state: capabilities?.androidSensorManager === true ? 'AVAILABLE'
        : capabilities?.androidSensorManager === false ? 'UNAVAILABLE' : 'UNKNOWN',
      sensorCount: finiteNonNegative(capabilities?.sensorCount) ? capabilities.sensorCount : null,
      registeredSensorCount: finiteNonNegative(capabilities?.registeredSensorCount) ? capabilities.registeredSensorCount : null,
      nativeBridgeVersion: typeof capabilities?.nativeBridgeVersion === 'string' ? capabilities.nativeBridgeVersion : null,
    },
    platform: lastKnownCapabilityRecord?.platform ?? {},
    permissions: {
      nativeAndroidSensorRuntime: lastKnownCapabilityRecord?.permissions?.nativeAndroidSensorRuntime ?? {
        state: capabilities?.androidSensorManager === true ? 'NOT_REQUIRED' : 'UNKNOWN',
        source: 'Android SensorManager policy',
      },
      webMotion: normalizeWebMotionStatus(webMotionPermission),
    },
    spatialPose: normalizeSpatialPose(spatialPose ?? latestRecord?.spatialPose),
    sensors,
    evidenceLimit: 'Capture counts mean saved polling records containing valid numeric readings, not the native event rate.',
  };
}
