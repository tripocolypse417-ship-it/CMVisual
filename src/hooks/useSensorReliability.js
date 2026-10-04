import { useMemo } from 'react';

// Reliability is a measurement-quality estimate, not a truth score. It never
// upgrades an observation into a target or identifies a person.
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(v)));
const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;

export default function useSensorReliability(observations = [], bridgeStats = {}) {
  return useMemo(() => {
    const items = Array.isArray(observations) ? observations : [];
    const bySource = new Map();
    items.forEach((d) => {
      const source = String(d?.source || d?.provenance?.source || 'LOCAL INPUT');
      const list = bySource.get(source) || [];
      list.push(d);
      bySource.set(source, list);
    });
    const sensors = [...bySource.entries()].map(([source, list]) => {
      const confidence = list.map(d => Number(d?.confidence)).filter(Number.isFinite).map(v => clamp(v));
      const capability = list.map(d => Number(d?.capabilityScore)).filter(Number.isFinite).map(v => clamp(v));
      const packetRate = list.map(d => finite(d?.packetRateHz)).filter(Number.isFinite).map(v => clamp(v / 60));
      const latency = list.map(d => finite(d?.latencyMs)).filter(Number.isFinite).map(v => clamp(1 - v / 1000));
      const signal = list.map(d => Number(d?.signalQuality)).filter(Number.isFinite).map(v => clamp(v, 0, 100) / 100);
      const uncertainty = list.map(d => Number(d?.uncertaintyM)).filter(Number.isFinite).map(v => clamp(1 - v / 10));
      const freshness = list.map(d => Number(d?.frameAgeMs)).filter(Number.isFinite).map(v => clamp(1 - v / 1500));
      const mean = (xs, fallback) => xs.length ? xs.reduce((a,b) => a+b, 0) / xs.length : fallback;
      const quality = mean(confidence, mean(signal, 0.5));
      const capabilityScore = mean(capability, 0.5);
      const delivery = mean(packetRate, 0.7);
      const latencyScore = mean(latency, 0.7);
      const reliability = 0.28 * quality + 0.18 * mean(signal, quality) + 0.16 * mean(uncertainty, 0.7) + 0.16 * mean(freshness, 0.7) + 0.12 * capabilityScore + 0.05 * delivery + 0.05 * latencyScore;
      return { source, observations: list.length, reliability: Math.round(clamp(reliability) * 100), quality: Math.round(quality * 100), capability: Math.round(capabilityScore * 100), delivery: Math.round(delivery * 100), latency: Math.round(latencyScore * 100) };
    });
    return {
      sensors,
      overall: sensors.length ? Math.round(sensors.reduce((a, s) => a + s.reliability, 0) / sensors.length) : null,
      bridge: {
        hz: Number.isFinite(Number(bridgeStats?.hz)) ? Number(bridgeStats.hz) : null,
        dropped: Number.isFinite(Number(bridgeStats?.totalDropped)) ? Number(bridgeStats.totalDropped) : null,
        agreement: Number.isFinite(Number(bridgeStats?.sensorAgreement)) ? Math.round(Number(bridgeStats.sensorAgreement) * 100) : null,
      },
      methodVersion: 'sensor-reliability-v1',
    };
  }, [observations, bridgeStats]);
}