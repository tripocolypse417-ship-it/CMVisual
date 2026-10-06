package com.waveradar.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(WaveRadarSensorsPlugin.class);
    registerPlugin(WaveRadarRangingPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
