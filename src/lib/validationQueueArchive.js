import {
  PHYSICAL_VALIDATION_QUEUE_KEY,
  PHYSICAL_VALIDATION_QUEUE_VERSION,
  readPhysicalValidationQueue,
  writePhysicalValidationQueue,
} from './physicalValidationQueue.js';

export const VALIDATION_QUEUE_ARCHIVE_VERSION = 'waveradar-validation-queue-archive-v1';

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

async function sha256(text, cryptoProvider) {
  if (!cryptoProvider?.subtle?.digest || typeof TextEncoder === 'undefined') return null;
  const bytes = new TextEncoder().encode(text);
  const digest = await cryptoProvider.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function recordId(item, index) {
  return item?.queueId || item?.sessionPayload?.session_id ||
    item?.validationPayload?.validation_id || `legacy-${index}-${item?.queuedAt || 'unknown'}`;
}

function archivePayload(archive) {
  return {
    archiveVersion: archive.archiveVersion,
    exportedAt: archive.exportedAt,
    source: archive.source,
    recordCount: archive.recordCount,
    records: archive.records,
  };
}

/** Export only the local physical-validation queue; this is not a full app backup. */
export async function createValidationQueueArchive({ storage, exportedAt = new Date().toISOString(), cryptoProvider = globalThis.crypto } = {}) {
  const loaded = readPhysicalValidationQueue(storage);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const payload = {
    archiveVersion: VALIDATION_QUEUE_ARCHIVE_VERSION,
    exportedAt,
    source: { queueKey: PHYSICAL_VALIDATION_QUEUE_KEY, queueVersion: PHYSICAL_VALIDATION_QUEUE_VERSION },
    recordCount: loaded.queue.length,
    records: loaded.queue,
  };
  const digest = await sha256(stableStringify(payload), cryptoProvider);
  if (!digest) return { ok: false, error: 'SHA256_UNAVAILABLE' };
  return {
    ok: true,
    archive: { ...payload, integrity: { algorithm: 'SHA-256', digest } },
    json: JSON.stringify({ ...payload, integrity: { algorithm: 'SHA-256', digest } }, null, 2),
  };
}

/** Verify schema, count, and digest before any restore is considered. */
export async function verifyValidationQueueArchive(input, { cryptoProvider = globalThis.crypto } = {}) {
  let archive;
  try { archive = typeof input === 'string' ? JSON.parse(input) : input; }
  catch { return { ok: false, error: 'ARCHIVE_JSON_INVALID' }; }
  if (!archive || archive.archiveVersion !== VALIDATION_QUEUE_ARCHIVE_VERSION) {
    return { ok: false, error: 'ARCHIVE_VERSION_UNSUPPORTED' };
  }
  if (!Array.isArray(archive.records) || archive.recordCount !== archive.records.length) {
    return { ok: false, error: 'ARCHIVE_RECORD_COUNT_MISMATCH' };
  }
  if (archive.integrity?.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/i.test(archive.integrity?.digest || '')) {
    return { ok: false, error: 'ARCHIVE_INTEGRITY_METADATA_INVALID' };
  }
  const digest = await sha256(stableStringify(archivePayload(archive)), cryptoProvider);
  if (!digest) return { ok: false, error: 'SHA256_UNAVAILABLE' };
  if (digest !== archive.integrity.digest) return { ok: false, error: 'ARCHIVE_HASH_MISMATCH' };
  return { ok: true, archive, verifiedDigest: digest, recordCount: archive.records.length };
}

/** Preview a verified archive against current storage without changing anything. */
export async function previewValidationQueueRestore(input, { storage, cryptoProvider = globalThis.crypto } = {}) {
  const verified = await verifyValidationQueueArchive(input, { cryptoProvider });
  if (!verified.ok) return verified;
  const loaded = readPhysicalValidationQueue(storage);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const existing = new Map(loaded.queue.map((item, index) => [recordId(item, index), item]));
  const additions = [];
  const identicalDuplicates = [];
  const conflicts = [];
  for (let index = 0; index < verified.archive.records.length; index += 1) {
    const item = verified.archive.records[index];
    const id = recordId(item, index);
    if (!existing.has(id)) { additions.push(item); continue; }
    if (stableStringify(existing.get(id)) === stableStringify(item)) identicalDuplicates.push(id);
    else conflicts.push(id);
  }
  return {
    ok: true,
    verifiedDigest: verified.verifiedDigest,
    archiveRecordCount: verified.recordCount,
    existingRecordCount: loaded.queue.length,
    additions: additions.length,
    identicalDuplicates,
    conflicts,
    canRestore: conflicts.length === 0,
  };
}

/** Restore verified new records only; existing records are never overwritten or deleted. */
export async function restoreValidationQueueArchive(input, { storage, cryptoProvider = globalThis.crypto } = {}) {
  const preview = await previewValidationQueueRestore(input, { storage, cryptoProvider });
  if (!preview.ok) return preview;
  if (preview.conflicts.length) return { ...preview, restored: false, error: 'RECORD_ID_CONFLICTS_REQUIRE_REVIEW' };
  const verified = await verifyValidationQueueArchive(input, { cryptoProvider });
  if (!verified.ok) return verified;
  const loaded = readPhysicalValidationQueue(storage);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const existingIds = new Set(loaded.queue.map((item, index) => recordId(item, index)));
  const additions = verified.archive.records.filter((item, index) => !existingIds.has(recordId(item, index)));
  const write = writePhysicalValidationQueue([...loaded.queue, ...additions], storage);
  if (!write.ok) return { ok: false, error: write.error, restored: false };
  return { ...preview, ok: true, restored: true, restoredCount: additions.length, finalRecordCount: write.count };
}
