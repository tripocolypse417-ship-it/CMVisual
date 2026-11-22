/**
 * Isolated, local-assets-only WaveRadar research harness. No cloud upload.
 * Records are held in this test app's own WebView IndexedDB (not native SQLite).
 * Neither local hashes nor sensor presence establish physical validation.
 */
import React, { useEffect, useState } from 'react';
import { getNativeSensorCapabilities, getNativeSensorSnapshot } from './lib/nativeSensors';

const DATABASE = 'waveradar-isolated-field-test-v1';
const STORE = 'originals';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Cannot open local journal'));
  });
}

async function writeOriginal(record) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Local journal write failed'));
      tx.onabort = () => reject(tx.error || new Error('Local journal write aborted'));
    });
  } finally { db.close(); }
}

async function loadOriginals() {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Local journal read failed'));
    });
  } finally { db.close(); }
}

async function checksum(value) {
  if (!crypto?.subtle) throw new Error('Secure WebCrypto unavailable; refusing unsealed capture');
  const data = new TextEncoder().encode(JSON.stringify(value));
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
}

export default function FieldTestApp() {
  const [online, setOnline] = useState(navigator.onLine);
  const [records, setRecords] = useState([]);
  const [problem, setProblem] = useState('');
  const [working, setWorking] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [note, setNote] = useState('');
  const [exportText, setExportText] = useState('');
  const [integrity, setIntegrity] = useState('NOT_CHECKED');

  async function refresh() {
    const restored = await loadOriginals();
    const verification = await Promise.all(restored.map(async row =>
      (await checksum(row.original)) === row.sha256
    ));
    setRecords(restored);
    setIntegrity(verification.every(Boolean) ? 'CHECKSUM_MATCH_ONLY' : 'CHECKSUM_MISMATCH');
  }

  useEffect(() => {
    const onLine = () => setOnline(navigator.onLine);
    window.addEventListener('online', onLine);
    window.addEventListener('offline', onLine);
    refresh().catch(error => setProblem(error.message));
    getNativeSensorCapabilities().then(setCapabilities).catch(() => {});
    return () => {
      window.removeEventListener('online', onLine);
      window.removeEventListener('offline', onLine);
    };
  }, []);

  async function append(kind) {
    setWorking(true);
    setProblem('');
    try {
      let payload;
      let evidenceClass = 'UNKNOWN';
      let sampleStatus = 'NOT_APPLICABLE';
      if (kind === 'NATIVE_SENSOR_SNAPSHOT') {
        const snapshot = await getNativeSensorSnapshot();
        if (!snapshot || !snapshot.measurements) throw new Error('Native sensor bridge unavailable; nothing was recorded');
        const samples = Object.values(snapshot.measurements).filter(item =>
          Array.isArray(item?.values) && item.values.length > 0 &&
          item.values.every(value => typeof value === 'number' && Number.isFinite(value))
        );
        if (!samples.length) throw new Error('No actual native sensor samples received yet; nothing was recorded');
        const fresh = samples.filter(item => Number.isFinite(item.ageMs) && item.ageMs >= 0 && item.ageMs <= 5000);
        evidenceClass = 'MEASURED';
        sampleStatus = fresh.length ? 'AT_LEAST_ONE_RECENT_SAMPLE' : 'STALE_OR_AGE_UNKNOWN';
        payload = snapshot;
      } else {
        if (!note.trim()) throw new Error('Enter a manual test note first');
        payload = { note: note.trim() };
        sampleStatus = 'HUMAN_ANNOTATION_UNVERIFIED';
      }
      const original = {
        id: crypto.randomUUID(),
        incidentId: 'isolated-field-test',
        kind,
        capturedAt: new Date().toISOString(),
        sourceClockDomain: 'DEVICE_RECEIPT_UTC',
        source: kind === 'NATIVE_SENSOR_SNAPSHOT' ? 'Android SensorManager bridge' : 'manual operator',
        evidenceClass,
        integrityState: 'UNASSESSED',
        validationState: 'NOT_INDEPENDENTLY_VALIDATED',
        spatialPoseState: 'UNAVAILABLE',
        sampleStatus,
        payload,
      };
      await writeOriginal({ id: original.id, original, sha256: await checksum(original) });
      setNote('');
      await refresh();
    } catch (error) { setProblem(error?.message || 'Capture failed'); }
    finally { setWorking(false); }
  }

  async function exportBundle() {
    setProblem('');
    try {
      const originals = await loadOriginals();
      const bundle = JSON.stringify({
        kind: 'WAVERADAR_ISOLATED_RESEARCH_EXPORT',
        disclaimer: 'Unvalidated local WebView evidence. NOT independent ground truth or field-ready.',
        exportedAt: new Date().toISOString(),
        records: originals,
      }, null, 2);
      setExportText(bundle);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bundle);
      }
    } catch (error) { setProblem('Export preparation failed: ' + error.message); }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="border-b border-slate-700 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Research-only isolated build</p>
          <h1 className="mt-2 text-2xl font-bold">WaveRadar Field Test</h1>
          <p className="mt-2 text-sm text-slate-300">Local assets. No account or server required. No rescue guidance or spatial positioning.</p>
        </header>
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
          <p>Network: <strong>{online ? 'ONLINE (not synced)' : 'OFFLINE'}</strong></p>
          <p>Local captured originals: <strong>{records.length}</strong></p>
          <p>Local content checksum: <strong>{integrity}</strong></p>
          <p className="text-xs text-amber-200">Storage: isolated WebView IndexedDB, not native encrypted SQLite. Checksum match does not mean calibrated or independently verified.</p>
        </section>
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Collect research evidence</h2>
          <button className="w-full rounded-lg bg-cyan-700 p-3 font-semibold disabled:opacity-50" disabled={working} onClick={() => append('NATIVE_SENSOR_SNAPSHOT')}>Capture actual native sensor snapshot</button>
          <label className="block text-sm" htmlFor="field-note">Manual test annotation</label>
          <textarea id="field-note" className="w-full rounded-lg bg-slate-800 p-3 text-white" rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="Example: manually marked door, unverified" />
          <button className="w-full rounded-lg border border-slate-500 p-3 disabled:opacity-50" disabled={working} onClick={() => append('MANUAL_ANNOTATION')}>Save manual annotation</button>
          <button className="w-full rounded-lg border border-cyan-500 p-3" onClick={() => refresh().catch(error => setProblem(error.message))}>Reopen journal / verify checksums</button>
          {problem && <p role="alert" className="text-sm text-rose-300">{problem}</p>}
        </section>
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
          <h2 className="text-lg font-semibold">Device capability facts</h2>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">{capabilities ? JSON.stringify(capabilities, null, 2) : 'Native capability report unavailable or loading'}</pre>
          <p className="text-xs text-slate-400">Hardware support, permission, registration, samples, freshness, calibration, and physical validation are distinct states. No ARCore pose is assumed.</p>
        </section>
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
          <h2 className="text-lg font-semibold">Preserve and export</h2>
          <button className="w-full rounded-lg border border-emerald-500 p-3" onClick={exportBundle}>Prepare evidence export (copy if permitted)</button>
          {exportText && <textarea aria-label="Evidence JSON export" readOnly value={exportText} rows={6} className="w-full rounded-lg bg-slate-800 p-2 text-xs text-slate-100" />}
          <p className="text-xs text-slate-400">Originals are not cleared automatically. Export may contain sensitive annotations: share only with authorized reviewers. This build makes no server upload.</p>
        </section>
      </div>
    </main>
  );
}
