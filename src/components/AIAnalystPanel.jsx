import React from 'react';
import { BrainCircuit, CheckCircle2, CircleAlert, Crosshair, ShieldCheck } from 'lucide-react';

export default function AIAnalystPanel({ analysis, selectedTarget = null, color = '#00ff88' }) {
  if (!analysis) return null;
  const selectedId = selectedTarget?.id ?? selectedTarget?.trackId;
  const selected = analysis.targets?.find(t => String(t.targetId) === String(selectedId));
  const rows = selected ? [selected] : (analysis.targets || []).slice(0, 6);

  return <section className="rounded-xl border border-white/10 bg-black/35 p-3" aria-label="AI evidence analyst">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-4 w-4" style={{ color }} />
        <div>
          <div className="font-mono text-[8px] tracking-[0.16em] text-white/45">AI ANALYST · EVIDENCE FUSION</div>
          <div className="font-mono text-sm font-bold tracking-wider" style={{ color }}>MULTI-SOURCE REASONING</div>
        </div>
      </div>
      <div className="text-right font-mono text-[7px] text-white/40">{analysis.dataPolicy || 'REAL INPUTS ONLY'}<div className="mt-0.5 text-[6px] text-white/25">{analysis.inferencePolicy || 'EVIDENCE-GATED'} · {analysis.inferenceRegistryVersion || 'REGISTRY'}</div></div>
    </div>

    {rows.length === 0 ? <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-[8px] text-white/45">NO TARGET EVIDENCE AVAILABLE. AI WILL NOT INVENT A TARGET.</div> : <div className="mt-3 space-y-2">
      {rows.map(row => <div key={String(row.targetId)} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0"><Crosshair className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} /><span className="font-mono text-[9px] font-bold truncate" style={{ color }}>{row.classification}</span></div>
          <span className="font-mono text-[8px] text-white/55">EVIDENCE {row.evidenceScore}%</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded border border-white/10 px-2 py-1.5 font-mono text-[7px] text-white/55">CONFIDENCE <b className="text-white/80">{row.confidence == null ? 'N/A' : `${row.confidence}%`}</b></div>
          <div className="rounded border border-white/10 px-2 py-1.5 font-mono text-[7px] text-white/55">MODEL <b className="text-white/80">{row.modelVersion}</b></div>
        </div>
        <div className="mt-2 font-mono text-[7px] text-white/40">EVIDENCE: {row.reasoning?.join(' · ')}</div>
        {row.hypotheses?.length > 0 && <div className="mt-2 rounded border border-white/10 bg-black/20 p-2 font-mono text-[7px] text-white/45"><span className="text-white/65">PHYSICAL HYPOTHESES:</span> {row.hypotheses.slice(0, 4).map(h => `${h.status}: ${h.label} (${h.basis})`).join(' · ')}</div>}
        {row.dataGaps?.length > 0 && <div className="mt-1 font-mono text-[7px] text-amber-200/60">DATA GAPS: {row.dataGaps.join(' · ')}</div>}
        {row.caveats?.length > 0 && <div className="mt-1 font-mono text-[7px] text-amber-200/60">LIMITS: {row.caveats.join(' · ')}</div>}
        {row.predictionCalibration != null && <div className="mt-1 font-mono text-[7px] text-white/40">CALIBRATION: {row.predictionCalibration}% · continuously compared with later measured outcomes</div>}
        {row.eligibleFutureInference?.length > 0 && <div className="mt-1 font-mono text-[7px] text-emerald-200/60">ENABLED BY EVIDENCE: {row.eligibleFutureInference.join(' · ')}</div>}
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[7px]" style={{ color: row.evidenceScore >= 75 ? color : '#ffaa00' }}>
          {row.evidenceScore >= 75 ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
          {row.recommendation}
        </div>
      </div>)}
    </div>}

    <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-black/25 p-2">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
      <div className="font-mono text-[7px] leading-relaxed text-white/50">AI ranks and explains supplied evidence, maintains competing physical hypotheses, surfaces data gaps, and updates when measurements change. It preserves uncertainty and sensor disagreement. Future capabilities can unlock additional inference classes only after the required validated sensor evidence and thresholds are present; otherwise the result remains UNKNOWN / INSUFFICIENT DATA.</div>
    </div>
  </section>;
}