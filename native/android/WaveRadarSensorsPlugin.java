package com.waveradar.app;

import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.SystemClock;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "WaveRadarSensors")
public class WaveRadarSensorsPlugin extends Plugin implements SensorEventListener {
  private SensorManager sensorManager;
  private final Map<Integer, float[]> latest = new HashMap<>();
  private final Map<Integer, Long> sensorTimestamps = new HashMap<>();
  private final Map<Integer, Integer> sensorAccuracies = new HashMap<>();
  private final Map<Integer, String> registrationStates = new HashMap<>();
  private long lastSensorTimestamp = 0L;
  private final Set<Integer> registeredSensorTypes = new HashSet<>();

  @Override
  public void load() {
    sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    registerSensors();
  }

  private void registerSensors() {
    if (sensorManager == null) return;
    int[] types = new int[] {
      Sensor.TYPE_ACCELEROMETER,
      Sensor.TYPE_GYROSCOPE,
      Sensor.TYPE_MAGNETIC_FIELD,
      Sensor.TYPE_ROTATION_VECTOR,
      Sensor.TYPE_GRAVITY,
      Sensor.TYPE_PRESSURE,
      Sensor.TYPE_LIGHT,
      Sensor.TYPE_PROXIMITY
    };
    for (int type : types) {
      Sensor sensor = sensorManager.getDefaultSensor(type);
      if (sensor == null) {
        registrationStates.put(type, "UNSUPPORTED");
        registeredSensorTypes.remove(type);
        continue;
      }
      if (registeredSensorTypes.contains(type)) {
        registrationStates.put(type, "REGISTERED");
        continue;
      }
      boolean registered = sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME);
      if (registered) {
        registeredSensorTypes.add(type);
        registrationStates.put(type, "REGISTERED");
      } else {
        registrationStates.put(type, "REGISTRATION_FAILED");
      }
    }
  }

  private void unregisterSensors() {
    if (sensorManager != null && !registeredSensorTypes.isEmpty()) {
      sensorManager.unregisterListener(this);
    }
    for (int type : registeredSensorTypes) {
      registrationStates.put(type, "NOT_REGISTERED");
    }
    registeredSensorTypes.clear();
  }

  @Override
  public void handleOnPause() {
    unregisterSensors();
    super.handleOnPause();
  }

  @Override
  public void handleOnResume() {
    super.handleOnResume();
    registerSensors();
  }

  @Override
  public void onSensorChanged(SensorEvent event) {
    int type = event.sensor.getType();
    latest.put(type, event.values.clone());
    sensorTimestamps.put(type, event.timestamp);
    sensorAccuracies.put(type, event.accuracy);
    lastSensorTimestamp = System.currentTimeMillis();
  }

  @Override
  public void onAccuracyChanged(Sensor sensor, int accuracy) {
    if (sensor != null) sensorAccuracies.put(sensor.getType(), accuracy);
  }

  @Override
  public void handleOnDestroy() {
    unregisterSensors();
    super.handleOnDestroy();
  }

  @PluginMethod
  public void getCapabilities(com.getcapacitor.PluginCall call) {
    call.resolve(buildCapabilities());
  }

  @PluginMethod
  public void getSnapshot(com.getcapacitor.PluginCall call) {
    JSObject out = buildCapabilities();
    JSObject measurements = new JSObject();
    addMeasurement(measurements, Sensor.TYPE_ACCELEROMETER, "accelerometer");
    addMeasurement(measurements, Sensor.TYPE_GYROSCOPE, "gyroscope");
    addMeasurement(measurements, Sensor.TYPE_MAGNETIC_FIELD, "magnetometer");
    addMeasurement(measurements, Sensor.TYPE_ROTATION_VECTOR, "rotationVector");
    addMeasurement(measurements, Sensor.TYPE_GRAVITY, "gravity");
    addMeasurement(measurements, Sensor.TYPE_PRESSURE, "barometer");
    addMeasurement(measurements, Sensor.TYPE_LIGHT, "ambientLight");
    addMeasurement(measurements, Sensor.TYPE_PROXIMITY, "proximity");
    out.put("measurements", measurements);
    out.put("lastSensorAt", lastSensorTimestamp == 0L ? null : lastSensorTimestamp);
    out.put("evidenceClass", "MEASURED");
    out.put("provenance", "Android SensorManager");
    call.resolve(out);
  }

  private void addMeasurement(JSObject target, int type, String name) {
    float[] v = latest.get(type);
    if (v == null) return;
    JSObject item = new JSObject();
    long sensorElapsedNs = sensorTimestamps.getOrDefault(type, 0L);
    long ageMs = sensorElapsedNs > 0L
      ? Math.max(0L, (SystemClock.elapsedRealtimeNanos() - sensorElapsedNs) / 1000000L)
      : 0L;
    item.put("values", toArray(v));
    item.put("timestamp", Math.max(0L, System.currentTimeMillis() - ageMs));
    item.put("ageMs", ageMs);
    item.put("sensorType", type);
    item.put("accuracy", sensorAccuracies.getOrDefault(type, SensorManager.SENSOR_STATUS_UNRELIABLE));
    item.put("evidenceClass", "MEASURED");
    item.put("freshness", ageMs <= 5000L ? "FRESH" : "STALE");
    target.put(name, item);
  }

  private org.json.JSONArray toArray(float[] values) {
    org.json.JSONArray a = new org.json.JSONArray();
    for (float v : values) {
      try {
        a.put(v);
      } catch (org.json.JSONException ignored) {
        // Skip a value only if JSON encoding rejects it.
      }
    }
    return a;
  }

  private JSObject buildCapabilities() {
    JSObject o = new JSObject();
    o.put("nativeBridgeVersion", "android-sensors-v1");
    o.put("androidSensorManager", sensorManager != null);
    o.put("androidGnss", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS));
    o.put("androidWifiRtt", hasWifiRtt());
    o.put("uwb", hasFeature("android.hardware.uwb"));
    o.put("camera", hasFeature(PackageManager.FEATURE_CAMERA_ANY));
    o.put("arcoreDepth", false);
    o.put("arcoreRawDepth", false);
    o.put("thermal", false);
    o.put("mmwave", false);
    o.put("externalPhysiology", false);
    o.put("sensorCount", sensorManager == null ? 0 : sensorManager.getSensorList(Sensor.TYPE_ALL).size());
    o.put("registeredSensorCount", registeredSensorTypes.size());
    JSObject sensorRegistration = new JSObject();
    addSensorRegistration(sensorRegistration, Sensor.TYPE_ACCELEROMETER, "accelerometer");
    addSensorRegistration(sensorRegistration, Sensor.TYPE_GYROSCOPE, "gyroscope");
    addSensorRegistration(sensorRegistration, Sensor.TYPE_MAGNETIC_FIELD, "magnetometer");
    addSensorRegistration(sensorRegistration, Sensor.TYPE_ROTATION_VECTOR, "rotationVector");
    addSensorRegistration(sensorRegistration, Sensor.TYPE_GRAVITY, "gravity");
    addSensorRegistration(sensorRegistration, Sensor.TYPE_PRESSURE, "barometer");
    addSensorRegistration(sensorRegistration, Sensor.TYPE_LIGHT, "ambientLight");
    addSensorRegistration(sensorRegistration, Sensor.TYPE_PROXIMITY, "proximity");
    o.put("sensorRegistration", sensorRegistration);
    return o;
  }

  private void addSensorRegistration(JSObject target, int type, String name) {
    Sensor sensor = sensorManager == null ? null : sensorManager.getDefaultSensor(type);
    JSObject status = new JSObject();
    status.put("supported", sensor != null);
    status.put("registered", registeredSensorTypes.contains(type));
    status.put("registrationState", registrationStates.getOrDefault(type, sensor == null ? "UNSUPPORTED" : "NOT_REGISTERED"));
    // Sample history is not a freshness guarantee; each measurement has its own age.
    status.put("hasSampleHistory", latest.containsKey(type));
    target.put(name, status);
  }

  private boolean hasWifiRtt() {
    return hasFeature("android.hardware.wifi.rtt");
  }

  private boolean hasFeature(String feature) {
    return getContext().getPackageManager().hasSystemFeature(feature);
  }
}