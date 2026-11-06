import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ANALYSIS_SCHEMA = 'waveradar.android-reference-analysis.v1';

const CHANNELS = Object.freeze([
  { sensor: 'accelerometer', referenceField: 'accelerometerMps2', unit: 'm/s^2' },
  { sensor: 'gyroscope', referenceField: 'gyroscopeRadPerSec', unit: 'rad/s' },
]);

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parseNs(value, field) {
  let parsed;
  if (typeof value === 'bigint') parsed = value;
  else if (typeof value === 'number' && Number.isSafeInteger(value)) parsed = BigInt(value);
  else if (typeof value === 'string' && /^\d+$/.test(value.trim())) parsed = BigInt(value.trim());
  else throw new Error(`${field} must be a non-negative integer nanosecond timestamp`);
  if (parsed < 0n) throw new Error(`${field} must be non-negative`);
  return parsed;
}

function finiteVector(value) {
  const vector = Array.isArray(value)
    ? value.slice(0, 3)
    : isObject(value) ? [value.x, value.y, value.z] : null;
  return vector && vector.length === 3 && vector.every(item => typeof item === 'number' && Number.isFinite(item))
    ? vector
    : null;
}

function sameVector(a, b) {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

function validateRotationMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 3 || matrix.some(row =>
    !Array.isArray(row) || row.length !== 3 || row.some(value => typeof value !== 'number' || !Number.isFinite(value))
  )) return { valid: false, reason: 'A finite 3x3 reference-to-WaveRadar rotation matrix is required.' };

  const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
  const rows = matrix;
  const rowErrors = [];
  for (let i = 0; i < 3; i += 1) {
    rowErrors.push(Math.abs(dot(rows[i], rows[i]) - 1));
    for (let j = i + 1; j < 3; j += 1) rowErrors.push(Math.abs(dot(rows[i], rows[j])));
  }
  const determinant =
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
  const maxOrthogonalityError = Math.max(...rowErrors);
  if (maxOrthogonalityError > 1e-3 || Math.abs(determinant - 1) > 1e-3) {
    return {
      valid: false,
      reason: 'The coordinate transform is not a right-handed orthonormal rotation matrix.',
      determinant,
      maxOrthogonalityError,
    };
  }
  return { valid: true, determinant, maxOrthogonalityError };
}

function fitClock(pairs = []) {
  const validPairs = [];
  let invalidPairCount = 0;
  for (const pair of Array.isArray(pairs) ? pairs : []) {
    try {
      const referenceNs = parseNs(pair?.referenceTimestampNs, 'clockSync.pairs.referenceTimestampNs');
      const androidNs = parseNs(pair?.androidElapsedRealtimeNanos, 'clockSync.pairs.androidElapsedRealtimeNanos');
      const uncertaintyNs = pair?.uncertaintyNs == null ? null : parseNs(pair.uncertaintyNs, 'clockSync.pairs.uncertaintyNs');
      validPairs.push({ referenceNs, androidNs, uncertaintyNs });
    } catch {
      invalidPairCount += 1;
    }
  }

  validPairs.sort((a, b) => a.referenceNs < b.referenceNs ? -1 : a.referenceNs > b.referenceNs ? 1 : 0);
  const base = {
    status: 'INSUFFICIENT_VALID_SYNC_PAIRS',
    method: 'LEAST_SQUARES_AFFINE_REFERENCE_TO_ANDROID_ELAPSED_REALTIME',
    pairCount: validPairs.length,
    invalidPairCount,
    minimumPairsRequired: 3,
    slope: null,
    driftPpm: null,
    referenceOriginNs: validPairs[0]?.referenceNs.toString() ?? null,
    androidOriginNs: validPairs[0]?.androidNs.toString() ?? null,
    referenceEndNs: validPairs[validPairs.length - 1]?.referenceNs.toString() ?? null,
    androidEndNs: validPairs[validPairs.length - 1]?.androidNs.toString() ?? null,
    interceptFromOriginNs: null,
    rmsResidualNs: null,
    maxAbsoluteResidualNs: null,
    maxDeclaredPairUncertaintyNs: validPairs.some(pair => pair.uncertaintyNs != null)
      ? validPairs.reduce((max, pair) => pair.uncertaintyNs != null && pair.uncertaintyNs > max ? pair.uncertaintyNs : max, 0n).toString()
      : null,
    declaredUncertaintyComplete: validPairs.length > 0 && validPairs.every(pair => pair.uncertaintyNs != null),
    referenceToAndroidMapping: 'androidNs = androidOriginNs + interceptFromOriginNs + slope * (referenceNs - referenceOriginNs)',
  };
  if (validPairs.length < 3) return { ...base, pairs: validPairs };

  const first = validPairs[0];
  const xs = validPairs.map(pair => Number(pair.referenceNs - first.referenceNs));
  const ys = validPairs.map(pair => Number(pair.androidNs - first.androidNs));
  if (xs.some(value => !Number.isSafeInteger(value)) || ys.some(value => !Number.isSafeInteger(value))) {
    return { ...base, status: 'CLOCK_SYNC_RANGE_EXCEEDS_SAFE_NUMERIC_PRECISION', pairs: validPairs };
  }
  for (let i = 1; i < validPairs.length; i += 1) {
    if (validPairs[i].referenceNs <= validPairs[i - 1].referenceNs || validPairs[i].androidNs <= validPairs[i - 1].androidNs) {
      return { ...base, status: 'CLOCK_SYNC_PAIRS_NOT_STRICTLY_MONOTONIC', pairs: validPairs };
    }
  }

  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  if (!(denominator > 0)) return { ...base, status: 'CLOCK_SYNC_REFERENCE_SPAN_ZERO', pairs: validPairs };
  const slope = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0) / denominator;
  if (!Number.isFinite(slope) || slope <= 0) return { ...base, status: 'CLOCK_SYNC_INVALID_SLOPE', pairs: validPairs };
  const interceptFromOriginNs = meanY - slope * meanX;
  const residuals = xs.map((value, index) => ys[index] - (interceptFromOriginNs + slope * value));
  const rmsResidualNs = Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length);
  const maxAbsoluteResidualNs = Math.max(...residuals.map(Math.abs));

  return {
    ...base,
    status: 'FIT_COMPUTED_PENDING_REVIEW',
    slope,
    driftPpm: (slope - 1) * 1e6,
    interceptFromOriginNs: Math.round(interceptFromOriginNs).toString(),
    rmsResidualNs,
    maxAbsoluteResidualNs,
    referenceSpanNs: (validPairs[validPairs.length - 1].referenceNs - first.referenceNs).toString(),
    pairs: validPairs,
  };
}

