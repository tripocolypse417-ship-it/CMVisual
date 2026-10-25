/**
 * Durable local queue for physical-validation records.
 *
 * Safety rules:
 * - Never truncate pending records to fit a fixed queue size.
 * - Persist an in-flight checkpoint before each remote write.
 * - Treat interrupted/rejected writes as ambiguous; never blindly retry them.
 * - Keep malformed/legacy records for review instead of silently dropping them.
 */
export const PHYSICAL_VALIDATION_QUEUE_KEY = 'waveradar:physical-validation:queue:v1';
export const PHYSICAL_VALIDATION_QUEUE_VERSION = 2;

const WRITE_STATE = Object.freeze({
  PENDING: 'pending',
  IN_FLIGHT: 'in_flight',
  SAVED: 'saved',
  AMBIGUOUS: 'ambiguous',
});

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function errorCode(error) {
  if (error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014) {
    return 'STORAGE_FULL';
  }
  return 'STORAGE_UNAVAILABLE';
}

export function readPhysicalValidationQueue(storage) {
  const target = resolveStorage(storage);
  if (!target || typeof target.getItem !== 'function') {
    return { ok: false, queue: [], error: 'STORAGE_UNAVAILABLE' };
  }
  try {
    const raw = target.getItem(PHYSICAL_VALIDATION_QUEUE_KEY);
    if (raw == null || raw === '') return { ok: true, queue: [] };
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue)) return { ok: false, queue: [], error: 'QUEUE_CORRUPT' };
    return { ok: true, queue };
  } catch (error) {
    return { ok: false, queue: [], error: errorCode(error) === 'STORAGE_FULL' ? 'QUEUE_READ_FAILED' : 'QUEUE_CORRUPT' };
  }
}

export function writePhysicalValidationQueue(queue, storage) {
  const target = resolveStorage(storage);
  if (!target || typeof target.setItem !== 'function') {
    return { ok: false, error: 'STORAGE_UNAVAILABLE' };
  }
  if (!Array.isArray(queue)) return { ok: false, error: 'INVALID_QUEUE' };
  try {
    target.setItem(PHYSICAL_VALIDATION_QUEUE_KEY, JSON.stringify(queue));
    return { ok: true, count: queue.length };
  } catch (error) {
    return { ok: false, error: errorCode(error) };
  }
}

function queueIdFor(item, index) {
  return item?.queueId ||
    item?.sessionPayload?.session_id ||
    item?.validationPayload?.validation_id ||
    `legacy-${index}-${item?.queuedAt || 'unknown'}`;
}

function normalizeQueueItem(item, index) {
  if (!item || typeof item !== 'object' || !item.sessionPayload || !item.validationPayload) {
    return {
      ...(item && typeof item === 'object' ? item : { legacyValue: item }),
      queueId: queueIdFor(item, index),
      schemaVersion: PHYSICAL_VALIDATION_QUEUE_VERSION,
      quarantined: true,
      quarantineReason: 'MISSING_REQUIRED_PAYLOAD',
    };
  }

  const normalized = {
    ...item,
    queueId: queueIdFor(item, index),
    schemaVersion: PHYSICAL_VALIDATION_QUEUE_VERSION,
  };

  if (normalized.sessionState || normalized.validationState) {
    if (normalized.sessionState === WRITE_STATE.IN_FLIGHT) {
      normalized.sessionState = WRITE_STATE.AMBIGUOUS;
      normalized.ambiguityReason = normalized.ambiguityReason || 'SESSION_WRITE_INTERRUPTED';
    }
    if (normalized.validationState === WRITE_STATE.IN_FLIGHT) {
      normalized.validationState = WRITE_STATE.AMBIGUOUS;
      normalized.ambiguityReason = normalized.ambiguityReason || 'VALIDATION_WRITE_INTERRUPTED';
    }
    return normalized;
  }

  // The previous queue format explicitly stored these booleans after caught
  // partial failures. Records without either checkpoint are unsafe to replay.
  if (typeof item.sessionSaved === 'boolean' || typeof item.validationSaved === 'boolean') {
    normalized.sessionState = item.sessionSaved ? WRITE_STATE.SAVED : WRITE_STATE.PENDING;
    normalized.validationState = item.validationSaved ? WRITE_STATE.SAVED : WRITE_STATE.PENDING;
    return normalized;
  }

  normalized.sessionState = WRITE_STATE.AMBIGUOUS;
  normalized.validationState = WRITE_STATE.AMBIGUOUS;
  normalized.ambiguityReason = 'LEGACY_RECORD_WITHOUT_WRITE_CHECKPOINTS';
  return normalized;
}

function summarize(queue) {
  const ambiguousCount = queue.filter(item =>
    item?.quarantined ||
    item?.sessionState === WRITE_STATE.AMBIGUOUS ||
    item?.validationState === WRITE_STATE.AMBIGUOUS
  ).length;
  return {
    pendingCount: queue.length,
    ambiguousCount,
    savedCount: 0,
  };
}

export function getPhysicalValidationQueueStatus(storage) {
  const loaded = readPhysicalValidationQueue(storage);
  if (!loaded.ok) return { ok: false, error: loaded.error, pendingCount: null, ambiguousCount: null };
  const queue = loaded.queue.map(normalizeQueueItem);
  return { ok: true, ...summarize(queue) };
}

