import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../native/android/WaveRadarSensorsPlugin.java', import.meta.url), 'utf8');

// Static source-contract guards. They are not physical-device tests.
assert.match(source, /private final Set<Integer> registeredSensorTypes = new HashSet<>\(\);/);
assert.match(source, /private final Map<Integer, String> registrationStates = new HashMap<>\(\);/);
assert.match(source, /private final Map<Integer, Long> sensorReceivedAt = new HashMap<>\(\);/);
assert.match(source, /private final Map<Integer, Long> sensorSequences = new HashMap<>\(\);/);
assert.match(source, /registrationStates\.put\(type, "UNSUPPORTED"\)/);
assert.match(source, /registrationStates\.put\(type, "REGISTRATION_FAILED"\)/);
assert.match(source, /registrationStates\.put\(type, "REGISTERED"\)/);
assert.match(source, /registrationStates\.put\(type, "NOT_REGISTERED"\)/);
assert.match(source, /sensorManager\.registerListener\(this, sensor, SensorManager\.SENSOR_DELAY_GAME\)/);
assert.match(source, /registeredSensorTypes\.add\(type\)/);
assert.match(source, /registeredSensorTypes\.clear\(\)/);
assert.match(source, /public void handleOnPause\(\)\s*\{\s*unregisterSensors\(\);/);
assert.match(source, /public void handleOnResume\(\)\s*\{\s*super\.handleOnResume\(\);\s*registerSensors\(\);/);

// Capability, registration, and sample-history are separate signals.
assert.match(source, /status\.put\("capabilityState", capabilityState\);/);
assert.match(source, /status\.put\("registrationState", registrationState\);/);
assert.match(source, /status\.put\("hasSampleHistory", latest\.containsKey\(type\)\);/);
assert.match(source, /status\.put\("sampleSequence", sensorSequences\.getOrDefault\(type, 0L\)\);/);

// Event arrival is independently counted and timestamped; sensor event time
// retains its elapsed-realtime clock basis.
assert.match(source, /sensorReceivedAt\.put\(type, System\.currentTimeMillis\(\)\)/);
assert.match(source, /sensorSequences\.put\(type, sensorSequences\.getOrDefault\(type, 0L\) \+ 1L\)/);
assert.match(source, /item\.put\("timestampClock", "WALL_CLOCK_ESTIMATE_FROM_ELAPSED_REALTIME"\)/);
assert.match(source, /item\.put\("timestampElapsedRealtimeNanos", sensorElapsedNs > 0L \? sensorElapsedNs : null\)/);
assert.match(source, /item\.put\("receivedAt", receivedAt > 0L \? receivedAt : null\)/);
assert.match(source, /item\.put\("sampleSequence", sequence > 0L \? sequence : null\)/);
assert.match(source, /item\.put\("evidenceClass", "MEASURED"\)/);
assert.match(source, /Float\.isNaN\(value\) \|\| Float\.isInfinite\(value\)/);

// Standard Android SensorManager sensors are not runtime-permission gated by
// this plugin. Device/app metadata helps identify the physical test build.
assert.match(source, /out\.put\("nativeSensorRuntimePermission", sensorManager != null \? "NOT_REQUIRED" : "UNKNOWN"\)/);
assert.match(source, /out\.put\("appPackageName", getContext\(\)\.getPackageName\(\)\)/);
assert.match(source, /out\.put\("androidSdkInt", Build\.VERSION\.SDK_INT\)/);
assert.match(source, /out\.put\("manufacturer", Build\.MANUFACTURER\)/);
assert.match(source, /out\.put\("model", Build\.MODEL\)/);

// The snapshot envelope is mixed metadata + samples, not a uniform measured
// record. Pose is not inferred from depth flags.
assert.match(source, /out\.put\("evidenceClass", "UNKNOWN"\)/);
assert.match(source, /out\.put\("measurementEvidenceClass", "MEASURED"\)/);
assert.match(source, /These are not a spatial-pose provider/);

console.log('Native sensor lifecycle source-contract checks passed (physical-device validation still required).');
