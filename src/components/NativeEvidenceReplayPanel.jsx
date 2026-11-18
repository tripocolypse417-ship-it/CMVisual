import React, { useEffect, useMemo, useState } from 'react';
import { listLocalEvidenceEvents } from '../lib/localEvidenceStore';

function sourceLabel(event) {
  return event?.source?.capability_id ||
    event?.payload?.data?.capabilityId ||
    event?.source?.source_type ||
    'UNKNOWN SOURCE';
}

function sourceTimeLabel(event) {
  const timing = event?.timing || {};
  if (timing.observed_at) return new Date(timing.observed_at).toISOString();
  if (timing.observed_monotonic_ns != null) {
    return String(timing.observed_monotonic_ns) + ' ns · ' + String(timing.observed_clock_domain || 'DEVICE_MONOTONIC');
  }
  return 'UNKNOWN · ' + String(timing.observed_clock_domain || 'UNKNOWN');
}

export default function NativeEvidenceReplayPanel({ stream, color = '#32d9ff' }) {
  const [localRecords, setLocalRecords] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const records = await listLocalEvidenceEvents({ limit: 500 });
        if (active) setLocalRecords(records);
      } catch {
        if (active) setLocalRecords([]);
      }
    };
    const onEvidence = () => refresh();
    refresh();
    window.addEventListener('waveradar:event-envelope', onEvidence);
    window.addEventListener('waveradar:remote-evidence-status', onEvidence);
    return () => {
      active = false;
      window.removeEventListener('waveradar:event-envelope', onEvidence);
      window.removeEventListener('waveradar:remote-evidence-status', onEvidence);
    };
  }, []);

  const entries = useMemo(() => {
    const byId = new Map();
    for (const record of localRecords) {
      const event = record.event;
      if (!event?.event_id) continue;
      byId.set(event.event_id, {
        event,
        localStatus: record.deliveryStatus || 'PENDING',
        localReceivedAt: record.received_at || null,
        serverReceivedAt: null,
        serverIntegrity: null,
      });
    }
    for (const row of Array.isArray(stream?.events) ? stream.events : []) {
      const event = row.envelope_json;
      if (!event?.event_id) continue;
      const prior = byId.get(event.event_id);
      byId.set(event.event_id, {
        ...(prior || {}),
        event,
        localStatus: prior?.localStatus || 'SERVER_STORED',
        localReceivedAt: prior?.localReceivedAt || event.timing?.received_at || null,
        serverReceivedAt: row.server_received_at || null,
        serverIntegrity: row.integrity_state || null,
      });
    }
    return [...byId.values()].sort((a, b) =>
      String(a.serverReceivedAt || a.localReceivedAt || '').localeCompare(String(b.serverReceivedAt || b.localReceivedAt || ''))
    );
  }, [localRecords, stream?.events]);

  const selected = entries.find(item => item.event.event_id === selectedId) || entries[entries.length - 1] || null;
  const selectedData = selected?.event?.payload?.data || null;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
      <button type="button" onClick={() => setExpanded(value => !value)} className="w-full min-h-[48px] flex items-center justify-between gap-3 px-3 text-left">
        <div>
          <div className="font-mono text-[9px] font-bold tracking-[0.18em] text-white/80">SENSOR & NETWORK EVIDENCE REPLAY</div>
          <div className="mt-1 font-mono text-[7px] text-white/40">{entries.length} LOCAL / CORE EVENTS · {String(stream?.status || 'UNAVAILABLE').replaceAll('_', ' ')}</div>
        </div>
        <span className="font-mono text-[8px]" style={{ color }}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="border-t border-white/10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="max-h-[260px] overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/10">
            {entries.length === 0 && <div className="p-4 font-mono text-[8px] text-white/40">No native evidence events received yet. Local collection begins on an enrolled Android device.</div>}
            {entries.slice(-40).reverse().map(item => {
              const event = item.event;
              const active = selected?.event?.event_id === event.event_id;
              const evidenceClass = event.provenance?.evidence_class || 'UNKNOWN';
              return (
                <button key={event.event_id} type="button" onClick={() => setSelectedId(event.event_id)} className="w-full min-h-[48px] border-b border-white/5 px-3 py-2 text-left" style={{ background: active ? 'rgba(50,217,255,0.08)' : 'transparent' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[8px] font-semibold" style={{ color: active ? color : '#e2e8f0' }}>{sourceLabel(event)}</span>
                    <span className="shrink-0 font-mono text-[7px] text-white/45">{evidenceClass}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[6px] text-white/40">
                    <span>{String(event.timing?.observed_clock_domain || 'UNKNOWN')}</span>
                    <span>{item.localStatus}</span>
                    <span>{item.serverIntegrity || event.provenance?.integrity_state || 'UNASSESSED'}</span>
                  </div>
                </button>
              );
            })}
            {stream?.hasMore && (
              <button type="button" disabled={stream.loadingMore} onClick={() => stream.loadMore?.()} className="w-full px-3 py-3 font-mono text-[7px] font-semibold tracking-wider text-cyan-200 disabled:opacity-40">
                {stream.loadingMore ? 'LOADING NEXT EVENT PAGE…' : 'LOAD NEXT 500 CORE EVENTS'}
              </button>
            )}
          </div>
          <div className="min-w-0 p-3">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-[8px] font-bold" style={{ color }}>{sourceLabel(selected.event)}</div>
                  <div className="font-mono text-[6px] text-white/45">{selected.localStatus}</div>
                </div>
                <div className="mt-2 space-y-1 font-mono text-[7px] text-white/55">
                  <div>SOURCE TIME: <span className="text-white/80">{sourceTimeLabel(selected.event)}</span></div>
                  <div>CLIENT RECEIVE: <span className="text-white/80">{selected.localReceivedAt || 'UNKNOWN'}</span></div>
                  <div>SERVER RECEIVE: <span className="text-white/80">{selected.serverReceivedAt || 'NOT UPLOADED'}</span></div>
                  <div>INTEGRITY: <span className="text-white/80">{selected.serverIntegrity || selected.event.provenance?.integrity_state || 'UNASSESSED'}</span></div>
                  <div>SESSION: <span className="text-white/80">{selected.event.session_id || 'UNASSIGNED'}</span></div>
                </div>
                <pre className="mt-3 max-h-[180px] overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[7px] leading-relaxed text-cyan-100/80 whitespace-pre-wrap break-all">{JSON.stringify(selectedData, null, 2)}</pre>
              </>
            ) : (
              <div className="font-mono text-[8px] text-white/40">Select an event to inspect its preserved payload.</div>
            )}
          </div>
        </div>
      )}
      <div className="border-t border-white/10 px-3 py-2 font-mono text-[7px] leading-relaxed text-white/35">
        Evidence-time and receive-time are separate. Monotonic timestamps are not converted into UTC. This panel replays source records; it does not invent coordinates or claim a reconstructed 3D scene.
      </div>
    </section>
  );
}
