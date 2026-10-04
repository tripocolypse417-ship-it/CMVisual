import { useMemo } from 'react';

const HORIZONS = [1000, 3000, 5000];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function finite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function distance(a, b) {
  if (!a || !b) return null;
  const dx = finite(a.x) - finite(b.x);
  const dz = finite(a.z) - finite(b.z);
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) return null;
  return Math.hypot(dx, dz);
}

/**
 * Compares predicted positions with later measured observations when the same
 * detector track id remains available. This is calibration telemetry only:
 * it never changes the measured world state or assessment level.
 */
export default function usePredictionCalibration(predictions, observations) {
  return useMemo(() => {
    const preds = Array.isArray(predictions) ? predictions : [];
    const obs = Array.isArray(observations) ? observations : [];
    const byTrack = new Map();
    obs.forEach((o) => {
      const id = String(o?.trackId ?? o?.id ?? '');
      const p = o?.derivedTrack?.position || o?.position;
      if (!id || !p) return;
      const t = Number(o?.derivedTrack?.lastSeenAt || o?.observedAt || Date.now());
      if (!byTrack.has(id)) byTrack.set(id, []);
      byTrack.get(id).push({ t, p });
    });

    const results = [];
    preds.forEach((prediction) => {
      const id = String(prediction?.trackId ?? '');
      const generatedAt = Number(prediction?.generatedAt);
      if (!id || !Number.isFinite(generatedAt)) return;
      const history = byTrack.get(id) || [];
      HORIZONS.forEach((horizonMs) => {
        const target = generatedAt + horizonMs;
        let best = null;
        history.forEach((sample) => {
          const delta = Math.abs(sample.t - target);
          if (delta <= 1200 && (!best || delta < best.delta)) best = { ...sample, delta };
        });
        if (!best) return;
        const forecast = prediction.horizons?.find((h) => h.horizonMs === horizonMs);
        const errorM = distance(forecast?.position, best.p);
        if (errorM == null) return;
        const uncertaintyM = Math.max(0.1, finite(forecast?.uncertaintyM) ?? 1);
        results.push({ trackId: id, horizonMs, errorM, uncertaintyM, calibrated: errorM <= uncertaintyM * 2 });
      });
    });

    const count = results.length;
    const meanErrorM = count ? results.reduce((s, r) => s + r.errorM, 0) / count : null;
    const within2SigmaPct = count ? Math.round(results.filter((r) => r.calibrated).length / count * 100) : null;
    const calibrationScore = count ? Math.round(clamp(100 * Math.exp(-(meanErrorM ?? 0) / 3) * ((within2SigmaPct ?? 0) / 100), 0, 100)) : null;
    return { samples: results, count, meanErrorM, within2SigmaPct, calibrationScore, evaluatedAt: Date.now() };
  }, [predictions, observations]);
}