import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NATIVE_SENSOR_BASELINE_SCHEMA,
  buildNativeSensorBaseline,
  summarizeNativeSensorBaseline,
} from '../src/lib/nativeSensorBaseline.js';

const physicalValidationSource = readFileSync(new URL('../src/pages/PhysicalValidation.jsx', import.meta.url), 'utf8');
assert.ok(physicalValidationSource.includes('nativeCapabilitiesRef.current = result.value'), 'capability response is retained separately');
assert.ok(physicalValidationSource.includes('capabilities: nativeCapabilitiesRef.current,\n        snapshot: native'), 'each baseline combines the retained capability record with the current sample');
assert.ok(!physicalValidationSource.includes('nativeCapabilitiesRef.current = native;'), 'a sample snapshot must not overwrite capability metadata');
assert.ok(!physicalValidationSource.includes('setNativeCapabilities(native)'), 'a sample snapshot must not replace capability UI state');

const at = '2026-10-30T20:00:00.000Z';
const supported = {
  androidSensorManager: true,
  nativeBridgeVersion: 'android-sensors-v2',
  sensorCount: 8,
  registeredSensorCount: 3,
  appPackageName: 'com.waveradar.app.safetest',
  appVersionName: '1.0',
  appVersionCode: 1,
  androidRelease: '14',
  androidSdkInt: 34,
  manufacturer: 'Motorola',
  model: 'Moto G Play 2024',
  sensorRegistration: {
    accelerometer: { capabilityState: 'SUPPORTED', registrationState: 'REGISTERED', hasSampleHistory: true },
    gyroscope: { capabilityState: 'SUPPORTED', registrationState: 'REGISTRATION_FAILED', hasSampleHistory: false },
    magnetometer: { capabilityState: 'UNSUPPORTED', registrationState: 'UNSUPPORTED', hasSampleHistory: false },
    rotationVector: { capabilityState: 'SUPPORTED', registrationState: 'NOT_REGISTERED', hasSampleHistory: false },
  },
};
const snapshot = {
  ...supported,
  measurements: {
    accelerometer: {
      values: [0.1, 0.2, 9.7],
      timestamp: at,
      timestampClock: 'WALL_CLOCK_ESTIMATE_FROM_ELAPSED_REALTIME',
      timestampElapsedRealtimeNanos: '1000000000000',
      receivedElapsedRealtimeNanos: '1000000250000',
      receivedAt: at,
      ageMs: 12,
      sampleSequence: 42,
      sensorType: 1,
      accuracy: 3,
    },
  },
};

const baseline = buildNativeSensorBaseline({
  capabilities: supported,
  snapshot,
  bridgeCallState: 'OK',
  capturedAt: at,
  sessionId: 'baseline-test-session',
  sampleIndex: 0,
  webMotionPermission: { hasSensors: true, needsPermission: false, denied: false },
});
assert.equal(baseline.schema, NATIVE_SENSOR_BASELINE_SCHEMA);
assert.equal(baseline.nativeSensorManager.state, 'AVAILABLE');
assert.equal(baseline.permissions.nativeAndroidSensorRuntime.state, 'NOT_REQUIRED');
assert.equal(baseline.permissions.webMotion.permissionState, 'UNKNOWN', 'observed events do not imply permission API state');
assert.equal(baseline.permissions.webMotion.eventsObserved, 'OBSERVED');
assert.equal(baseline.spatialPose.state, 'NOT_INSTRUMENTED');
assert.equal(baseline.sensors.accelerometer.capability.state, 'SUPPORTED');
assert.equal(baseline.sensors.accelerometer.registration.state, 'REGISTERED');
assert.equal(baseline.sensors.accelerometer.sampleArrival.state, 'ARRIVED');
assert.equal(baseline.sensors.accelerometer.sampleArrival.evidenceClass, 'MEASURED');
assert.equal(baseline.sensors.accelerometer.sampleArrival.sampleSequence, 42);
assert.equal(baseline.sensors.accelerometer.sampleArrival.timestampElapsedRealtimeNanos, '1000000000000');
assert.equal(baseline.sensors.accelerometer.sampleArrival.receivedElapsedRealtimeNanos, '1000000250000');
assert.equal(baseline.sensors.accelerometer.sampleArrival.callbackDeliveryLatencyState, 'AVAILABLE');
assert.equal(baseline.sensors.accelerometer.sampleArrival.callbackDeliveryLatencyMs, 0.25);
assert.equal(baseline.sensors.gyroscope.capability.state, 'SUPPORTED');
assert.equal(baseline.sensors.gyroscope.registration.state, 'REGISTRATION_FAILED');
assert.equal(baseline.sensors.gyroscope.sampleArrival.state, 'UNKNOWN', 'registration failure does not prove sample non-arrival');
assert.equal(baseline.sensors.magnetometer.capability.state, 'UNSUPPORTED');
assert.equal(baseline.sensors.magnetometer.registration.state, 'UNSUPPORTED');
assert.equal(baseline.sensors.rotationVector.registration.state, 'NOT_REGISTERED');
assert.equal(baseline.sensors.rotationVector.sampleArrival.state, 'UNKNOWN', 'not registered does not prove no sample history');
assert.equal(baseline.platform.model, 'Moto G Play 2024');

