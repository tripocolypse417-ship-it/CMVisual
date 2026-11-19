// Experimental trend forecast only. Not firefighter navigation or life-safety guidance.
export function forecastTrend(observations, options = {}) {
  const unavailable = (reason) => ({ status: "UNAVAILABLE", reason });
  const { horizonMs = 30000, maxAgeMs = 60000, maxGapMs = 30000, nowMs, minSpanMs = 1000 } = options;
  if (!Number.isFinite(nowMs) || !Array.isArray(observations) || observations.length < 3) return unavailable("INSUFFICIENT_INPUT");
  if (![horizonMs,maxAgeMs,maxGapMs,minSpanMs].every(v => Number.isFinite(v) && v > 0) || horizonMs > 60000) return unavailable("INVALID_LIMITS");
  const rows = observations.map(o => ({ ...o }));
  if (rows.some(o => !o || o.evidenceClass !== "MEASURED" || !o.id || !o.sourceId || !o.clockDomain || !o.unit || !o.variable || !Number.isFinite(o.timeMs) || !Number.isFinite(o.value))) return unavailable("INVALID_EVIDENCE");
  if (new Set(rows.map(o => o.id)).size !== rows.length) return unavailable("DUPLICATE_EVENT");
  if (new Set(rows.map(o => o.clockDomain)).size !== 1 || new Set(rows.map(o => o.sourceId)).size !== 1 || new Set(rows.map(o => o.unit)).size !== 1 || new Set(rows.map(o => o.variable)).size !== 1) return unavailable("INCOMPATIBLE_EVIDENCE");
  if (rows.some(o => o.calibrated !== true)) return unavailable("UNCALIBRATED_SOURCE");
  rows.sort((a,b) => a.timeMs - b.timeMs);
  if (rows.some((o,i) => o.timeMs > nowMs || (i > 0 && (o.timeMs <= rows[i-1].timeMs || o.timeMs - rows[i-1].timeMs > maxGapMs)))) return unavailable("INVALID_TIMELINE");
  if (nowMs - rows.at(-1).timeMs > maxAgeMs) return unavailable("STALE_EVIDENCE");
  const span = rows.at(-1).timeMs - rows[0].timeMs;
  if (span < minSpanMs) return unavailable("INSUFFICIENT_SPAN");
  const x = rows.map(o => (o.timeMs - rows[0].timeMs)/1000);
  const y = rows.map(o => o.value);
  const xm = x.reduce((a,b)=>a+b,0)/x.length, ym = y.reduce((a,b)=>a+b,0)/y.length;
  const denominator = x.reduce((s,v)=>s+(v-xm)**2,0);
  if (denominator <= 0) return unavailable("INSUFFICIENT_SPAN");
  const slope = x.reduce((s,v,i)=>s+(v-xm)*(y[i]-ym),0)/denominator;
  const forecastAtMs = nowMs + horizonMs;
  const value = ym + slope*((forecastAtMs - rows[0].timeMs)/1000-xm);
  if (!Number.isFinite(value)) return unavailable("NUMERIC_FAILURE");
  return { status:"EXPERIMENTAL_FORECAST", evidenceClass:"DERIVED", operationallyValidated:false, modelVersion:"linear-trend-v0", variable:rows[0].variable, unit:rows[0].unit, value, horizonMs, forecastAtMs, expiresAtMs:forecastAtMs, sourceEventIds:rows.map(o=>o.id), sourceId:rows[0].sourceId, clockDomain:rows[0].clockDomain, uncertainty:"UNCALIBRATED_FORECAST_ERROR", warning:"Not validated for life-safety decisions" };
}
