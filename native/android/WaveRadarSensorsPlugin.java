package com.waveradar.app;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
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
  private final Map<Integer, Long> sensorReceivedAt = new HashMap<>();
  private final Map<Integer, Long> sensorSequences = new HashMap<>();
  private final Map<Integer, Integer> sensorAccuracies = new HashMap<>();
  private final Map<Integer, String> registrationStates = new HashMap<>();
  private long lastSensorTimestamp = 0L;
  private final Set<Integer> registeredSensorTypes = new HashSet<>();

  @Override
  public void load() {
    sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    registerSensors();
  }

  private int[] sensorTypes() {
    return new int[] {
      Sensor.TYPE_ACCELEROMETER,
      Sensor.TYPE_GYROSCOPE,
      Sensor.TYPE_MAGNETIC_FIELD,
      Sensor.TYPE_ROTATION_VECTOR,
      Sensor.TYPE_GRAVITY,
      Sensor.TYPE_PRESSURE,
      Sensor.TYPE_LIGHT,
      Sensor.TYPE_PROXIMITY
    };
  }

  private void registerSensors() {
    // Reacquire the service on resume if the initial lookup was unavailable.
    if (sensorManager == null) {
      sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    }
    if (sensorManager == null) {
      for (int type : sensorTypes()) registrationStates.put(type, "UNKNOWN");
      return;
    }
    for (int type : sensorTypes()) {
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
    sensorReceivedAt.put(type, System.currentTimeMillis());
    sensorSequences.put(type, sensorSequences.getOrDefault(type, 0L) + 1L);
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
    out.put("evidenceClass", "UNKNOWN");
    out.put("measurementEvidenceClass", "MEASURED");
    out.put("evidencePolicy", "Each per-sensor numeric reading is MEASURED; capability and registration metadata are not measurements.");
    call.resolve(out);
  }

  private boolean isVectorSensor(int type) {
    return type == Sensor.TYPE_ACCELEROMETER ||
      type == Sensor.TYPE_GYROSCOPE ||
      type == Sensor.TYPE_MAGNETIC_FIELD ||
      type == Sensor.TYPE_ROTATION_VECTOR ||
      type == Sensor.TYPE_GRAVITY;
  }

  private void addMeasurement(JSObject target, int type, String name) {
    float[] values = latest.get(type);
    if (values == null || values.length == 0) return;
    if (isVectorSensor(type) && values.length < 3) return;
    for (float value : values) {
      if (Float.isNaN(value) || Float.isInfinite(value)) return;
    }

    JSObject item = new JSObject();
    long sensorElapsedNs = sensorTimestamps.getOrDefault(type, 0L);
    long ageMs = sensorElapsedNs > 0L
      ? Math.max(0L, (SystemClock.elapsedRealtimeNanos() - sensorElapsedNs) / 1000000L)
      : -1L;
    long receivedAt = sensorReceivedAt.getOrDefault(type, 0L);
    long sequence = sensorSequences.getOrDefault(type, 0L);

    item.put("values", toArray(values));
    item.put("timestamp", ageMs >= 0L ? Math.max(0L, System.currentTimeMillis() - ageMs) : null);
    item.put("timestampClock", "WALL_CLOCK_ESTIMATE_FROM_ELAPSED_REALTIME");
    item.put("timestampElapsedRealtimeNanos", sensorElapsedNs > 0L ? sensorElapsedNs : null);
    item.put("receivedAt", receivedAt > 0L ? receivedAt : null);
    item.put("ageMs", ageMs >= 0L ? ageMs : null);
    item.put("freshness", ageMs < 0L ? "UNKNOWN" : ageMs <= 5000L ? "FRESH" : "STALE");
    item.put("sampleSequence", sequence > 0L ? sequence : null);
    item.put("sensorType", type);
    item.put("accuracy", sensorAccuracies.getOrDefault(type, SensorManager.SENSOR_STATUS_UNRELIABLE));
    item.put("evidenceClass", "MEASURED");
    item.put("provenance", "Android SensorManager SensorEvent");
    target.put(name, item);
  }

  private org.json.JSONArray toArray(float[] values) {
    org.json.JSONArray array = new org.json.JSONArray();
    for (float value : values) {
      // Values are validated for finiteness before conversion.
      array.put((Object) Double.valueOf(value));
    }
    return array;
  }

  private JSObject buildCapabilities() {
    JSObject out = new JSObject();
    out.put("nativeBridgeVersion", "android-sensors-v2");
    out.put("androidSensorManager", sensorManager != null);
    out.put("nativeSensorRuntimePermission", sensorManager != null ? "NOT_REQUIRED" : "UNKNOWN");
    out.put("androidGnss", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS));
    out.put("androidWifiRtt", hasWifiRtt());
    out.put("uwb", hasFeature("android.hardware.uwb"));
    out.put("camera", hasFeature(PackageManager.FEATURE_CAMERA_ANY));
    // These are not a spatial-pose provider. Do not infer pose availability from them.
    out.put("arcoreDepth", false);
    out.put("arcoreRawDepth", false);
    out.put("thermal", false);
    out.put("mmwave", false);
    out.put("externalPhysiology", false);
    out.put("sensorCount", sensorManager == null ? 0 : sensorManager.getSensorList(Sensor.TYPE_ALL).size());
    out.put("registeredSensorCount", registeredSensorTypes.size());
    addAppAndPlatformMetadata(out);

    JSObject registration = new JSObject();
    addSensorRegistration(registration, Sensor.TYPE_ACCELEROMETER, "accelerometer");
    addSensorRegistration(registration, Sensor.TYPE_GYROSCOPE, "gyroscope");
    addSensorRegistration(registration, Sensor.TYPE_MAGNETIC_FIELD, "magnetometer");
    addSensorRegistration(registration, Sensor.TYPE_ROTATION_VECTOR, "rotationVector");
    addSensorRegistration(registration, Sensor.TYPE_GRAVITY, "gravity");
    addSensorRegistration(registration, Sensor.TYPE_PRESSURE, "barometer");
    addSensorRegistration(registration, Sensor.TYPE_LIGHT, "ambientLight");
    addSensorRegistration(registration, Sensor.TYPE_PROXIMITY, "proximity");
    out.put("sensorRegistration", registration);
    return out;
  }

  private void addAppAndPlatformMetadata(JSObject out) {
    out.put("appPackageName", getContext().getPackageName());
    out.put("androidRelease", Build.VERSION.RELEASE);
    out.put("androidSdkInt", Build.VERSION.SDK_INT);
    out.put("manufacturer", Build.MANUFACTURER);
    out.put("model", Build.MODEL);
    try {
      PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
      out.put("appVersionName", info.versionName);
      out.put("appVersionCode", (long) info.versionCode);
    } catch (PackageManager.NameNotFoundException ignored) {
      out.put("appVersionName", null);
      out.put("appVersionCode", null);
    }
  }

  private void addSensorRegistration(JSObject target, int type, String name) {
    Sensor sensor = sensorManager == null ? null : sensorManager.getDefaultSensor(type);
    JSObject status = new JSObject();
    String capabilityState = sensorManager == null
      ? "UNKNOWN"
      : sensor == null ? "UNSUPPORTED" : "SUPPORTED";
    String registrationState = registrationStates.getOrDefault(
      type,
      sensorManager == null ? "UNKNOWN" : sensor == null ? "UNSUPPORTED" : "NOT_REGISTERED"
    );
    status.put("supported", "SUPPORTED".equals(capabilityState));
    status.put("capabilityState", capabilityState);
    status.put("registered", registeredSensorTypes.contains(type));
    status.put("registrationState", registrationState);
    status.put("hasSampleHistory", latest.containsKey(type));
    status.put("sampleSequence", sensorSequences.getOrDefault(type, 0L));
    status.put("lastEventReceivedAt", sensorReceivedAt.get(type));
    target.put(name, status);
  }

  private boolean hasWifiRtt() {
    return hasFeature("android.hardware.wifi.rtt");
  }

  private boolean hasFeature(String feature) {
    return getContext().getPackageManager().hasSystemFeature(feature);
  }
}
