package com.waveradar.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.net.wifi.rtt.RangingRequest;
import android.net.wifi.rtt.RangingResult;
import android.net.wifi.rtt.RangingResultCallback;
import android.net.wifi.rtt.WifiRttManager;
import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.PluginMethod;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "WaveRadarRanging", permissions = {
  @Permission(alias = "ranging", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.NEARBY_WIFI_DEVICES })
})
public class WaveRadarRangingPlugin extends Plugin {
  private WifiManager wifiManager;
  private WifiRttManager rttManager;

  @Override
  public void load() {
    Context context = getContext();
    wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
    if (android.os.Build.VERSION.SDK_INT >= 28) {
      rttManager = (WifiRttManager) context.getApplicationContext().getSystemService(Context.WIFI_RTT_RANGING_SERVICE);
    }
  }

  @PluginMethod
  public void getCapabilities(PluginCall call) {
    JSObject out = new JSObject();
    boolean feature = getContext().getPackageManager().hasSystemFeature("android.hardware.wifi.rtt");
    boolean available = rttManager != null && rttManager.isAvailable();
    out.put("wifiRtt", feature);
    out.put("available", available);
    out.put("androidApi", android.os.Build.VERSION.SDK_INT);
    out.put("dataClass", "CAPABILITY_STATUS");
    out.put("provenance", "Android WifiRttManager");
    call.resolve(out);
  }

  @PluginMethod
  public void requestPermissions(PluginCall call) {
    if (android.os.Build.VERSION.SDK_INT >= 33) {
      requestPermissionForAlias("ranging", call, "android.permission.NEARBY_WIFI_DEVICES");
    } else {
      requestPermissionForAlias("ranging", call, "android.permission.ACCESS_FINE_LOCATION");
    }
  }

  @PluginMethod
  public void startRanging(PluginCall call) {
    if (android.os.Build.VERSION.SDK_INT < 28 || rttManager == null || wifiManager == null) {
      call.reject("Wi-Fi RTT is not supported on this device");
      return;
    }
    if (!hasAndroidPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
      call.reject("Precise location permission is required for Wi-Fi RTT");
      return;
    }
    if (android.os.Build.VERSION.SDK_INT >= 33 &&
        getContext().checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES) != PackageManager.PERMISSION_GRANTED) {
      call.reject("Nearby Wi-Fi devices permission is required for Wi-Fi RTT");
      return;
    }
    if (!rttManager.isAvailable()) {
      call.reject("Wi-Fi RTT is currently unavailable");
      return;
    }

    List<ScanResult> responders = new ArrayList<>();
    try {
      for (ScanResult result : wifiManager.getScanResults()) {
        if (result == null) continue;
        boolean supported = false;
        if (android.os.Build.VERSION.SDK_INT >= 35) {
          supported = result.is80211mcResponder() || result.is80211azNtbResponder();
        } else if (android.os.Build.VERSION.SDK_INT >= 23) {
          supported = result.is80211mcResponder();
        }
        if (supported) responders.add(result);
        if (responders.size() >= 8) break;
      }
    } catch (SecurityException e) {
      call.reject("Wi-Fi scan permission was not granted");
      return;
    }

    if (responders.isEmpty()) {
      call.reject("No RTT-capable Wi-Fi responders were found");
      return;
    }

    RangingRequest.Builder builder = new RangingRequest.Builder();
    for (ScanResult responder : responders) builder.addAccessPoint(responder);
    RangingRequest request = builder.build();

    Executor executor = getActivity().getMainExecutor();
    rttManager.startRanging(request, executor, new RangingResultCallback() {
      @Override
      public void onRangingFailure(int code) {
        call.reject("Wi-Fi RTT ranging failed: " + code);
      }

      @Override
      public void onRangingResults(@NonNull List<RangingResult> results) {
        JSArray measurements = new JSArray();
        long timestamp = System.currentTimeMillis();
        for (RangingResult result : results) {
          JSObject item = new JSObject();
          item.put("source", "wifi-rtt");
          item.put("technology", "IEEE_802.11_RTT");
          item.put("timestamp", timestamp);
          item.put("evidenceClass", "MEASURED");
          item.put("status", result.getStatus());
          if (result.getStatus() == RangingResult.STATUS_SUCCESS) {
            item.put("distanceM", result.getDistanceMm() / 1000.0);
            item.put("uncertaintyM", result.getDistanceStdDevMm() / 1000.0);
          }
          if (result.getMacAddress() != null) item.put("responder", result.getMacAddress().toString());
          measurements.put(item);
        }
        JSObject out = new JSObject();
        out.put("timestamp", timestamp);
        out.put("measurements", measurements);
        out.put("evidenceClass", "MEASURED");
        out.put("provenance", "Android WifiRttManager");
        call.resolve(out);
      }
    });
  }

  private boolean hasAndroidPermission(String permission) {
    return getContext().checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
  }
}
