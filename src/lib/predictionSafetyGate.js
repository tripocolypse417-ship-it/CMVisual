/**
 * Experimental prediction quality gate. Does not calibrate probabilities,
 * establish safe routes, or authorize life-safety decisions.
 */
export function assessForecastReadiness({ observations, horizonSec, nowMs, maxAgeMs = 2000, maxHorizonSec = 10, maxGapMs = 2000 } = {}) {
  const unavailable = reason => ({ status: 'INSUFFICIENT_DATA', reason, operationalUseAllowed: false, evidenceClass: 'PREDICTED' });
  if (!Array.isArray(observations) || observations.length < 3) return unavailable('NEED_THREE_OBSERVATIONS');
  if (![horizonSec, nowMs, maxAgeMs, maxHorizonSec, maxGapMs].every(Number.isFinite) || horizonSec <= 0 || horizonSec > maxHorizonSec || maxAgeMs <= 0 || maxGapMs <= 0) return unavailable('INVALID_FORECAST_WINDOW');
  const sorted = [...observations].sort((a,b) => a.timestampMs - b.timestampMs);
  let frame, clock, source;
  for (let i = 0; i < sorted.length; i++) {
    const o = sorted[i];
    if (!o || !['MEASURED','DERIVED'].includes(o.evidenceClass) || !Number.isFinite(o.timestampMs) || !Number.isFinite(o.x) || !Number.isFinite(o.y) || !Number.isFinite(o.uncertainty) || o.uncertainty <= 0) return unavailable('INVALID_OBSERVATION');
    if (!o.coordinateFrame || !o.clockDomain || !o.sourceId) return unavailable('MISSING_PROVENANCE');
    if (i === 0) { frame = o.coordinateFrame; clock = o.clockDomain; source = o.sourceId; }
    if (o.coordinateFrame !== frame || o.clockDomain !== clock || o.sourceId !== source) return unavailable('INCOMPATIBLE_TRACK');
    if (o.timestampMs > nowMs || nowMs - o.timestampMs > maxAgeMs) return unavailable('STALE_OR_FUTURE_DATA');
    if (i && (o.timestampMs - sorted[i-1].timestampMs <= 0 || o.timestampMs - sorted[i-1].timestampMs > maxGapMs)) return unavailable('INVALID_SAMPLE_SPACING');
  }
  return {
    status: 'EXPERIMENTAL_READY', operationalUseAllowed: false,
    evidenceClass: 'PREDICTED', sourceId: source, coordinateFrame: frame, clockDomain: clock,
    horizonSec, sourceObservationCount: sorted.length,
    uncertaintyKind: 'INPUT_ONLY_NOT_FORECAST_CALIBRATED',
    limitations: ['No calibrated forecast interval', 'No validated hazard or safe-route prediction'],
  };
}
