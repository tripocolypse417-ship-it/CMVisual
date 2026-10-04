import React, { useMemo } from 'react';
import { BrainCircuit, Database, ShieldAlert } from 'lucide-react';

function pct(v) { return Number.isFinite(Number(v)) ? `${Math.round(Number(v))}%` : '—'; }

export default function SpeculativeOutcomePanel({ assessment, selectedTrackId = null, color = '#00ff88' }) {
  const selected = useMemo(() => {
    if (!assessment?.assessments?.length) return null;
    if (selectedTrackId == null) return assessment.assessments[0];
    return assessment.assessments.find(x => String(x.trackId) === String(selectedTrackId)) || null;
  }, [assessment, selectedTrackId]);

  if (!selected) return null;

  const qualityTone = selected.evidenceQuality >= 70 ? '#00ff88' : selected.evidenceQuality >= 45 ? '#ffaa00' : '#ff6633';
  return <section className="rounded-xl border border-amber-300/15 bg-black/35 p-3" aria-label="speculative physical outcome assessment">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-4 w-4 text-amber-300" />
        <div>
          <div className="font-mono text-[8px] tracking-[0.16em] text-white/40">SPECULATION · {selected.methodVersion}</div>
          <div className="font-mono text-sm font-bold tracking-wider text-amber-200">POSSIBLE OUTCOME</div>
        </div>
      </div>
      <div className="text-right font-mono text-[7px] text-white/40">TRACK {selected.trackId}</div>
    </div>

    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
      <div className="rounded-lg border border-white/10 bg-black/25 p-2"><div className="font-mono text-[7px] text-white/40">OUTCOME LIKELIHOOD</div><div className="font-mono text-lg font-bold text-amber-200">{pct(selected.outcomeProbability)}</div></div>
      <div className="rounded-lg border border-white/10 bg-black/25 p-2"><div className="font-mono text-[7px] text-white/40">EVIDENCE QUALITY</div><div className="font-mono text-lg font-bold" style={{ color: qualityTone }}>{pct(selected.evidenceQuality)}</div></div>
      <div className="rounded-lg border border-white/10 bg-black/25 p-2 col-span-2 sm:col-span-1"><div className="font-mono text-[7px] text-white/40">PREDICTED OUTCOME</div><div className="font-mono text-xs font-bold" style={{ color }}>{selected.outcome}</div></div>
    </div>

    <div className="mt-2 rounded-lg border border-amber-300/15 bg-amber-300/5 p-2">
      <div className="flex items-center gap-1.5 font-mono text-[7px] tracking-wider text-amber-200/80"><ShieldAlert className="h-3 w-3" /> SPECULATIVE · NOT VERIFIED · HUMAN REVIEW</div>
      <div className="mt-1 font-mono text-[7px] leading-relaxed text-white/55">This is an estimate of an observable physical outcome. It is not a probability that the person is dangerous, hostile, criminal, violent, or acting with a particular intent.</div>
    </div>

    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <div className="font-mono text-[7px] tracking-wider text-white/35">WHY THE MODEL MOVED THE SCORE</div>
        <div className="mt-1 space-y-1">{selected.reasons.length ? selected.reasons.map(r => <div key={r} className="font-mono text-[7px] text-white/60">+ {r}</div>) : <div className="font-mono text-[7px] text-white/40">No strong positive evidence.</div>}</div>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <div className="font-mono text-[7px] tracking-wider text-white/35">LIMITATIONS</div>
        <div className="mt-1 space-y-1">{selected.limitations.length ? selected.limitations.map(r => <div key={r} className="font-mono text-[7px] text-amber-200/60">− {r}</div>) : <div className="font-mono text-[7px] text-white/40">No recorded limitations.</div>}</div>
      </div>
    </div>

    <div className="mt-2 flex flex-wrap gap-1">
      {Object.entries(selected.dataSources).map(([key, enabled]) => <span key={key} className={`rounded-full border px-2 py-1 font-mono text-[6px] ${enabled ? 'border-emerald-300/20 bg-emerald-300/5 text-emerald-200/65' : 'border-white/5 bg-white/[0.02] text-white/25'}`}>{enabled ? '✓' : '—'} {key.toUpperCase()}</span>)}
    </div>

    <div className="mt-2 border-t border-white/10 pt-2 font-mono text-[6px] leading-relaxed text-white/30">
      <Database className="inline h-2.5 w-2.5 mr-1" />MEASURED DATA, DERIVED DATA, HISTORICAL CONTEXT, SCIENTIFIC PRIORS, AND SPECULATION ARE kept separate. Missing or conflicting sensor data lowers evidence quality rather than being silently filled in.
    </div>
  </section>;
}