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
assert.match(source, /o\.put\("sensorRegistration", sensorRegistration\);/);

console.log('Native sensor lifecycle source-contract checks passed (physical-device validation still required).');
