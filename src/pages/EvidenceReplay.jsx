import { useEffect, useMemo, useState } from 'react';
import EvidenceSceneCanvas from '@/components/EvidenceSceneCanvas';
import { nativeEvidenceStore } from '@/lib/nativeEvidenceStore';
import { createEvidenceJournalRepository } from '@/lib/evidenceJournalRepository';
import { buildSynchronizedEvidenceScene } from '@/lib/evidenceSceneReplay';

const repository = createEvidenceJournalRepository(nativeEvidenceStore);
const formatTime = value => value == null ? 'TIME UNKNOWN' : new Date(value).toLocaleTimeString();
const formatDateTime = value => value == null ? 'TIME UNKNOWN' : new Date(value).toLocaleString();

export default function EvidenceReplay() {
  const [incidents, setIncidents] = useState([]);
  const [incidentId, setIncidentId] = useState('');
  const [ledger, setLedger] = useState(null);
  const [clockDomain, setClockDomain] = useState('');
  const [cursorMs, setCursorMs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState('CHECKING LOCAL EVIDENCE STORE');
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let active = true;
    repository.listIncidents().then(result => {
      if (!active) return;
      if (!result.available) {
        setStatus('NATIVE LOCAL JOURNAL UNAVAILABLE · OPEN THIS VIEW IN THE ANDROID APP');
        return;
      }
      const rows = Array.isArray(result.incidents) ? result.incidents : [];
      setIncidents(rows);
      setStatus(rows.length ? 'LOCAL JOURNAL READY' : 'NO LOCAL INCIDENT RECORDS');
      if (rows[0]?.incidentId) setIncidentId(rows[0].incidentId);
    }).catch(error => {
      if (active) setStatus('LOCAL JOURNAL ERROR · ' + (error?.message || 'UNKNOWN'));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!incidentId) {
      setLedger(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setPlaying(false);
    repository.loadIncident(incidentId).then(result => {
      if (!active) return;
      if (!result.available || !result.ledger) {
        setLedger(null);
        setStatus('LOCAL JOURNAL COULD NOT BE READ');
        return;
      }
      setLedger(result.ledger);
      setHasMore(result.hasMore);
      const domains = [...new Set(result.ledger.events.filter(event => event.capturedAt != null && event.clockDomain).map(event => event.clockDomain))];
      const firstDomain = domains[0] || '';
      setClockDomain(firstDomain);
      const times = result.ledger.events.filter(event => event.clockDomain === firstDomain && event.capturedAt != null).map(event => event.capturedAt);
      setCursorMs(times.length ? Math.max(...times) : null);
      setStatus(`LOADED ${result.loadedCount} EVENT(S)${result.hasMore ? ' · LOAD LIMIT REACHED' : ''}`);
    }).catch(error => {
      if (active) setStatus('READ ERROR · ' + (error?.message || 'UNKNOWN'));
      setLedger(null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [incidentId]);

  const domainEvents = useMemo(() => ledger?.events.filter(event =>
    event.clockDomain === clockDomain && event.capturedAt != null
  ).sort((a, b) => a.capturedAt - b.capturedAt || (a.sequence ?? 0) - (b.sequence ?? 0)) ?? [], [ledger, clockDomain]);
  const minTime = domainEvents.length ? domainEvents[0].capturedAt : 0;
  const maxTime = domainEvents.length ? domainEvents[domainEvents.length - 1].capturedAt : 0;
  const safeCursor = cursorMs == null ? (domainEvents.length ? maxTime : null) : Math.max(minTime, Math.min(maxTime, cursorMs));

  const scene = useMemo(() => {
    if (!ledger || !clockDomain || safeCursor == null) return null;
    try {
      return buildSynchronizedEvidenceScene(ledger, {
        incidentId, clockDomain, cursorMs: safeCursor,
        command: {}, helmet: {},
      });
    } catch {
      return null;
    }
  }, [ledger, incidentId, clockDomain, safeCursor]);

  useEffect(() => {
    if (!playing || !domainEvents.length) return undefined;
    const timer = window.setInterval(() => {
      setCursorMs(current => {
        const next = (current ?? minTime) + 500;
        if (next >= maxTime) {
          setPlaying(false);
          return maxTime;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, minTime, maxTime, domainEvents.length]);

  const selectIncident = value => {
    setIncidentId(value);
    setLedger(null);
    setCursorMs(null);
  };

  const step = direction => setCursorMs(current => Math.max(minTime, Math.min(maxTime, (current ?? maxTime) + direction * 1000)));

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-xl border border-cyan-900/50 bg-slate-900 p-4">
          <div className="text-[10px] tracking-[0.25em] text-cyan-300">WAVERADAR · INCIDENT REPLAY</div>
          <h1 className="mt-2 text-2xl font-semibold">Evidence-backed scene reconstruction</h1>
          <p className="mt-2 max-w-3xl text-xs text-slate-400">Replay reads the local evidence journal. It displays only explicitly registered scene geometry; unlocated, untimed, conflicting and unaligned evidence remains visible separately.</p>
          <div className="mt-3 font-mono text-[10px] text-emerald-300">{status}</div>
        </header>

        <section className="grid gap-3 rounded-xl border border-white/10 bg-slate-900 p-4 md:grid-cols-3">
          <label className="text-xs text-slate-300">INCIDENT / CAPTURE SESSION
            <select value={incidentId} onChange={event => selectIncident(event.target.value)} className="mt-1 block w-full rounded border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="">Select local incident</option>
              {incidents.map(item => <option key={item.incidentId} value={item.incidentId}>{item.incidentId} · {item.eventCount} events</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-300">CAPTURE CLOCK DOMAIN
            <select value={clockDomain} onChange={event => { setClockDomain(event.target.value); setPlaying(false); }} className="mt-1 block w-full rounded border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="">Select clock domain</option>
              {[...new Set(ledger?.events.filter(event => event.capturedAt != null && event.clockDomain).map(event => event.clockDomain) ?? [])].map(domain => <option key={domain} value={domain}>{domain}</option>)}
            </select>
          </label>
          <div className="text-xs text-slate-300">REPLAY STATE
            <div className="mt-1 rounded border border-white/10 bg-slate-950 px-3 py-2 font-mono text-xs">{loading ? 'LOADING' : scene?.snapshot.state || 'WAITING FOR DATA'}</div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-2">
            <EvidenceSceneCanvas entities={scene?.snapshot.entities ?? []} />
            <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-xs text-cyan-200">TIME CURSOR · {formatDateTime(safeCursor)}</div>
                <div className="flex gap-2">
                  <button onClick={() => step(-1)} disabled={!domainEvents.length} className="rounded border border-white/15 px-3 py-2 text-xs disabled:opacity-30">−1s</button>
                  <button onClick={() => setPlaying(value => !value)} disabled={!domainEvents.length} className="rounded border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200 disabled:opacity-30">{playing ? 'PAUSE' : 'PLAY'}</button>
                  <button onClick={() => step(1)} disabled={!domainEvents.length} className="rounded border border-white/15 px-3 py-2 text-xs disabled:opacity-30">+1s</button>
                </div>
              </div>
              <input aria-label="Incident replay time cursor" type="range" min={minTime} max={Math.max(minTime, maxTime)} step="1" value={safeCursor ?? minTime} onChange={event => { setPlaying(false); setCursorMs(Number(event.target.value)); }} disabled={!domainEvents.length} className="mt-3 w-full accent-cyan-400" />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500"><span>{formatTime(domainEvents.length ? minTime : null)}</span><span>{domainEvents.length} timed events in selected domain</span><span>{formatTime(domainEvents.length ? maxTime : null)}</span></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
              <div className="text-xs font-semibold text-cyan-200">SHARED COMMAND / HELMET STATE</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-950 p-2"><div className="text-[10px] text-slate-500">COMMAND PROJECTION</div><div>{scene?.command.entities.length ?? 0} registered entities</div></div>
                <div className="rounded bg-slate-950 p-2"><div className="text-[10px] text-slate-500">HELMET PROJECTION</div><div>{scene?.helmet.entities.length ?? 0} registered entities</div></div>
              </div>
              <div className="mt-2 break-all font-mono text-[9px] text-slate-500">SYNC: {scene?.synchronized ? 'MATCHED' : 'NOT AVAILABLE'} · {scene?.command.synchronizationKey || '—'}</div>
              <div className="mt-1 text-[10px] text-amber-200">Projection contract only · not a live helmet connection</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
              <div className="text-xs font-semibold text-cyan-200">EVIDENCE AT CURSOR</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>Entities: {scene?.snapshot.entities.length ?? 0}</div>
                <div>Hypotheses: {scene?.snapshot.hypotheses.length ?? 0}</div>
                <div>Conflicts: {scene?.snapshot.conflicts.length ?? 0}</div>
                <div>Untimed: {scene?.snapshot.untimedEvents.length ?? 0}</div>
                <div>Other clocks: {scene?.snapshot.unalignedClockEvents.length ?? 0}</div>
                <div>Unlocated: {scene?.command.unlocatedEntityCount ?? 0}</div>
              </div>
              {hasMore && <div className="mt-2 text-[10px] text-amber-200">Journal read limit reached; this view is partial.</div>}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900 p-3">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-semibold text-cyan-200">SOURCE EVIDENCE TIMELINE</h2><span className="text-[10px] text-slate-500">{ledger?.events.length ?? 0} loaded events</span></div>
          <div className="max-h-[420px] space-y-1 overflow-auto">
            {(ledger?.events ?? []).slice().sort((a, b) => (a.receivedAt ?? Infinity) - (b.receivedAt ?? Infinity)).map(event => (
              <button key={event.eventId} onClick={() => {
                if (event.clockDomain && event.capturedAt != null) {
                  setClockDomain(event.clockDomain);
                  setCursorMs(event.capturedAt);
                  setPlaying(false);
                }
              }} className="grid w-full grid-cols-[1fr_auto] gap-2 rounded border border-white/5 bg-slate-950/70 p-2 text-left">
                <span className="min-w-0"><span className="block truncate text-xs">{event.eventType} · {event.sourceId || 'SOURCE UNKNOWN'}</span><span className="block truncate font-mono text-[9px] text-slate-500">{event.eventId}</span></span>
                <span className="text-right"><span className="block font-mono text-[10px] text-cyan-200">{formatTime(event.capturedAt)}</span><span className="block text-[9px] text-slate-500">{event.evidenceClass}</span></span>
              </button>
            ))}
            {!ledger?.events.length && <div className="py-6 text-center text-xs text-slate-500">No local journal records are available. Start a physical-validation capture in the Android app first.</div>}
          </div>
        </section>
        <footer className="text-[10px] text-slate-500">No fabricated floor plan, coordinates, victim identities or accuracy claims. Event payloads are AES-GCM encrypted with an Android Keystore key. Index metadata remains plaintext; this is not tamper-evident storage.</footer>
      </div>
    </main>
  );
}
