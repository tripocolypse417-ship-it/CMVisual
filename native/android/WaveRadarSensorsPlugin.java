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
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "WaveRadarSensors")
public class WaveRadarSensorsPlugin extends Plugin implements SensorEventListener {
  private static final int MAX_PENDING_SAMPLES = 10000;
  private static final int MAX_SAMPLES_PER_SNAPSHOT = 2000;

  private static final class SensorSample {
    final long sequence;
    final int sensorType;
    final float[] values;
    final long sourceTimestampNs;
    final long sampleReceivedAt;
    final int accuracy;

    SensorSample(long sequence, int sensorType, float[] values, long sourceTimestampNs, long sampleReceivedAt, int accuracy) {
      this.sequence = sequence;
      this.sensorType = sensorType;
      this.values = values;
      this.sourceTimestampNs = sourceTimestampNs;
      this.sampleReceivedAt = sampleReceivedAt;
      this.accuracy = accuracy;
    }
  }

  private SensorManager sensorManager;
  private final Map<Integer, float[]> latest = new HashMap<>();
  private final Map<Integer, Long> sensorTimestamps = new HashMap<>();
  private final Map<Integer, Long> sampleReceiptTimes = new HashMap<>();
  private final Map<Integer, Integer> sensorAccuracies = new HashMap<>();
  private long lastSensorTimestamp = 0L;
  private final Set<Integer> registeredSensorTypes = new HashSet<>();
  // Samples remain queued until JavaScript confirms IndexedDB persistence.
  private final ArrayDeque<SensorSample> pendingSamples = new ArrayDeque<>();
  private long nextSampleSequence = 0L;
  private long droppedSamplesTotal = 0L;
  private long droppedSamplesAcknowledged = 0L;

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
      // Track registration per sensor. One successful registration must not
      // prevent a failed sensor from being retried after the app resumes.
      if (registeredSensorTypes.contains(type)) continue;
      Sensor sensor = sensorManager.getDefaultSensor(type);
      if (sensor != null && sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME)) {
        registeredSensorTypes.add(type);
      }
    }
  }

  private void unregisterSensors() {
    if (sensorManager != null && !registeredSensorTypes.isEmpty()) {
      sensorManager.unregisterListener(this);
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
    long receivedAt = System.currentTimeMillis();
    float[] values = event.values.clone();
    synchronized (this) {
      latest.put(type, values);
      sensorTimestamps.put(type, event.timestamp);
      sensorAccuracies.put(type, event.accuracy);
      lastSensorTimestamp = receivedAt;
      sampleReceiptTimes.put(type, receivedAt);
    }
    synchronized (pendingSamples) {
      if (pendingSamples.size() >= MAX_PENDING_SAMPLES) {
        pendingSamples.removeFirst();
        droppedSamplesTotal += 1L;
      }
      pendingSamples.addLast(new SensorSample(++nextSampleSequence, type, values, event.timestamp, receivedAt, event.accuracy));
    }
  }

  @Override
  public void onAccuracyChanged(Sensor sensor, int accuracy) {
    if (sensor != null) {
      synchronized (this) { sensorAccuracies.put(sensor.getType(), accuracy); }
    }
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
    synchronized (this) {
      out.put("lastSensorAt", lastSensorTimestamp == 0L ? null : lastSensorTimestamp);
    }
    addPendingSamples(out);
    out.put("evidenceClass", "MEASURED");
    out.put("provenance", "Android SensorManager");
    call.resolve(out);
  }

  private void addPendingSamples(JSObject out) {
    org.json.JSONArray samples = new org.json.JSONArray();
    synchronized (pendingSamples) {
      int returned = 0;
      long lastReturnedSequence = 0L;
      for (SensorSample sample : pendingSamples) {
        if (returned >= MAX_SAMPLES_PER_SNAPSHOT) break;
        JSObject item = new JSObject();
        item.put("sequence", sample.sequence);
        item.put("sensorType", sample.sensorType);
        item.put("capabilityId", capabilityName(sample.sensorType));
        item.put("values", toArray(sample.values));
        item.put("sourceTimestampNs", sample.sourceTimestampNs);
        item.put("sourceClockDomain", "ANDROID_ELAPSED_REALTIME_NANOS");
        item.put("sampleReceivedAt", sample.sampleReceivedAt);
        item.put("sampleAgeMs", Math.max(0L, (SystemClock.elapsedRealtimeNanos() - sample.sourceTimestampNs) / 1000000L));
        item.put("accuracy", sample.accuracy);
        samples.put(item);
        returned += 1;
        lastReturnedSequence = sample.sequence;
      }
      out.put("samples", samples);
      out.put("returnedSampleCount", returned);
      out.put("pendingSampleCount", pendingSamples.size());
      out.put("sampleBufferCapacity", MAX_PENDING_SAMPLES);
      out.put("sampleSnapshotLimit", MAX_SAMPLES_PER_SNAPSHOT);
      out.put("lastReturnedSequence", lastReturnedSequence);
      out.put("lastSampleSequence", nextSampleSequence);
      out.put("droppedSamplesTotal", droppedSamplesTotal);
      out.put("droppedSamplesSinceLastAck", Math.max(0L, droppedSamplesTotal - droppedSamplesAcknowledged));
    }
  }

  @PluginMethod
  public void acknowledgeSamples(com.getcapacitor.PluginCall call) {
    Long throughSequence = call.getLong("throughSequence");
    Long droppedTotalAtSnapshot = call.getLong("droppedSamplesTotal");
    if (throughSequence == null || throughSequence < 0L) {
      call.reject("throughSequence is required");
      return;
    }
    int removed = 0;
    synchronized (pendingSamples) {
      while (!pendingSamples.isEmpty() && pendingSamples.peekFirst().sequence <= throughSequence) {
        pendingSamples.removeFirst();
        removed += 1;
      }
      if (droppedTotalAtSnapshot != null && droppedTotalAtSnapshot >= droppedSamplesAcknowledged) {
        droppedSamplesAcknowledged = Math.min(droppedSamplesTotal, droppedTotalAtSnapshot);
      }
      JSObject result = new JSObject();
      result.put("acknowledgedThroughSequence", throughSequence);
      result.put("removedSampleCount", removed);
      result.put("remainingSampleCount", pendingSamples.size());
      result.put("droppedSamplesAcknowledged", droppedSamplesAcknowledged);
      call.resolve(result);
    }
  }

  private String capabilityName(int type) {
    switch (type) {
      case Sensor.TYPE_ACCELEROMETER: return "accelerometer";
      case Sensor.TYPE_GYROSCOPE: return "gyroscope";
      case Sensor.TYPE_MAGNETIC_FIELD: return "magnetometer";
      case Sensor.TYPE_ROTATION_VECTOR: return "rotationVector";
      case Sensor.TYPE_GRAVITY: return "gravity";
      case Sensor.TYPE_PRESSURE: return "barometer";
      case Sensor.TYPE_LIGHT: return "ambientLight";
      case Sensor.TYPE_PROXIMITY: return "proximity";
      default: return "sensorType-" + type;
    }
  }

  private void addMeasurement(JSObject target, int type, String name) {
    float[] v;
    long sensorElapsedNs;
    long receiptAt;
    int accuracy;
    synchronized (this) {
      v = latest.get(type);
      sensorElapsedNs = sensorTimestamps.getOrDefault(type, 0L);
      receiptAt = sampleReceiptTimes.getOrDefault(type, 0L);
      accuracy = sensorAccuracies.getOrDefault(type, SensorManager.SENSOR_STATUS_UNRELIABLE);
    }
    if (v == null) return;
    JSObject item = new JSObject();
    long ageMs = sensorElapsedNs > 0L
      ? Math.max(0L, (SystemClock.elapsedRealtimeNanos() - sensorElapsedNs) / 1000000L)
      : 0L;
    item.put("values", toArray(v));
    // SensorEvent.timestamp uses the elapsed-realtime clock (nanoseconds since boot),
    // not Unix epoch time. Keep it intact and label the wall-clock conversion as an estimate.
    item.put("sourceTimestampNs", sensorElapsedNs);
    item.put("sourceClockDomain", "ANDROID_ELAPSED_REALTIME_NANOS");
    item.put("timestampEstimateMs", Math.max(0L, System.currentTimeMillis() - ageMs));
    item.put("timestampEstimateMethod", "receipt_wall_clock_minus_elapsed_age");
    item.put("timestamp", Math.max(0L, System.currentTimeMillis() - ageMs)); // Legacy compatibility; estimate only.
    item.put("sampleReceivedAt", receiptAt == 0L ? org.json.JSONObject.NULL : receiptAt);
    item.put("ageMs", ageMs);
    item.put("sampleAgeMs", ageMs);
    item.put("sensorType", type);
    item.put("accuracy", accuracy);
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
    o.put("sampleBufferCapacity", MAX_PENDING_SAMPLES);
    o.put("sampleSnapshotLimit", MAX_SAMPLES_PER_SNAPSHOT);
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
    // A prior sample may be stale; this flag indicates history only, not freshness.
    long sourceTimestampNs;
    long receivedAt;
    boolean hasSampleHistory;
    synchronized (this) {
      hasSampleHistory = latest.containsKey(type);
      sourceTimestampNs = sensorTimestamps.getOrDefault(type, 0L);
      receivedAt = sampleReceiptTimes.getOrDefault(type, 0L);
    }
    status.put("hasSampleHistory", hasSampleHistory);
    long sampleAgeMs = sourceTimestampNs > 0L
      ? Math.max(0L, (SystemClock.elapsedRealtimeNanos() - sourceTimestampNs) / 1000000L)
      : -1L;
    status.put("sampleAgeMs", sampleAgeMs);
    status.put("sampleReceivedAt", receivedAt == 0L ? org.json.JSONObject.NULL : receivedAt);
    target.put(name, status);
  }

  private boolean hasWifiRtt() {
    return hasFeature("android.hardware.wifi.rtt");
  }

  private boolean hasFeature(String feature) {
    return getContext().getPackageManager().hasSystemFeature(feature);
  }
}