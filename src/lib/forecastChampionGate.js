/**
 * Conservative experimental model-promotion gate.
 * This gate is not an operational certification.
 */
export function evaluateForecastPromotion({ candidate, baseline, evaluation } = {}) {
  const reject = reason => ({ promote: false, reason, operationalUseAllowed: false });
  if (!evaluation?.independent || !evaluation?.heldOut || !evaluation?.reproducible) return reject('INDEPENDENT_HELD_OUT_EVALUATION_REQUIRED');
  if (!Number.isSafeInteger(evaluation.sampleCount) || evaluation.sampleCount < 100) return reject('INSUFFICIENT_EVALUATION_SAMPLES');
  if (!candidate || !baseline) return reject('MISSING_MODEL_RESULTS');
  for (const key of ['rmse','falseNegativeRate','latencyP95Ms','calibrationError']) {
    if (![candidate[key],baseline[key]].every(Number.isFinite) || candidate[key] < 0 || baseline[key] < 0) return reject('INVALID_METRICS');
  }
  if (candidate.rmse >= baseline.rmse) return reject('NO_ACCURACY_IMPROVEMENT');
  if (candidate.falseNegativeRate > baseline.falseNegativeRate) return reject('MISSED_HAZARD_REGRESSION');
  if (candidate.calibrationError > baseline.calibrationError) return reject('CALIBRATION_REGRESSION');
  if (candidate.latencyP95Ms > baseline.latencyP95Ms * 1.2) return reject('LATENCY_REGRESSION');
  if (evaluation.outOfDistribution || evaluation.unresolvedSafetyFindings) return reject('UNRESOLVED_VALIDITY_OR_SAFETY_GAP');
  return { promote: true, reason: 'EXPERIMENTAL_EVALUATION_GATES_PASSED', operationalUseAllowed: false,
    limitations: ['Requires additional physical validation and safety review before operational deployment'] };
}
