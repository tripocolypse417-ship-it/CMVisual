package com.waveradar.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanRecord;
import android.os.Handler;
import android.os.Looper;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.SystemClock;
import android.telephony.CellInfo;
import android.telephony.CellInfoCdma;
import android.telephony.CellInfoGsm;
import android.telephony.CellInfoLte;
import android.telephony.CellInfoTdscdma;
import android.telephony.CellInfoWcdma;
import android.telephony.CellSignalStrength;
import android.telephony.TelephonyManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

import java.util.List;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "WaveRadarNetwork", permissions = {
  @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.READ_PHONE_STATE }),
  @Permission(alias = "bleScan", strings = { Manifest.permission.BLUETOOTH_SCAN })
})
public class WaveRadarNetworkPlugin extends Plugin {
  private WifiManager wifiManager;
  private TelephonyManager telephonyManager;
  private BluetoothAdapter bluetoothAdapter;
  private BluetoothLeScanner bleScanner;
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private boolean bleScanRunning = false;

  @Override
  public void load() {
    Context app = getContext().getApplicationContext();
    wifiManager = (WifiManager) app.getSystemService(Context.WIFI_SERVICE);
    telephonyManager = (TelephonyManager) app.getSystemService(Context.TELEPHONY_SERVICE);
    BluetoothManager bluetoothManager = (BluetoothManager) app.getSystemService(Context.BLUETOOTH_SERVICE);
    bluetoothAdapter = bluetoothManager == null ? null : bluetoothManager.getAdapter();
  }

