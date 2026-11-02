export const INDEPENDENT_GROUND_TRUTH_SCHEMA = 'waveradar-independent-ground-truth-v1';

const CALIBRATION_STATES = new Set(['CALIBRATED', 'NOT_CALIBRATED', 'UNKNOWN']);

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function finiteNumber(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegative(value) {
  return value != null && Number.isFinite(value) && value >= 0;
}

function normalizeIso(value) {
  if (value == null || value === '') return null;
  const timestamp = typeof value === 'number' ? value : Date.parse(String(value));
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeBearing(value) {
  const number = finiteNumber(value);
  if (number == null || number < 0 || number > 360) return null;
  return ((number % 360) + 360) % 360;
}

function bearingError(reference, observed) {
  if (reference == null || observed == null) return null;
  return Math.abs(((observed - reference + 540) % 360) - 180);
}

/**
 * Preserve an independently sourced reference claim without treating its
 * presence as proof. A separate reviewer must verify the instrument,
 * calibration, witness independence, artifact, and method before use.
 *
 * Empty metadata returns NOT_ATTACHED. Partial metadata is retained as an
 * INCOMPLETE record so omissions are visible in the exported evidence bundle.
 */
export function buildIndependentGroundTruthRecord(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const metadataValues = [
    source.referenceMethod,
    source.instrumentMakeModel,
    source.instrumentAssetId,
    source.calibrationStatus,
    source.calibrationEvidenceRef,
    source.distanceUncertaintyMeters,
    source.bearingUncertaintyDegrees,
    source.operatorId,
    source.independentWitnessId,
    source.referenceMeasuredAt,
    source.referenceEvidenceRef,
  ];
  const hasMetadata = metadataValues.some(value =>
    value != null && String(value).trim() !== ''
  );

  if (!hasMetadata) {
    return { status: 'NOT_ATTACHED', record: null, errors: [] };
  }

  const errors = [];
  const recordId = cleanText(source.recordId);
  const checkId = cleanText(source.checkId);
  const referenceName = cleanText(source.referenceName);
  const referenceMethod = cleanText(source.referenceMethod);
  const instrumentMakeModel = cleanText(source.instrumentMakeModel);
  const instrumentAssetId = cleanText(source.instrumentAssetId);
  const calibrationStatus = cleanText(source.calibrationStatus).toUpperCase();
  const calibrationEvidenceRef = cleanText(source.calibrationEvidenceRef);
  const operatorId = cleanText(source.operatorId);
  const independentWitnessId = cleanText(source.independentWitnessId);
  const referenceEvidenceRef = cleanText(source.referenceEvidenceRef);
  const sourceInstallationId = cleanText(source.sourceInstallationId);
  const recordedAt = normalizeIso(source.recordedAt) ?? new Date().toISOString();
  const referenceMeasuredAt = normalizeIso(source.referenceMeasuredAt);

  const referenceDistanceMeters = finiteNumber(source.referenceDistanceMeters);
  const observedDistanceMeters = finiteNumber(source.observedDistanceMeters);
  const referenceBearingDegrees = normalizeBearing(source.referenceBearingDegrees);
  const observedBearingDegrees = normalizeBearing(source.observedBearingDegrees);
  const distanceUncertaintyMeters = finiteNumber(source.distanceUncertaintyMeters);
  const bearingUncertaintyDegrees = finiteNumber(source.bearingUncertaintyDegrees);

  if (!recordId) errors.push('recordId is required');
  if (!checkId) errors.push('checkId is required');
  if (!referenceName) errors.push('referenceName is required');
  if (!referenceMethod) errors.push('referenceMethod is required');
  if (!instrumentMakeModel) errors.push('instrumentMakeModel is required');
  if (!instrumentAssetId) errors.push('instrumentAssetId is required');
  if (!CALIBRATION_STATES.has(calibrationStatus)) errors.push('calibrationStatus must be CALIBRATED, NOT_CALIBRATED, or UNKNOWN');
  if (calibrationStatus === 'CALIBRATED' && !calibrationEvidenceRef) {
    errors.push('calibrationEvidenceRef is required for a CALIBRATED instrument');
  }
  if (!operatorId) errors.push('operatorId is required');
  if (!independentWitnessId) errors.push('independentWitnessId is required');
  if (operatorId && independentWitnessId && operatorId.toLowerCase() === independentWitnessId.toLowerCase()) {
    errors.push('independentWitnessId must differ from operatorId');
  }
  if (!referenceMeasuredAt) errors.push('referenceMeasuredAt must be a valid timestamp');
  if (!referenceEvidenceRef) errors.push('referenceEvidenceRef is required');
  if (!nonNegative(referenceDistanceMeters)) errors.push('referenceDistanceMeters must be a non-negative finite number');
  if (!nonNegative(observedDistanceMeters)) errors.push('observedDistanceMeters must be a non-negative finite number');
  if (referenceBearingDegrees == null) errors.push('referenceBearingDegrees must be between 0 and 360');
  if (observedBearingDegrees == null) errors.push('observedBearingDegrees must be between 0 and 360');
  if (!nonNegative(distanceUncertaintyMeters)) errors.push('distanceUncertaintyMeters must be non-negative');
  if (!nonNegative(bearingUncertaintyDegrees) || bearingUncertaintyDegrees > 180) {
    errors.push('bearingUncertaintyDegrees must be between 0 and 180');
  }

  const complete = errors.length === 0;
  const calibrated = calibrationStatus === 'CALIBRATED' && Boolean(calibrationEvidenceRef);
  const record = {
    schema: INDEPENDENT_GROUND_TRUTH_SCHEMA,
    recordId,
    checkId,
    referenceName,
    recordedAt,
    referenceMeasuredAt,
    sourceInstallationId: sourceInstallationId || null,
    referenceMethod,
    instrument: {
      makeModel: instrumentMakeModel,
      assetId: instrumentAssetId,
      calibrationStatus: CALIBRATION_STATES.has(calibrationStatus) ? calibrationStatus : 'UNKNOWN',
      calibrationEvidenceRef: calibrationEvidenceRef || null,
    },
    participants: {
      operatorId: operatorId || null,
      independentWitnessId: independentWitnessId || null,
      independenceState: operatorId && independentWitnessId &&
        operatorId.toLowerCase() !== independentWitnessId.toLowerCase()
        ? 'ASSERTED_NOT_VERIFIED'
        : 'NOT_ESTABLISHED',
    },
    reference: {
      distanceMeters: referenceDistanceMeters,
      bearingDegrees: referenceBearingDegrees,
      distanceUncertaintyMeters,
      bearingUncertaintyDegrees,
      uncertaintyBasis: 'OPERATOR_REPORTED; REVIEW REQUIRED',
    },
    waveRadarEstimate: {
      distanceMeters: observedDistanceMeters,
      bearingDegrees: observedBearingDegrees,
    },
    comparison: {
      absoluteDistanceErrorMeters: referenceDistanceMeters != null && observedDistanceMeters != null
        ? Math.abs(observedDistanceMeters - referenceDistanceMeters) : null,
      absoluteBearingErrorDegrees: bearingError(referenceBearingDegrees, observedBearingDegrees),
    },
    referenceEvidenceRef: referenceEvidenceRef || null,
    completenessState: complete ? 'COMPLETE' : 'INCOMPLETE',
    eligibilityState: !complete
      ? 'INELIGIBLE_INCOMPLETE'
      : calibrated
        ? 'PENDING_INDEPENDENT_REVIEW'
        : 'METHOD_REVIEW_REQUIRED',
    reviewState: 'NOT_REVIEWED',
    verificationState: 'UNVERIFIED',
    evidenceClass: 'OPERATOR_REPORTED_REFERENCE',
    custodyState: 'LOCAL_STORAGE_NOT_TAMPER_EVIDENT',
    errors,
    limitation: 'A complete record is only a review candidate. This client cannot verify witness independence, instrument calibration, artifact authenticity, or measurement truth.',
  };

  return {
    status: record.eligibilityState,
    record,
    errors,
  };
}
