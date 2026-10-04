import { useEffect } from 'react';
import useSensorBridge from './useSensorBridge';

// Detection source is strictly real sensor data.
// This hook intentionally does not synthesize, drift, spawn, or extrapolate
// targets when no physical sensor bridge is providing measurements.
// Camera-derived detections are handled separately by the camera detectors.

export default function useDetectionEngine(setDetections, { isScanning, sensorBridge }) {
  const fallbackBridge = useSensorBridge(!sensorBridge && isScanning);
  const { connected, lastFrame } = sensorBridge || fallbackBridge;

  useEffect(() => {
    if (!isScanning) {
      setDetections([]);
      return;
    }

    // A connected sensor bridge is the only source for this detection stream.
    // An empty frame is meaningful: it means there is currently no detected
    // target from that sensor, not that a target should be fabricated.
    if (!connected) {
      setDetections([]);
      return;
    }

    const frameAgeMs = lastFrame?.receivedAt ? performance.now() - lastFrame.receivedAt : Infinity;
    const sourceDetections = frameAgeMs <= 1500 && Array.isArray(lastFrame?.detections)
      ? lastFrame.detections
      : [];

    setDetections(sourceDetections.map((d, i) => ({
      id: d.id ?? `hw-${i}`,
      type: d.type || 'unknown',
      angle: Number.isFinite(Number(d.angle)) ? Number(d.angle) : 0,
      distance: Number.isFinite(Number(d.distance)) ? Number(d.distance) : null,
      intensity: Math.max(0, Math.min(100, Number(d.intensity) || 0)),
      moving: Boolean(d.moving),
      speed: Number.isFinite(Number(d.speed)) ? Number(d.speed) : 0,
      height: Number.isFinite(Number(d.height)) ? Number(d.height) : null,
      confidence: Number.isFinite(Number(d.confidence)) ? Math.max(0, Math.min(1, Number(d.confidence))) : null,
      snrDb: Number.isFinite(Number(d.snrDb)) ? Number(d.snrDb) : null,
      signalQuality: Number.isFinite(Number(d.signalQuality)) ? Math.max(0, Math.min(100, Number(d.signalQuality))) : null,
      uncertaintyM: Number.isFinite(Number(d.uncertaintyM)) ? Math.max(0, Number(d.uncertaintyM)) : null,
      bearingUncertaintyDeg: Number.isFinite(Number(d.bearingUncertaintyDeg)) ? Math.max(0, Number(d.bearingUncertaintyDeg)) : null,
      heightUncertaintyM: Number.isFinite(Number(d.heightUncertaintyM)) ? Math.max(0, Number(d.heightUncertaintyM)) : null,
      source: d.source || lastFrame?.source || lastFrame?.technology || 'external-sensor',
      provenance: d.provenance || { source: d.source || lastFrame?.source || lastFrame?.technology || 'external-sensor', frameSequence: lastFrame?.sequence ?? null },
      measuredAt: d.measuredAt ?? lastFrame?.timestamp ?? null,
      frameReceivedAt: lastFrame?.receivedAt ?? null,
      frameAgeMs: Math.max(0, frameAgeMs),
      packetRateHz: Number.isFinite(Number(lastFrame?.packetRateHz)) ? Number(lastFrame.packetRateHz) : null,
      latencyMs: Number.isFinite(Number(lastFrame?.latencyMs)) ? Number(lastFrame.latencyMs) : null,
      capabilityScore: Number.isFinite(Number(d.capabilityScore)) ? Math.max(0, Math.min(1, Number(d.capabilityScore))) : null,
    })));
  }, [isScanning, connected, lastFrame, setDetections]);
}