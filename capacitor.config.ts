import type { CapacitorConfig } from '@capacitor/cli';

// The normal connected pilot uses a hosted WebView and therefore requires
// network access. The isolated field-test build uses packaged assets and its
// own app ID to protect existing WaveRadar installs and evidence.
// This does not establish offline completeness of the production application.
const isolatedFieldTest = process.env.WAVERADAR_ISOLATED_FIELD_TEST === '1';
const hostedUrl = isolatedFieldTest ? undefined : process.env.WAVERADAR_HOSTED_URL?.trim();

const config: CapacitorConfig = {
  appId: isolatedFieldTest ? 'com.waveradar.fieldtest' : 'com.waveradar.app',
  appName: isolatedFieldTest ? 'WaveRadar Field Test' : 'WaveRadar',
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
