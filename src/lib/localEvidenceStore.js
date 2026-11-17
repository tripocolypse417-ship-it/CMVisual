const DB_NAME = 'waveradar-evidence-v1';
const STORE_NAME = 'events';
const DELIVERY_STORE = 'deliveries';
const DB_VERSION = 3;

let dbPromise;

function openEvidenceDb() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('INDEXED_DB_UNAVAILABLE'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (upgrade) => {
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
        // Upgrade old local-only event records into the delivery queue without
        // modifying their immutable evidence envelopes.
        if (upgrade.oldVersion < 3) {
          const events = upgrade.target.transaction.objectStore(STORE_NAME);
          const deliveries = upgrade.target.transaction.objectStore(DELIVERY_STORE);
          const cursor = events.openCursor();
          cursor.onsuccess = () => {
            const current = cursor.result;
            if (!current) return;
            const lookup = deliveries.get(current.value.sample_key);
            lookup.onsuccess = () => {
              if (!lookup.result) {
                deliveries.put({
                  sample_key: current.value.sample_key,
                  status: 'PENDING',
                  attempts: 0,
                  updated_at: new Date().toISOString(),
                  server_ack: null,
                });
              }
              current.continue();
            };
          };
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
      const ensurePending = () => {
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
      };
      if (!lookup.result) {
        try {
          store.add(record);
          added = true;
          ensurePending();
        } catch (error) {
          reject(error);
          try { tx.abort(); } catch {}
        }
      } else {
        ensurePending();
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
        status: serverAck?.status === 'QUARANTINED' ? 'QUARANTINED' : 'ACKNOWLEDGED',
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
  const max = Math.max(1, Math.min(100, Number(limit) || 50));
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, DELIVERY_STORE], 'readonly');
    const events = tx.objectStore(STORE_NAME);
    const deliveries = tx.objectStore(DELIVERY_STORE);
    const records = [];
    tx.oncomplete = () => resolve(records);
    tx.onerror = () => reject(tx.error || new Error('INDEXED_DB_PENDING_READ_FAILED'));
    const cursor = deliveries.index('status').openCursor('PENDING');
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current || records.length >= max) return;
      const lookup = events.get(current.value.sample_key);
      lookup.onsuccess = () => {
        if (lookup.result) records.push(lookup.result);
        current.continue();
      };
      lookup.onerror = () => {
        reject(lookup.error || new Error('INDEXED_DB_PENDING_EVENT_LOOKUP_FAILED'));
        try { tx.abort(); } catch {}
      };
    };
    cursor.onerror = () => {
      reject(cursor.error || new Error('INDEXED_DB_PENDING_CURSOR_FAILED'));
      try { tx.abort(); } catch {}
    };
  });
}

export async function getLocalEvidenceStatus() {
  const db = await openEvidenceDb();
  const tx = db.transaction([STORE_NAME, DELIVERY_STORE], 'readonly');
  const events = tx.objectStore(STORE_NAME);
  const deliveries = tx.objectStore(DELIVERY_STORE);
  const [count, pending, quarantined, newest] = await Promise.all([
    requestResult(events.count()),
    requestResult(deliveries.index('status').count('PENDING')),
    requestResult(deliveries.index('status').count('QUARANTINED')),
    requestResult(events.index('received_at').openCursor(null, 'prev')),
  ]);
  return {
    available: true,
    count,
    pending,
    quarantined,
    newestReceivedAt: newest?.value?.received_at || null,
    storage: 'INDEXED_DB_LOCAL_ONLY',
    remoteIngestion: pending ? 'PENDING' : quarantined ? 'QUARANTINED' : 'SYNCED',
  };
}

export async function listLocalEvidenceEvents({ limit = 100 } = {}) {
  const db = await openEvidenceDb();
  const max = Math.max(1, Math.min(1000, Number(limit) || 100));
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const records = [];
    tx.oncomplete = () => resolve(records.reverse());
    tx.onerror = () => reject(tx.error || new Error('INDEXED_DB_EVIDENCE_READ_FAILED'));
    const cursor = store.index('received_at').openCursor(null, 'prev');
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current || records.length >= max) return;
      records.push(current.value);
      current.continue();
    };
    cursor.onerror = () => reject(cursor.error || new Error('INDEXED_DB_EVIDENCE_CURSOR_FAILED'));
  });
}
