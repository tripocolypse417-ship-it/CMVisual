import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendEvidenceEvent, verifyEvidenceLedger } from '../src/lib/controlPlane/evidenceLedger.js';

const dir = await mkdtemp(join(tmpdir(), 'waveradar-ledger-'));
const path = join(dir, 'events.jsonl');
try {
  let status = await verifyEvidenceLedger(path);
  assert.equal(status.valid, true);
  assert.equal(status.entries, 0);

  const first = await appendEvidenceEvent(path, {
    eventId: 'event-001',
    eventType: 'SENSOR_OBSERVATION_IMPORTED',
    recordedAt: '2026-11-13T20:00:00.000Z',
    provenance: { source: 'android-native', captureId: 'capture-001' },
    dataClassification: 'INTERNAL',
    payload: { rawObservationPreserved: true },
  });
  assert.equal(first.sequence, 1);
  const second = await appendEvidenceEvent(path, {
    eventId: 'event-002',
    eventType: 'REVIEW_DECISION_RECORDED',
    recordedAt: '2026-11-13T20:01:00.000Z',
    provenance: { reviewerRole: 'independent-reviewer' },
    payload: { decision: 'NEEDS_MORE_EVIDENCE' },
  });
  assert.equal(second.sequence, 2);
  status = await verifyEvidenceLedger(path);
  assert.equal(status.entries, 2);
  assert.equal(status.headHash, second.hash);

  await assert.rejects(() => appendEvidenceEvent(path, {
    eventId: 'event-002', eventType: 'DUPLICATE',
    recordedAt: '2026-11-13T20:02:00.000Z',
  }), /Duplicate/);

  const original = await readFile(path, 'utf8');
  const altered = original.replace('rawObservationPreserved', 'rawObservationChanged');
  await writeFile(path, altered);
  await assert.rejects(() => verifyEvidenceLedger(path), /integrity failure/);

  await writeFile(path, original + '{"partial":');
  status = await verifyEvidenceLedger(path);
  assert.equal(status.incompleteTail, true);
  await assert.rejects(() => appendEvidenceEvent(path, {
    eventId: 'event-003', eventType: 'SHOULD_NOT_APPEND',
    recordedAt: '2026-11-13T20:03:00.000Z',
  }), /incomplete trailing write/);
} finally {
  await rm(dir, { recursive: true, force: true });
}
console.log('WaveRadar append-only evidence ledger checks passed.');