const largeMonotonicTimestamp = buildNativeSensorBaseline({
  capabilities: supported,
  snapshot: {
    measurements: {
      accelerometer: {
        values: [0, 0, 9.8],
        timestampElapsedRealtimeNanos: '9007199254740993123',
        receivedElapsedRealtimeNanos: '9007199254740994123',
      },
    },
  },
  bridgeCallState: 'OK',
  capturedAt: at,
  sessionId: 'large-timestamp-session',
});
assert.equal(largeMonotonicTimestamp.sensors.accelerometer.sampleArrival.timestampElapsedRealtimeNanos, '9007199254740993123', 'string nanosecond timestamps preserve 64-bit precision');
assert.equal(largeMonotonicTimestamp.sensors.accelerometer.sampleArrival.callbackDeliveryLatencyMs, 0.001);

const invalidTiming = buildNativeSensorBaseline({
  capabilities: supported,
  snapshot: {
    measurements: {
      accelerometer: {
        values: [0, 0, 9.8],
        timestampElapsedRealtimeNanos: '2000',
        receivedElapsedRealtimeNanos: '1000',
      },
    },
  },
  bridgeCallState: 'OK',
  capturedAt: at,
  sessionId: 'invalid-timestamp-order',
});
assert.equal(invalidTiming.sensors.accelerometer.sampleArrival.callbackDeliveryLatencyState, 'INVALID_ORDER');
assert.equal(invalidTiming.sensors.accelerometer.sampleArrival.callbackDeliveryLatencyMs, null);

const noBridge = buildNativeSensorBaseline({
  capabilities: null,
  snapshot: null,
  bridgeCallState: 'CALL_FAILED',
  capturedAt: at,
});
assert.equal(noBridge.nativeSensorManager.state, 'UNKNOWN');
assert.equal(noBridge.sensors.accelerometer.capability.state, 'UNKNOWN');
assert.equal(noBridge.sensors.accelerometer.registration.state, 'UNKNOWN');
assert.equal(noBridge.sensors.accelerometer.sampleArrival.state, 'UNKNOWN');
assert.equal(noBridge.permissions.nativeAndroidSensorRuntime.state, 'UNKNOWN');
assert.equal(noBridge.spatialPose.state, 'NOT_INSTRUMENTED');

const invalidVector = buildNativeSensorBaseline({
  capabilities: {
    ...supported,
    sensorRegistration: {
      ...supported.sensorRegistration,
      accelerometer: { ...supported.sensorRegistration.accelerometer, hasSampleHistory: false },
    },
  },
  snapshot: { measurements: { accelerometer: { values: [1, null, 3], timestamp: at, ageMs: 0 } } },
  bridgeCallState: 'OK',
  capturedAt: at,
});
assert.equal(invalidVector.sensors.accelerometer.sampleArrival.state, 'NOT_ARRIVED');
assert.equal(invalidVector.sensors.accelerometer.sampleArrival.evidenceClass, 'UNKNOWN');

