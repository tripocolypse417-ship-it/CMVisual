const DB_NAME = 'waveradar-evidence-v1';
const STORE_NAME = 'events';
const DB_VERSION = 1;

let dbPromise;

function openEvidenceDb() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('INDEXED_DB_UNAVAILABLE'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'sample_key' });
          store.createIndex('received_at', 'received_at', { unique: false });
          store.createIndex('event_id', 'event.event_id', { unique: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('INDEXED_DB_OPEN_FAILED'));
      request.onblocked = () => reject(new Error('INDEXED_DB_UPGRADE_BLOCKED'));
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('INDEXED_DB_REQUEST_FAILED'));
  });
}

/**
 * Append once by deterministic source-sample key. Existing records are never
 * overwritten or deleted. A storage failure is returned to the caller.
 */
export async function appendLocalEvidenceEvent(event, sampleKey) {
  if (!event || typeof event !== 'object' || !event.event_id || !sampleKey) {
    throw new TypeError('event and deterministic sampleKey are required');
  }
  const db = await openEvidenceDb();
  const record = {
    sample_key: String(sampleKey),
    event,
    received_at: event.timing?.received_at || new Date().toISOString(),
    stored_at: new Date().toISOString(),
    storage_state: 'LOCAL_DURABLE',
  };
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  let added = false;
  const existing = await requestResult(store.get(record.sample_key));
  if (!existing) {
    await requestResult(store.add(record));
    added = true;
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('INDEXED_DB_COMMIT_FAILED'));
    tx.onabort = () => reject(tx.error || new Error('INDEXED_DB_TRANSACTION_ABORTED'));
  });
  return { added, sampleKey: record.sample_key };
}

export async function getLocalEvidenceStatus() {
  const db = await openEvidenceDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const [count, newest] = await Promise.all([
    requestResult(store.count()),
    requestResult(store.index('received_at').openCursor(null, 'prev')),
  ]);
  return {
    available: true,
    count,
    newestReceivedAt: newest?.value?.received_at || null,
    storage: 'INDEXED_DB_LOCAL_ONLY',
    remoteIngestion: 'NOT_CONNECTED',
  };
}

export async function listLocalEvidenceEvents({ limit = 100 } = {}) {
  const db = await openEvidenceDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const records = await requestResult(store.getAll());
  return records.slice(-Math.max(1, Math.min(1000, Number(limit) || 100)));
}
