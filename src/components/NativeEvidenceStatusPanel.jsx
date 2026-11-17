import React from 'react';
import useNativeEvidencePipeline from '../hooks/useNativeEvidencePipeline';

const statusColor = (phase) => {
  if (phase === 'CAPTURING_LOCAL') return 'text-emerald-300';
  if (phase === 'STORAGE_FULL' || phase === 'ERROR' || phase === 'STORAGE_UNAVAILABLE') return 'text-amber-300';
  return 'text-slate-300';
};

export default function NativeEvidenceStatusPanel({ sessionId = null }) {
  const state = useNativeEvidencePipeline(true, sessionId);
  return (
    <section className="rounded-xl border border-emerald-400/20 bg-slate-950/70 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-100">NATIVE EVIDENCE PIPELINE</h3>
          <p className="text-[9px] text-slate-500">Android sensor samples · append-only local capture</p>
        </div>
        <span className={`text-[9px] font-mono font-semibold ${statusColor(state.phase)}`}>{state.phase.replaceAll('_', ' ')}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Stored events</div>
          <div className="mt-1 text-xs font-semibold text-slate-100">{state.storedEvents ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Pending upload</div>
          <div className="mt-1 text-xs font-semibold text-slate-100">{state.pendingEvents ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Quarantined</div>
          <div className="mt-1 text-xs font-semibold text-amber-200">{state.quarantinedEvents ?? 0}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="text-[9px] uppercase text-slate-500">Core ingestion</div>
          <div className="mt-1 text-xs font-semibold text-amber-200">{state.remoteIngestion || 'UNKNOWN'}</div>
        </div>
      </div>
      <p className="text-[9px] leading-relaxed text-slate-500">
        Evidence is first stored locally, then sent to WaveRadar Core when the device enrollment token is available. Source monotonic timestamps remain separate from receive time. Server acknowledgment is not independent validation.
      </p>
      {state.lastError && <p className="text-[9px] leading-relaxed text-amber-200">{state.lastError}</p>}
    </section>
  );
}
