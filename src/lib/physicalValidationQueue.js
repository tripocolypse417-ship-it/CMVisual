/**
 * Durable offline queue for paired physical-validation records.
 * Each completed backend write is checkpointed before the next write begins.
 */
export const PHYSICAL_VALIDATION_QUEUE_KEY = 'waveradar:physical-validation:queue:v1';
const MAX_PENDING_RECORDS = 20;
let activeFlush = null;

export function readPhysicalValidationQueue(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(PHYSICAL_VALIDATION_QUEUE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && item.sessionPayload && item.validationPayload).map(item => ({
      ...item,
      queueId: item.queueId || item.sessionPayload.session_id || `validation-${item.queuedAt || 'legacy'}`,
      sessionSaved: Boolean(item.sessionSaved),
      validationSaved: Boolean(item.validationSaved),
    }));
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
  const normalized = { ...item, queueId, sessionSaved: Boolean(item.sessionSaved), validationSaved: Boolean(item.validationSaved) };
  const next = [...queue.filter(existing => existing.queueId !== queueId), normalized].slice(-MAX_PENDING_RECORDS);
  return { ok: writePhysicalValidationQueue(next, storage), queue: next, item: normalized };
}

export function flushPhysicalValidationQueue({ createSession, createValidation, storage = globalThis.localStorage, online = globalThis.navigator?.onLine !== false, onError = null } = {}) {
  if (activeFlush) return activeFlush;
  const work = (async () => {
    const queue = readPhysicalValidationQueue(storage);
    if (!online) return { syncedCount: 0, remainingCount: queue.length, failedCount: 0, offline: true };
    if (typeof createSession !== 'function' || typeof createValidation !== 'function') {
      return { syncedCount: 0, remainingCount: queue.length, failedCount: queue.length, offline: false };
    }
    let syncedCount = 0;
    let failedCount = 0;
    for (let index = 0; index < queue.length; index += 1) {
      let item = queue[index];
      try {
        if (!item.sessionSaved) {
          await createSession(item.sessionPayload);
          item = { ...item, sessionSaved: true };
          queue[index] = item;
          if (!writePhysicalValidationQueue(queue, storage)) throw new Error('Could not persist session-save checkpoint');
        }
        if (!item.validationSaved) {
          await createValidation(item.validationPayload);
          item = { ...item, validationSaved: true };
          queue[index] = item;
          if (!writePhysicalValidationQueue(queue, storage)) throw new Error('Could not persist validation-save checkpoint');
        }
        queue.splice(index, 1);
        index -= 1;
        syncedCount += 1;
        if (!writePhysicalValidationQueue(queue, storage)) throw new Error('Could not persist queue removal');
      } catch (error) {
        failedCount += 1;
        if (typeof onError === 'function') onError(error, item);
      }
    }
    return { syncedCount, remainingCount: queue.length, failedCount, offline: false };
  })();
  activeFlush = work.finally(() => { activeFlush = null; });
  return activeFlush;
}