function mapAndroidToReference(androidTimestampNs, clockFit) {
  const referenceOrigin = BigInt(clockFit.referenceOriginNs);
  const androidOrigin = BigInt(clockFit.androidOriginNs);
  const androidEnd = BigInt(clockFit.androidEndNs);
  // A fitted clock model is valid only inside the observed synchronization span.
  // Do not extrapolate timestamps beyond the first/last paired sync observations.
  if (androidTimestampNs < androidOrigin || androidTimestampNs > androidEnd) return null;
  const intercept = Number(clockFit.interceptFromOriginNs);
  const deltaAndroid = Number(androidTimestampNs - androidOrigin);
  if (!Number.isSafeInteger(deltaAndroid)) return null;
  const deltaReference = (deltaAndroid - intercept) / clockFit.slope;
  if (!Number.isFinite(deltaReference) || Math.abs(deltaReference) > Number.MAX_SAFE_INTEGER) return null;
  return referenceOrigin + BigInt(Math.round(deltaReference));
}

function buildReferenceChannel(samples, field) {
  const byTimestamp = new Map();
  const conflictingTimestamps = new Set();
  let invalidTimestampCount = 0;
  let invalidVectorCount = 0;
  let duplicateIdenticalCount = 0;
  let conflictingTimestampCount = 0;
  for (const sample of Array.isArray(samples) ? samples : []) {
    let timestampNs;
    try {
      timestampNs = parseNs(sample?.timestampNs, `referenceSamples.${field}.timestampNs`);
    } catch {
      invalidTimestampCount += 1;
      continue;
    }
    const vector = finiteVector(sample?.[field]);
    if (!vector) {
      invalidVectorCount += 1;
      continue;
    }
    const key = timestampNs.toString();
    if (conflictingTimestamps.has(key)) {
      conflictingTimestampCount += 1;
      continue;
    }
    const previous = byTimestamp.get(key);
    if (!previous) byTimestamp.set(key, { timestampNs, vector });
    else if (sameVector(previous.vector, vector)) duplicateIdenticalCount += 1;
    else {
      byTimestamp.delete(key);
      conflictingTimestamps.add(key);
      conflictingTimestampCount += 1;
    }
  }
  const rows = [...byTimestamp.values()].filter(Boolean).sort((a, b) => a.timestampNs < b.timestampNs ? -1 : a.timestampNs > b.timestampNs ? 1 : 0);
  return {
    rows,
    diagnostics: { invalidTimestampCount, invalidVectorCount, duplicateIdenticalCount, conflictingTimestampCount },
  };
}