  @PluginMethod
  public void getCapabilities(PluginCall call) {
    JSObject out = new JSObject();
    out.put("nativeBridge", true);
    out.put("androidApi", Build.VERSION.SDK_INT);
    out.put("wifiScanCache", wifiManager != null);
    out.put("telephony", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY_RADIO_ACCESS));
    out.put("activeWifiScan", false);
    out.put("activeCellNetworkScan", false);
    out.put("bleAdvertisementScan", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE));
    out.put("blePermissionState", hasBleScanPermission() ? "GRANTED" : "NOT_GRANTED");
    out.put("permissionState", hasLocationPermission() ? "GRANTED" : "NOT_GRANTED");
    out.put("phoneStatePermission", hasPhoneStatePermission() ? "GRANTED" : "NOT_GRANTED");
    out.put("dataClass", "CAPABILITY_STATUS");
    call.resolve(out);
  }

  @PluginMethod
  public void requestPermissions(PluginCall call) {
    if (hasLocationPermission() && hasPhoneStatePermission()) {
      JSObject result = new JSObject();
      result.put("permissionState", "GRANTED");
      call.resolve(result);
      return;
    }
    requestPermissionForAlias("location", call, "locationPermissionCallback");
  }

  @com.getcapacitor.annotation.PermissionCallback
  private void locationPermissionCallback(PluginCall call) {
    JSObject result = new JSObject();
    result.put("permissionState", hasLocationPermission() ? "GRANTED" : "DENIED");
    result.put("phoneStatePermission", hasPhoneStatePermission() ? "GRANTED" : "DENIED");
    call.resolve(result);
  }

  @PluginMethod
  public void getSnapshot(PluginCall call) {
    if (!hasLocationPermission()) {
      JSObject out = new JSObject();
      out.put("permissionState", "NOT_GRANTED");
      out.put("wifi", unavailable("PERMISSION_REQUIRED"));
      out.put("cellular", unavailable("PERMISSION_REQUIRED"));
      call.resolve(out);
      return;
    }

    if (Build.VERSION.SDK_INT >= 29 && telephonyManager != null &&
        getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY_RADIO_ACCESS)) {
      try {
        Executor executor = getActivity().getMainExecutor();
        telephonyManager.requestCellInfoUpdate(executor, new TelephonyManager.CellInfoCallback() {
          @Override
          public void onCellInfo(List<CellInfo> cells) {
            call.resolve(buildSnapshot(cells));
          }

          @Override
          public void onError(int errorCode, Throwable detail) {
            call.resolve(buildSnapshot(readCachedCells()));
          }
        });
        return;
      } catch (SecurityException | UnsupportedOperationException e) {
        call.resolve(buildSnapshot(readCachedCells()));
        return;
      }
    }
    call.resolve(buildSnapshot(readCachedCells()));
  }

  private JSObject buildSnapshot(List<CellInfo> cells) {
    JSObject out = new JSObject();
    out.put("permissionState", "GRANTED");
    out.put("capturedAt", System.currentTimeMillis());
    out.put("clockDomain", "UNIX_EPOCH_MILLISECONDS");
    out.put("wifi", readWifiCache());
    out.put("cellular", readCells(cells));
    out.put("scanPolicy", "PASSIVE_CACHED_WIFI_AND_PLATFORM_CELL_INFO");
    return out;
  }

  private JSObject readWifiCache() {
    JSObject wifi = new JSObject();
    if (wifiManager == null) {
      wifi.put("status", "UNAVAILABLE");
      wifi.put("reason", "WIFI_SERVICE_MISSING");
      wifi.put("networks", new JSArray());
      return wifi;
    }
    if (!hasLocationPermission()) {
      wifi.put("status", "PERMISSION_REQUIRED");
      wifi.put("networks", new JSArray());
      return wifi;
    }
    JSArray networks = new JSArray();
    try {
      List<ScanResult> results = wifiManager.getScanResults();
      long nowMicros = SystemClock.elapsedRealtimeNanos() / 1000L;
      for (ScanResult result : results) {
        if (result == null) continue;
        JSObject item = new JSObject();
        item.put("ssid", result.SSID == null ? "" : result.SSID);
        item.put("bssid", result.BSSID == null ? "" : result.BSSID);
        item.put("frequencyMhz", result.frequency);
        item.put("rssiDbm", result.level);
        item.put("capabilities", result.capabilities == null ? "" : result.capabilities);
        item.put("timestampMicros", result.timestamp);
        item.put("ageMs", result.timestamp > 0L ? Math.max(0L, (nowMicros - result.timestamp) / 1000L) : -1L);
        networks.put(item);
      }
      wifi.put("status", "AVAILABLE");
      wifi.put("networks", networks);
      wifi.put("source", "WifiManager.getScanResults");
      wifi.put("freshness", "PLATFORM_SCAN_CACHE");
    } catch (SecurityException e) {
      wifi.put("status", "PERMISSION_REQUIRED");
      wifi.put("reason", "WIFI_SCAN_ACCESS_DENIED");
      wifi.put("networks", networks);
    } catch (RuntimeException e) {
      wifi.put("status", "ERROR");
      wifi.put("reason", "WIFI_SCAN_CACHE_READ_FAILED");
      wifi.put("networks", networks);
    }
    return wifi;
  }

  private JSObject readCells(List<CellInfo> cells) {
    JSObject cellular = new JSObject();
    JSArray output = new JSArray();
    if (telephonyManager == null ||
        !getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY_RADIO_ACCESS)) {
      cellular.put("status", "UNAVAILABLE");
      cellular.put("reason", "TELEPHONY_RADIO_FEATURE_MISSING");
      cellular.put("cells", output);
      return cellular;
    }
    try {
      String operator = telephonyManager.getNetworkOperator();
      cellular.put("operatorCode", operator == null || operator.isEmpty() ? null : operator);
      if (cells != null) {
        long nowNanos = SystemClock.elapsedRealtimeNanos();
        for (CellInfo cell : cells) {
          if (cell == null) continue;
          JSObject item = new JSObject();
          item.put("technology", technology(cell));
          item.put("registered", cell.isRegistered());
          item.put("timestampNanos", cell.getTimeStamp());
          item.put("ageMs", cell.getTimeStamp() > 0L ? Math.max(0L, (nowNanos - cell.getTimeStamp()) / 1000000L) : -1L);
          CellSignalStrength signal = cell.getCellSignalStrength();
          item.put("signalDbm", signal == null ? null : signal.getDbm());
          item.put("cellId", cellIdentifier(cell));
          output.put(item);
        }
      }
      cellular.put("status", output.length() > 0 ? "AVAILABLE" : "EMPTY_OR_UNAVAILABLE");
      cellular.put("cells", output);
      cellular.put("source", "TelephonyManager.requestCellInfoUpdate/getAllCellInfo");
      cellular.put("freshness", "PLATFORM_CELL_INFO_CALLBACK_OR_CACHE");
    } catch (SecurityException e) {
      cellular.put("status", "PERMISSION_REQUIRED");
      cellular.put("reason", "CELL_INFO_ACCESS_DENIED");
      cellular.put("cells", output);
    } catch (RuntimeException e) {
      cellular.put("status", "ERROR");
      cellular.put("reason", "CELL_INFO_READ_FAILED");
      cellular.put("cells", output);
    }
    return cellular;
  }

  private String technology(CellInfo cell) {
    if (cell instanceof CellInfoLte) return "LTE";
    if (cell instanceof CellInfoGsm) return "GSM";
    if (cell instanceof CellInfoWcdma) return "WCDMA";
    if (cell instanceof CellInfoCdma) return "CDMA";
    if (Build.VERSION.SDK_INT >= 29 && cell instanceof android.telephony.CellInfoNr) return "NR";
    if (Build.VERSION.SDK_INT >= 29 && cell instanceof CellInfoTdscdma) return "TD_SCDMA";
    return "UNKNOWN";
  }

  private String cellIdentifier(CellInfo cell) {
    try {
      if (cell instanceof CellInfoLte) return String.valueOf(((CellInfoLte) cell).getCellIdentity().getCi());
      if (cell instanceof CellInfoGsm) return String.valueOf(((CellInfoGsm) cell).getCellIdentity().getCid());
      if (cell instanceof CellInfoWcdma) return String.valueOf(((CellInfoWcdma) cell).getCellIdentity().getCid());
      if (cell instanceof CellInfoCdma) return String.valueOf(((CellInfoCdma) cell).getCellIdentity().getBasestationId());
      if (Build.VERSION.SDK_INT >= 29 && cell instanceof CellInfoTdscdma) return String.valueOf(((CellInfoTdscdma) cell).getCellIdentity().getCid());
      if (Build.VERSION.SDK_INT >= 29 && cell instanceof android.telephony.CellInfoNr) return String.valueOf(((android.telephony.CellInfoNr) cell).getCellIdentity().getNci());
    } catch (RuntimeException ignored) {
      return null;
    }
    return null;
  }

  private List<CellInfo> readCachedCells() {
    try {
      return telephonyManager == null ? null : telephonyManager.getAllCellInfo();
    } catch (RuntimeException e) {
      return null;
    }
  }

  private JSObject unavailable(String reason) {
    JSObject out = new JSObject();
    out.put("status", "UNAVAILABLE");
    out.put("reason", reason);
    out.put("networks", new JSArray());
    out.put("cells", new JSArray());
    return out;
  }


  @PluginMethod
  public void discoverBluetooth(PluginCall call) {
    if (!getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
      call.reject("Bluetooth LE is not supported on this device");
      return;
    }
    if (Build.VERSION.SDK_INT >= 31) {
      if (getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
        requestPermissionForAlias("bleScan", call, "blePermissionCallback");
        return;
      }
    } else if (!hasLocationPermission()) {
      requestPermissionForAlias("location", call, "blePermissionCallback");
      return;
    }
    startBleScan(call);
  }

  @com.getcapacitor.annotation.PermissionCallback
  private void blePermissionCallback(PluginCall call) {
    if (!hasBleScanPermission()) {
      call.reject("Bluetooth scan permission was not granted");
      return;
    }
    startBleScan(call);
  }

  private void startBleScan(PluginCall call) {
    try {
      bleScanner = bluetoothAdapter == null ? null : bluetoothAdapter.getBluetoothLeScanner();
    } catch (SecurityException e) {
      call.reject("Bluetooth scan permission is required");
      return;
    }
    if (bleScanner == null) {
      call.reject("Bluetooth is disabled or its scanner is unavailable");
      return;
    }
    if (bleScanRunning) {
      call.reject("A Bluetooth discovery scan is already running");
      return;
    }
    final Map<String, JSObject> candidates = new LinkedHashMap<>();
    final ScanCallback callback = new ScanCallback() {
      @Override
      public void onScanResult(int callbackType, android.bluetooth.le.ScanResult result) {
        addBleCandidate(candidates, result);
      }

      @Override
      public void onBatchScanResults(List<android.bluetooth.le.ScanResult> results) {
        if (results != null) for (android.bluetooth.le.ScanResult result : results) addBleCandidate(candidates, result);
      }

      @Override
      public void onScanFailed(int errorCode) {
        bleScanRunning = false;
        call.reject("Bluetooth LE scan failed with platform code " + errorCode);
      }
    };

    try {
      bleScanRunning = true;
      bleScanner.startScan(callback);
      mainHandler.postDelayed(() -> {
        if (!bleScanRunning) return;
        try {
          bleScanner.stopScan(callback);
        } catch (SecurityException ignored) {
          // Permission may have been revoked while the scan was running.
        }
        bleScanRunning = false;
        JSArray observations = new JSArray();
        for (JSObject candidate : candidates.values()) observations.put(candidate);
        JSObject out = new JSObject();
        out.put("capturedAt", System.currentTimeMillis());
        out.put("scanDurationMs", 6000);
        out.put("scanMode", "PASSIVE_BLE_ADVERTISEMENT_DISCOVERY");
        out.put("observations", observations);
        out.put("candidateCount", observations.length());
        out.put("provenance", "Android BluetoothLeScanner");
        call.resolve(out);
      }, 6000L);
    } catch (SecurityException e) {
      bleScanRunning = false;
      call.reject("Bluetooth scan permission was not granted");
    } catch (RuntimeException e) {
      bleScanRunning = false;
      call.reject("Bluetooth LE scan could not start");
    }
  }

  private void addBleCandidate(Map<String, JSObject> candidates, android.bluetooth.le.ScanResult result) {
    if (result == null || result.getScanRecord() == null) return;
    ScanRecord record = result.getScanRecord();
    List<String> serviceUuids = new ArrayList<>();
    if (record.getServiceUuids() != null) {
      for (android.os.ParcelUuid uuid : record.getServiceUuids()) serviceUuids.add(uuid.toString());
    }
    List<Integer> manufacturerIds = new ArrayList<>();
    android.util.SparseArray<byte[]> manufacturerData = record.getManufacturerSpecificData();
    if (manufacturerData != null) {
      for (int i = 0; i < manufacturerData.size(); i++) manufacturerIds.add(manufacturerData.keyAt(i));
    }
    java.util.Collections.sort(serviceUuids);
    java.util.Collections.sort(manufacturerIds);
    String signature = serviceUuids.toString() + "|" + manufacturerIds.toString();
    if (signature.equals("|")) signature = "unclassified-advertisement";
    JSObject item = new JSObject();
    JSArray uuidArray = new JSArray();
    for (String uuid : serviceUuids) uuidArray.put(uuid);
    JSArray manufacturerArray = new JSArray();
    for (Integer id : manufacturerIds) manufacturerArray.put(id);
    item.put("serviceUuids", uuidArray);
    item.put("manufacturerIds", manufacturerArray);
    item.put("rssiDbm", result.getRssi());
    item.put("txPowerLevel", record.getTxPowerLevel());
    item.put("advertiseFlags", record.getAdvertiseFlags());
    item.put("sourceTimestampNanos", result.getTimestampNanos());
    item.put("clockDomain", "ANDROID_ELAPSED_REALTIME_NANOS");
    item.put("evidenceState", "MEASURED");
    item.put("classification", serviceUuids.isEmpty() && manufacturerIds.isEmpty() ? "UNKNOWN_DEVICE" : "POSSIBLE_SENSOR");
    item.put("limitations", "Advertisement only; no device name, hardware address, GATT data, identity, or owner is collected");
    candidates.put(signature, item);
  }

  private boolean hasBleScanPermission() {
    if (Build.VERSION.SDK_INT >= 31) {
      return getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
    }
    return hasLocationPermission();
  }

  private boolean hasPhoneStatePermission() {
    return getContext().checkSelfPermission(Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;
  }

  private boolean hasLocationPermission() {
    return getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
  }
}
