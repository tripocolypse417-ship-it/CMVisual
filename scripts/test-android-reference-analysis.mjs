import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeAndroidReference, ANALYSIS_SCHEMA } from './analyze-android-reference.mjs';

const protocolDoc = readFileSync(new URL('../docs/research-validation-institute/analysis/ANDROID_REFERENCE_ANALYSIS_V1.md', import.meta.url), 'utf8');
const exampleBlock = protocolDoc.match(/```json\s*([\s\S]*?)\s*```/);
assert.ok(exampleBlock, 'Protocol documentation must retain its machine-readable artifact example.');
const documentedExample = JSON.parse(exampleBlock[1]);
assert.equal(documentedExample.qaFixture, true, 'The documentation-only artifact must be explicitly marked QA-only.');
assert.equal(documentedExample.instrument.calibrationStatus, 'UNKNOWN', 'The example must not imply real calibration.');
assert.equal(documentedExample.instrument.calibrationCertificateSha256, 'NOT-A-REAL-DIGEST');

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
        bridgeCallState: 'OK',
        permissions: {
          nativeAndroidSensorRuntime: { state: 'NOT_REQUIRED' },
          webMotion: { permissionState: 'DENIED' },
        },
        spatialPose: { state: 'NOT_INSTRUMENTED' },
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
  analysis: { maxInterpolationGapNs: '1500000000' },
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
assert.equal(report.sensors.accelerometer.waveRadar.nativeLifecycleStateMismatchCount, 0);
assert.equal(report.sensors.accelerometer.waveRadar.captureStateCounts.nativeSensorManager.AVAILABLE, 4);
assert.equal(report.sensors.accelerometer.waveRadar.captureStateCounts.capability.SUPPORTED, 4);
assert.equal(report.sensors.accelerometer.waveRadar.captureStateCounts.registration.REGISTERED, 4);
assert.equal(report.sensors.accelerometer.waveRadar.captureStateCounts.nativeBridge.OK, 4);
assert.equal(report.sensors.accelerometer.waveRadar.captureStateCounts.nativeAndroidSensorRuntimePermission.NOT_REQUIRED, 4);
assert.equal(report.sensors.accelerometer.waveRadar.captureStateCounts.webMotionPermission.DENIED, 4);
assert.equal(report.sensors.accelerometer.waveRadar.captureStateCounts.spatialPose.NOT_INSTRUMENTED, 4);
assert.equal(report.sensors.accelerometer.nativeAndroidSensorPermissionPolicyConfirmed, true);
assert.equal(report.sensors.accelerometer.browserMotionPermissionStateCounts.DENIED, 4);
assert.equal(report.sensors.accelerometer.spatialPoseStateCounts.NOT_INSTRUMENTED, 4);
assert.equal(report.sensors.accelerometer.channelEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');
assert.equal(report.sensors.accelerometer.matchedSampleCount, 3, 'Browser motion permission and spatial-pose status must not substitute for or block valid native IMU capture.');
assert.equal(report.analysisMethod.automaticPassFail, false);

// Software-only synthetic fixture: an unsupported gyroscope must not erase
// a separately computable accelerometer channel result. The global run stays
// exploratory because not every requested channel was assessed.
const unmarkedSyntheticWave = structuredClone(waveRadarExport);
delete unmarkedSyntheticWave.qaFixture;
const unmarkedSyntheticReference = structuredClone(referenceArtifact);
delete unmarkedSyntheticReference.qaFixture;
for (const sample of unmarkedSyntheticWave.samples) {
  sample.nativeSensorBaseline.sensors.gyroscope.capability.state = 'UNSUPPORTED';
  sample.nativeSensorBaseline.sensors.gyroscope.registration.state = 'UNSUPPORTED';
}
const channelReport = analyzeAndroidReference({
  waveRadarExport: unmarkedSyntheticWave,
  referenceArtifact: unmarkedSyntheticReference,
});
assert.equal(channelReport.sensors.accelerometer.channelEvidenceStatus, 'CANDIDATE_FOR_INDEPENDENT_REVIEW_NOT_VERIFIED');
assert.equal(channelReport.sensors.gyroscope.channelEvidenceStatus, 'NOT_ASSESSED_SENSOR_UNSUPPORTED');
assert.equal(channelReport.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');
assert.equal(channelReport.sensors.accelerometer.browserMotionPermissionStateCounts.DENIED, 4);
assert.equal(channelReport.sensors.accelerometer.spatialPoseStateCounts.NOT_INSTRUMENTED, 4);

assert.equal(report.instrumentCalibration.measurementWindowCoveredByCalibration, true);

const unsupportedNativeSensor = structuredClone(waveRadarExport);
unsupportedNativeSensor.samples[0].nativeSensorBaseline.sensors.accelerometer.capability.state = 'UNSUPPORTED';
const unsupportedNativeReport = analyzeAndroidReference({ waveRadarExport: unsupportedNativeSensor, referenceArtifact });
assert.equal(unsupportedNativeReport.sensors.accelerometer.matchedSampleCount, 2);
assert.equal(unsupportedNativeReport.sensors.accelerometer.waveRadar.nativeLifecycleStateMismatchCount, 1);
assert.ok(unsupportedNativeReport.sensors.accelerometer.waveRadar.excludedByReason.CAPABILITY_UNSUPPORTED_NOT_CONFIRMED_SUPPORTED > 0);
assert.equal(unsupportedNativeReport.accuracyEvidenceStatus, 'INSTRUMENTATION_OR_EXPLORATORY_COMPARISON_ONLY');

const failedRegistration = structuredClone(waveRadarExport);
failedRegistration.samples[0].nativeSensorBaseline.sensors.gyroscope.registration.state = 'REGISTRATION_FAILED';
const failedRegistrationReport = analyzeAndroidReference({ waveRadarExport: failedRegistration, referenceArtifact });
assert.equal(failedRegistrationReport.sensors.gyroscope.matchedSampleCount, 2);
assert.equal(failedRegistrationReport.sensors.gyroscope.waveRadar.nativeLifecycleStateMismatchCount, 1);
assert.ok(failedRegistrationReport.sensors.gyroscope.waveRadar.excludedByReason.REGISTRATION_REGISTRATION_FAILED_NOT_CONFIRMED_REGISTERED > 0);

const failedBridge = structuredClone(waveRadarExport);
failedBridge.samples[0].nativeSensorBaseline.bridgeCallState = 'CALL_FAILED';
const failedBridgeReport = analyzeAndroidReference({ waveRadarExport: failedBridge, referenceArtifact });
assert.equal(failedBridgeReport.sensors.accelerometer.matchedSampleCount, 2);
assert.equal(failedBridgeReport.sensors.accelerometer.waveRadar.nativeLifecycleStateMismatchCount, 1);
assert.ok(failedBridgeReport.sensors.accelerometer.waveRadar.excludedByReason.NATIVE_BRIDGE_CALL_FAILED_NOT_OK > 0);

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

assert.throws(() => analyzeAndroidReference({ waveRadarExport, referenceArtifact: { ...referenceArtifact, analysis: {} } }), /maxInterpolationGapNs/);
assert.throws(() => analyzeAndroidReference({ waveRadarExport, referenceArtifact: { ...referenceArtifact, schema: 'wrong' } }), /schema/);
assert.throws(() => analyzeAndroidReference({ waveRadarExport: { ...waveRadarExport, schema: 'unknown' }, referenceArtifact }), /cmvisual-physical-validation/);

console.log('Android independent-reference synchronization, deduplication, interpolation, metrics, and non-promotion tests: PASS');