function interpolateReference(rows, targetNs, maxGapNs) {
  if (!rows.length) return { value: null, reason: 'NO_VALID_REFERENCE_CHANNEL_SAMPLES' };
  let low = 0;
  let high = rows.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const timestamp = rows[mid].timestampNs;
    if (timestamp === targetNs) return { value: rows[mid].vector, reason: null, exact: true };
    if (timestamp < targetNs) low = mid + 1;
    else high = mid - 1;
  }
  if (high < 0 || low >= rows.length) return { value: null, reason: 'OUTSIDE_REFERENCE_TIME_WINDOW' };
  const left = rows[high];
  const right = rows[low];
  const gap = right.timestampNs - left.timestampNs;
  if (gap <= 0n || gap > maxGapNs) return { value: null, reason: 'REFERENCE_BRACKET_GAP_EXCEEDS_PREREGISTERED_LIMIT' };
  const numerator = Number(targetNs - left.timestampNs);
  const denominator = Number(gap);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    return { value: null, reason: 'REFERENCE_INTERPOLATION_PRECISION_UNAVAILABLE' };
  }
  const fraction = numerator / denominator;
  return {
    value: left.vector.map((value, index) => value + fraction * (right.vector[index] - value)),
    reason: null,
    exact: false,
  };
}

function extractWaveRadarEvents(samples, sensor) {
  const bySequence = new Map();
  const conflicts = new Set();
  const exclusions = {};
  const count = reason => { exclusions[reason] = (exclusions[reason] || 0) + 1; };
  let rawArrivedCount = 0;
  let previousObservedSequence = null;
  let outOfOrderSequenceCount = 0;
  const timestampBasisCounts = {};

  for (let pollIndex = 0; pollIndex < (Array.isArray(samples) ? samples.length : 0); pollIndex += 1) {
    const arrival = samples[pollIndex]?.nativeSensorBaseline?.sensors?.[sensor]?.sampleArrival;
    if (!arrival || arrival.state !== 'ARRIVED') {
      count(arrival?.state || 'MISSING_SENSOR_CAPTURE');
      continue;
    }
    rawArrivedCount += 1;
    if (arrival.evidenceClass !== 'MEASURED') {
      count('NON_MEASURED_EVIDENCE_CLASS');
      continue;
    }
    const timestampBasis = typeof arrival.timestampBasis === 'string' && arrival.timestampBasis.trim()
      ? arrival.timestampBasis : 'NOT_REPORTED';
    timestampBasisCounts[timestampBasis] = (timestampBasisCounts[timestampBasis] || 0) + 1;
    if (!Number.isSafeInteger(arrival.sampleSequence) || arrival.sampleSequence < 1) {
      count('MISSING_OR_INVALID_SAMPLE_SEQUENCE');
      continue;
    }
    if (previousObservedSequence != null && arrival.sampleSequence < previousObservedSequence) outOfOrderSequenceCount += 1;
    previousObservedSequence = arrival.sampleSequence;
    let timestampNs;
    try {
      timestampNs = parseNs(arrival.timestampElapsedRealtimeNanos, 'timestampElapsedRealtimeNanos');
    } catch {
      count('MISSING_OR_INVALID_ELAPSED_REALTIME_TIMESTAMP');
      continue;
    }
    const vector = finiteVector(arrival.value);
    if (!vector) {
      count('INVALID_OR_MISSING_MEASURED_VECTOR');
      continue;
    }
    const event = { sequence: arrival.sampleSequence, timestampNs, vector, pollIndex };
    const prior = bySequence.get(event.sequence);
    if (!prior && !conflicts.has(event.sequence)) bySequence.set(event.sequence, event);
    else if (prior && prior.timestampNs === event.timestampNs && sameVector(prior.vector, event.vector)) count('REPEATED_POLL_OF_SAME_NATIVE_EVENT');
    else {
      bySequence.delete(event.sequence);
      conflicts.add(event.sequence);
      count('CONFLICTING_DUPLICATE_SEQUENCE_EXCLUDED');
    }
  }

  const events = [...bySequence.values()].sort((a, b) => a.sequence - b.sequence);
  let missingSequenceCount = 0;
  for (let i = 1; i < events.length; i += 1) {
    const gap = events[i].sequence - events[i - 1].sequence;
    if (gap > 1) missingSequenceCount += gap - 1;
  }
  let nonMonotonicEventTimestampCount = 0;
  for (let i = 1; i < events.length; i += 1) {
    if (events[i].timestampNs <= events[i - 1].timestampNs) nonMonotonicEventTimestampCount += 1;
  }
  return {
    events,
    diagnostics: {
      rawArrivedPollingRecords: rawArrivedCount,
      uniqueNativeEvents: events.length,
      repeatedPollRecords: exclusions.REPEATED_POLL_OF_SAME_NATIVE_EVENT || 0,
      conflictingDuplicateSequenceCount: exclusions.CONFLICTING_DUPLICATE_SEQUENCE_EXCLUDED || 0,
      outOfOrderSequenceCount,
      missingSequenceCount,
      nonMonotonicEventTimestampCount,
      timestampBasisCounts,
      excludedByReason: exclusions,
    },
  };
}

