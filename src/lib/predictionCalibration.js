import { parseTimestamp } from './dataContract.js';

const HORIZONS = [1000, 3000, 5000];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function finite(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distance(a, b) {
  const ax = finite(a?.x);
  const az = finite(a?.z);
  const bx = finite(b?.x);
  const bz = finite(b?.z);
  if ([ax, az, bx, bz].some(value => value == null)) return null;
  return Math.hypot(ax - bx, az - bz);
}

/**
 * Evaluate forecasts against later, timestamped observations from the same
 * track. Missing/invalid measurement time or coordinates are excluded; they
 * are never replaced with processing time or zero-valued coordinates.
 *
 * This is same-stream calibration telemetry, not independent ground truth.
 */
export function evaluatePredictionCalibration(predictions, observations, evaluatedAt = Date.now()) {
  const preds = Array.isArray(predictions) ? predictions : [];
  const obs = Array.isArray(observations) ? observations : [];
  const byTrack = new Map();

  obs.forEach((observation) => {
    const id = String(observation?.trackId ?? observation?.id ?? '').trim();
    const position = observation?.derivedTrack?.position || observation?.position;
    const observedAt = parseTimestamp(
      observation?.derivedTrack?.lastSeenAt ??
      observation?.observedAt ??
      observation?.measuredAt ??
      observation?.timestamp
    );
    if (!id || !position || observedAt == null || observedAt > evaluatedAt + 1000) return;
    if (!byTrack.has(id)) byTrack.set(id, []);
    byTrack.get(id).push({ t: observedAt, position });
  });

  const results = [];
  preds.forEach((prediction) => {
    const id = String(prediction?.trackId ?? '').trim();
    const generatedAt = parseTimestamp(prediction?.generatedAt);
    if (!id || generatedAt == null || generatedAt > evaluatedAt + 1000) return;
    const history = byTrack.get(id) || [];

    HORIZONS.forEach((horizonMs) => {
      const target = generatedAt + horizonMs;
      let best = null;
      history.forEach((sample) => {
        const delta = Math.abs(sample.t - target);
        if (delta <= 1200 && (!best || delta < best.delta)) best = { ...sample, delta };
      });
      if (!best) return;

      const horizons = Array.isArray(prediction?.horizons) ? prediction.horizons : [];
      const forecast = horizons.find(item => item?.horizonMs === horizonMs);
      const errorM = distance(forecast?.position, best.position);
      if (errorM == null) return;

      const uncertaintyM = finite(forecast?.uncertaintyM);
      const calibrated = uncertaintyM != null && uncertaintyM > 0
        ? errorM <= uncertaintyM * 2
        : null;
      results.push({ trackId: id, horizonMs, errorM, uncertaintyM, calibrated });
    });
  });

  const count = results.length;
  const meanErrorM = count
    ? results.reduce((sum, sample) => sum + sample.errorM, 0) / count
    : null;
  const uncertaintySamples = results.filter(sample => sample.calibrated != null);
  const within2SigmaPct = uncertaintySamples.length
    ? Math.round(uncertaintySamples.filter(sample => sample.calibrated).length / uncertaintySamples.length * 100)
    : null;
  const calibrationScore = count && uncertaintySamples.length
    ? Math.round(clamp(100 * Math.exp(-(meanErrorM ?? 0) / 3) * (within2SigmaPct / 100), 0, 100))
    : null;

  return {
    samples: results,
    count,
    meanErrorM,
    within2SigmaPct,
    calibrationScore,
    evaluatedAt,
    evaluationBasis: 'SAME_STREAM_LATER_OBSERVATIONS_NOT_INDEPENDENT_GROUND_TRUTH',
  };
}
