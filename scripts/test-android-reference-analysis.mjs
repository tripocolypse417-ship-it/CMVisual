import assert from 'node:assert/strict';
import { analyzeAndroidReference, ANALYSIS_SCHEMA } from './analyze-android-reference.mjs';

const waveTimes = [2_000_000_000, 3_000_000_000, 4_000_000_000];
const waveRadarExport = {
  schema: 'cmvisual-physical-validation-v5',
  qaFixture: true,
  sessionId: 'synthetic-analysis-test',
  samples: waveTimes.flatMap((timestamp, index) => {
    const sequence = index + 1;
    const values = [index + 1.1, index + 2, 9.0];
    const record = {
      nativeSensorBaseline: {
        nativeSensorManager: { state: 'AVAILABLE' },
        permissions: {
          nativeAndroidSensorRuntime: { state: 'NOT_REQUIRED' },
          webMotion: { permissionState: 'UNKNOWN' },
        },
        spatialPose: { state: 'NOT_INSTRUMENTED' },
        platform: { manufacturer: 'Motorola', model: 'Moto G Play 2024' },
        sensors: {
          accelerometer: {
            capability: { state: 'SUPPORTED' },
            registration: { state: 'REGISTERED' },
            sampleArrival: {
              state: 'ARRIVED',
              evidenceClass: 'MEASURED',
              sampleSequence: sequence,
              timestampElapsedRealtimeNanos: String(timestamp),
              timestampBasis: 'WALL_CLOCK_ESTIMATE_FROM_ELAPSED_REALTIME',
              value: values,
            },
          },
          gyroscope: {
            capability: { state: 'SUPPORTED' },
            registration: { state: 'REGISTERED' },
            sampleArrival: {
              state: 'ARRIVED',
              evidenceClass: 'MEASURED',
              sampleSequence: sequence,
              timestampElapsedRealtimeNanos: String(timestamp),
              timestampBasis: 'ANDROID_ELAPSED_REALTIME_NANOS',
              value: [0.1, 0.2, 0.3],
            },
          },
        },
      },
    };
    return index === 1 ? [record, structuredClone(record)] : [record];
  }),
};

const referenceArtifact = {
  schema: 'waveradar.independent-reference-imu.v1',
  qaFixture: true,
  preregistration: {
    protocolId: 'WR-ANDROID-NATIVE-BASELINE-001',
    protocolVersion: '1',
    preregisteredAt: '2026-11-03T00:00:00.000Z',
  },
  instrument: {
    makeModel: 'Synthetic reference IMU',
    assetId: 'QA-ONLY-001',
    calibrationStatus: 'CALIBRATED',
    calibrationEvidenceRef: 'qa://calibration-certificate',
    calibrationDate: '2026-01-01T00:00:00.000Z',
    calibrationCertificateSha256: 'a'.repeat(64),
    calibrationValidThrough: '2027-01-01T00:00:00.000Z',
    standardUncertainty: {
      accelerometerMps2: { x: 0.01, y: 0.01, z: 0.01 },
      gyroscopeRadPerSec: { x: 0.001, y: 0.001, z: 0.001 },
    },
  },
  measurementWindow: { startedAt: '2026-11-03T00:01:00.000Z', endedAt: '2026-11-03T00:02:00.000Z' },
  clockSync: {
    method: 'SYNTHETIC_KNOWN_OFFSET_FIXTURE',
    pairs: [
      { referenceTimestampNs: '1000000000', androidElapsedRealtimeNanos: '2000000000', uncertaintyNs: '1000' },
      { referenceTimestampNs: '2000000000', androidElapsedRealtimeNanos: '3000000000', uncertaintyNs: '1000' },
      { referenceTimestampNs: '3000000000', androidElapsedRealtimeNanos: '4000000000', uncertaintyNs: '1000' },
      { referenceTimestampNs: '4000000000', androidElapsedRealtimeNanos: '5000000000', uncertaintyNs: '1000' },
    ],
  },
  coordinateFrame: {
    referenceToWaveRadarRotationMatrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  },
  analysis: {
    maxInterpolationGapNs: '1500000000',
    requiredSensors: ['accelerometer', 'gyroscope'],
  },
  referenceSamples: [
    { timestampNs: '1000000000', accelerometerMps2: [1, 2, 9], gyroscopeRadPerSec: [0.1, 0.2, 0.3] },
    { timestampNs: '2000000000', accelerometerMps2: [2, 3, 9], gyroscopeRadPerSec: [0.1, 0.2, 0.3] },
    { timestampNs: '3000000000', accelerometerMps2: [3, 4, 9], gyroscopeRadPerSec: [0.1, 0.2, 0.3] },
  ],
};