function summarizeErrors(errors) {
  if (!errors.length) return null;
  const metrics = {};
  for (let axis = 0; axis < 3; axis += 1) {
    const values = errors.map(error => error[axis]).sort((a, b) => a - b);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.length > 1
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
      : null;
    const absolute = values.map(Math.abs).sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.ceil(0.95 * absolute.length) - 1);
    metrics[['x', 'y', 'z'][axis]] = {
      bias: mean,
      sampleStandardDeviation: variance == null ? null : Math.sqrt(variance),
      rmse: Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length),
      p95AbsoluteError: absolute[p95Index],
      maximumAbsoluteError: absolute[absolute.length - 1],
    };
  }
  return metrics;
}

function calibrationMetadata(instrument = {}, measurementWindow = {}) {
  const uncertainty = instrument.standardUncertainty || {};
  const channelUncertainty = {};
  for (const channel of CHANNELS) {
    const axis = uncertainty[channel.referenceField];
    channelUncertainty[channel.sensor] = isObject(axis) && ['x', 'y', 'z'].every(key =>
      typeof axis[key] === 'number' && Number.isFinite(axis[key]) && axis[key] >= 0
    );
  }
  const calibrationDateValid = typeof instrument.calibrationDate === 'string'
    && Number.isFinite(Date.parse(instrument.calibrationDate));
  const validThrough = typeof instrument.calibrationValidThrough === 'string'
    && Number.isFinite(Date.parse(instrument.calibrationValidThrough));
  const windowStartValid = typeof measurementWindow.startedAt === 'string'
    && Number.isFinite(Date.parse(measurementWindow.startedAt));
  const windowEndValid = typeof measurementWindow.endedAt === 'string'
    && Number.isFinite(Date.parse(measurementWindow.endedAt));
  const measurementWindowValid = windowStartValid && windowEndValid
    && Date.parse(measurementWindow.endedAt) >= Date.parse(measurementWindow.startedAt);
  const calibrationWindowCoversRun = calibrationDateValid && validThrough && measurementWindowValid
    && Date.parse(instrument.calibrationDate) <= Date.parse(measurementWindow.startedAt)
    && Date.parse(instrument.calibrationValidThrough) >= Date.parse(measurementWindow.endedAt);
  const complete = instrument.calibrationStatus === 'CALIBRATED'
    && typeof instrument.makeModel === 'string' && instrument.makeModel.trim().length > 0
    && typeof instrument.assetId === 'string' && instrument.assetId.trim().length > 0
    && typeof instrument.calibrationEvidenceRef === 'string' && instrument.calibrationEvidenceRef.trim().length > 0
    && typeof instrument.calibrationCertificateSha256 === 'string' && /^[a-f0-9]{64}$/i.test(instrument.calibrationCertificateSha256)
    && calibrationWindowCoversRun
    && Object.values(channelUncertainty).every(Boolean);
  return {
    state: complete ? 'METADATA_COMPLETE_PENDING_CUSTODIAN_VERIFICATION' : 'NOT_ESTABLISHED',
    calibrationStatus: instrument.calibrationStatus || 'UNKNOWN',
    calibrationEvidenceRefPresent: Boolean(instrument.calibrationEvidenceRef),
    calibrationCertificateDigestPresent: typeof instrument.calibrationCertificateSha256 === 'string' && /^[a-f0-9]{64}$/i.test(instrument.calibrationCertificateSha256),
    calibrationDate: calibrationDateValid ? instrument.calibrationDate : null,
    calibrationValidThrough: validThrough ? instrument.calibrationValidThrough : null,
    measurementWindowCoveredByCalibration: calibrationWindowCoversRun,
    perChannelStandardUncertaintyPresent: channelUncertainty,
    limitation: 'Metadata completeness does not authenticate the certificate, asset, calibration traceability, or uncertainty statement. Independent evidence-custodian review is required.',
  };
}

