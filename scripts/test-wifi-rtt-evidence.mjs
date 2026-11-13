import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const plugin = await readFile(new URL('../native/android/WaveRadarRangingPlugin.java', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/build-android.yml', import.meta.url), 'utf8');
const wrapper = await readFile(new URL('../src/lib/nativeRanging.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../src/hooks/useSensorBridge.js', import.meta.url), 'utf8');

// The permission alias must complete through a real Capacitor permission callback.
assert.match(plugin, /requestPermissionForAlias\("ranging", call, "rangingPermissionCallback"\);/);
assert.match(plugin, /@PermissionCallback\s+private void rangingPermissionCallback\(PluginCall call\)/);
assert.match(plugin, /hasAndroidPermission\(Manifest\.permission\.ACCESS_FINE_LOCATION\)/);
assert.match(plugin, /hasAndroidPermission\(Manifest\.permission\.NEARBY_WIFI_DEVICES\)/);

// Distinguish measurement time (elapsed realtime) from callback/receipt wall time.
assert.match(plugin, /measurementTimestampElapsedRealtimeMs", result\.getRangingTimestampMillis\(\)/);
assert.match(plugin, /timestampClockDomain", "ANDROID_ELAPSED_REALTIME_SINCE_BOOT"/);
assert.match(plugin, /receivedAtEpochMs/);

// Failed per-responder results are retained as unavailable, never labeled measured.
assert.match(plugin, /if \(result\.getStatus\(\) == RangingResult\.STATUS_SUCCESS\)[\s\S]*?evidenceClass", "MEASURED"[\s\S]*?\} else \{[\s\S]*?evidenceClass", "UNAVAILABLE"/);
assert.match(plugin, /numAttemptedMeasurements", result\.getNumAttemptedMeasurements\(\)/);
assert.match(plugin, /numSuccessfulMeasurements", result\.getNumSuccessfulMeasurements\(\)/);

// The Android build must declare the platform permissions needed by the RTT/scan path.
for (const permission of [
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.CHANGE_WIFI_STATE',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.NEARBY_WIFI_DEVICES',
]) {
  assert.ok(workflow.includes(permission), `Missing manifest permission: ${permission}`);
}

// A range-only Wi-Fi RTT observation has no bearing. Null must not be coerced to 0 degrees.
assert.match(wrapper, /m\.angle != null && Number\.isFinite\(Number\(m\.angle\)\)/);
assert.match(wrapper, /measurementTimestampElapsedRealtimeMs/);
assert.match(wrapper, /confidence: null/);
assert.match(bridge, /d\.angle != null && Number\.isFinite\(Number\(d\.angle\)\)/);
assert.match(bridge, /d\.distance != null && Number\.isFinite\(Number\(d\.distance\)\)/);

console.log('Wi-Fi RTT evidence contract checks passed (static source checks only; device validation remains required).');
