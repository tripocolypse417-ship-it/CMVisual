/**
 * WaveRadar offline event journal (browser/Capacitor IndexedDB).
 * Event payloads must contain only authorized, minimized observations.
 * Persistence is local; transport, encryption-at-rest and retention policies
 * must be provided by the deployment before sensitive production use.
 */
const DB_NAME = 'waveradar-offline-events';
const STORE = 'events';
const DB_VERSION = 1;
function database() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('status', 'status');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction(mode, operation) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      try { result = operation(store); } catch (error) { reject(error); tx.abort(); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } finally { db.close(); }
}
export function validateObservation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Observation must be an object');
  if (!['measured', 'derived', 'inferred', 'simulated'].includes(input.evidenceClass)) throw new TypeError('Invalid evidence class');
  if (typeof input.source !== 'string' || !input.source.trim()) throw new TypeError('Missing source');
  if (typeof input.incidentId !== 'string' || !input.incidentId.trim()) throw new TypeError('Missing incident ID');
  if (input.evidenceClass !== 'simulated' && !input.calibrationVersion) throw new TypeError('Calibration provenance required');
  return true;
}
export async function appendObservation(input) {
  validateObservation(input);
  const id = crypto.randomUUID();
  const record = {
    id, incidentId: input.incidentId, source: input.source,
    evidenceClass: input.evidenceClass, calibrationVersion: input.calibrationVersion ?? null,
    uncertainty: input.uncertainty ?? null, coordinateFrame: input.coordinateFrame ?? 'device',
    payload: input.payload ?? null, timestamp: new Date().toISOString(),
    status: 'pending', attempts: 0
  };
  await transaction('readwrite', store => store.add(record));
  return id;
}
export async function pendingObservations(limit = 100) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new RangeError('Invalid limit');
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).index('status').getAll('pending', limit);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}
export async function acknowledgeObservation(id) {
  if (!id) throw new TypeError('Missing event ID');
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        if (!req.result) return;
        store.put({ ...req.result, status: 'acknowledged' });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
/**
 * send(record) must resolve only after server-side durable acceptance.
 * The server must deduplicate on record.id; retries may repeat requests.
 */
export async function synchronizeObservations(send, limit = 100) {
  if (typeof send !== 'function') throw new TypeError('send must be a function');
  const batch = await pendingObservations(limit);
  let acknowledged = 0;
  for (const record of batch) {
    try {
      const receipt = await send(record);
      if (!receipt || receipt.id !== record.id || receipt.accepted !== true) break;
      await acknowledgeObservation(record.id);
      acknowledged++;
    } catch { break; }
  }
  return { attempted: batch.length, acknowledged, remainingInBatch: batch.length - acknowledged };
}
