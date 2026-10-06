import { registerPlugin } from '@capacitor/core';

const WaveRadarRanging = registerPlugin('WaveRadarRanging');

export async function getNativeRangingCapabilities() {
  try {
    return await WaveRadarRanging.getCapabilities();
  } catch {
    return { wifiRtt: false, available: false, provenance: 'unavailable' };
  }
}

export async function startNativeRanging() {
  return WaveRadarRanging.startRanging();
}

export function publishRangingFrame(result) {
  if (typeof window === 'undefined' || !result) return;
  const measurements = Array.isArray(result.measurements) ? result.measurements : [];
  const detections = measurements
    .filter(m => m && Number.isFinite(Number(m.distanceM)))
    .map((m, index) => ({
      id: `wifi-rtt-${m.responder || index}`,
      angle: null,
      distance: Number(m.distanceM),
      uncertaintyM: Number.isFinite(Number(m.uncertaintyM)) ? Number(m.uncertaintyM) : null,
      confidence: Number.isFinite(Number(m.uncertaintyM)) ? Math.max(0, Math.min(1, 1 / (1 + Number(m.uncertaintyM)))) : null,
      source: 'wifi-rtt',
      evidenceClass: 'MEASURED',
      measuredAt: result.timestamp || Date.now(),
      provenance: { source: 'Android WifiRttManager', responder: m.responder || null }
    }));
  window.dispatchEvent(new CustomEvent('waveradar:range-frame', {
    detail: {
      timestamp: result.timestamp || Date.now(),
      source: 'wifi-rtt',
      technology: 'IEEE_802.11_RTT',
      measurements,
      detections
    }
  }));
}
