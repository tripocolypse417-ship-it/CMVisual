import { registerPlugin } from '@capacitor/core';

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
  const measurements = Array.isArray(result.measurements) ? result.measurements.filter(Boolean) : [];
  const receivedAtEpochMs = Number.isFinite(Number(result.receivedAtEpochMs))
    ? Number(result.receivedAtEpochMs)
    : Date.now();

  // Wi-Fi RTT supplies range, not bearing. Do not turn a missing angle into 0°,
  // and do not invent a target/detection from a range-only observation.
  const detections = measurements
    .filter(m => m.evidenceClass === 'MEASURED' &&
      Number.isFinite(Number(m.distanceM)) &&
      m.angle != null && Number.isFinite(Number(m.angle)))
    .map((m, index) => ({
      id: `wifi-rtt-${m.responder || index}`,
      angle: Number(m.angle),
      distance: Number(m.distanceM),
      uncertaintyM: Number.isFinite(Number(m.uncertaintyM)) ? Number(m.uncertaintyM) : null,
      uncertaintyType: m.uncertaintyType || null,
      confidence: null,
      source: 'wifi-rtt',
      evidenceClass: 'MEASURED',
      measurementTimestampElapsedRealtimeMs: Number.isFinite(Number(m.measurementTimestampElapsedRealtimeMs))
        ? Number(m.measurementTimestampElapsedRealtimeMs)
        : null,
      timestampClockDomain: m.timestampClockDomain || null,
      receivedAtEpochMs,
      provenance: { source: 'Android WifiRttManager', responder: m.responder || null }
    }));
  window.dispatchEvent(new CustomEvent('waveradar:range-frame', {
    detail: {
      timestamp: receivedAtEpochMs,
      receivedAtEpochMs,
      measurements,
      detections
    }
  }));
}
