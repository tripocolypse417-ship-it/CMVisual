import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Download, Plus, Radio, ShieldAlert } from 'lucide-react';
import {
  VICTIM_CATEGORIES,
  VICTIM_STATUSES,
  VICTIM_STORAGE_SCOPE,
  appendVictimObservation,
  buildVictimHandoff,
  captureVictimScanReference,
  createVictimRecord,
  loadVictimRecords,
  saveVictimRecords,
  summarizeVictimRecord,
} from '@/lib/victimEvidence';

const panel = 'rounded-xl border border-white/10 bg-black/35 p-3';
const field = 'w-full rounded-md border border-white/15 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-cyan-300/60';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 font-mono text-[9px] tracking-wider text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35';

function downloadHandoff(record) {
  const payload = buildVictimHandoff(record);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `waveradar-${record.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-evidence.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function VictimAssessmentPanel({ selectedDetection, incidentId }) {
  const [records, setRecords] = useState(() => loadVictimRecords());
  const [activeVictimId, setActiveVictimId] = useState('');
  const [category, setCategory] = useState('RESPIRATORY');
  const [status, setStatus] = useState('UNABLE_TO_ASSESS');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { saveVictimRecords(records); }, [records]);

  const activeRecord = useMemo(
    () => records.find((record) => record.victimId === activeVictimId) || null,
    [records, activeVictimId]
  );
  const selectedTrackId = String(selectedDetection?.trackId ?? selectedDetection?.id ?? '');
  const scanMatches = Boolean(activeRecord && selectedTrackId && activeRecord.trackId === selectedTrackId);
  const summary = activeRecord ? summarizeVictimRecord(activeRecord) : null;

  const updateRecord = (nextRecord) => {
    setRecords((current) => current.map((record) => record.victimId === nextRecord.victimId ? nextRecord : record));
    setError('');
  };

  const assignSelected = () => {
    if (!selectedDetection || !['human', 'person'].includes(String(selectedDetection.type || '').toLowerCase())) {
      setError('Select a person-classified track before assigning a victim record. Sensor-only unknowns are not automatically people.');
      return;
    }
    try {
      const record = createVictimRecord({ incidentId, selectedTrack: selectedDetection });
      setRecords((current) => [record, ...current].slice(0, 40));
      setActiveVictimId(record.victimId);
      setError('');
    } catch (e) { setError(e.message); }
  };

  const captureScan = () => {
    try { updateRecord(captureVictimScanReference(activeRecord, selectedDetection)); }
    catch (e) { setError(e.message); }
  };

  const addObservation = (event) => {
    event.preventDefault();
    try {
      updateRecord(appendVictimObservation(activeRecord, { category, status, note }));
      setNote('');
    } catch (e) { setError(e.message); }
  };

  const currentLabel = selectedDetection?.displayId || selectedDetection?.type || 'No selected track';

  return (
    <section className={panel} aria-label="Victim evidence and rescue handoff">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-cyan-200" />
          <div>
            <div className="font-mono text-[8px] tracking-[0.16em] text-cyan-100/55">WAVERADAR OS · WIS / VICTIM EVIDENCE</div>
            <h2 className="font-mono text-sm font-bold tracking-wider text-cyan-50">VICTIM ASSESSMENT RECORD</h2>
          </div>
        </div>
        <div className="text-right font-mono text-[8px] text-white/40">
          <div>SELECTED TRACK</div><div className="text-cyan-100">{currentLabel}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <div className="rounded-md border border-white/10 bg-black/25 p-2 font-mono text-[9px] text-white/55">
          Records are created only after an operator explicitly assigns a person track. No face recognition, identity inference, automatic injury diagnosis, or autonomous triage.
        </div>
        <button type="button" className={button} onClick={assignSelected} disabled={!selectedDetection}>
          <Plus className="h-3 w-3" /> ASSIGN SELECTED PERSON
        </button>
      </div>

      {records.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <select className={field} value={activeVictimId} onChange={(event) => setActiveVictimId(event.target.value)} aria-label="Active victim record">
            <option value="">Select a victim record</option>
            {records.map((record) => <option key={record.victimId} value={record.victimId}>{record.label} · {record.events.length} events</option>)}
          </select>
          {activeRecord && <button type="button" className={button} onClick={() => downloadHandoff(activeRecord)}><Download className="h-3 w-3" /> EXPORT HANDOFF</button>}
        </div>
      )}

      {activeRecord && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-white/10 p-2"><div className="font-mono text-[8px] text-white/40">OBSERVATIONS</div><div className="font-mono text-lg text-white">{summary.observationCount}</div></div>
            <div className="rounded-md border border-white/10 p-2"><div className="font-mono text-[8px] text-white/40">SCAN REFERENCES</div><div className="font-mono text-lg text-white">{summary.scanReferenceCount}</div></div>
            <div className="rounded-md border border-white/10 p-2"><div className="font-mono text-[8px] text-white/40">CONFLICTS</div><div className="font-mono text-lg text-amber-200">{summary.conflicts.length}</div></div>
            <div className="rounded-md border border-white/10 p-2"><div className="font-mono text-[8px] text-white/40">UNASSESSED CATEGORIES</div><div className="font-mono text-lg text-white">{summary.notAssessed.length}</div></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-cyan-300/15 bg-cyan-300/5 p-2">
            <div className="font-mono text-[9px] text-cyan-50/80"><Radio className="mr-1 inline h-3 w-3" /> Scan reference: {scanMatches ? 'selected track matches record' : 'select the linked track to capture'}</div>
            <button type="button" className={button} onClick={captureScan} disabled={!scanMatches}><Radio className="h-3 w-3" /> CAPTURE SCAN REFERENCE</button>
          </div>

          <form onSubmit={addObservation} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="font-mono text-[8px] text-white/55">OBSERVATION CATEGORY
              <select className={field} value={category} onChange={(event) => setCategory(event.target.value)}>
                {VICTIM_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="font-mono text-[8px] text-white/55">OBSERVATION STATUS
              <select className={field} value={status} onChange={(event) => setStatus(event.target.value)}>
                {VICTIM_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2 font-mono text-[8px] text-white/55">RESPONDER NOTE · OBSERVABLE FACTS ONLY
              <textarea className={field} rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Example: visible bleeding at left forearm; assessment limited by smoke." />
            </label>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[8px] text-white/35">Human-entered observation; not a diagnosis or severity score.</span>
              <button type="submit" className={button}><Plus className="h-3 w-3" /> APPEND OBSERVATION</button>
            </div>
          </form>

          {summary.conflicts.length > 0 && (
            <div className="rounded-md border border-amber-300/25 bg-amber-300/5 p-2">
              <div className="flex items-center gap-2 font-mono text-[9px] text-amber-100"><AlertTriangle className="h-3 w-3" /> CONTRADICTORY OBSERVATIONS — REVIEW REQUIRED</div>
              <div className="mt-1 font-mono text-[8px] text-amber-100/65">{summary.conflicts.map((item) => `${item.category}: ${item.statuses.join(' / ')}`).join(' · ')}</div>
              <div className="mt-1 font-mono text-[8px] text-white/45">Original events are retained. No averaging or automatic conflict resolution is performed.</div>
            </div>
          )}

          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-black/20 p-2">
            {[...activeRecord.events].reverse().map((event) => (
              <div key={event.eventId} className="border-b border-white/5 py-1.5 last:border-0">
                <div className="flex flex-wrap justify-between gap-2 font-mono text-[8px]">
                  <span className="text-cyan-100">{event.eventType}{event.category ? ` · ${event.category}` : ''}</span>
                  <span className="text-white/35">{new Date(event.observedAt).toLocaleString()}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-white/70">{event.note || event.status || event.source}</div>
                <div className="mt-0.5 font-mono text-[7px] text-white/35">{event.evidenceClass} · {event.source} · {event.modality || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div role="alert" className="mt-2 rounded-md border border-amber-300/25 bg-amber-300/5 p-2 font-mono text-[9px] text-amber-100">{error}</div>}

      <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300/20 bg-amber-300/5 p-2">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200" />
        <div className="font-mono text-[8px] leading-relaxed text-amber-100/70">
          {VICTIM_STORAGE_SCOPE} Do not enter names or other direct identifiers. This prototype does not provide secure clinical storage, medical diagnosis, validated triage, or treatment recommendations. Follow department protocols and obtain qualified EMS/clinical assessment.
        </div>
      </div>
    </section>
  );
}
