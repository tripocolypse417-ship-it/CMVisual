import { createHash } from 'node:crypto';
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const GENESIS = '0'.repeat(64);
const HASH_RE = /^[a-f0-9]{64}$/;

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function digest(entry) {
  return createHash('sha256').update(canonical(entry)).digest('hex');
}

/**
 * Verify an append-only JSONL evidence journal. A malformed final line is
 * reported as an incomplete write; earlier corruption always fails closed.
 */
export async function verifyEvidenceLedger(path) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { valid: true, entries: 0, headHash: GENESIS, incompleteTail: false };
    throw error;
  }
  const lines = raw.split('\n');
  const incompleteTail = lines.at(-1) !== '';
  if (incompleteTail) lines.pop();
  else lines.pop();

  let previousHash = GENESIS;
  let sequence = 0;
  for (const line of lines) {
    if (!line) throw new Error('Evidence ledger contains an empty record');
    let record;
    try { record = JSON.parse(line); } catch { throw new Error('Evidence ledger contains invalid JSON'); }
    const { hash, ...payload } = record;
    if (!HASH_RE.test(hash || '') || payload.previousHash !== previousHash) {
      throw new Error(`Evidence ledger chain break at sequence ${sequence + 1}`);
    }
    if (payload.sequence !== sequence + 1 || digest(payload) !== hash) {
      throw new Error(`Evidence ledger integrity failure at sequence ${sequence + 1}`);
    }
    previousHash = hash;
    sequence += 1;
  }
  return { valid: true, entries: sequence, headHash: previousHash, incompleteTail };
}

/**
 * Append one immutable event. The caller must provide a single-writer
 * discipline (e.g. one journal writer per partition); this module refuses
 * to imply multi-process transactional guarantees that plain JSONL cannot
 * provide. Use a transactional database adapter when concurrent writers
 * are required.
 */
export async function appendEvidenceEvent(path, event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new TypeError('event must be an object');
  }
  if (typeof event.eventId !== 'string' || !event.eventId.trim()) {
    throw new TypeError('event.eventId is required');
  }
  if (typeof event.eventType !== 'string' || !event.eventType.trim()) {
    throw new TypeError('event.eventType is required');
  }
  if (typeof event.recordedAt !== 'string' || !Number.isFinite(Date.parse(event.recordedAt))) {
    throw new TypeError('event.recordedAt must be a valid timestamp');
  }
  const current = await verifyEvidenceLedger(path);
  if (current.incompleteTail) {
    throw new Error('Evidence ledger has an incomplete trailing write; recover or quarantine before appending');
  }
  const existing = await readFile(path, 'utf8').catch(error => error.code === 'ENOENT' ? '' : Promise.reject(error));
  if (existing.split('\n').filter(Boolean).some(line => JSON.parse(line).eventId === event.eventId)) {
    throw new Error('Duplicate evidence eventId');
  }
  const payload = {
    sequence: current.entries + 1,
    previousHash: current.headHash,
    eventId: event.eventId,
    eventType: event.eventType,
    recordedAt: event.recordedAt,
    provenance: event.provenance ?? null,
    dataClassification: event.dataClassification ?? 'INTERNAL',
    payload: event.payload ?? null,
  };
  const record = { ...payload, hash: digest(payload) };
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, JSON.stringify(record) + '\n', { encoding: 'utf8', flag: 'a', mode: 0o600 });
  return record;
}
