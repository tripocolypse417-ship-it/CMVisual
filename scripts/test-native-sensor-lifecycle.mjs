import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../native/android/WaveRadarSensorsPlugin.java', import.meta.url), 'utf8');

// Static contract checks guard the native lifecycle code included in the APK.
// They do not substitute for testing on a physical Android device.
assert.match(source, /private final Set<Integer> registeredSensorTypes = new HashSet<>\(\);/);
assert.doesNotMatch(source, /private boolean sensorsRegistered/);
assert.match(source, /if \(registeredSensorTypes\.contains\(type\)\) continue;/);
assert.match(source, /registerListener\(this, sensor, SensorManager\.SENSOR_DELAY_GAME\)\)\s*\{\s*registeredSensorTypes\.add\(type\);/);
assert.match(source, /private void unregisterSensors\(\)[\s\S]*?registeredSensorTypes\.clear\(\);/);
assert.match(source, /public void handleOnPause\(\)\s*\{\s*unregisterSensors\(\);/);
assert.match(source, /public void handleOnResume\(\)\s*\{\s*super\.handleOnResume\(\);\s*registerSensors\(\);/);
assert.match(source, /status\.put\("supported", sensor != null\);/);
assert.match(source, /status\.put\("registered", registeredSensorTypes\.contains\(type\)\);/);
assert.match(source, /status\.put\("hasSampleHistory", latest\.containsKey\(type\)\);/);
assert.ok(source.includes('o.put("sensorRegistration", sensorRegistration);'));
// Preserve Android's monotonic source clock separately from estimated wall-clock time.
assert.match(source, /sourceTimestampNs/);
assert.match(source, /ANDROID_ELAPSED_REALTIME_NANOS/);
assert.match(source, /timestampEstimateMethod/);
assert.match(source, /sampleReceiptTimes\.put\(type, lastSensorTimestamp\)/);
assert.match(source, /status\.put\("sampleAgeMs", sampleAgeMs\)/);
assert.match(source, /status\.put\("sampleReceivedAt", receivedAt == 0L \? org\.json\.JSONObject\.NULL : receivedAt\)/);
assert.match(source, /item\.put\("sampleAgeMs", ageMs\)/);

assert.match(source, /MAX_PENDING_SAMPLES = 10000/);
assert.match(source, /pendingSamples\.addLast\(new SensorSample/);
assert.match(source, /droppedSamplesTotal/);
assert.match(source, /sampleReceivedAt/);
assert.match(source, /public void acknowledgeSamples/);
assert.match(source, /pendingSamples\.peekFirst\(\)\.sequence <= throughSequence/);
assert.match(source, /droppedSamplesSinceLastAck/);

console.log('Native sensor lifecycle source-contract checks passed (physical-device validation still required).');
