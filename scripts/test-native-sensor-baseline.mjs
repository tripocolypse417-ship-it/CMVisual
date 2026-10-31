import assert from 'node:assert/strict';
import {
  NATIVE_SENSOR_BASELINE_SCHEMA,
  buildNativeSensorBaseline,
  summarizeNativeSensorBaseline,
} from '../src/lib/nativeSensorBaseline.js';

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
      timestampElapsedRealtimeNanos: 1234567890000,
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
assert.equal(baseline.sensors.accelerometer.sampleArrival.timestampElapsedRealtimeNanos, '1234567890000');
assert.equal(baseline.sensors.gyroscope.capability.state, 'SUPPORTED');
assert.equal(baseline.sensors.gyroscope.registration.state, 'REGISTRATION_FAILED');
assert.equal(baseline.sensors.gyroscope.sampleArrival.state, 'NOT_ARRIVED');
assert.equal(baseline.sensors.magnetometer.capability.state, 'UNSUPPORTED');
assert.equal(baseline.sensors.magnetometer.registration.state, 'UNSUPPORTED');
assert.equal(baseline.sensors.rotationVector.registration.state, 'NOT_REGISTERED');
assert.equal(baseline.sensors.rotationVector.sampleArrival.state, 'UNKNOWN', 'not registered does not prove no sample history');
assert.equal(baseline.platform.model, 'Moto G Play 2024');

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
  sampleIndex: 1,
}) };
const summary = summarizeNativeSensorBaseline({
  capabilities: supported,
  samples: [sample1, sample2],
  bridgeCallStates: ['OK', 'OK'],
  webMotionPermission: { hasSensors: true },
  generatedAt: at,
});
assert.equal(summary.captureCount, 2);
assert.equal(summary.sensors.accelerometer.capturedSampleCount, 2);
assert.equal(summary.sensors.accelerometer.firstSequence, 42);
assert.equal(summary.sensors.accelerometer.lastSequence, 58);
assert.equal(summary.sensors.accelerometer.observedSequenceSpan, 16);
assert.equal(summary.sensors.gyroscope.capturedSampleCount, 0);
assert.equal(summary.sensors.gyroscope.registrationState, 'REGISTRATION_FAILED');
assert.equal(summary.spatialPose.state, 'NOT_INSTRUMENTED');
assert.match(summary.evidenceLimit, /polling records/);

console.log('Native Android baseline classification, separation, timestamp, and summary tests: PASS');
