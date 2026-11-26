import { fusePositionObservations } from './consensus.js';

/**
 * Experimental, opt-in adapter for position fusion.
 * No default clock/frame/calibration values are fabricated.
 * The resulting candidate must not be displayed as verified life-safety data.
 */
export function fuseEvidencePositions(observations, options = {}) {
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array');
  const rejected = [];
  const compatible = [];
  for (const record of observations) {
    const value = record?.value;
    const position = record?.position ?? value?.position;
    const candidate = {
      sourceId: record?.sourceId ?? record?.observationId,
      evidenceClass: record?.evidenceClass,
      position,
      coordinateFrame: record?.coordinateFrame ?? record?.frameId,
      units: record?.units ?? record?.unit,
      clockDomain: record?.clockDomain,
      timestampMs: record?.timestampMs ?? record?.observedAt,
      uncertainty: record?.uncertainty,
    };
    if (!candidate.position || !['x', 'y', 'z'].every(axis => Number.isFinite(candidate.position[axis]))) {
      rejected.push({ sourceId: candidate.sourceId ?? null, reason: 'POSITION_UNAVAILABLE' });
      continue;
    }
    if (typeof candidate.timestampMs !== 'number') {
      rejected.push({ sourceId: candidate.sourceId ?? null, reason: 'TIMESTAMP_NOT_NORMALIZED' });
      continue;
    }
    compatible.push(candidate);
  }
  const result = fusePositionObservations(compatible, options);
  return {
    ...result,
    rejected: [...rejected, ...result.rejected],
    operationalStatus: 'EXPERIMENTAL_NOT_VALIDATED',
    operationalUseAllowed: false,
    displayLabel: result.status === 'CANDIDATE' ? 'DERIVED POSITION — UNVALIDATED' : 'POSITION UNAVAILABLE',
  };
}
