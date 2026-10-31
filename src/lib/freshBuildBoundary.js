/**
 * Fresh-build evidence boundary.
 *
 * New build starts with an empty trusted dataset. Historical/legacy records are
 * preserved outside the trusted view, never silently deleted or relabeled.
 * A record is eligible for a trusted live layer only when it belongs to this
 * build generation and carries explicit source, device, timestamp, and verified
 * integrity metadata. Valid timestamps alone are not proof of truth.
 */
export const FRESH_BUILD_GENERATION = 'waveradar-fresh-2026-10-29-v1';
export const FRESH_BUILD_POLICY_VERSION = 'fresh-build-zero-trust-v1';

const text = value => typeof value === 'string' ? value.trim() : '';
const finiteTimestamp = value => {
  if (value == null || value === '') return false;
  const parsed = typeof value === 'number'
    ? (value < 1e11 && value >= 1e9 ? value * 1000 : value)
    : Date.parse(String(value));
  return Number.isFinite(parsed);
};

const suspiciousLabel = value => /(^|[\s_:-])(demo|mock|fixture|fake|simulated|sample|seed|legacy|replay|test-only)([\s_:-]|$)/i.test(String(value || ''));

export function assessFreshBuildRecord(record, { generation = FRESH_BUILD_GENERATION, verifyIntegrityReceipt = null } = {}) {
  const reasons = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { eligible: false, reasons: ['INVALID_RECORD'] };
  }
  if (text(record.buildGeneration) !== generation) reasons.push('NOT_FROM_FRESH_BUILD_GENERATION');
  const source = text(record.source || record.provenance?.source);
  const deviceId = text(record.deviceId || record.provenance?.deviceId);
  if (!source) reasons.push('SOURCE_MISSING');
  if (!deviceId) reasons.push('DEVICE_ID_MISSING');
  if (!finiteTimestamp(record.observedAt ?? record.measuredAt ?? record.timestamp)) reasons.push('MEASUREMENT_TIMESTAMP_MISSING_OR_INVALID');
  // Never trust a client-set boolean as proof of integrity. A future server-side
  // verifier must issue a receipt bound to this record's digest; absent that
  // receipt the build fails closed and keeps the record quarantined.
  const integrity = record.integrityReceipt;
  const validReceiptShape = integrity &&
    integrity.version === 'server-attestation-v1' &&
    integrity.issuer === 'waveradar-server-verifier' &&
    typeof integrity.recordDigest === 'string' && /^[a-f0-9]{64}$/i.test(integrity.recordDigest) &&
    typeof integrity.signature === 'string' && integrity.signature.length >= 32 &&
    finiteTimestamp(integrity.verifiedAt);
  if (!validReceiptShape) {
    reasons.push('SERVER_INTEGRITY_RECEIPT_MISSING_OR_INVALID');
  } else if (typeof verifyIntegrityReceipt !== 'function' || verifyIntegrityReceipt(record, integrity) !== true) {
    reasons.push('SERVER_INTEGRITY_RECEIPT_NOT_CRYPTOGRAPHICALLY_VERIFIED');
  }
  if (record.quarantined === true || record.state === 'QUARANTINED') reasons.push('QUARANTINED');
  if (suspiciousLabel(source) || suspiciousLabel(record.datasetType) || suspiciousLabel(record.recordType)) reasons.push('SIMULATED_OR_LEGACY_LABEL');
  const evidence = text(record.evidenceClass || record.evidence_class).toUpperCase();
  if (!evidence) reasons.push('EVIDENCE_CLASS_EXPLICITLY_REQUIRED');
  if (['UNKNOWN', 'INFERRED', 'PREDICTED', 'DERIVED', 'CONFLICT'].includes(evidence)) reasons.push('NOT_RAW_MEASURED_EVIDENCE');
  return { eligible: reasons.length === 0, reasons };
}

export function partitionFreshBuildRecords(records = [], options = {}) {
  const eligible = [];
  const quarantined = [];
  (Array.isArray(records) ? records : []).forEach((record, index) => {
    const assessment = assessFreshBuildRecord(record, options);
    if (assessment.eligible) eligible.push(record);
    else quarantined.push({
      id: String(record?.eventId ?? record?.observationId ?? record?.id ?? `record-${index}`),
      reasons: assessment.reasons,
      record,
    });
  });
  return { eligible, quarantined, inputCount: Array.isArray(records) ? records.length : 0 };
}
