import { useEffect, useRef, useState } from 'react';
import { getNativeRangingCapabilities } from '../lib/nativeRanging';

/**
 * Open sensor-ingress bridge. The browser cannot manufacture radar/ranging data;
 * this adapter accepts measurements from real external hardware/software without
 * adding a paid SDK. A WebSocket URL may be stored in localStorage as
 * `waveradar.sensorUrl`, or another component can dispatch a
 * `waveradar:range-frame` CustomEvent with the same frame shape.
 *
 * Frame shape:
 * { timestamp, measurements, detections: [{ id, angle, distance, intensity, moving, speed, height, type, source, confidence }] }
 *
 * Multiple physical devices can feed the same bridge. Each measurement keeps
 * its source/provenance; this hook never invents range, bearing, or targets.
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
        const timestamp = Number.isFinite(Number(frame.timestamp)) ? Number(frame.timestamp) : Date.now();
        const measurements = Array.isArray(frame.measurements) ? frame.measurements.filter(Boolean) : [];
        const sequence = Number.isFinite(Number(frame.sequence)) ? Number(frame.sequence) : null;
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
            lastLatencyMs: Number.isFinite(Number(frame.timestamp)) && Number(frame.timestamp) > 1e12
              ? Math.max(0, Date.now() - timestamp) : null,
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
        const frameAgeMs = Number.isFinite(Number(frame.timestamp)) && Number(frame.timestamp) > 1e12 ? Math.max(0, Date.now() - timestamp) : null;
        const packetRateHz = Number.isFinite(Number(frame.packetRateHz)) ? Math.max(0, Number(frame.packetRateHz)) : null;
        const latencyMs = Number.isFinite(Number(frame.latencyMs)) ? Math.max(0, Number(frame.latencyMs)) : frameAgeMs;
        const validDetections = frame.detections.filter(d => d && Number.isFinite(Number(d.angle)) && Number.isFinite(Number(d.distance)));
        const confidenceValues = validDetections.map(d => Number(d.confidence)).filter(Number.isFinite).map(v => Math.max(0, Math.min(1, v)));
        const rangeQuality = confidenceValues.length ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length : 0;
        const sourceSet = new Set(validDetections.map(d => d.source ?? frame.source ?? frame.technology).filter(Boolean));
        // Agreement is only scored when independent sources report compatible
        // ranges for the same track. Merely having multiple sensor names is not
        // evidence of agreement.
        const byId = new Map();
        for (const d of validDetections) {
          const key = d.id ?? `${Math.round(Number(d.angle) * 10)}:${Math.round(Number(d.distance) * 10)}`;
          const list = byId.get(key) ?? [];
          list.push(d);
          byId.set(key, list);
        }
        let agreementSum = 0; let agreementCount = 0;
        for (const list of byId.values()) {
          const ranges = list.map(d => Number(d.distance)).filter(Number.isFinite);
          const sources = new Set(list.map(d => d.source ?? frame.source ?? frame.technology).filter(Boolean));
          if (ranges.length >= 2 && sources.size >= 2) {
            const mean = ranges.reduce((a, b) => a + b, 0) / ranges.length;
            const spread = mean > 0 ? Math.min(1, Math.max(0, 1 - (Math.max(...ranges) - Math.min(...ranges)) / (mean * 0.25))) : 0;
            agreementSum += spread; agreementCount += 1;
          }
        }
        const sensorAgreement = agreementCount ? agreementSum / agreementCount : 0;
        setBridgeStats(prev => ({ ...prev, rangeQuality: +rangeQuality.toFixed(2), sensorAgreement: +sensorAgreement.toFixed(2) }));
        const normalizedDetections = validDetections.filter(d =>
          d && Number.isFinite(Number(d.angle)) && Number.isFinite(Number(d.distance))
        ).map((d, i) => ({
          ...d,
          id: d.id ?? `${frame.deviceId ?? 'sensor'}-${timestamp}-${i}`,
          source: d.source ?? frame.source ?? frame.technology ?? 'external-sensor',
          confidence: Number.isFinite(Number(d.confidence)) ? Math.max(0, Math.min(1, Number(d.confidence))) : null,
          uncertaintyM: Number.isFinite(Number(d.uncertaintyM)) ? Math.max(0, Number(d.uncertaintyM)) : null,
          measuredAt: d.measuredAt ?? timestamp,
          provenance: d.provenance ?? { source: d.source ?? frame.source ?? frame.technology ?? 'unknown', frameSequence: sequence, deviceId: frame.deviceId ?? frame.sourceDeviceId ?? null },
          capabilityScore: Number.isFinite(Number(d.capabilityScore)) ? Math.max(0, Math.min(1, Number(d.capabilityScore))) : null,
          packetRateHz,
          latencyMs,
        }));
        setLastFrame({
          ...frame,
          timestamp,
          sequence,
          receivedAt,
          measurements,
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
    // Native Android bridge can announce its capabilities without the web app
    // pretending that unsupported radios exist.
    const onCapabilities = (event) => {
      const capabilities = event.detail && typeof event.detail === 'object' ? event.detail : {};
      setLastFrame((prev) => prev ? { ...prev, capabilities } : { timestamp: Date.now(), receivedAt: performance.now(), detections: [], measurements: [], capabilities });
    };
    window.addEventListener('waveradar:ranging-capabilities', onCapabilities);

    const url = window.localStorage.getItem('waveradar.sensorUrl')?.trim();
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