const sample1 = { nativeSensorBaseline: baseline };
const sample2 = { nativeSensorBaseline: buildNativeSensorBaseline({
  capabilities: supported,
  snapshot: {
    ...supported,
    measurements: {
      accelerometer: {
        values: [0.2, 0.3, 9.6],
        timestamp: '2026-10-30T20:00:00.250Z',
        timestampClock: 'WALL_CLOCK_ESTIMATE_FROM_ELAPSED_REALTIME',
        timestampElapsedRealtimeNanos: '1000250000000',
        receivedElapsedRealtimeNanos: '1000250500000',
        receivedAt: '2026-10-30T20:00:00.250Z',
        ageMs: 4,
        sampleSequence: 58,
        sensorType: 1,
        accuracy: 3,
      },
    },
  },
  bridgeCallState: 'OK',
  capturedAt: '2026-10-30T20:00:00.250Z',
  sessionId: 'baseline-test-session',
  sampleIndex: 1,
}) };
const failedBridgeSample = { nativeSensorBaseline: noBridge };
const summary = summarizeNativeSensorBaseline({
  capabilities: supported,
  samples: [sample1, sample2, failedBridgeSample],
  bridgeCallStates: ['OK', 'OK', 'CALL_FAILED'],
  webMotionPermission: { hasSensors: true },
  generatedAt: at,
});
assert.equal(summary.captureCount, 3);
assert.equal(summary.latestBridgeCallState, 'CALL_FAILED');
assert.equal(summary.nativeSensorManager.state, 'AVAILABLE', 'retain last known capability separately from latest failed bridge call');
assert.equal(summary.platform.model, 'Moto G Play 2024');
assert.equal(summary.lastKnownCapabilityCapturedAt, '2026-10-30T20:00:00.250Z');
assert.equal(summary.sensors.accelerometer.capturedSampleCount, 2);
assert.equal(summary.sensors.accelerometer.latestSampleArrivalState, 'UNKNOWN', 'latest bridge failure is not reported as a fresh sample');
assert.equal(summary.sensors.accelerometer.firstEventReceivedAt, at);
assert.equal(summary.sensors.accelerometer.lastEventReceivedAt, '2026-10-30T20:00:00.250Z');
assert.equal(summary.sensors.accelerometer.firstSequence, 42);
assert.equal(summary.sensors.accelerometer.lastSequence, 58);
assert.equal(summary.sensors.accelerometer.observedSequenceSpan, 16);
assert.equal(summary.sensors.accelerometer.uniqueSequenceCount, 2);
assert.equal(summary.sensors.accelerometer.sequenceComparisonCount, 1);
assert.equal(summary.sensors.accelerometer.sequenceRegressionCount, 0);
assert.equal(summary.sensors.accelerometer.interveningNativeEventsNotIndividuallyCapturedByPolling, 15, 'polling snapshots do not individually retain intervening native callbacks');
assert.equal(summary.sensors.accelerometer.sequenceMonotonicityState, 'MONOTONIC_IN_OBSERVED_SNAPSHOTS');
assert.equal(summary.sensors.accelerometer.eventTimestampComparisonCount, 1);
assert.equal(summary.sensors.accelerometer.eventTimestampRegressionCount, 0);
assert.equal(summary.sensors.accelerometer.observedEventTimestampDeltaMs.medianMs, 250);
assert.equal(summary.sensors.accelerometer.callbackDeliveryLatencyMs.medianMs, 0.375);
assert.equal(summary.sensors.accelerometer.pollingCaptureIntervalMs.medianMs, 250);
assert.equal(summary.sensors.accelerometer.timestampBasisCounts.WALL_CLOCK_ESTIMATE_FROM_ELAPSED_REALTIME, 2);
assert.equal(summary.sensors.gyroscope.capturedSampleCount, 0);
assert.equal(summary.sensors.gyroscope.registrationState, 'REGISTRATION_FAILED');
assert.equal(summary.spatialPose.state, 'NOT_INSTRUMENTED');
assert.match(summary.evidenceLimit, /polling snapshots/);
assert.match(summary.evidenceLimit, /not proven dropped callbacks/);

const repeatedSnapshot = { nativeSensorBaseline: buildNativeSensorBaseline({
  capabilities: supported,
  snapshot: {
    measurements: {
      accelerometer: {
        values: [0.2, 0.3, 9.6],
        timestampElapsedRealtimeNanos: '1000250000000',
        receivedElapsedRealtimeNanos: '1000250500000',
        receivedAt: '2026-10-30T20:00:00.500Z',
        ageMs: 254,
        sampleSequence: 58,
      },
    },
  },
  bridgeCallState: 'OK',
  capturedAt: '2026-10-30T20:00:00.500Z',
  sessionId: 'baseline-test-session',
  sampleIndex: 2,
}) };
const regressedSnapshot = { nativeSensorBaseline: buildNativeSensorBaseline({
  capabilities: supported,
  snapshot: {
    measurements: {
      accelerometer: {
        values: [0.2, 0.3, 9.6],
        timestampElapsedRealtimeNanos: '1000249000000',
        receivedElapsedRealtimeNanos: '1000249500000',
        receivedAt: '2026-10-30T20:00:00.750Z',
        ageMs: 1,
        sampleSequence: 57,
      },
    },
  },
  bridgeCallState: 'OK',
  capturedAt: '2026-10-30T20:00:00.750Z',
  sessionId: 'baseline-test-session',
  sampleIndex: 3,
}) };
const anomalySummary = summarizeNativeSensorBaseline({
  samples: [sample1, sample2, repeatedSnapshot, regressedSnapshot],
  generatedAt: at,
});
assert.equal(anomalySummary.sensors.accelerometer.repeatedSequenceSnapshotCount, 1);
assert.equal(anomalySummary.sensors.accelerometer.sequenceRegressionCount, 1);
assert.equal(anomalySummary.sensors.accelerometer.sequenceMonotonicityState, 'NON_MONOTONIC');
assert.equal(anomalySummary.sensors.accelerometer.repeatedEventTimestampSnapshotCount, 1);
assert.equal(anomalySummary.sensors.accelerometer.eventTimestampRegressionCount, 1);
assert.equal(anomalySummary.sensors.accelerometer.eventTimestampMonotonicityState, 'NON_MONOTONIC');

console.log('Native Android baseline classification, separation, timestamp, and summary tests: PASS');
