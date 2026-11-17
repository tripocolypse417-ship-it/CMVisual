/**
 * Experimental position fusion for WaveRadar.
 *
 * This module combines only explicitly classified, fresh observations that
 * share a coordinate frame, units, and a bounded timestamp window. It emits a
 * DERIVED candidate, never a MEASURED or independently validated position.
 * The scalar uncertainty is a screening heuristic, not a calibrated confidence
 * interval; source correlation must be established before operational use.
 */

const finite = (value) => Number.isFinite(value);
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function validateObservation(observation, nowMs, maxAgeMs) {
  if (!observation || typeof observation !== 'object') return 'INVALID_OBSERVATION';
  if (typeof observation.sourceId !== 'string' || !observation.sourceId.trim()) return 'MISSING_SOURCE_ID';
  if (!['MEASURED', 'DERIVED'].includes(String(observation.evidenceClass ?? '').trim().toUpperCase())) return 'UNTRUSTED_EVIDENCE_CLASS';
  if (!observation.position || !['x', 'y', 'z'].every((axis) => finite(observation.position[axis]))) return 'INVALID_POSITION';
  if (typeof observation.coordinateFrame !== 'string' || !observation.coordinateFrame.trim()) return 'MISSING_COORDINATE_FRAME';
  if (typeof observation.units !== 'string' || !observation.units.trim()) return 'MISSING_UNITS';
  if (!finite(observation.timestampMs)) return 'INVALID_TIMESTAMP';
  if (!finite(observation.uncertainty) || observation.uncertainty <= 0) return 'INVALID_UNCERTAINTY';
  const ageMs = nowMs - observation.timestampMs;
  if (ageMs < 0) return 'FUTURE_TIMESTAMP';
  if (ageMs > maxAgeMs) return 'STALE';
  return null;
}

/**
 * @param {Array<object>} observations source-native observations
 * @param {{nowMs:number,maxAgeMs?:number,maxSkewMs?:number,outlierSigma?:number}} options
 */