function detectQaFixture(waveRadarExport, referenceArtifact) {
  const reasons = [];
  if (waveRadarExport.qaFixture === true) reasons.push('WAVERADAR_EXPORT_QA_FIXTURE_FLAG');
  if (waveRadarExport.evidenceClass === 'QA_FIXTURE') reasons.push('WAVERADAR_EXPORT_QA_EVIDENCE_CLASS');
  if (referenceArtifact.qaFixture === true) reasons.push('REFERENCE_ARTIFACT_QA_FIXTURE_FLAG');
  if (referenceArtifact.evidenceClass === 'QA_FIXTURE') reasons.push('REFERENCE_ARTIFACT_QA_EVIDENCE_CLASS');
  if (Array.isArray(waveRadarExport.samples) && waveRadarExport.samples.some(sample =>
    sample?.qaFixture === true || sample?.evidenceClass === 'QA_FIXTURE'
  )) reasons.push('WAVERADAR_SAMPLE_QA_FIXTURE_FLAG');
  if (Array.isArray(referenceArtifact.referenceSamples) && referenceArtifact.referenceSamples.some(sample =>
    sample?.qaFixture === true || sample?.evidenceClass === 'QA_FIXTURE'
  )) reasons.push('REFERENCE_SAMPLE_QA_FIXTURE_FLAG');
  return { detected: reasons.length > 0, reasons };
}

function summarizeStates(records, selector, allowedStates) {
  const values = records.map(record => {
    const value = selector(record);
    return allowedStates.has(value) ? value : 'UNKNOWN';
  });
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  const unique = Object.keys(counts);
  return {
    state: unique.length === 1 ? unique[0] : unique.length === 0 ? 'UNKNOWN' : 'MIXED',
    complete: records.length > 0 && values.length === records.length && values.every(value => value !== 'UNKNOWN'),
    recordCount: records.length,
    counts,
  };
}

function baselineRecords(samples) {
  return (Array.isArray(samples) ? samples : [])
    .map(sample => sample?.nativeSensorBaseline)
    .filter(record => record?.schema === 'waveradar-android-native-baseline-v1');
}

function summarizeSensorLifecycle(samples, sensor) {
  const records = baselineRecords(samples);
  return {
    baselineRecordCoverage: {
      capturedSampleCount: Array.isArray(samples) ? samples.length : 0,
      baselineRecordCount: records.length,
      complete: Array.isArray(samples) && samples.length > 0 && records.length === samples.length,
    },
    capability: summarizeStates(
      records,
      record => record.sensors?.[sensor]?.capability?.state,
      new Set(['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN']),
    ),
    registration: summarizeStates(
      records,
      record => record.sensors?.[sensor]?.registration?.state,
      new Set(['REGISTERED', 'NOT_REGISTERED', 'REGISTRATION_FAILED', 'UNSUPPORTED', 'UNKNOWN']),
    ),
  };
}

function summarizeNativeAccessContext(samples) {
  const records = baselineRecords(samples);
  return {
    baselineRecordCoverage: {
      capturedSampleCount: Array.isArray(samples) ? samples.length : 0,
      baselineRecordCount: records.length,
      complete: Array.isArray(samples) && samples.length > 0 && records.length === samples.length,
    },
    nativeAndroidSensorRuntimePolicy: summarizeStates(
      records,
      record => record.permissions?.nativeAndroidSensorRuntime?.state,
      new Set(['NOT_REQUIRED', 'UNKNOWN']),
    ),
    webMotionPermission: summarizeStates(
      records,
      record => record.permissions?.webMotion?.permissionState,
      new Set(['DENIED', 'PROMPT_REQUIRED', 'UNKNOWN']),
    ),
    spatialPose: summarizeStates(
      records,
      record => record.spatialPose?.state,
      new Set(['AVAILABLE', 'UNAVAILABLE', 'NOT_INSTRUMENTED', 'UNKNOWN']),
    ),
    interpretation: {
      webMotionPermissionAffectsNativeSensorEligibility: false,
      spatialPoseAffectsNativeSensorEligibility: false,
      note: 'Web motion permission and spatial-pose provider state are reported independently; neither is substituted for native SensorManager capability or registration.',
    },
  };
}

