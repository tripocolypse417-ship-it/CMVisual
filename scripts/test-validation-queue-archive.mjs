import assert from 'node:assert/strict';
import {
  createValidationQueueArchive,
  previewValidationQueueRestore,
  restoreValidationQueueArchive,
  verifyValidationQueueArchive,
} from '../src/lib/validationQueueArchive.js';
import { PHYSICAL_VALIDATION_QUEUE_KEY } from '../src/lib/physicalValidationQueue.js';

function memoryStorage(seed = []) {
  const data = new Map([[PHYSICAL_VALIDATION_QUEUE_KEY, JSON.stringify(seed)]]);
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
  };
}

const recordA = { queueId: 'q-a', sessionPayload: { session_id: 's-a' }, validationPayload: { validation_id: 'v-a' }, note: 'preserve exactly' };
const recordB = { queueId: 'q-b', sessionPayload: { session_id: 's-b' }, validationPayload: { validation_id: 'v-b' } };
const source = memoryStorage([recordA, recordB]);
const exported = await createValidationQueueArchive({ storage: source, exportedAt: '2026-10-30T18:00:00.000Z' });
assert.equal(exported.ok, true);
assert.equal(JSON.parse(exported.json).recordCount, 2);
assert.equal((await verifyValidationQueueArchive(exported.json)).ok, true);

const emptyDestination = memoryStorage([]);
const preview = await previewValidationQueueRestore(exported.json, { storage: emptyDestination });
assert.equal(preview.ok, true);
assert.equal(preview.additions, 2);
assert.equal(preview.canRestore, true);
const restored = await restoreValidationQueueArchive(exported.json, { storage: emptyDestination });
assert.equal(restored.restored, true);
assert.equal(restored.restoredCount, 2);

const repeated = await restoreValidationQueueArchive(exported.json, { storage: emptyDestination });
assert.equal(repeated.restored, true);
assert.equal(repeated.restoredCount, 0, 'repeat restore must not duplicate records');

const tampered = JSON.parse(exported.json);
tampered.records[0].note = 'changed';
assert.equal((await verifyValidationQueueArchive(tampered)).error, 'ARCHIVE_HASH_MISMATCH');

const conflictingDestination = memoryStorage([{ ...recordA, note: 'different existing content' }]);
const conflictPreview = await previewValidationQueueRestore(exported.json, { storage: conflictingDestination });
assert.equal(conflictPreview.canRestore, false);
assert.deepEqual(conflictPreview.conflicts, ['q-a']);
const conflictRestore = await restoreValidationQueueArchive(exported.json, { storage: conflictingDestination });
assert.equal(conflictRestore.restored, false);
assert.equal(conflictRestore.error, 'RECORD_ID_CONFLICTS_REQUIRE_REVIEW');

console.log('WaveRadar validation queue archive/restore tests: PASS');
