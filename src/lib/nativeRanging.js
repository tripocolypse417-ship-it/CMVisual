import { registerPlugin } from '@capacitor/core';
import { normalizeFrameTimestamp } from './sensorFrameContract.js';

const WaveRadarRanging = registerPlugin('WaveRadarRanging');

export async function getNativeRangingCapabilities() {
  try {
    return await WaveRadarRanging.getCapabilities();
  } catch {
    return { wifiRtt: false, available: false, provenance: 'unavailable' };
  }
}

export async function requestNativeRangingPermissions() {
  try { return await WaveRadarRanging.requestPermissions(); }
  catch (error) { return { granted: false, error: String(error?.message || error) }; }
}

export async function startNativeRanging() {
  return WaveRadarRanging.startRanging();
}

export function publishRangingFrame(result) {
  if (typeof window === 'undefined' || !result) return;
  const timestamp = normalizeFrameTimestamp(result.timestamp);
  const measurements = Array.isArray(result.measurements) ? result.measurements : [];
  const detections = measurements
    .filter(m => m && m.distanceM != null && m.distanceM !== '' && Number.isFinite(Number(m.distanceM)))
    .map((m, index) => ({
      id: `wifi-rtt-${m.responder || index}`,
      angle: null,
      distance: Number(m.distanceM),
      uncertaintyM: m.uncertaintyM != null && Number.isFinite(Number(m.uncertaintyM)) ? Number(m.uncertaintyM) : null,
      confidence: m.uncertaintyM != null && Number.isFinite(Number(m.uncertaintyM)) ? Math.max(0, Math.min(1, 1 / (1 + Number(m.uncertaintyM)))) : null,
      source: 'wifi-rtt',
      evidenceClass: 'MEASURED',
      measuredAt: normalizeFrameTimestamp(m.timestamp ?? timestamp),
      coordinateAlignment: 'RANGE_ONLY',
      provenance: { source: 'Android WifiRttManager', responder: m.responder || null }
    }));
  window.dispatchEvent(new CustomEvent('waveradar:range-frame', {
    detail: {
      timestamp,
      timestampState: timestamp == null ? 'UNKNOWN' : 'SOURCE_TIMESTAMP',
      source: 'wifi-rtt',
      technology: 'IEEE_802.11_RTT',
      measurements,
      detections
    }
  }));
}
