import { useMemo } from 'react';

// Physical outcome forecasting only. This layer predicts observable spatial
// consequences from repeated measurements; it does not infer intent,
// dangerousness, personality, mental state, or a person's future choices.
const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(v) || 0));

function classify(track) {
  const speed = finite(track?.derivedTrack?.speedMps) ?? finite(track?.speed) ?? 0;
  const heading = finite(track?.derivedTrack?.headingDeg);
  const distance = finite(track?.distance);
  const predicted = track?.predictedPosition;

  if (speed < 0.08) return { label: 'REMAIN / STOP', score: 72, basis: 'Current movement is near zero.' };
  if (predicted && distance != null && distance < 1.5 && speed > 0.3) return { label: 'CLOSE PROXIMITY', score: 78, basis: 'Measured range is short and repeated motion persists.' };
  if (heading != null && speed > 0.15) return { label: 'CONTINUE PATH', score: 68, basis: 'Repeated track motion supports continuation of the current vector.' };
  return { label: 'CONTINUE OBSERVATION', score: 45, basis: 'Insufficient motion evidence for a stronger physical forecast.' };
}

export default function usePhysicalOutcomeForecast(tracks = [], predictions = []) {
  return useMemo(() => {
    const byTrack = new Map((predictions || []).map(p => [String(p.trackId), p]));
    const forecasts = (Array.isArray(tracks) ? tracks : []).map((track) => {
      const id = String(track?.trackId ?? track?.id ?? 'unknown');
      const prediction = byTrack.get(id);
      const result = classify({ ...track, predictedPosition: prediction?.horizons?.[0]?.position });
      const uncertainty = finite(prediction?.horizons?.[0]?.uncertaintyM);
      return {
        trackId: id,
        outcome: result.label,
        score: clamp(result.score),
        basis: result.basis,
        horizon: prediction?.horizons?.[0]?.horizonMs ? prediction.horizons[0].horizonMs / 1000 : 1,
        uncertaintyM: uncertainty,
        evidence: 'PHYSICAL / OBSERVABLE',
      };
    });
    return {
      forecasts,
      methodVersion: 'physical-outcome-v1',
      semantics: 'Observable spatial outcome forecast only; not intent or personality prediction.',
    };
  }, [tracks, predictions]);
}