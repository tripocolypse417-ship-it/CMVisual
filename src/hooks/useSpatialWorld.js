import { useEffect, useRef, useState } from 'react';

const MAX_POINTS = 1500;
const STALE_MS = 30000;
const MAX_TRACK_HISTORY = 12;
const TRACK_GATE_M = 1.75;
const ANGLE_GATE_DEG = 24;
const PREDICTION_MAX_MS = 1800;
const PREDICTION_UNCERTAINTY_GROWTH = 0.35;
const DEPTH_OPTIMAL_MIN_M = 0.5;
const DEPTH_OPTIMAL_MAX_M = 5.0;

// Prefer the strongest physically grounded measurement available. Camera/AR depth
// is useful for human localization, while radio ranging is only promoted when the
// platform reports that the relevant capability is actually available.
function measurementQuality(d) {
  const source = String(d?.source || '').toLowerCase();
  const distance = Number(d?.distance);
  const confidence = Number.isFinite(Number(d?.confidence)) ? Math.max(0, Math.min(1, Number(d.confidence))) : 0;
  const uncertainty = Number.isFinite(Number(d?.uncertaintyM)) ? Math.max(0, Number(d.uncertaintyM)) : null;
  const rangeFactor = uncertainty == null ? 0.5 : Math.max(0, Math.min(1, 1 / (1 + uncertainty)));
  const depthFactor = Number.isFinite(distance) && distance >= DEPTH_OPTIMAL_MIN_M && distance <= DEPTH_OPTIMAL_MAX_M ? 1 : 0.7;
  const sourceFactor = source.includes('uwb') ? 1 : source.includes('rtt') ? 0.9 : source.includes('depth') || source.includes('arcore') ? 0.85 : source.includes('camera') ? 0.7 : 0.45;
  return confidence * rangeFactor * depthFactor * sourceFactor;
}
const MAX_PREDICTED_SPEED_MPS = 4.0;
const TRACK_CONFIRMATION_HITS = 2;

function robustMedian(values) {
  const xs = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

function robustMad(values, median) {
  const deviations = values.map(v => Math.abs(v - median)).filter(Number.isFinite);
  return robustMedian(deviations) ?? 0;
}

function normalizeAngle(deg) {
  let a = Number(deg) || 0;
  while (a > 180) a -= 360;
  while (a < -180) a += 360;
  return a;
}

function angleDelta(a, b) {
  return Math.abs(normalizeAngle((Number(a) || 0) - (Number(b) || 0)));
}

function polarToWorld(angleDeg, distance, heading = 0) {
  const a = ((Number(angleDeg) || 0) + (Number(heading) || 0)) * Math.PI / 180;
  const r = Math.max(0, Number(distance) || 0);
  return { x: Math.sin(a) * r, z: -Math.cos(a) * r };
}

function worldDistance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
}

/** Lightweight, dependency-free spatial world model for mobile browsers.
 * It keeps a bounded point history and exposes a stable local coordinate frame.
 * Coordinates are estimates until backed by a calibrated ranging sensor.
 */