export function analyzeAndroidReference({ waveRadarExport, referenceArtifact, inputDigests = {} }) {
  if (!isObject(waveRadarExport) || !/^cmvisual-physical-validation-v\d+$/.test(String(waveRadarExport.schema || '')) || !Array.isArray(waveRadarExport.samples)) {
    throw new Error('WaveRadar export must use a cmvisual-physical-validation-vN schema and contain a samples array.');
  }
  if (!isObject(referenceArtifact) || referenceArtifact.schema !== 'waveradar.independent-reference-imu.v1') {
    throw new Error('Reference artifact schema must be waveradar.independent-reference-imu.v1.');
  }
  if (!Array.isArray(referenceArtifact.referenceSamples)) throw new Error('referenceArtifact.referenceSamples must be an array.');
  const maxGapValue = referenceArtifact.analysis?.maxInterpolationGapNs;
  const maxInterpolationGapNs = parseNs(maxGapValue, 'analysis.maxInterpolationGapNs');
  if (maxInterpolationGapNs <= 0n) throw new Error('analysis.maxInterpolationGapNs must be greater than zero.');

  const matrix = referenceArtifact.coordinateFrame?.referenceToWaveRadarRotationMatrix;
  const frame = validateRotationMatrix(matrix);
  const clockFit = fitClock(referenceArtifact.clockSync?.pairs || []);
  const measurementWindow = referenceArtifact.measurementWindow || {};
  const calibration = calibrationMetadata(referenceArtifact.instrument || {}, measurementWindow);
  const qaFixture = detectQaFixture(waveRadarExport, referenceArtifact);
  const nativeAccessContext = summarizeNativeAccessContext(waveRadarExport.samples);
  const preregistration = referenceArtifact.preregistration || {};
  const clockMethodComplete = typeof referenceArtifact.clockSync?.method === 'string' && referenceArtifact.clockSync.method.trim().length > 0;
  const preregistrationComplete = typeof preregistration.protocolId === 'string' && preregistration.protocolId.trim().length > 0
    && typeof preregistration.protocolVersion === 'string' && preregistration.protocolVersion.trim().length > 0
    && typeof preregistration.preregisteredAt === 'string' && Number.isFinite(Date.parse(preregistration.preregisteredAt))
    && typeof measurementWindow.startedAt === 'string' && Number.isFinite(Date.parse(measurementWindow.startedAt))
    && Date.parse(preregistration.preregisteredAt) <= Date.parse(measurementWindow.startedAt);
  const analysisCanCompare = clockFit.status === 'FIT_COMPUTED_PENDING_REVIEW' && frame.valid;
  const sensors = {};

  for (const channel of CHANNELS) {
    const wave = extractWaveRadarEvents(waveRadarExport.samples, channel.sensor);
    const reference = buildReferenceChannel(referenceArtifact.referenceSamples, channel.referenceField);
    const lifecycle = summarizeSensorLifecycle(waveRadarExport.samples, channel.sensor);
    const exclusions = {};
    const count = reason => { exclusions[reason] = (exclusions[reason] || 0) + 1; };
    const errors = [];
    let exactReferenceMatches = 0;
    let interpolatedReferenceMatches = 0;

    if (!analysisCanCompare) {
      count(clockFit.status !== 'FIT_COMPUTED_PENDING_REVIEW' ? 'CLOCK_SYNC_NOT_COMPUTABLE' : 'COORDINATE_FRAME_INVALID');
    } else {
      for (const event of wave.events) {
        const referenceTime = mapAndroidToReference(event.timestampNs, clockFit);
        if (referenceTime == null) {
          const androidStart = BigInt(clockFit.androidOriginNs);
          const androidEnd = BigInt(clockFit.androidEndNs);
          count(event.timestampNs < androidStart || event.timestampNs > androidEnd
            ? 'CLOCK_MAPPING_OUTSIDE_SYNC_PAIR_RANGE'
            : 'CLOCK_MAPPING_PRECISION_UNAVAILABLE');
          continue;
        }
        const matched = interpolateReference(reference.rows, referenceTime, maxInterpolationGapNs);
        if (!matched.value) {
          count(matched.reason);
          continue;
        }
        const transformed = matrix.map(row => row.reduce((sum, coefficient, index) => sum + coefficient * matched.value[index], 0));
        errors.push(event.vector.map((value, index) => value - transformed[index]));
        if (matched.exact) exactReferenceMatches += 1;
        else interpolatedReferenceMatches += 1;
      }
    }

    const sequenceIntegrityAcceptable =
      wave.diagnostics.conflictingDuplicateSequenceCount === 0 &&
      wave.diagnostics.nonMonotonicEventTimestampCount === 0 &&
      wave.diagnostics.outOfOrderSequenceCount === 0 &&
      reference.diagnostics.conflictingTimestampCount === 0;
    const eligibilityReasons = [];
    if (qaFixture.detected) eligibilityReasons.push('QA_FIXTURE_INPUT');
    if (!lifecycle.baselineRecordCoverage.complete) eligibilityReasons.push('NATIVE_BASELINE_RECORD_COVERAGE_INCOMPLETE');
    if (!lifecycle.capability.complete || lifecycle.capability.state !== 'SUPPORTED') eligibilityReasons.push('SENSOR_CAPABILITY_NOT_CONFIRMED_SUPPORTED');
    if (!lifecycle.registration.complete || lifecycle.registration.state !== 'REGISTERED') eligibilityReasons.push('SENSOR_REGISTRATION_NOT_CONFIRMED_REGISTERED');
    if (!nativeAccessContext.baselineRecordCoverage.complete) eligibilityReasons.push('NATIVE_ACCESS_CONTEXT_INCOMPLETE');
    if (!nativeAccessContext.nativeAndroidSensorRuntimePolicy.complete ||
        nativeAccessContext.nativeAndroidSensorRuntimePolicy.state !== 'NOT_REQUIRED') {
      eligibilityReasons.push('NATIVE_ANDROID_SENSOR_RUNTIME_POLICY_NOT_CONFIRMED');
    }
    if (!analysisCanCompare) eligibilityReasons.push('CLOCK_OR_COORDINATE_FRAME_NOT_COMPUTABLE');
    if (errors.length === 0) eligibilityReasons.push('NO_MATCHED_REFERENCE_SAMPLES');
    if (!preregistrationComplete) eligibilityReasons.push('PREREGISTRATION_NOT_ESTABLISHED');
    if (!clockMethodComplete || !clockFit.declaredUncertaintyComplete || clockFit.invalidPairCount !== 0) {
      eligibilityReasons.push('CLOCK_SYNCHRONIZATION_METHOD_OR_UNCERTAINTY_INCOMPLETE');
    }
    if (calibration.state !== 'METADATA_COMPLETE_PENDING_CUSTODIAN_VERIFICATION') {
      eligibilityReasons.push('INSTRUMENT_CALIBRATION_METADATA_INCOMPLETE');
    }
    if (!calibration.perChannelStandardUncertaintyPresent[channel.sensor]) {
      eligibilityReasons.push('REFERENCE_CHANNEL_UNCERTAINTY_INCOMPLETE');
    }
    if (!sequenceIntegrityAcceptable) eligibilityReasons.push('SEQUENCE_OR_REFERENCE_TIMESTAMP_INTEGRITY_NOT_ESTABLISHED');

    const sensorAccuracyEvidenceStatus = eligibilityReasons.length === 0
      ? 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED'
      : 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY';

    sensors[channel.sensor] = {
      unit: channel.unit,
      lifecycle,
      waveRadar: wave.diagnostics,
      reference: reference.diagnostics,
      validReferenceSamples: reference.rows.length,
      matchedSampleCount: errors.length,
      exactReferenceMatches,
      interpolatedReferenceMatches,
      unmatchedOrExcludedByReason: exclusions,
      perAxisError: summarizeErrors(errors),
      vectorRmse: errors.length
        ? Math.sqrt(errors.reduce((sum, vector) => sum + vector.reduce((inner, value) => sum + value * value, 0), 0) / errors.length)
        : null,
      comparisonStatus: errors.length ? 'COMPUTED_PENDING_INDEPENDENT_REVIEW' : 'NO_COMPARISON_COMPUTED',
      accuracyEvidenceStatus: sensorAccuracyEvidenceStatus,
      eligibilityReasons,
    };
  }

  const candidateChannelCount = CHANNELS.filter(channel =>
    sensors[channel.sensor].accuracyEvidenceStatus === 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED'
  ).length;
  const accuracyEvidenceStatus = candidateChannelCount === CHANNELS.length
    ? 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED'
    : candidateChannelCount > 0
      ? 'PARTIAL_CHANNEL_CANDIDATE_NOT_VERIFIED'
      : 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY';

  return {
    schema: ANALYSIS_SCHEMA,
    generatedAt: new Date().toISOString(),
    qaFixture,
    nativeAccessContext,
    analysisDisposition: analysisCanCompare ? 'COMPUTED_COMPARISON_PENDING_INDEPENDENT_REVIEW' : 'NOT_COMPUTABLE_WITH_CURRENT_SYNC_OR_FRAME_METADATA',
    accuracyEvidenceStatus,
    inputs: {
      waveRadarSchema: waveRadarExport.schema || 'UNKNOWN',
      waveRadarSessionId: waveRadarExport.sessionId || null,
      waveRadarDeviceId: waveRadarExport.deviceId || null,
      waveRadarSourceCommit: waveRadarExport.sourceCommit || null,
      waveRadarExportSha256: inputDigests.waveRadarExportSha256 || null,
      referenceArtifactSha256: inputDigests.referenceArtifactSha256 || null,
      protocolId: referenceArtifact.preregistration?.protocolId || null,
      protocolVersion: referenceArtifact.preregistration?.protocolVersion || null,
      preregisteredAt: preregistration.preregisteredAt || null,
      preregistrationComplete,
      measurementWindow,
    },
    clockSynchronization: {
      ...clockFit,
      pairs: undefined,
      declaredMethod: referenceArtifact.clockSync?.method || 'NOT_REPORTED',
      declaredMethodComplete: clockMethodComplete,
    },
    coordinateFrame: {
      state: frame.valid ? 'VALID_ORTHONORMAL_ROTATION_PENDING_REVIEW' : 'INVALID',
      reason: frame.reason || null,
      determinant: frame.determinant ?? null,
      maxOrthogonalityError: frame.maxOrthogonalityError ?? null,
      referenceToWaveRadarRotationMatrix: frame.valid ? matrix : null,
    },
    instrumentCalibration: calibration,
    analysisMethod: {
      interpolation: 'LINEAR_BETWEEN_BRACKETING_REFERENCE_SAMPLES_ONLY; NO_EXTRAPOLATION',
      maxInterpolationGapNs: maxInterpolationGapNs.toString(),
      waveRadarRepeatedPollPolicy: 'Deduplicate identical repeated polling records by native sampleSequence; exclude conflicting duplicate sequences.',
      alignmentTimestampField: 'timestampElapsedRealtimeNanos (raw Android SensorEvent.timestamp); timestampBasis is retained as measurement-timestamp context, not used as the alignment clock.',
      sequenceGapPolicy: 'Report missing sequence counts; do not synthesize samples.',
      metrics: ['per-axis bias', 'sample standard deviation of error', 'RMSE', '95th percentile absolute error', 'maximum absolute error', 'vector RMSE'],
      automaticPassFail: false,
    },
    sensors,
    limitations: [
      'This analyzer does not certify the instrument, calibration, witness independence, artifact custody, or measurement truth.',
      'A computed comparison is not a pass/fail decision. Acceptance thresholds must be preregistered and independently reviewed.',
      'Only accelerometer and gyroscope channels are analyzed in this version; other Android sensors remain outside this comparison.',
      'WaveRadar polling captures can repeat one native event. Unique native events are deduplicated by sampleSequence; polling count is not event rate.',
      'Clock fitting and coordinate-frame metadata must be checked against the raw logger and physical fixture. A mathematical fit does not prove correct synchronization or alignment.',
      'No absolute position, spatial pose, indoor localization, through-wall sensing, human presence, victim detection, or life-safety readiness is established.',
    ],
  };
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--help' || key === '-h') args.help = true;
    else if (['--waveradar', '--reference', '--out'].includes(key)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`${key} requires a path.`);
      args[key.slice(2)] = argv[++i];
    } else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

