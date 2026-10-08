/**
 * WaveRadar quantitative validation metrics.
 * Dependency-free and deliberately conservative: missing ground truth is not
 * converted into a zero-error result.
 */

const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;

function paired(values, truth, projector = (v) => v) {
  const out = [];
  const n = Math.min(Array.isArray(values) ? values.length : 0, Array.isArray(truth) ? truth.length : 0);
  for (let i = 0; i < n; i++) {
    const a = finite(projector(values[i]));
    const b = finite(projector(truth[i]));
    if (a != null && b != null) out.push([a, b]);
  }
  return out;
}

export function errorMetrics(values = [], truth = [], projector = (v) => v) {
  const pairs = paired(values, truth, projector);
  if (!pairs.length) return { n: 0, mae: null, rmse: null, maxAbsError: null, bias: null };
  const errors = pairs.map(([a, b]) => a - b);
  const abs = errors.map(Math.abs);
  return {
    n: pairs.length,
    mae: abs.reduce((s, v) => s + v, 0) / abs.length,
    rmse: Math.sqrt(errors.reduce((s, v) => s + v * v, 0) / errors.length),
    maxAbsError: Math.max(...abs),
    bias: errors.reduce((s, v) => s + v, 0) / errors.length,
  };
}

export function distanceErrorMeters(measured = [], groundTruth = []) {
  return errorMetrics(measured, groundTruth, (v) => v?.distanceM ?? v?.distance);
}

export function headingErrorDegrees(measured = [], groundTruth = []) {
  const pairs = paired(
    measured,
    groundTruth,
    (v) => finite(v?.headingDeg ?? v?.heading)
  );
  if (!pairs.length) return { n: 0, mae: null, rmse: null, maxAbsError: null, bias: null };

  const errors = pairs.map(([measuredDeg, truthDeg]) => {
    // Smallest signed angular difference in [-180, 180).
    return ((measuredDeg - truthDeg + 540) % 360) - 180;
  });
  const abs = errors.map(Math.abs);
  return {
    n: errors.length,
    mae: abs.reduce((s, v) => s + v, 0) / abs.length,
    rmse: Math.sqrt(errors.reduce((s, v) => s + v * v, 0) / errors.length),
    maxAbsError: Math.max(...abs),
    bias: errors.reduce((s, v) => s + v, 0) / errors.length,
  };
}

export function latencyMetrics(events = []) {
  const values = (Array.isArray(events) ? events : [])
    .map(e => finite(e?.receivedAt) != null && finite(e?.observedAt) != null
      ? Math.max(0, finite(e.receivedAt) - finite(e.observedAt))
      : null)
    .filter(v => v != null)
    .sort((a, b) => a - b);
  if (!values.length) return { n: 0, meanMs: null, p50Ms: null, p95Ms: null, maxMs: null };
  const percentile = (p) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))];
  return {
    n: values.length,
    meanMs: values.reduce((s, v) => s + v, 0) / values.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: values[values.length - 1],
  };
}

export function trackContinuityMetrics(trackIds = []) {
  const ids = (Array.isArray(trackIds) ? trackIds : []).map(v => v == null ? null : String(v));
  const valid = ids.filter(Boolean);
  if (!valid.length) return { observations: 0, uniqueTracks: 0, continuity: null, idSwitches: 0 };
  let switches = 0;
  for (let i = 1; i < valid.length; i++) if (valid[i] !== valid[i - 1]) switches++;
  return {
    observations: valid.length,
    uniqueTracks: new Set(valid).size,
    continuity: valid.length <= 1 ? 1 : 1 - switches / (valid.length - 1),
    idSwitches: switches,
  };
}

export function summarizeValidationMetrics(input = {}) {
  const distance = distanceErrorMeters(input.measuredDistances, input.groundTruthDistances);
  const latency = latencyMetrics(input.events);
  const continuity = trackContinuityMetrics(input.trackIds);
  const complete = distance.n > 0 || latency.n > 0 || continuity.observations > 0;
  return {
    version: 'waveradar-metrics-v1',
    complete,
    distance,
    latency,
    continuity,
    limitations: complete ? [] : ['No paired measurements and ground truth were available.'],
  };
}
