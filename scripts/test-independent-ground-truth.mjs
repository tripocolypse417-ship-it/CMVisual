import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  INDEPENDENT_GROUND_TRUTH_SCHEMA,
  buildIndependentGroundTruthRecord,
} from '../src/lib/independentGroundTruth.js';

const empty = buildIndependentGroundTruthRecord({});
assert.equal(empty.status, 'NOT_ATTACHED');
assert.equal(empty.record, null);

const partial = buildIndependentGroundTruthRecord({
  recordId: 'gt-partial',
  checkId: 'check-1',
  referenceName: 'Doorway A',
  referenceMethod: 'TAPE_MEASURE_AND_COMPASS',
});
assert.equal(partial.record.schema, INDEPENDENT_GROUND_TRUTH_SCHEMA);
assert.equal(partial.record.completenessState, 'INCOMPLETE');
assert.equal(partial.record.eligibilityState, 'INELIGIBLE_INCOMPLETE');
assert.equal(partial.record.verificationState, 'UNVERIFIED');
assert.equal(partial.record.reviewState, 'NOT_REVIEWED');
assert.ok(partial.errors.length > 0);

const completeInput = {
  recordId: 'gt-complete',
  checkId: 'check-2',
  referenceName: 'Marked test point B',
  referenceMethod: 'CALIBRATED_LASER_DISTANCE_METER_AND_SURVEY_COMPASS',
  instrumentMakeModel: 'Reference instrument model X',
  instrumentAssetId: 'LAB-ASSET-014',
  calibrationStatus: 'CALIBRATED',
  calibrationEvidenceRef: 'calibration-certificate-2026-014',
  operatorId: 'operator-01',
  independentWitnessId: 'witness-02',
  referenceMeasuredAt: '2026-11-01T18:00:00.000Z',
  referenceEvidenceRef: 'artifact://lab-run-12/reference-photo-01',
  referenceDistanceMeters: '4.25',
  observedDistanceMeters: '4.31',
  referenceBearingDegrees: '359',
  observedBearingDegrees: '1',
  distanceUncertaintyMeters: '0.01',
  bearingUncertaintyDegrees: '0.5',
  sourceInstallationId: 'local-installation-01',
  recordedAt: '2026-11-01T18:01:00.000Z',
};
const complete = buildIndependentGroundTruthRecord(completeInput);
assert.equal(complete.errors.length, 0);
assert.equal(complete.record.completenessState, 'COMPLETE');
assert.equal(complete.record.eligibilityState, 'PENDING_INDEPENDENT_REVIEW');
assert.equal(complete.record.reviewState, 'NOT_REVIEWED');
assert.equal(complete.record.verificationState, 'UNVERIFIED');
assert.equal(complete.record.evidenceClass, 'OPERATOR_REPORTED_REFERENCE');
assert.equal(complete.record.participants.independenceState, 'ASSERTED_NOT_VERIFIED');
assert.ok(Math.abs(complete.record.comparison.absoluteDistanceErrorMeters - 0.06) < 1e-9);
assert.equal(complete.record.comparison.absoluteBearingErrorDegrees, 2);
assert.equal(complete.record.reference.bearingDegrees, 359);
assert.equal(complete.record.waveRadarEstimate.bearingDegrees, 1);
assert.equal(complete.record.custodyState, 'LOCAL_STORAGE_NOT_TAMPER_EVIDENT');

const samePerson = buildIndependentGroundTruthRecord({
  ...completeInput,
  recordId: 'gt-same-person',
  operatorId: 'same-person',
  independentWitnessId: 'SAME-PERSON',
});
assert.ok(samePerson.errors.some(error => error.includes('must differ')));
assert.equal(samePerson.record.eligibilityState, 'INELIGIBLE_INCOMPLETE');
assert.equal(samePerson.record.verificationState, 'UNVERIFIED');

const uncalibrated = buildIndependentGroundTruthRecord({
  ...completeInput,
  recordId: 'gt-uncalibrated',
  calibrationStatus: 'NOT_CALIBRATED',
  calibrationEvidenceRef: '',
});
assert.equal(uncalibrated.errors.length, 0);
assert.equal(uncalibrated.record.completenessState, 'COMPLETE');
assert.equal(uncalibrated.record.eligibilityState, 'METHOD_REVIEW_REQUIRED');
assert.equal(uncalibrated.record.verificationState, 'UNVERIFIED');

const missingCalibrationCertificate = buildIndependentGroundTruthRecord({
  ...completeInput,
  recordId: 'gt-missing-calibration',
  calibrationEvidenceRef: '',
});
assert.ok(missingCalibrationCertificate.errors.some(error => error.includes('calibrationEvidenceRef')));

const invalid = buildIndependentGroundTruthRecord({
  ...completeInput,
  recordId: 'gt-invalid',
  referenceDistanceMeters: '-1',
  observedBearingDegrees: '361',
  distanceUncertaintyMeters: '-0.1',
  bearingUncertaintyDegrees: '181',
  referenceMeasuredAt: 'not-a-time',
  referenceEvidenceRef: '',
});
assert.ok(invalid.errors.some(error => error.includes('referenceDistanceMeters')));
assert.ok(invalid.errors.some(error => error.includes('observedBearingDegrees')));
assert.ok(invalid.errors.some(error => error.includes('distanceUncertaintyMeters')));
assert.ok(invalid.errors.some(error => error.includes('bearingUncertaintyDegrees')));
assert.ok(invalid.errors.some(error => error.includes('referenceMeasuredAt')));
assert.ok(invalid.errors.some(error => error.includes('referenceEvidenceRef')));
assert.equal(invalid.record.verificationState, 'UNVERIFIED');

const page = await readFile(new URL('../src/pages/PhysicalValidation.jsx', import.meta.url), 'utf8');
assert.match(page, /buildIndependentGroundTruthRecord/);
assert.match(page, /independentGroundTruthRecords/);
assert.match(page, /independentReferenceRecords/);
assert.match(page, /LOCAL_STORAGE_NOT_TAMPER_EVIDENT/);
assert.match(page, /independent witness/i);
assert.match(page, /reference evidence artifact/i);
assert.match(page, /cmvisual-physical-validation-v4/);
assert.match(page, /REFERENCE_RECORDS_ATTACHED_PENDING_INDEPENDENT_REVIEW/);
assert.match(page, /groundTruthEvidenceStatus: 'OPERATOR_RECORDED_NOT_INDEPENDENTLY_VERIFIED'/);

console.log('Independent ground-truth record completeness, provenance, uncertainty, and non-promotion tests: PASS');
