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
import java.util.Map;

@CapacitorPlugin(name = "WaveRadarSensors")
public class WaveRadarSensorsPlugin extends Plugin implements SensorEventListener {
  private SensorManager sensorManager;
  private final Map<Integer, float[]> latest = new HashMap<>();
  private final Map<Integer, Long> sensorTimestamps = new HashMap<>();
  private final Map<Integer, Integer> sensorAccuracies = new HashMap<>();
  private long lastSensorTimestamp = 0L;

  @Override
  public void load() {
    sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    if (sensorManager != null) {
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
        if (sensor != null) sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME);
      }
    }
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
    if (sensorManager != null) sensorManager.unregisterListener(this);
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
    target.put(name, item);
  }

  private org.json.JSONArray toArray(float[] values) {
    org.json.JSONArray a = new org.json.JSONArray();
    for (float v : values) a.put(v);
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
    return o;
  }

  private boolean hasWifiRtt() {
    return hasFeature("android.hardware.wifi.rtt");
  }

  private boolean hasFeature(String feature) {
    return getContext().getPackageManager().hasSystemFeature(feature);
  }
}