package com.waveradar.app;

import android.Manifest;
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

import java.util.List;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "WaveRadarNetwork", permissions = {
  @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.READ_PHONE_STATE })
})
public class WaveRadarNetworkPlugin extends Plugin {
  private WifiManager wifiManager;
  private TelephonyManager telephonyManager;

  @Override
  public void load() {
    Context app = getContext().getApplicationContext();
    wifiManager = (WifiManager) app.getSystemService(Context.WIFI_SERVICE);
    telephonyManager = (TelephonyManager) app.getSystemService(Context.TELEPHONY_SERVICE);
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
    out.put("permissionState", hasLocationPermission() ? "GRANTED" : "NOT_GRANTED");
    out.put("dataClass", "CAPABILITY_STATUS");
    call.resolve(out);
  }

  @PluginMethod
  public void requestPermissions(PluginCall call) {
    if (hasLocationPermission()) {
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

  private boolean hasLocationPermission() {
    return getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
  }
}
