const EVIDENCE_CLASSES = new Set([
  'MEASURED',
  'DERIVED',
  'INFERRED',
  'PREDICTED',
  'SIMULATED',
  'DEMO',
  'UNKNOWN',
  'UNAVAILABLE',
]);

/** Return only an explicitly declared evidence class; never infer MEASURED from a source label. */
export function normalizeEvidenceClass(value) {
  const declared = String(value ?? '').trim().toUpperCase();
  return EVIDENCE_CLASSES.has(declared) ? declared : 'UNKNOWN';
}
