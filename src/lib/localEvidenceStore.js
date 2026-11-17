const DB_NAME = 'waveradar-evidence-v1';
const STORE_NAME = 'events';
const DELIVERY_STORE = 'deliveries';
const DB_VERSION = 2;

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
        if (!db.objectStoreNames.contains(DELIVERY_STORE)) {
          const delivery = db.createObjectStore(DELIVERY_STORE, { keyPath: 'sample_key' });
          delivery.createIndex('status', 'status', { unique: false });
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
 * Append event content once. Evidence records are never updated or deleted;
 * delivery state is tracked separately so retries cannot rewrite evidence.
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
    storage_state: 'LOCAL_PERSISTED',
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, DELIVERY_STORE], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const deliveries = tx.objectStore(DELIVERY_STORE);
    let added = false;
    tx.oncomplete = () => resolve({ added, sampleKey: record.sample_key });
    tx.onerror = () => reject(tx.error || new Error('INDEXED_DB_COMMIT_FAILED'));
    tx.onabort = () => reject(tx.error || new Error('INDEXED_DB_TRANSACTION_ABORTED'));
    const lookup = store.get(record.sample_key);
    lookup.onsuccess = () => {
      if (!lookup.result) {
        try {
          store.add(record);
          deliveries.put({
            sample_key: record.sample_key,
            status: 'PENDING',
            attempts: 0,
            updated_at: new Date().toISOString(),
            server_ack: null,
          });
          added = true;
        } catch (error) {
          reject(error);
          try { tx.abort(); } catch {}
        }
      } else {
        const deliveryLookup = deliveries.get(record.sample_key);
        deliveryLookup.onsuccess = () => {
          if (!deliveryLookup.result) {
            deliveries.put({
              sample_key: record.sample_key,
              status: 'PENDING',
              attempts: 0,
              updated_at: new Date().toISOString(),
              server_ack: null,
            });
          }
        };
      }
    };
    lookup.onerror = () => {
      reject(lookup.error || new Error('INDEXED_DB_LOOKUP_FAILED'));
      try { tx.abort(); } catch {}
    };
  });
}

export async function markLocalEvidenceDelivered(sampleKey, serverAck) {
  const db = await openEvidenceDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DELIVERY_STORE, 'readwrite');
    const store = tx.objectStore(DELIVERY_STORE);
    let found = false;
    tx.oncomplete = () => resolve(found);
    tx.onerror = () => reject(tx.error || new Error('INDEXED_DB_DELIVERY_UPDATE_FAILED'));
    tx.onabort = () => reject(tx.error || new Error('INDEXED_DB_DELIVERY_UPDATE_ABORTED'));
    const lookup = store.get(String(sampleKey));
    lookup.onsuccess = () => {
      const current = lookup.result;
      if (!current) return;
      found = true;
      store.put({
        ...current,
        status: 'ACKNOWLEDGED',
        attempts: Number(current.attempts || 0) + 1,
        updated_at: new Date().toISOString(),
        server_ack: serverAck || null,
      });
    };
    lookup.onerror = () => {
      reject(lookup.error || new Error('INDEXED_DB_DELIVERY_LOOKUP_FAILED'));
      try { tx.abort(); } catch {}
    };
  });
}

export async function listPendingLocalEvidenceEvents({ limit = 50 } = {}) {
  const db = await openEvidenceDb();
  const tx = db.transaction([STORE_NAME, DELIVERY_STORE], 'readonly');
  const [records, deliveries] = await Promise.all([
    requestResult(tx.objectStore(STORE_NAME).getAll()),
    requestResult(tx.objectStore(DELIVERY_STORE).getAll()),
  ]);
  const statusByKey = new Map(deliveries.map(item => [item.sample_key, item]));
  return records
    .filter(record => statusByKey.get(record.sample_key)?.status !== 'ACKNOWLEDGED')
    .sort((a, b) => String(a.received_at).localeCompare(String(b.received_at)))
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 50)));
}

export async function getLocalEvidenceStatus() {
  const db = await openEvidenceDb();
  const tx = db.transaction([STORE_NAME, DELIVERY_STORE], 'readonly');
  const [count, records, deliveries] = await Promise.all([
    requestResult(tx.objectStore(STORE_NAME).count()),
    requestResult(tx.objectStore(STORE_NAME).index('received_at').openCursor(null, 'prev')),
    requestResult(tx.objectStore(DELIVERY_STORE).getAll()),
  ]);
  const pending = deliveries.filter(item => item.status !== 'ACKNOWLEDGED').length;
  return {
    available: true,
    count,
    pending,
    newestReceivedAt: records?.value?.received_at || null,
    storage: 'INDEXED_DB_LOCAL_ONLY',
    remoteIngestion: pending ? 'PENDING' : 'SYNCED',
  };
}

export async function listLocalEvidenceEvents({ limit = 100 } = {}) {
  const db = await openEvidenceDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const records = await requestResult(tx.objectStore(STORE_NAME).getAll());
  return records
    .sort((a, b) => String(a.received_at).localeCompare(String(b.received_at)))
    .slice(-Math.max(1, Math.min(1000, Number(limit) || 100)));
}