export function fusePositionObservations(observations, options = {}) {
  const {
    nowMs,
    maxAgeMs = 2000,
    maxSkewMs = 150,
    outlierSigma = 3,
  } = options;

  if (!finite(nowMs)) throw new TypeError('nowMs must be a finite timestamp');
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array');
  if (![maxAgeMs, maxSkewMs, outlierSigma].every(finite) || maxAgeMs < 0 || maxSkewMs < 0 || outlierSigma <= 0) {
    throw new TypeError('fusion limits must be finite and non-negative (outlierSigma must be positive)');
  }

  const rejected = [];
  const accepted = [];
  for (const observation of observations) {
    const reason = validateObservation(observation, nowMs, maxAgeMs);
    if (reason) rejected.push({ sourceId: observation?.sourceId ?? null, reason });
    else accepted.push(observation);
  }

  const unique = new Set();
  const distinct = [];
  for (const observation of accepted) {
    if (unique.has(observation.sourceId)) {
      rejected.push({ sourceId: observation.sourceId, reason: 'DUPLICATE_SOURCE' });
    } else {
      unique.add(observation.sourceId);
      distinct.push(observation);
    }
  }

  if (distinct.length < 2) {
    return { status: 'UNAVAILABLE', reason: 'INSUFFICIENT_INDEPENDENT_SOURCES', evidenceClass: 'UNAVAILABLE', rejected };
  }

  const frame = distinct[0].coordinateFrame;
  const units = distinct[0].units;
  const compatible = [];
  for (const observation of distinct) {
    if (observation.coordinateFrame !== frame) rejected.push({ sourceId: observation.sourceId, reason: 'COORDINATE_FRAME_MISMATCH' });
    else if (observation.units !== units) rejected.push({ sourceId: observation.sourceId, reason: 'UNIT_MISMATCH' });
    else compatible.push(observation);
  }

  if (compatible.length < 2) {
    return { status: 'UNAVAILABLE', reason: 'INSUFFICIENT_COMPATIBLE_SOURCES', evidenceClass: 'UNAVAILABLE', rejected };
  }

  const timestamps = compatible.map((item) => item.timestampMs);
  if (Math.max(...timestamps) - Math.min(...timestamps) > maxSkewMs) {
    return { status: 'UNAVAILABLE', reason: 'TIME_ALIGNMENT_OUTSIDE_LIMIT', evidenceClass: 'UNAVAILABLE', rejected };
  }

  const center = {
    x: median(compatible.map((item) => item.position.x)),
    y: median(compatible.map((item) => item.position.y)),
    z: median(compatible.map((item) => item.position.z)),
  };
  const typicalUncertainty = median(compatible.map((item) => item.uncertainty));
  const inliers = [];
  for (const observation of compatible) {
    const dx = observation.position.x - center.x;
    const dy = observation.position.y - center.y;
    const dz = observation.position.z - center.z;
    const residual = Math.hypot(dx, dy, dz);
    const gate = outlierSigma * Math.hypot(observation.uncertainty, typicalUncertainty);
    if (residual > gate) rejected.push({ sourceId: observation.sourceId, reason: 'ROBUST_OUTLIER', residual, gate });
    else inliers.push({ observation, residual });
  }

  if (inliers.length < 2) {
    return { status: 'UNAVAILABLE', reason: 'INSUFFICIENT_INLIERS', evidenceClass: 'UNAVAILABLE', rejected };
  }

  const weights = inliers.map(({ observation }) => 1 / (observation.uncertainty ** 2));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const position = { x: 0, y: 0, z: 0 };
  for (let index = 0; index < inliers.length; index += 1) {
    const { observation } = inliers[index];
    const weight = weights[index] / totalWeight;
    position.x += observation.position.x * weight;
    position.y += observation.position.y * weight;
    position.z += observation.position.z * weight;
  }

  const residualVariance = inliers.reduce((sum, item, index) =>
    sum + (weights[index] / totalWeight) * item.residual ** 2, 0);
  const nominalVariance = 1 / totalWeight;

  // Descriptive leave-one-source-out sensitivity: this exposes whether the
  // candidate depends heavily on one provider. It is not an integrity verdict.
  const leaveOneOutSensitivity = inliers.length >= 3
    ? inliers.map(({ observation: omitted }, omittedIndex) => {
      const remaining = inliers.filter((_, index) => index !== omittedIndex);
      const remainingWeights = remaining.map(({ observation }) => 1 / (observation.uncertainty ** 2));
      const remainingTotal = remainingWeights.reduce((sum, value) => sum + value, 0);
      const estimate = { x: 0, y: 0, z: 0 };
      for (let index = 0; index < remaining.length; index += 1) {
        const weight = remainingWeights[index] / remainingTotal;
        estimate.x += remaining[index].observation.position.x * weight;
        estimate.y += remaining[index].observation.position.y * weight;
        estimate.z += remaining[index].observation.position.z * weight;
      }
      return {
        omittedSourceId: omitted.sourceId,
        shift: Math.hypot(estimate.x - position.x, estimate.y - position.y, estimate.z - position.z),
      };
    })
    : null;

  return {
    status: 'CANDIDATE',
    evidenceClass: 'DERIVED',
    position,
    units,
    coordinateFrame: frame,
    timestampWindow: { earliestMs: Math.min(...timestamps), latestMs: Math.max(...timestamps) },
    sourceIds: inliers.map(({ observation }) => observation.sourceId),
    excludedSourceIds: rejected.map(({ sourceId }) => sourceId).filter(Boolean),
    uncertainty: Math.sqrt(nominalVariance + residualVariance),
    leaveOneOutSensitivity,
    sensitivityKind: leaveOneOutSensitivity ? 'DESCRIPTIVE_NOT_VALIDATION' : 'INSUFFICIENT_SOURCES',
    uncertaintyKind: 'HEURISTIC_NOT_CALIBRATED',
    assumptions: [
      'Source errors are treated as independent for nominal weighting; correlation is not estimated.',
      'All sources share the declared coordinate frame, units, and compatible clock domain.',
      'The robust residual gate is a screening rule, not proof that an observation is false.',
    ],
    limitations: [
      'Not independently validated; not suitable for life-safety decisions.',
      'No bearing, occupancy, identity, through-wall, or victim-detection capability is inferred.',
      'Requires independent ground truth and device/environment-specific calibration before operational use.',
    ],
    rejected,
  };
}