const HELP = `WaveRadar Android reference comparison analyzer v1\n\nUsage:\n  node scripts/analyze-android-reference.mjs --waveradar <export.json> --reference <reference.json> --out <new-report.json>\n\nThe output path must not already exist. Inputs are read only and never modified.\nThe analyzer computes comparison metrics only; it never issues a pass/fail or validation decision.\n`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (!args.waveradar || !args.reference || !args.out) throw new Error('Provide --waveradar, --reference, and --out.');
  const wavePath = path.resolve(args.waveradar);
  const referencePath = path.resolve(args.reference);
  const outputPath = path.resolve(args.out);
  if (outputPath === wavePath || outputPath === referencePath) throw new Error('Output path must be different from both read-only input paths.');
  const [waveBytes, referenceBytes] = await Promise.all([readFile(wavePath), readFile(referencePath)]);
  const waveRadarExport = JSON.parse(waveBytes.toString('utf8'));
  const referenceArtifact = JSON.parse(referenceBytes.toString('utf8'));
  const report = analyzeAndroidReference({
    waveRadarExport,
    referenceArtifact,
    inputDigests: {
      waveRadarExportSha256: sha256(waveBytes),
      referenceArtifactSha256: sha256(referenceBytes),
    },
  });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`Analysis report written: ${outputPath}\n`);
  process.stdout.write(`Disposition: ${report.analysisDisposition}\n`);
  process.stdout.write(`Accuracy evidence: ${report.accuracyEvidenceStatus}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n${HELP}`);
    process.exitCode = 1;
  });
}
