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

async function recordMatches(existing, incoming, cryptoProvider) {
  if (stableStringify(existing) === stableStringify(incoming)) return true;
  if (!existing?.restoredFromArchive || !/^[a-f0-9]{64}$/i.test(existing.archiveSourceRecordSha256 || '')) return false;
  const digest = await sha256(stableStringify(incoming), cryptoProvider);
  return !!digest && digest === existing.archiveSourceRecordSha256;
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
  if (archive.source?.queueKey !== PHYSICAL_VALIDATION_QUEUE_KEY ||
      archive.source?.queueVersion !== PHYSICAL_VALIDATION_QUEUE_VERSION) {
    return { ok: false, error: 'ARCHIVE_SOURCE_MISMATCH' };
  }
  if (typeof archive.exportedAt !== 'string' || !Number.isFinite(Date.parse(archive.exportedAt))) {
    return { ok: false, error: 'ARCHIVE_TIMESTAMP_INVALID' };
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
  const archiveSeen = new Map();
  const additions = [];
  const identicalDuplicates = [];
  const conflicts = [];
  for (let index = 0; index < verified.archive.records.length; index += 1) {
    const item = verified.archive.records[index];
    const id = recordId(item, index);
    if (existing.has(id)) {
      if (await recordMatches(existing.get(id), item, cryptoProvider)) identicalDuplicates.push(id);
      else conflicts.push(id);
      continue;
    }
    if (archiveSeen.has(id)) {
      if (stableStringify(archiveSeen.get(id)) === stableStringify(item)) identicalDuplicates.push(id);
      else conflicts.push(id);
      continue;
    }
    archiveSeen.set(id, item);
    additions.push(item);
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
  const existing = new Map(loaded.queue.map((item, index) => [recordId(item, index), item]));
  const archiveSeen = new Map();
  const additions = [];
  const conflicts = [];
  const identicalDuplicates = [];
  for (let index = 0; index < verified.archive.records.length; index += 1) {
    const item = verified.archive.records[index];
    const id = recordId(item, index);
    if (existing.has(id)) {
      if (await recordMatches(existing.get(id), item, cryptoProvider)) identicalDuplicates.push(id);
      else conflicts.push(id);
      continue;
    }
    if (archiveSeen.has(id)) {
      if (stableStringify(archiveSeen.get(id)) === stableStringify(item)) identicalDuplicates.push(id);
      else conflicts.push(id);
      continue;
    }
    archiveSeen.set(id, item);
    additions.push(item);
  }
  if (conflicts.length) {
    return {
      ...preview,
      identicalDuplicates,
      conflicts: [...new Set(conflicts)],
      canRestore: false,
      restored: false,
      error: 'RECORD_ID_CONFLICTS_REQUIRE_REVIEW',
    };
  }
  const quarantinedAdditions = [];
  for (const item of additions) {
    const sourceDigest = await sha256(stableStringify(item), cryptoProvider);
    if (!sourceDigest) return { ...preview, ok: false, restored: false, error: 'SHA256_UNAVAILABLE' };
    quarantinedAdditions.push({
      ...item,
      quarantined: true,
      quarantineReason: 'ARCHIVE_RESTORE_REVIEW_REQUIRED',
      restoredFromArchive: true,
      archiveSourceRecordSha256: sourceDigest,
    });
  }
  // Re-read and reconcile synchronously after all asynchronous hashing, immediately
  // before setItem, so a concurrent writer cannot slip in during digest generation.
  const finalLoaded = readPhysicalValidationQueue(storage);
  if (!finalLoaded.ok) return { ok: false, error: finalLoaded.error, restored: false };
  const finalExisting = new Map(finalLoaded.queue.map((item, index) => [recordId(item, index), item]));
  const finalAdditions = [];
  const finalConflicts = [];
  const finalDuplicates = [];
  for (let index = 0; index < additions.length; index += 1) {
    const sourceItem = additions[index];
    const restoredItem = quarantinedAdditions[index];
    const id = recordId(sourceItem, index);
    if (!finalExisting.has(id)) {
      finalAdditions.push(restoredItem);
      continue;
    }
    const current = finalExisting.get(id);
    if (stableStringify(current) === stableStringify(sourceItem) ||
        (current?.restoredFromArchive && current.archiveSourceRecordSha256 === restoredItem.archiveSourceRecordSha256)) {
      finalDuplicates.push(id);
    } else {
      finalConflicts.push(id);
    }
  }
  if (finalConflicts.length) {
    return {
      ...preview,
      identicalDuplicates: [...preview.identicalDuplicates, ...finalDuplicates],
      conflicts: [...new Set(finalConflicts)],
      canRestore: false,
      restored: false,
      error: 'RECORD_ID_CONFLICTS_REQUIRE_REVIEW',
    };
  }
  const write = writePhysicalValidationQueue([...finalLoaded.queue, ...finalAdditions], storage);
  if (!write.ok) return { ok: false, error: write.error, restored: false };
  return {
    ...preview,
    identicalDuplicates: [...preview.identicalDuplicates, ...finalDuplicates],
    ok: true,
    restored: true,
    restoredCount: finalAdditions.length,
    quarantinedCount: finalAdditions.length,
    finalRecordCount: write.count,
  };
}
