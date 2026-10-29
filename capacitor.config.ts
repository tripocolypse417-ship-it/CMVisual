import type { CapacitorConfig } from '@capacitor/cli';

// WAVERADAR_HOSTED_URL is set only by the connected pilot APK workflow.
// This keeps the APK aligned with the live WaveRadar UI while native Android
// sensor plugins remain available through Capacitor. It requires internet and
// is not an offline/production deployment configuration.
const hostedUrl = process.env.WAVERADAR_HOSTED_URL?.trim();
// An isolated test build must use its own Android package so it can be installed
// beside the recovery app without replacing it or touching its local data.
const appId = process.env.WAVERADAR_APP_ID?.trim() || 'com.waveradar.app';
if (!/^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$/.test(appId)) {
  throw new Error(`Invalid WAVERADAR_APP_ID: ${appId}`);
}

const config: CapacitorConfig = {
  appId,
  appName: 'WaveRadar',
  webDir: 'dist',
  ...(hostedUrl
    ? {
        server: {
          url: hostedUrl,
          cleartext: false,
        },
      }
    : {}),
};

export default config;
