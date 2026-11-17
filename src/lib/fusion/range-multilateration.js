/**
 * Experimental 2D range-only multilateration from surveyed anchors.
 *
 * Ranges do not contain bearing. A 2D solution requires at least three
 * geometrically useful, surveyed anchor positions in one known frame.
 * Results are DERIVED candidates with heuristic residual diagnostics only.
 */
const finite = Number.isFinite;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function solveThree(a, b, c) {
  const p = [a, b, c];
  const ref = p[0];
  const u = { x: p[1].anchor.x - ref.anchor.x, y: p[1].anchor.y - ref.anchor.y };
  const v = { x: p[2].anchor.x - ref.anchor.x, y: p[2].anchor.y - ref.anchor.y };
  const det = 2 * (u.x * v.y - u.y * v.x);
  const geometryQuality = Math.abs(u.x * v.y - u.y * v.x) /
    Math.max(1e-12, Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  if (geometryQuality < 0.05 || Math.abs(det) < 1e-9) return null;
  const rhs = (item) => item.anchor.x ** 2 + item.anchor.y ** 2 -
    ref.anchor.x ** 2 - ref.anchor.y ** 2 + ref.rangeM ** 2 - ref.rangeM ** 2;
  const r1 = rhs(p[1]);
  const r2 = rhs(p[2]);
  const x = (r1 * v.y - u.y * r2) / det;
  const y = (u.x * r2 - r1 * v.x) / det;
  return finite(x) && finite(y) ? { x, y, geometryQuality } : null;
}

function solveWeightedLinear(inliers) {
  const ref = inliers[0];
  let xx = 0, xy = 0, yy = 0, xb = 0, yb = 0;
  for (const item of inliers.slice(1)) {
    const dx = 2 * (item.anchor.x - ref.anchor.x);
    const dy = 2 * (item.anchor.y - ref.anchor.y);
    const rhs = item.anchor.x ** 2 + item.anchor.y ** 2 -
      ref.anchor.x ** 2 - ref.anchor.y ** 2 + ref.rangeM ** 2 - ref.rangeM ** 2;
    const weight = 1 / (item.uncertaintyM ** 2 + ref.uncertaintyM ** 2);
    xx += weight * dx * dx;
    xy += weight * dx * dy;
    yy += weight * dy * dy;
    xb += weight * dx * rhs;
    yb += weight * dy * rhs;
  }
  const determinant = xx * yy - xy * xy;
  if (!finite(determinant) || Math.abs(determinant) < 1e-12) return null;
  const x = (xb * yy - xy * yb) / determinant;
  const y = (xx * yb - xy * xb) / determinant;
  return finite(x) && finite(y) ? { x, y } : null;
}

function validate(item, nowMs, maxAgeMs) {
  if (!item || typeof item !== 'object') return 'INVALID_OBSERVATION';
  if (typeof item.sourceId !== 'string' || !item.sourceId.trim()) return 'MISSING_SOURCE_ID';
  if (typeof item.anchorId !== 'string' || !item.anchorId.trim()) return 'MISSING_ANCHOR_ID';
  if (!item.anchor || !finite(item.anchor.x) || !finite(item.anchor.y)) return 'INVALID_ANCHOR_POSITION';
  if (!['MEASURED', 'DERIVED'].includes(String(item.evidenceClass ?? '').trim().toUpperCase())) return 'UNTRUSTED_EVIDENCE_CLASS';
  if (!finite(item.rangeM) || item.rangeM <= 0) return 'INVALID_RANGE';
  if (!finite(item.uncertaintyM) || item.uncertaintyM <= 0) return 'INVALID_UNCERTAINTY';
  if (!finite(item.timestampMs)) return 'INVALID_TIMESTAMP';
  if (typeof item.coordinateFrame !== 'string' || !item.coordinateFrame.trim()) return 'MISSING_COORDINATE_FRAME';
  const age = nowMs - item.timestampMs;
  if (age < 0) return 'FUTURE_TIMESTAMP';
  if (age > maxAgeMs) return 'STALE';
  return null;
}

/**
 * Solve a 2D position from range-only observations to surveyed anchors.
 * @param {Array<object>} observations
 * @param {{nowMs:number,maxAgeMs?:number,maxSkewMs?:number,residualFloorM?:number,outlierSigma?:number}} options
 */
export function solveRangeOnlyPosition2D(observations, options = {}) {
  const { nowMs, maxAgeMs = 2000, maxSkewMs = 150, residualFloorM = 0.5, outlierSigma = 3 } = options;
  if (!finite(nowMs)) throw new TypeError('nowMs must be a finite timestamp');
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array');
  if (![maxAgeMs, maxSkewMs, residualFloorM, outlierSigma].every(finite) ||
      maxAgeMs < 0 || maxSkewMs < 0 || residualFloorM < 0 || outlierSigma <= 0) {
    throw new TypeError('invalid solver limits');
  }
  const rejected = [];
  const valid = [];
  for (const item of observations) {
    const reason = validate(item, nowMs, maxAgeMs);
    if (reason) rejected.push({ sourceId: item?.sourceId ?? null, reason });
    else valid.push(item);
  }
  const frames = new Set(valid.map((item) => item.coordinateFrame));
  if (frames.size > 1) {
    for (const item of valid) rejected.push({ sourceId: item.sourceId, reason: 'COORDINATE_FRAME_MISMATCH' });
    return { status: 'UNAVAILABLE', reason: 'INCOMPATIBLE_COORDINATE_FRAMES', evidenceClass: 'UNAVAILABLE', rejected };
  }
  const unique = new Set();
  const anchors = [];
  for (const item of valid) {
    if (unique.has(item.anchorId)) rejected.push({ sourceId: item.sourceId, reason: 'DUPLICATE_ANCHOR' });
    else { unique.add(item.anchorId); anchors.push(item); }
  }
  if (anchors.length < 3) return { status: 'UNAVAILABLE', reason: 'INSUFFICIENT_ANCHORS', evidenceClass: 'UNAVAILABLE', rejected };
  const times = anchors.map((item) => item.timestampMs);
  if (Math.max(...times) - Math.min(...times) > maxSkewMs) {
    return { status: 'UNAVAILABLE', reason: 'TIME_ALIGNMENT_OUTSIDE_LIMIT', evidenceClass: 'UNAVAILABLE', rejected };
  }
  if (anchors.length > 20) return { status: 'UNAVAILABLE', reason: 'ANCHOR_LIMIT_EXCEEDED', evidenceClass: 'UNAVAILABLE', rejected };

  // Deterministic three-anchor hypotheses; choose the largest residual-consistent set.
  let best = null;
  for (let i = 0; i < anchors.length - 2; i += 1) {
    for (let j = i + 1; j < anchors.length - 1; j += 1) {
      for (let k = j + 1; k < anchors.length; k += 1) {
        const hypothesis = solveThree(anchors[i], anchors[j], anchors[k]);
        if (!hypothesis) continue;
        const inliers = anchors.filter((item) => {
          const residual = Math.abs(distance(hypothesis, item.anchor) - item.rangeM);
          return residual <= Math.max(residualFloorM, outlierSigma * item.uncertaintyM);
        });
        if (!best || inliers.length > best.inliers.length ||
            (inliers.length === best.inliers.length && hypothesis.geometryQuality > best.geometryQuality)) {
          best = { hypothesis, inliers };
        }
      }
    }
  }
  if (!best || best.inliers.length < 3) {
    return { status: 'UNAVAILABLE', reason: 'NO_GEOMETRICALLY_CONSISTENT_ANCHOR_SET', evidenceClass: 'UNAVAILABLE', rejected };
  }
  const position = solveWeightedLinear(best.inliers);
  if (!position) return { status: 'UNAVAILABLE', reason: 'ILL_CONDITIONED_GEOMETRY', evidenceClass: 'UNAVAILABLE', rejected };
  const residuals = best.inliers.map((item) => ({
    anchorId: item.anchorId,
    residualM: distance(position, item.anchor) - item.rangeM,
  }));
  const rmsResidualM = Math.sqrt(residuals.reduce((sum, item) => sum + item.residualM ** 2, 0) / residuals.length);
  const inlierIds = new Set(best.inliers.map((item) => item.anchorId));
  for (const item of anchors) {
    if (!inlierIds.has(item.anchorId)) rejected.push({ sourceId: item.sourceId, reason: 'RANGE_OUTLIER' });
  }
  return {
    status: 'CANDIDATE',
    evidenceClass: 'DERIVED',
    position,
    dimensions: 2,
    units: 'm',
    coordinateFrame: anchors[0].coordinateFrame,
    sourceIds: best.inliers.map((item) => item.sourceId),
    anchorIds: best.inliers.map((item) => item.anchorId),
    residuals,
    rmsResidualM,
    geometryQuality: best.hypothesis.geometryQuality,
    uncertaintyKind: 'NOT_CALIBRATED_RANGE_RESIDUAL_DIAGNOSTIC',
    sourceCorrelation: 'UNKNOWN_NOT_ESTIMATED',
    limitations: [
      'Range-only measurements provide no bearing; a 2D solution requires surveyed anchor coordinates and adequate geometry.',
      'This candidate is not a measured position or a calibrated confidence interval.',
      'Anchor coordinates, clock alignment, multipath/NLOS behavior, and correlated errors require independent validation.',
      'Not suitable for victim detection, through-wall localization, navigation, or life-safety decisions.',
    ],
    rejected,
  };
}