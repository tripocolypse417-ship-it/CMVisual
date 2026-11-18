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

export async function acknowledgeNativeSensorSamples(throughSequence, droppedSamplesTotal) {
  if (!Number.isSafeInteger(Number(throughSequence)) || Number(throughSequence) < 0) {
    throw new TypeError('A valid throughSequence is required');
  }
  return WaveRadarSensors.acknowledgeSamples({
    throughSequence: Number(throughSequence),
    droppedSamplesTotal: Number(droppedSamplesTotal || 0),
  });
}
