/**
 * Offline-first queue for paired physical-validation records.
 *
 * Writes are checkpointed individually. A retry skips any backend write whose
 * successful completion was persisted locally. Legacy queue entries from v1
 * have no checkpoints, so they are held for review rather than blindly replayed.
 */
export const PHYSICAL_VALIDATION_QUEUE_KEY = 'waveradar:physical-validation:queue:v1';
const MAX_PENDING_RECORDS = 20;
let activeFlush = null;

const hasCheckpointState = item =>
  item?.queueVersion >= 2 ||
  Object.prototype.hasOwnProperty.call(item || {}, 'sessionSaved') ||
  Object.prototype.hasOwnProperty.call(item || {}, 'validationSaved');

export function readPhysicalValidationQueue(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(PHYSICAL_VALIDATION_QUEUE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && item.sessionPayload && item.validationPayload).map(item => {
      const checkpointed = hasCheckpointState(item);
      return {
        ...item,
        queueId: item.queueId || item.sessionPayload.session_id || `validation-${item.queuedAt || 'legacy'}`,
        queueVersion: Number(item.queueVersion) || (checkpointed ? 2 : 1),
        sessionSaved: checkpointed && Boolean(item.sessionSaved),
        validationSaved: checkpointed && Boolean(item.validationSaved),
        needsReview: item.needsReview === true || !checkpointed,
      };
    });
  } catch {
    return [];
  }
}

export function writePhysicalValidationQueue(queue, storage = globalThis.localStorage) {
  try {
    if (!storage?.setItem) return false;
    storage.setItem(PHYSICAL_VALIDATION_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_PENDING_RECORDS)));
    return true;
  } catch (error) {
    console.warn('[WaveRadar] offline validation queue write failed', error);
    return false;
  }
}

export function enqueuePhysicalValidationRecord(item, storage = globalThis.localStorage) {
  const queueId = item?.queueId || item?.sessionPayload?.session_id;
  if (!queueId || !item?.sessionPayload || !item?.validationPayload) {
    return { ok: false, queue: readPhysicalValidationQueue(storage) };
  }
  const queue = readPhysicalValidationQueue(storage);
  const existing = queue.find(entry => entry.queueId === queueId);
  if (existing) return { ok: true, duplicate: true, queue, item: existing };
  const normalized = {
    ...item,
    queueId,
    queueVersion: 2,
    sessionSaved: Boolean(item.sessionSaved),
    validationSaved: Boolean(item.validationSaved),
    needsReview: false,
  };
  const next = [...queue, normalized].slice(-MAX_PENDING_RECORDS);
  return { ok: writePhysicalValidationQueue(next, storage), queue: next, item: normalized };
}

export function flushPhysicalValidationQueue({
  createSession,
  createValidation,
  storage = globalThis.localStorage,
  online = globalThis.navigator?.onLine !== false,
  onError = null,
} = {}) {
  if (activeFlush) return activeFlush;
  const work = (async () => {
    const queue = readPhysicalValidationQueue(storage);
    if (!online) {
      return {
        syncedCount: 0,
        remainingCount: queue.length,
        failedCount: 0,
        reviewRequiredCount: queue.filter(item => item.needsReview).length,
        checkpointFailureCount: 0,
        offline: true,
      };
    }
    if (typeof createSession !== 'function' || typeof createValidation !== 'function') {
      return {
        syncedCount: 0,
        remainingCount: queue.length,
        failedCount: queue.length,
        reviewRequiredCount: queue.filter(item => item.needsReview).length,
        checkpointFailureCount: 0,
        offline: false,
      };
    }

    let syncedCount = 0;
    let failedCount = 0;
    let checkpointFailureCount = 0;
    for (let index = 0; index < queue.length;) {
      let item = queue[index];
      if (item.needsReview) {
        index += 1;
        continue;
      }
      try {
        if (!item.sessionSaved) {
          await createSession(item.sessionPayload);
          item = { ...item, sessionSaved: true };
          queue[index] = item;
          if (!writePhysicalValidationQueue(queue, storage)) {
            checkpointFailureCount += 1;
            throw new Error('Could not persist session-save checkpoint; manual review required');
          }
        }
        if (!item.validationSaved) {
          await createValidation(item.validationPayload);
          item = { ...item, validationSaved: true };
          queue[index] = item;
          if (!writePhysicalValidationQueue(queue, storage)) {
            checkpointFailureCount += 1;
            throw new Error('Could not persist validation-save checkpoint; manual review required');
          }
        }
        queue.splice(index, 1);
        // If removal cannot be persisted, the durable copy has both save flags
        // and the next retry safely removes it without replaying backend writes.
        writePhysicalValidationQueue(queue, storage);
        syncedCount += 1;
      } catch (error) {
        failedCount += 1;
        if (typeof onError === 'function') onError(error, item);
        index += 1;
      }
    }
    const durableQueue = readPhysicalValidationQueue(storage);
    return {
      syncedCount,
      remainingCount: durableQueue.length,
      failedCount,
      reviewRequiredCount: durableQueue.filter(item => item.needsReview).length,
      checkpointFailureCount,
      offline: false,
    };
  })();
  activeFlush = work.finally(() => { activeFlush = null; });
  return activeFlush;
}