const report = analyzeAndroidReference({ waveRadarExport, referenceArtifact });
assert.equal(report.schema, ANALYSIS_SCHEMA);
assert.equal(report.analysisDisposition, 'COMPUTED_COMPARISON_PENDING_INDEPENDENT_REVIEW');
assert.equal(report.qaFixture.detected, true);
assert.deepEqual(report.qaFixture.reasons, [
  'WAVERADAR_EXPORT_QA_FIXTURE_FLAG',
  'REFERENCE_ARTIFACT_QA_FIXTURE_FLAG',
]);
assert.equal(report.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');
assert.equal(report.clockSynchronization.status, 'FIT_COMPUTED_PENDING_REVIEW');
assert.equal(report.clockSynchronization.declaredMethodComplete, true);
assert.ok(Math.abs(report.clockSynchronization.slope - 1) < 1e-12);
assert.equal(report.clockSynchronization.driftPpm, 0);
assert.equal(report.sensors.accelerometer.matchedSampleCount, 3);
assert.equal(report.sensors.accelerometer.waveRadar.repeatedPollRecords, 1);
assert.equal(report.sensors.accelerometer.waveRadar.timestampBasisCounts.WALL_CLOCK_ESTIMATE_FROM_ELAPSED_REALTIME, 4);
assert.ok(Math.abs(report.sensors.accelerometer.perAxisError.x.bias - 0.1) < 1e-12);
assert.ok(Math.abs(report.sensors.accelerometer.perAxisError.x.rmse - 0.1) < 1e-12);
assert.equal(report.sensors.accelerometer.perAxisError.y.bias, 0);
assert.equal(report.sensors.gyroscope.matchedSampleCount, 3);
assert.equal(report.sensors.gyroscope.vectorRmse, 0);
assert.equal(report.analysisMethod.automaticPassFail, false);
assert.equal(report.instrumentCalibration.measurementWindowCoveredByCalibration, true);
assert.equal(report.deviceContext.nativeSensorRuntimePermissionPolicyComplete, true);
assert.equal(report.deviceContext.nativeSensorManagerStateCounts.AVAILABLE, 4);
assert.equal(report.deviceContext.nativeAndroidSensorRuntimePermissionStateCounts.NOT_REQUIRED, 4);
assert.equal(report.deviceContext.webMotionPermissionStateCounts.UNKNOWN, 4);
assert.equal(report.deviceContext.spatialPoseStateCounts.NOT_INSTRUMENTED, 4);
assert.equal(report.sensors.accelerometer.waveRadar.capabilityStateCounts.SUPPORTED, 4);
assert.equal(report.sensors.accelerometer.waveRadar.registrationStateCounts.REGISTERED, 4);
assert.equal(report.sensors.accelerometer.waveRadar.lifecycleEvidenceComplete, true);
assert.deepEqual(report.inputs.requiredSensors, ['accelerometer', 'gyroscope']);
assert.equal(report.inputs.requiredSensorScopeDeclared, true);

const noSync = structuredClone(referenceArtifact);
noSync.clockSync.pairs = [];
const noSyncReport = analyzeAndroidReference({ waveRadarExport, referenceArtifact: noSync });
assert.equal(noSyncReport.analysisDisposition, 'NOT_COMPUTABLE_WITH_CURRENT_SYNC_OR_FRAME_METADATA');
assert.equal(noSyncReport.sensors.accelerometer.matchedSampleCount, 0);
assert.equal(noSyncReport.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

const noCalibration = structuredClone(referenceArtifact);
noCalibration.instrument.calibrationStatus = 'UNKNOWN';
const exploratory = analyzeAndroidReference({ waveRadarExport, referenceArtifact: noCalibration });
assert.equal(exploratory.analysisDisposition, 'COMPUTED_COMPARISON_PENDING_INDEPENDENT_REVIEW');
assert.equal(exploratory.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

const latePreregistration = structuredClone(referenceArtifact);
latePreregistration.preregistration.preregisteredAt = '2026-11-04T00:00:00.000Z';
const latePreregistrationReport = analyzeAndroidReference({ waveRadarExport, referenceArtifact: latePreregistration });
assert.equal(latePreregistrationReport.inputs.preregistrationComplete, false);
assert.equal(latePreregistrationReport.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

const expiredCalibration = structuredClone(referenceArtifact);
expiredCalibration.instrument.calibrationValidThrough = '2026-11-02T00:00:00.000Z';
const expiredCalibrationReport = analyzeAndroidReference({ waveRadarExport, referenceArtifact: expiredCalibration });
assert.equal(expiredCalibrationReport.instrumentCalibration.measurementWindowCoveredByCalibration, false);
assert.equal(expiredCalibrationReport.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

const invalidFrame = structuredClone(referenceArtifact);
invalidFrame.coordinateFrame.referenceToWaveRadarRotationMatrix[0][0] = 2;
const badFrame = analyzeAndroidReference({ waveRadarExport, referenceArtifact: invalidFrame });
assert.equal(badFrame.coordinateFrame.state, 'INVALID');
assert.equal(badFrame.sensors.accelerometer.matchedSampleCount, 0);

const conflictingSequence = structuredClone(waveRadarExport);
const conflictRecord = structuredClone(conflictingSequence.samples[0]);
conflictRecord.nativeSensorBaseline.sensors.accelerometer.sampleArrival.value = [99, 99, 99];
conflictingSequence.samples.push(conflictRecord);
const conflictReport = analyzeAndroidReference({ waveRadarExport: conflictingSequence, referenceArtifact });
assert.equal(conflictReport.sensors.accelerometer.waveRadar.conflictingDuplicateSequenceCount, 1);
assert.equal(conflictReport.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

const noExtrapolation = structuredClone(referenceArtifact);
noExtrapolation.analysis.maxInterpolationGapNs = '100';
const shiftedWave = structuredClone(waveRadarExport);
let shiftedIndex = 0;
for (const sample of shiftedWave.samples) {
  if (sample.nativeSensorBaseline?.sensors?.accelerometer?.sampleArrival) {
    sample.nativeSensorBaseline.sensors.accelerometer.sampleArrival.timestampElapsedRealtimeNanos = String(2_500_000_000 + shiftedIndex * 1_000_000_000);
    sample.nativeSensorBaseline.sensors.gyroscope.sampleArrival.timestampElapsedRealtimeNanos = String(2_500_000_000 + shiftedIndex * 1_000_000_000);
    shiftedIndex += 1;
  }
}
const gapReport = analyzeAndroidReference({ waveRadarExport: shiftedWave, referenceArtifact: noExtrapolation });
assert.equal(gapReport.sensors.accelerometer.matchedSampleCount, 0);
assert.ok(gapReport.sensors.accelerometer.unmatchedOrExcludedByReason.REFERENCE_BRACKET_GAP_EXCEEDS_PREREGISTERED_LIMIT > 0);

const outsideSyncRange = structuredClone(waveRadarExport);
for (const sample of outsideSyncRange.samples) {
  for (const sensor of ['accelerometer', 'gyroscope']) {
    const arrival = sample.nativeSensorBaseline?.sensors?.[sensor]?.sampleArrival;
    if (arrival) arrival.timestampElapsedRealtimeNanos = '6000000000';
  }
}
const syncRangeReport = analyzeAndroidReference({ waveRadarExport: outsideSyncRange, referenceArtifact });
assert.equal(syncRangeReport.sensors.accelerometer.matchedSampleCount, 0);
assert.ok(syncRangeReport.sensors.accelerometer.unmatchedOrExcludedByReason.CLOCK_MAPPING_OUTSIDE_SYNC_PAIR_RANGE > 0);
assert.equal(syncRangeReport.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

const sampleMarkedQa = structuredClone(waveRadarExport);
delete sampleMarkedQa.qaFixture;
sampleMarkedQa.samples[0].qaFixture = true;
const sampleQaReport = analyzeAndroidReference({ waveRadarExport: sampleMarkedQa, referenceArtifact });
assert.equal(sampleQaReport.qaFixture.detected, true);
assert.ok(sampleQaReport.qaFixture.reasons.includes('WAVERADAR_SAMPLE_QA_FIXTURE_FLAG'));
assert.equal(sampleQaReport.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

// A clean, preregistered accelerometer + gyroscope fixture demonstrates the
// candidate path. It remains a software fixture and is never measurement evidence.
const cleanWaveRadarExport = structuredClone(waveRadarExport);
delete cleanWaveRadarExport.qaFixture;
const cleanReferenceArtifact = structuredClone(referenceArtifact);
delete cleanReferenceArtifact.qaFixture;
const cleanReport = analyzeAndroidReference({
  waveRadarExport: cleanWaveRadarExport,
  referenceArtifact: cleanReferenceArtifact,
});
assert.equal(cleanReport.accuracyEvidenceStatus, 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED');
assert.equal(cleanReport.sensors.accelerometer.accuracyEvidenceStatus, 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED');
assert.equal(cleanReport.sensors.gyroscope.accuracyEvidenceStatus, 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED');

// If the device inventory confirms no gyroscope, the preregistered scope can
// explicitly require only accelerometer. The unsupported channel is reported,
// not silently treated as a failed measurement or a required comparison.
const accelerometerOnlyWave = structuredClone(cleanWaveRadarExport);
for (const sample of accelerometerOnlyWave.samples) {
  const gyro = sample.nativeSensorBaseline.sensors.gyroscope;
  gyro.capability.state = 'UNSUPPORTED';
  gyro.registration.state = 'UNSUPPORTED';
  gyro.sampleArrival.state = 'UNKNOWN';
  gyro.sampleArrival.evidenceClass = 'UNKNOWN';
  gyro.sampleArrival.value = null;
}
const accelerometerOnlyReference = structuredClone(cleanReferenceArtifact);
accelerometerOnlyReference.analysis.requiredSensors = ['accelerometer'];
const accelerometerOnlyReport = analyzeAndroidReference({
  waveRadarExport: accelerometerOnlyWave,
  referenceArtifact: accelerometerOnlyReference,
});
assert.equal(accelerometerOnlyReport.accuracyEvidenceStatus, 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED');
assert.equal(accelerometerOnlyReport.sensors.accelerometer.accuracyEvidenceStatus, 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED');
assert.equal(accelerometerOnlyReport.sensors.gyroscope.accuracyEvidenceStatus, 'NOT_IN_REQUIRED_ANALYSIS_SCOPE');
assert.equal(accelerometerOnlyReport.sensors.gyroscope.waveRadar.capabilityStateCounts.UNSUPPORTED, 4);

// A measured numeric event does not silently imply confirmed support or listener
// registration. Unknown lifecycle metadata keeps the channel exploratory.
const unknownLifecycleWave = structuredClone(accelerometerOnlyWave);
unknownLifecycleWave.samples[0].nativeSensorBaseline.sensors.accelerometer.capability.state = 'UNKNOWN';
unknownLifecycleWave.samples[0].nativeSensorBaseline.sensors.accelerometer.registration.state = 'UNKNOWN';
const unknownLifecycleReport = analyzeAndroidReference({
  waveRadarExport: unknownLifecycleWave,
  referenceArtifact: accelerometerOnlyReference,
});
assert.equal(unknownLifecycleReport.sensors.accelerometer.waveRadar.lifecycleEvidenceComplete, false);
assert.equal(unknownLifecycleReport.sensors.accelerometer.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

// Browser motion permission is reported independently and does not overwrite
// the native SensorManager permission policy.
const browserDeniedWave = structuredClone(cleanWaveRadarExport);
for (const sample of browserDeniedWave.samples) {
  sample.nativeSensorBaseline.permissions.webMotion.permissionState = 'DENIED';
}
const browserDeniedReport = analyzeAndroidReference({
  waveRadarExport: browserDeniedWave,
  referenceArtifact: cleanReferenceArtifact,
});
assert.equal(browserDeniedReport.accuracyEvidenceStatus, 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED');
assert.equal(browserDeniedReport.deviceContext.webMotionPermissionStateCounts.DENIED, 4);
assert.equal(browserDeniedReport.deviceContext.nativeAndroidSensorRuntimePermissionStateCounts.NOT_REQUIRED, 4);

assert.throws(() => analyzeAndroidReference({ waveRadarExport, referenceArtifact: { ...referenceArtifact, analysis: {} } }), /maxInterpolationGapNs/);
assert.throws(() => analyzeAndroidReference({ waveRadarExport, referenceArtifact: { ...referenceArtifact, schema: 'wrong' } }), /schema/);
assert.throws(() => analyzeAndroidReference({ waveRadarExport: { ...waveRadarExport, schema: 'unknown' }, referenceArtifact }), /cmvisual-physical-validation/);

console.log('Android independent-reference synchronization, deduplication, interpolation, metrics, and non-promotion tests: PASS');
