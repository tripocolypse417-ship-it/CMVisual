import type { CapacitorConfig } from '@capacitor/cli';

// WAVERADAR_HOSTED_URL is set only by the connected pilot APK workflow.
// This keeps the APK aligned with the live WaveRadar UI while native Android
// sensor plugins remain available through Capacitor. It requires internet and
// is not an offline/production deployment configuration.
const hostedUrl = process.env.WAVERADAR_HOSTED_URL?.trim();

const config: CapacitorConfig = {
  // Optional alternate package ID lets test APKs install beside the existing app.
  // Keep the production/pilot package ID unchanged unless explicitly overridden.
  appId: process.env.WAVERADAR_APP_ID?.trim() || 'com.waveradar.app',
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
