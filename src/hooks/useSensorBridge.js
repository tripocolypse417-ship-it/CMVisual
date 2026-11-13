import { useEffect, useRef, useState } from 'react';
import { getNativeRangingCapabilities } from '../lib/nativeRanging';
import { classifySpatialMeasurement, normalizeFrameTimestamp, finiteMeasurement } from '../lib/sensorFrameContract.js';

/**
 * Open sensor-ingress bridge. The browser cannot manufacture radar/ranging data;
 * this adapter accepts measurements from real external hardware/software without
 * adding a paid SDK. A WebSocket URL may be stored in localStorage as
 * waveradar.sensorUrl, or another component can dispatch a
 * waveradar:range-frame CustomEvent with the same frame shape.
 *
 * Range-only measurements are retained separately and are never projected as
 * a bearing or placed on the world map. Missing capture time remains UNKNOWN.
 */
export default function useSensorBridge(enabled = true) {
  const [connected, setConnected] = useState(false);
  const [lastFrame, setLastFrame] = useState(null);
  const [bridgeStats, setBridgeStats] = useState({ frames: 0, hz: 0, dropped: 0, lastLatencyMs: null, totalFrames: 0, totalDropped: 0, sequence: null, rangeQuality: 0, sensorAgreement: 0, outliers: 0 });
  const socketRef = useRef(null);
  const liveTimerRef = useRef(null);
  const statsRef = useRef({ frames: 0, windowStart: performance.now(), lastSequence: null, totalFrames: 0, totalDropped: 0 });

  useEffect(() => {
    if (!enabled) return undefined;

    const accept = (raw) => {
      try {
        const frame = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!frame || !Array.isArray(frame.detections)) return;
        const receivedAt = performance.now();
        const timestamp = normalizeFrameTimestamp(frame.timestamp);
        const frameAgeMs = timestamp == null ? null : Date.now() - timestamp;
        const validFrameAgeMs = frameAgeMs != null && frameAgeMs >= 0 ? frameAgeMs : null;
        const timestampState = timestamp == null
          ? 'UNKNOWN'
          : frameAgeMs < 0
            ? 'FUTURE'
            : frameAgeMs > 5000
              ? 'STALE'
              : 'CURRENT';
        const measurements = Array.isArray(frame.measurements) ? frame.measurements.filter(Boolean) : [];
        const sequence = finiteMeasurement(frame.sequence);
        const previousSequence = statsRef.current.lastSequence;
        const dropped = sequence != null && previousSequence != null && sequence > previousSequence + 1
          ? sequence - previousSequence - 1 : 0;
        statsRef.current.lastSequence = sequence ?? statsRef.current.lastSequence;
        statsRef.current.frames += 1;
        statsRef.current.totalFrames += 1;
        statsRef.current.totalDropped += dropped;
        const elapsed = Math.max(1, receivedAt - statsRef.current.windowStart);
        if (elapsed >= 1000) {
          setBridgeStats({
            frames: statsRef.current.frames,
            hz: +(statsRef.current.frames * 1000 / elapsed).toFixed(1),
            dropped,
            lastLatencyMs: validFrameAgeMs,
            totalFrames: statsRef.current.totalFrames,
            totalDropped: statsRef.current.totalDropped,
            sequence,
          });
          statsRef.current.frames = 0;
          statsRef.current.windowStart = receivedAt;
        }
        setConnected(true);
        if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
        liveTimerRef.current = setTimeout(() => setConnected(false), 1500);
        const packetRate = finiteMeasurement(frame.packetRateHz);
        const packetRateHz = packetRate != null && packetRate >= 0 ? packetRate : null;
        const reportedLatency = finiteMeasurement(frame.latencyMs);
        const latencyMs = reportedLatency != null && reportedLatency >= 0
          ? reportedLatency
          : validFrameAgeMs;

        const classified = frame.detections.map(d => ({ d, spatial: classifySpatialMeasurement(d) }));
        const validDetections = classified.filter(item => item.spatial.status === 'SPATIALLY_ALIGNED');
        const rangeOnlyMeasurements = classified
          .filter(item => item.spatial.status === 'RANGE_ONLY')
          .map(({ d, spatial }) => ({
            ...d,
            angle: null,
            distance: spatial.distance,
            coordinateAlignment: 'RANGE_ONLY',
            measuredAt: d.measuredAt ?? timestamp,
          }));

        const confidenceValues = validDetections
          .map(({ d }) => finiteMeasurement(d.confidence))
          .filter(value => value != null)
          .map(value => Math.max(0, Math.min(1, value)));
        const rangeQuality = confidenceValues.length
          ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
          : 0;

        // Agreement is only scored when independent sources report compatible
        // ranges for the same track. Merely having multiple sensor names is not
        // evidence of agreement.
        const byId = new Map();
        for (const { d, spatial } of validDetections) {
          const key = d.id ?? `${Math.round(spatial.angle * 10)}:${Math.round(spatial.distance * 10)}`;
          const list = byId.get(key) ?? [];
          list.push({ ...d, angle: spatial.angle, distance: spatial.distance });
          byId.set(key, list);
        }
        let agreementSum = 0;
        let agreementCount = 0;
        for (const list of byId.values()) {
          const ranges = list.map(d => Number(d.distance)).filter(Number.isFinite);
          const sources = new Set(list.map(d => d.source ?? frame.source ?? frame.technology).filter(Boolean));
          if (ranges.length >= 2 && sources.size >= 2) {
            const mean = ranges.reduce((a, b) => a + b, 0) / ranges.length;
            const spread = mean > 0
              ? Math.min(1, Math.max(0, 1 - (Math.max(...ranges) - Math.min(...ranges)) / (mean * 0.25)))
              : 0;
            agreementSum += spread;
            agreementCount += 1;
          }
        }
        const sensorAgreement = agreementCount ? agreementSum / agreementCount : 0;
        setBridgeStats(prev => ({
          ...prev,
          rangeQuality: +rangeQuality.toFixed(2),
          sensorAgreement: +sensorAgreement.toFixed(2),
        }));

        const normalizedDetections = validDetections.map(({ d, spatial }, i) => {
          const confidence = finiteMeasurement(d.confidence);
          const uncertainty = finiteMeasurement(d.uncertaintyM);
          const capability = finiteMeasurement(d.capabilityScore);
          return {
            ...d,
            id: d.id ?? `${frame.deviceId ?? 'sensor'}-${timestamp ?? sequence ?? Math.round(receivedAt)}-${i}`,
            angle: spatial.angle,
            distance: spatial.distance,
            source: d.source ?? frame.source ?? frame.technology ?? 'external-sensor',
            confidence: confidence == null ? null : Math.max(0, Math.min(1, confidence)),
            uncertaintyM: uncertainty == null ? null : Math.max(0, uncertainty),
            measuredAt: d.measuredAt ?? timestamp,
            coordinateAlignment: 'SPATIALLY_ALIGNED',
            provenance: d.provenance ?? {
              source: d.source ?? frame.source ?? frame.technology ?? 'unknown',
              frameSequence: sequence,
              deviceId: frame.deviceId ?? frame.sourceDeviceId ?? null,
            },
            capabilityScore: capability == null ? null : Math.max(0, Math.min(1, capability)),
            packetRateHz,
            latencyMs,
          };
        });

        setLastFrame({
          ...frame,
          timestamp,
          timestampState,
          frameAgeMs: validFrameAgeMs,
          sequence,
          receivedAt,
          measurements,
          rangeOnlyMeasurements,
          deviceId: frame.deviceId ?? frame.sourceDeviceId ?? null,
          detections: normalizedDetections,
          packetRateHz,
          latencyMs,
        });
      } catch { /* ignore malformed frames */ }
    };

    const onFrame = (event) => accept(event.detail);
    getNativeRangingCapabilities().then((capabilities) => {
      window.dispatchEvent(new CustomEvent('waveradar:ranging-capabilities', { detail: capabilities }));
    }).catch(() => {});
    window.addEventListener('waveradar:range-frame', onFrame);

    const onCapabilities = (event) => {
      const capabilities = event.detail && typeof event.detail === 'object' ? event.detail : {};
      setLastFrame((prev) => prev
        ? { ...prev, capabilities }
        : { timestamp: null, timestampState: 'UNKNOWN', frameAgeMs: null, receivedAt: performance.now(), detections: [], rangeOnlyMeasurements: [], measurements: [], capabilities });
    };
    window.addEventListener('waveradar:ranging-capabilities', onCapabilities);

    let url = null;
    try { url = window.localStorage.getItem('waveradar.sensorUrl')?.trim() || null; } catch { /* storage may be unavailable */ }
    if (url && /^wss?:\/\//i.test(url)) {
      try {
        const ws = new WebSocket(url);
        socketRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);
        ws.onmessage = (event) => accept(event.data);
      } catch { setConnected(false); }
    }

    return () => {
      window.removeEventListener('waveradar:range-frame', onFrame);
      window.removeEventListener('waveradar:ranging-capabilities', onCapabilities);
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled]);

  return { connected, lastFrame, bridgeStats };
}
