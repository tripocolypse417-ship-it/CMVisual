import assert from 'node:assert/strict';
import {
  PHYSICAL_VALIDATION_QUEUE_KEY,
  enqueuePhysicalValidationRecord,
  getPhysicalValidationQueueStatus,
  readPhysicalValidationQueue,
  syncPhysicalValidationQueue,
} from '../src/lib/physicalValidationQueue.js';

class MemoryStorage {
  constructor() { this.values = new Map(); this.failOnWrite = new Set(); this.writeCount = 0; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    this.writeCount += 1;
    if (this.failOnWrite.has(this.writeCount)) {
      const error = new Error('quota exceeded');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.values.set(key, String(value));
  }
}

const makeRecord = (id) => ({
  queueId: id,
  sessionPayload: { session_id: id },
  validationPayload: { sensor_id: id },
  queuedAt: '2026-10-24T00:00:00.000Z',
});

{
  // Queue growth never silently truncates records.
  const storage = new MemoryStorage();
  for (let i = 0; i < 25; i += 1) {
    const result = enqueuePhysicalValidationRecord(makeRecord(`record-${i}`), storage);
    assert.equal(result.ok, true);
  }
  const loaded = readPhysicalValidationQueue(storage);
  assert.equal(loaded.queue.length, 25);
  assert.equal(loaded.queue[0].queueId, 'record-0');
  assert.equal(loaded.queue[24].queueId, 'record-24');
}

{
  // Each remote call sees its in-flight checkpoint already persisted.
  const storage = new MemoryStorage();
  enqueuePhysicalValidationRecord(makeRecord('success'), storage);
  let sessions = 0;
  let validations = 0;
  const result = await syncPhysicalValidationQueue({
    storage,
    createSession: async (payload) => {
      const queued = JSON.parse(storage.getItem(PHYSICAL_VALIDATION_QUEUE_KEY));
      assert.equal(queued[0].sessionState, 'in_flight');
      assert.equal(payload.session_id, 'success');
      sessions += 1;
    },
    createValidation: async (payload) => {
      const queued = JSON.parse(storage.getItem(PHYSICAL_VALIDATION_QUEUE_KEY));
      assert.equal(queued[0].validationState, 'in_flight');
      assert.equal(payload.sensor_id, 'success');
      validations += 1;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.pendingCount, 0);
  assert.equal(result.savedCount, 1);
  assert.equal(sessions, 1);
  assert.equal(validations, 1);
  assert.deepEqual(readPhysicalValidationQueue(storage).queue, []);
}

{
  // Rejected writes become ambiguous and are not automatically retried.
  const storage = new MemoryStorage();
  enqueuePhysicalValidationRecord(makeRecord('ambiguous'), storage);
  let sessions = 0;
  let validations = 0;
  const writers = {
    storage,
    createSession: async () => { sessions += 1; throw new Error('connection reset'); },
    createValidation: async () => { validations += 1; },
  };
  const first = await syncPhysicalValidationQueue(writers);
  assert.equal(first.ok, true);
  assert.equal(first.ambiguousCount, 1);
  assert.equal(sessions, 1);
  assert.equal(validations, 0);
  const second = await syncPhysicalValidationQueue(writers);
  assert.equal(second.ok, true);
  assert.equal(sessions, 1);
  assert.equal(validations, 0);
}

{
  // If persisting an in-flight checkpoint fails, no remote call is made.
  const storage = new MemoryStorage();
  enqueuePhysicalValidationRecord(makeRecord('storage-fail'), storage);
  storage.failOnWrite.add(storage.writeCount + 2); // normalization write succeeds; in-flight write fails
  let called = false;
  const result = await syncPhysicalValidationQueue({
    storage,
    createSession: async () => { called = true; },
    createValidation: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.checkpointFailed, true);
  assert.equal(called, false);
}

{
  // A successful remote write with a failed success-checkpoint is never blindly replayed.
  const storage = new MemoryStorage();
  enqueuePhysicalValidationRecord(makeRecord('checkpoint-fail'), storage);
  storage.failOnWrite.add(storage.writeCount + 3); // normalization, in-flight, then success checkpoint
  let sessions = 0;
  const first = await syncPhysicalValidationQueue({
    storage,
    createSession: async () => { sessions += 1; },
    createValidation: async () => { throw new Error('must not run after checkpoint failure'); },
  });
  assert.equal(first.ok, false);
  assert.equal(first.checkpointFailed, true);
  assert.equal(sessions, 1);
  const second = await syncPhysicalValidationQueue({
    storage,
    createSession: async () => { sessions += 1; },
    createValidation: async () => {},
  });
  assert.equal(second.ok, true);
  assert.equal(second.ambiguousCount, 1);
  assert.equal(sessions, 1);
}

{
  // Legacy entries without write checkpoints are preserved for review.
  const storage = new MemoryStorage();
  storage.setItem(PHYSICAL_VALIDATION_QUEUE_KEY, JSON.stringify([makeRecord('legacy')]));
  let called = false;
  const result = await syncPhysicalValidationQueue({
    storage,
    createSession: async () => { called = true; },
    createValidation: async () => { called = true; },
  });
  assert.equal(result.ok, true);
  assert.equal(result.ambiguousCount, 1);
  assert.equal(called, false);
  assert.equal(readPhysicalValidationQueue(storage).queue.length, 1);
}

{
  // Queue storage failure is surfaced; no record is reported as queued.
  const storage = new MemoryStorage();
  storage.failOnWrite.add(1);
  const result = enqueuePhysicalValidationRecord(makeRecord('quota'), storage);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'STORAGE_FULL');
  assert.equal(getPhysicalValidationQueueStatus(storage).ok, true);
}

console.log('WaveRadar physical-validation queue regression tests: PASS');
