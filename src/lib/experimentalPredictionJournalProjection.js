import { forecastTrend } from "./experimentalPredictionEngine.js";

// Pure read-only projection: the input journal is never modified.
export function projectExperimentalForecast(journalEvents, { nowMs, horizonMs = 30000, enabled = false, sourceId, variable = "temperature", unit = "C" } = {}) {
  if (!enabled) return { status: "UNAVAILABLE", reason: "EXPERIMENT_DISABLED" };
  if (!Array.isArray(journalEvents)) return { status: "UNAVAILABLE", reason: "JOURNAL_UNAVAILABLE" };
  const rows = journalEvents.filter(e => e && e.kind === "sensor-observation" && e.sourceId === sourceId && e.variable === variable);
  const observations = rows.map(e => ({
    id: e.id, sourceId: e.sourceId, variable: e.variable, unit: e.unit,
    timeMs: e.timeMs, value: e.value, clockDomain: e.clockDomain,
    calibrated: e.calibrated, evidenceClass: e.evidenceClass
  }));
  const result = forecastTrend(observations, { nowMs, horizonMs });
  return result.status === "EXPERIMENTAL_FORECAST"
    ? { ...result, presentation: "EXPERIMENTAL ONLY — NOT FOR OPERATIONAL DECISIONS", sourceRecordCount: rows.length }
    : result;
}

// Deterministic replay is obtained by projecting the same frozen events with the same clock.
export function replayExperimentalForecast(frozenEvents, options) {
  return projectExperimentalForecast(frozenEvents, options);
}
