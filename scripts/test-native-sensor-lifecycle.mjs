import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../native/android/WaveRadarSensorsPlugin.java', import.meta.url), 'utf8');

// Source-contract checks guard the native lifecycle code included in the APK.
// They do not substitute for exercising Android SensorManager on a physical device.
assert.match(source, /private final Set<Integer> registeredSensorTypes = new HashSet<>\(\);/);
assert.match(source, /private final Map<Integer, String> registrationStates = new HashMap<>\(\);/);
assert.doesNotMatch(source, /private boolean sensorsRegistered/);
assert.match(source, /registrationStates\.put\(type, "UNSUPPORTED"\);/);
assert.match(source, /registrationStates\.put\(type, "REGISTRATION_FAILED"\);/);
assert.match(source, /registrationStates\.put\(type, "REGISTERED"\);/);
assert.match(source, /registrationStates\.put\(type, "NOT_REGISTERED"\);/);
assert.match(source, /if \(registeredSensorTypes\.contains\(type\)\) \{/);
assert.match(source, /handleOnPause\(\)[\s\S]*?unregisterSensors\(\);/);
assert.match(source, /handleOnResume\(\)[\s\S]*?registerSensors\(\);/);
assert.match(source, /status\.put\("supported", sensor != null\);/);
assert.match(source, /status\.put\("registered", registeredSensorTypes\.contains\(type\)\);/);
assert.match(source, /status\.put\("registrationState", registrationStates\.getOrDefault/);
assert.match(source, /status\.put\("hasSampleHistory", latest\.containsKey\(type\)\);/);
assert.match(source, /item\.put\("freshness", ageMs <= 5000L \? "FRESH" : "STALE"\);/);
assert.match(source, /item\.put\("evidenceClass", "MEASURED"\);/);

console.log('Native sensor lifecycle state-contract checks passed (physical-device validation still required).');
