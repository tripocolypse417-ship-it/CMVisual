/**
 * Reproducible experimental forecast evaluation.
 * Ground truth must come from independently measured observations.
 * No score is a safety certification or calibrated probability.
 */
export function scorePositionForecasts(cases = []) {
  if (!Array.isArray(cases)) throw new TypeError('cases must be an array');
  const valid = [];
  const rejected = [];
  for (const item of cases) {
    const p = item?.predicted, g = item?.groundTruth, b = item?.baseline;
    const coords = [p?.x,p?.y,g?.x,g?.y,b?.x,b?.y];
    if (!item?.id || !coords.every(Number.isFinite) || !Number.isFinite(item.horizonSec) || item.horizonSec <= 0 || item.independentGroundTruth !== true) {
      rejected.push({ id: item?.id ?? null, reason: 'INVALID_OR_UNVERIFIED_GROUND_TRUTH' });
      continue;
    }
    const error = Math.hypot(p.x-g.x,p.y-g.y);
    const baselineError = Math.hypot(b.x-g.x,b.y-g.y);
    valid.push({ id:item.id, horizonSec:item.horizonSec, error, baselineError, improvement:baselineError-error });
  }
  if (!valid.length) return { status:'INSUFFICIENT_DATA', evaluated:0, rejected, operationalUseAllowed:false };
  const mean = key => valid.reduce((sum,row)=>sum+row[key],0)/valid.length;
  const rmse = key => Math.sqrt(valid.reduce((sum,row)=>sum+row[key]**2,0)/valid.length);
  return {
    status:'EXPERIMENTAL_BACKTEST', evaluated:valid.length, rejected,
    meanError:mean('error'), baselineMeanError:mean('baselineError'),
    rmse:rmse('error'), baselineRmse:rmse('baselineError'),
    improvementOverBaseline:mean('improvement'),
    units:'input-coordinate-units', operationalUseAllowed:false,
    cases:valid,
    limitations:['Requires independent held-out ground truth','No statistical significance or safety certification inferred'],
  };
}