export default function useSpatialWorld(detections = [], heading = 0, enabled = true) {
  const mapRef = useRef(new Map());
  const [stats, setStats] = useState({ points: 0, tracked: 0, confidence: 0, rangeQuality: 0, stability: 0, outliers: 0 });

  useEffect(() => {
    if (!enabled) return;
    const now = performance.now();
    const map = mapRef.current;

    for (const d of detections) {
      if (!d?.id) continue;
      const distance = Number(d.distance);
      if (!Number.isFinite(distance) || distance < 0) continue;
      const p = polarToWorld(d.angle, distance, heading);
      const confidence = Number.isFinite(Number(d.confidence))
        ? Math.max(0, Math.min(1, Number(d.confidence)))
        : Math.max(0, Math.min(1, (Number(d.intensity) || 0) / 100));
      let prev = map.get(d.id);
      // If an incoming measurement has no stable ID, associate it with the nearest
      // recent track only when both position and bearing are plausibly compatible.
      if (!prev && d.trackId == null) {
        const candidates = [...map.values()].filter(p => now - p.lastSeen < 1200);
        let best = null;
        let bestScore = Infinity;
        for (const candidate of candidates) {
          const cp = polarToWorld(candidate.angle, candidate.distance, heading);
          const spatial = worldDistance(cp, p);
          const angular = angleDelta(candidate.angle, d.angle);
          const score = spatial + angular / 30;
          if (spatial <= TRACK_GATE_M && angular <= ANGLE_GATE_DEG && score < bestScore) {
            best = candidate;
            bestScore = score;
          }
        }
        if (best) prev = best;
      }
      const trackId = d.trackId || prev?.id || d.id;
      const recentDistances = [...(prev?.history ?? []).map(h => h.distance), distance].slice(-MAX_TRACK_HISTORY);
      const median = robustMedian(recentDistances) ?? distance;
      const mad = robustMad(recentDistances, median);
      const robustLimit = Math.max(0.35, mad * 4 + 0.15);
      const outlier = Math.abs(distance - median) > robustLimit && recentDistances.length >= 4;
      if (outlier) {
        if (prev) map.set(d.id, { ...prev, outlierCount: (prev.outlierCount ?? 0) + 1, lastSeen: now });
        continue;
      }
      const alpha = d.moving ? 0.3 : 0.1;
      const previousAge = prev ? Math.max(0.001, (now - prev.lastSeen) / 1000) : 0;
      const velocity = prev && previousAge > 0 ? (distance - prev.distance) / previousAge : 0;
      map.set(trackId, {
        id: trackId,
        angle: Number.isFinite(Number(d.angle)) ? Number(d.angle) : (prev?.angle ?? 0),
        x: prev ? prev.x + (p.x - prev.x) * alpha : p.x,
        y: Number.isFinite(d.height) ? d.height : (prev?.y ?? 0),
        z: prev ? prev.z + (p.z - prev.z) * alpha : p.z,
        confidence: prev ? prev.confidence * 0.7 + confidence * 0.3 : confidence,
        distance: prev ? prev.distance + (median - prev.distance) * alpha : median,
        velocityMps: Number.isFinite(Number(d.speed)) ? Number(d.speed) : velocity,
        uncertaintyM: Number.isFinite(Number(d.uncertaintyM)) ? Math.max(0, Number(d.uncertaintyM)) : Math.max(0.05, mad * 1.4826),
        stability: recentDistances.length > 1 ? Math.max(0, Math.min(1, 1 - mad / Math.max(0.25, median * 0.25))) : 0.5,
        outlierCount: prev?.outlierCount ?? 0,
        history: [...(prev?.history ?? []), { distance, timestamp: now }].slice(-MAX_TRACK_HISTORY),
        source: d.source || prev?.source || 'unknown',
        provenance: d.provenance || prev?.provenance || null,
        lastSeen: now,
        type: d.type || prev?.type || 'unknown',
        state: 'live',
        hits: (prev?.hits ?? 0) + 1,
        confirmed: (prev?.hits ?? 0) + 1 >= TRACK_CONFIRMATION_HITS,
        association: prev ? 'tracked' : 'new',
      });
    }

    for (const [id, point] of map) {
      const ageMs = now - point.lastSeen;
      if (ageMs > STALE_MS) {
        map.delete(id);
        continue;
      }
      // Brief sensor dropouts become explicitly predicted tracks instead of frozen
      // measurements. Uncertainty expands with elapsed time and the track expires
      // if fresh evidence does not return.
      if (ageMs > 250 && ageMs <= PREDICTION_MAX_MS) {
        const dt = ageMs / 1000;
        const predictionSpeed = Math.min(MAX_PREDICTED_SPEED_MPS, Math.abs(point.velocityMps || 0));
        const predictedX = point.x + (predictionSpeed * Math.sign(point.velocityMps || 1) * dt) * Math.sin((point.angle || 0) * Math.PI / 180);
        const predictedZ = point.z + (predictionSpeed * Math.sign(point.velocityMps || 1) * dt) * -Math.cos((point.angle || 0) * Math.PI / 180);
        map.set(id, {
          ...point,
          x: predictedX,
          z: predictedZ,
          predictedX,
          predictedZ,
          state: 'predicted',
          uncertaintyM: (point.uncertaintyM ?? 0.25) + dt * PREDICTION_UNCERTAINTY_GROWTH,
          confidence: Math.max(0, point.confidence * Math.exp(-dt * 0.9)),
        });
      } else if (ageMs <= 250) {
        map.set(id, { ...point, state: 'live' });
      } else if (ageMs <= STALE_MS) {
        map.set(id, { ...point, state: 'occluded' });
      }
    }

    const values = [...map.values()];
    const confidence = values.length ? values.reduce((s, p) => s + p.confidence, 0) / values.length : 0;
    const stability = values.length ? values.reduce((s, p) => s + (p.stability ?? 0), 0) / values.length : 0;
    const uncertaintyValues = values.map(p => p.uncertaintyM).filter(Number.isFinite);
    const rangeQuality = values.length ? Math.max(0, Math.min(1, values.reduce((s, p) => s + p.confidence * (p.stability ?? 0.5), 0) / values.length)) : 0;
    setStats({
      points: values.length,
      tracked: values.filter(p => p.confidence >= 0.5).length,
      confidence,
      rangeQuality,
      stability,
      meanUncertaintyM: uncertaintyValues.length ? uncertaintyValues.reduce((a, b) => a + b, 0) / uncertaintyValues.length : null,
      outliers: values.reduce((s, p) => s + (p.outlierCount ?? 0), 0),
    });
  }, [detections, heading, enabled]);

  return { points: [...mapRef.current.values()].slice(0, MAX_POINTS), stats, reset: () => mapRef.current.clear() };
}