export function enqueuePhysicalValidationRecord(record, storage) {
  if (!record || typeof record !== 'object' || !record.sessionPayload || !record.validationPayload) {
    return { ok: false, error: 'INVALID_RECORD' };
  }
  const loaded = readPhysicalValidationQueue(storage);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const queue = loaded.queue;
  const queueId = record.queueId || record.sessionPayload.session_id || queueIdFor(record, queue.length);
  if (queue.some(item => item?.queueId === queueId || item?.sessionPayload?.session_id === queueId)) {
    return { ok: true, queued: false, duplicate: true, queueId, count: queue.length };
  }
  const queuedRecord = {
    ...record,
    queueId,
    schemaVersion: PHYSICAL_VALIDATION_QUEUE_VERSION,
    sessionState: WRITE_STATE.PENDING,
    validationState: WRITE_STATE.PENDING,
    sessionSaved: false,
    validationSaved: false,
  };
  const result = writePhysicalValidationQueue([...queue, queuedRecord], storage);
  return { ...result, queued: result.ok, duplicate: false, queueId };
}

/**
 * Flush queued records in order. Each remote write is preceded by a persisted
 * in-flight state. A rejected request is ambiguous because the server may have
 * accepted it before the client lost the response; automatic retry is unsafe.
 */
export async function syncPhysicalValidationQueue({
  storage,
  online = true,
  createSession,
  createValidation,
} = {}) {
  if (!online) {
    const status = getPhysicalValidationQueueStatus(storage);
    return { ...status, ok: status.ok, skipped: true, reason: 'OFFLINE' };
  }
  if (typeof createSession !== 'function' || typeof createValidation !== 'function') {
    return { ok: false, error: 'MISSING_REMOTE_WRITERS', pendingCount: null, ambiguousCount: null };
  }

  const loaded = readPhysicalValidationQueue(storage);
  if (!loaded.ok) return { ok: false, error: loaded.error, pendingCount: null, ambiguousCount: null };

  let queue = loaded.queue.map(normalizeQueueItem);
  const normalizedWrite = writePhysicalValidationQueue(queue, storage);
  if (!normalizedWrite.ok) {
    return { ok: false, error: normalizedWrite.error, ...summarize(queue) };
  }

  const persist = () => writePhysicalValidationQueue(queue, storage);
  const persistOrStop = () => {
    const result = persist();
    return result.ok ? null : { ok: false, error: result.error, checkpointFailed: true, ...summarize(queue) };
  };

  for (let index = 0; index < queue.length; index += 1) {
    let item = queue[index];
    if (!item || item.quarantined ||
        item.sessionState === WRITE_STATE.AMBIGUOUS ||
        item.validationState === WRITE_STATE.AMBIGUOUS) continue;

    if (item.sessionState !== WRITE_STATE.SAVED) {
      item = { ...item, sessionState: WRITE_STATE.IN_FLIGHT, sessionSaved: false };
      queue[index] = item;
      const checkpointError = persistOrStop();
      if (checkpointError) return checkpointError;

      try {
        await createSession(item.sessionPayload);
        item = { ...item, sessionState: WRITE_STATE.SAVED, sessionSaved: true, lastError: null };
        queue[index] = item;
        const checkpointErrorAfterWrite = persistOrStop();
        if (checkpointErrorAfterWrite) return checkpointErrorAfterWrite;
      } catch {
        item = { ...item, sessionState: WRITE_STATE.AMBIGUOUS, sessionSaved: false, ambiguityReason: 'SESSION_WRITE_OUTCOME_UNKNOWN' };
        queue[index] = item;
        const checkpointError = persistOrStop();
        if (checkpointError) return checkpointError;
        continue;
      }
    }

    if (item.validationState !== WRITE_STATE.SAVED) {
      item = { ...item, validationState: WRITE_STATE.IN_FLIGHT, validationSaved: false };
      queue[index] = item;
      const checkpointError = persistOrStop();
      if (checkpointError) return checkpointError;

      try {
        await createValidation(item.validationPayload);
        item = { ...item, validationState: WRITE_STATE.SAVED, validationSaved: true, lastError: null };
        queue[index] = item;
        const checkpointErrorAfterWrite = persistOrStop();
        if (checkpointErrorAfterWrite) return checkpointErrorAfterWrite;
      } catch {
        item = { ...item, validationState: WRITE_STATE.AMBIGUOUS, validationSaved: false, ambiguityReason: 'VALIDATION_WRITE_OUTCOME_UNKNOWN' };
        queue[index] = item;
        const checkpointError = persistOrStop();
        if (checkpointError) return checkpointError;
      }
    }
  }

  const remaining = queue.filter(item =>
    item?.quarantined ||
    item?.sessionState !== WRITE_STATE.SAVED ||
    item?.validationState !== WRITE_STATE.SAVED
  );
  const finalWrite = writePhysicalValidationQueue(remaining, storage);
  if (!finalWrite.ok) {
    return { ok: false, error: finalWrite.error, checkpointFailed: true, ...summarize(queue) };
  }
  return {
    ok: true,
    pendingCount: remaining.length,
    ambiguousCount: summarize(remaining).ambiguousCount,
    savedCount: queue.length - remaining.length,
    queue: remaining,
  };
}
