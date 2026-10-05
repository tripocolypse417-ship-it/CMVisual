import { registerPlugin } from '@capacitor/core';

export const WaveRadarSensors = registerPlugin('WaveRadarSensors');

export async function getNativeSensorSnapshot() {
  try {
    const snapshot = await WaveRadarSensors.getSnapshot();
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
  } catch {
    return null;
  }
}

export async function getNativeSensorCapabilities() {
  try {
    const capabilities = await WaveRadarSensors.getCapabilities();
    return capabilities && typeof capabilities === 'object' ? capabilities : null;
  } catch {
    return null;
  }
}
