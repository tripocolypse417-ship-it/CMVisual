import { describe, it, expect } from 'vitest';
import { fuseEvidencePositions } from './evidencePipeline.js';

const nowMs = 100000;
const sample = (sourceId, x) => ({
  sourceId, evidenceClass: 'MEASURED', position: { x, y: 0, z: 0 },
  coordinateFrame: 'surveyed-local', units: 'm', clockDomain: 'synchronized-test',
  timestampMs: nowMs - 10, uncertainty: 0.2,
});
describe('experimental evidence fusion adapter', () => {
  it('produces only unvalidated candidates', () => {
    const result = fuseEvidencePositions([sample('a', 1), sample('b', 1.1)], { nowMs });
    expect(result.status).toBe('CANDIDATE');
    expect(result.operationalUseAllowed).toBe(false);
    expect(result.evidenceClass).toBe('DERIVED');
  });
  it('rejects missing normalized timestamps', () => {
    const result = fuseEvidencePositions([{ ...sample('a', 1), timestampMs: undefined }, sample('b', 1)], { nowMs });
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.rejected.some(r => r.reason === 'TIMESTAMP_NOT_NORMALIZED')).toBe(true);
  });
  it('rejects incompatible frames', () => {
    const result = fuseEvidencePositions([sample('a', 1), { ...sample('b', 1), coordinateFrame: 'other' }], { nowMs });
    expect(result.status).toBe('UNAVAILABLE');
  });
  it('rejects conflicting clock domains', () => {
    const result = fuseEvidencePositions([sample('a', 1), { ...sample('b', 1), clockDomain: 'different' }], { nowMs });
    expect(result.status).toBe('UNAVAILABLE');
  });
  it('rejects out-of-range timestamps', () => {
    const result = fuseEvidencePositions([sample('a', 1), { ...sample('b', 1), timestampMs: nowMs - 5000 }], { nowMs });
    expect(result.status).toBe('UNAVAILABLE');
  });
});
