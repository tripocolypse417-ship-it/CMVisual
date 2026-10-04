import { useMemo } from 'react';

// Resolves only observations that explicitly share a detector track ID. It
// preserves every raw observation and reports disagreement instead of silently
// choosing one sensor. No cross-target identity matching is performed.
const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const clamp = (v) => Math.max(0, Math.min(1, Number(v)));

export default function useSensorConflictResolver(observations = [], reliability = null) {
  return useMemo(() => {
    const items = Array.isArray(observations) ? observations : [];
    const weights = new Map((reliability?.sensors || []).map(s => [String(s.source), clamp(Number(s.reliability) / 100)]));
    const groups = new Map();
    items.forEach((d, index) => {
      const key = String(d?.trackId ?? d?.id ?? `observation-${index}`);
      const list = groups.get(key) || [];
      list.push(d);
      groups.set(key, list);
    });
    const resolved = [];
    const conflicts = [];
    groups.forEach((list, trackId) => {
      if (list.length === 1) {
        resolved.push({ ...list[0], conflict: false, sensorCount: 1 });
        return;
      }
      const valid = list.filter(d => finite(d?.distance) != null && finite(d?.angle) != null);
      const totalWeight = valid.reduce((sum, d) => sum + (weights.get(String(d?.source || 'LOCAL INPUT')) || 0.5), 0);
      if (!valid.length || totalWeight <= 0) {
        resolved.push({ ...list[0], conflict: true, sensorCount: list.length, rawObservations: list });
        conflicts.push({ trackId, sensorCount: list.length, reason: 'INSUFFICIENT_MEASUREMENTS' });
        return;
      }
      const w = d => weights.get(String(d?.source || 'LOCAL INPUT')) || 0.5;
      const distance = valid.reduce((sum, d) => sum + finite(d.distance) * w(d), 0) / totalWeight;
      const angle = valid.reduce((sum, d) => sum + finite(d.angle) * w(d), 0) / totalWeight;
      const rangeSpread = Math.max(...valid.map(d => finite(d.distance))) - Math.min(...valid.map(d => finite(d.distance)));
      const bearingSpread = Math.max(...valid.map(d => finite(d.angle))) - Math.min(...valid.map(d => finite(d.angle)));
      const conflict = rangeSpread > Math.max(0.5, distance * 0.25) || bearingSpread > 30;
      const result = { ...list[0], distance, angle, conflict, sensorCount: list.length, sensorAgreement: conflict ? 0 : 1, rawObservations: list };
      resolved.push(result);
      if (conflict) conflicts.push({ trackId, sensorCount: list.length, rangeSpread, bearingSpread, reason: 'MEASUREMENT_DISAGREEMENT' });
    });
    return { observations: resolved, conflicts, methodVersion: 'sensor-conflict-v1' };
  }, [observations, reliability]);
}