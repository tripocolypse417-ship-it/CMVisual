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
const wrongSource = JSON.parse(exported.json);
wrongSource.source.queueKey = 'unrelated:queue';
assert.equal((await verifyValidationQueueArchive(wrongSource)).error, 'ARCHIVE_SOURCE_MISMATCH');
const badExportTime = JSON.parse(exported.json);
badExportTime.exportedAt = 'not-a-timestamp';
assert.equal((await verifyValidationQueueArchive(badExportTime)).error, 'ARCHIVE_TIMESTAMP_INVALID');

const emptyDestination = memoryStorage([]);
const preview = await previewValidationQueueRestore(exported.json, { storage: emptyDestination });
assert.equal(preview.ok, true);
assert.equal(preview.additions, 2);
assert.equal(preview.canRestore, true);
const restored = await restoreValidationQueueArchive(exported.json, { storage: emptyDestination });
assert.equal(restored.restored, true);
assert.equal(restored.restoredCount, 2);
assert.equal(restored.quarantinedCount, 2);
const restoredQueue = JSON.parse(emptyDestination.getItem(PHYSICAL_VALIDATION_QUEUE_KEY));
assert.equal(restoredQueue[0].quarantined, true);
assert.equal(restoredQueue[0].quarantineReason, 'ARCHIVE_RESTORE_REVIEW_REQUIRED');
assert.equal(restoredQueue[0].restoredFromArchive, true);

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

// Recheck immediately before writing: a concurrent change after preview must block restore.
const raceDestination = memoryStorage([]);
let digestCalls = 0;
const raceCrypto = {
  subtle: {
    async digest(algorithm, bytes) {
      digestCalls += 1;
      if (digestCalls === 3) {
        raceDestination.setItem(PHYSICAL_VALIDATION_QUEUE_KEY, JSON.stringify([
          { ...recordA, note: 'concurrent conflicting write' },
        ]));
      }
      return globalThis.crypto.subtle.digest(algorithm, bytes);
    },
  },
};
const raceRestore = await restoreValidationQueueArchive(exported.json, {
  storage: raceDestination,
  cryptoProvider: raceCrypto,
});
assert.equal(raceRestore.restored, false);
assert.equal(raceRestore.error, 'RECORD_ID_CONFLICTS_REQUIRE_REVIEW');
assert.deepEqual(raceRestore.conflicts, ['q-a']);
assert.equal(JSON.parse(raceDestination.getItem(PHYSICAL_VALIDATION_QUEUE_KEY))[0].note, 'concurrent conflicting write');

console.log('WaveRadar validation queue archive/restore tests: PASS');
