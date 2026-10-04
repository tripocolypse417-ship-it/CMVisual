import React from 'react';
import { ClipboardCheck, Download, Play, Square, RotateCcw } from 'lucide-react';

export default function EvaluationReadinessPanel({ evaluation, runtimeCapacity = null, color = '#00ff88' }) {
  if (!evaluation) return null;
  const { evaluationMode, metrics } = evaluation;
  return (
    <section className="glass-panel rounded-2xl p-3 relative corner-decoration">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[9px] tracking-[0.16em] text-white/75"><ClipboardCheck className="inline w-3.5 h-3.5 mr-1" />EVALUATION READINESS</div>
        <span className="font-mono text-[7px]" style={{ color }}>{metrics.passCount}/{metrics.gates.length} GATES</span>
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {metrics.gates.map(g => <div key={g.id} className={`rounded-md border px-2 py-1.5 font-mono text-[6px] ${g.pass ? 'border-emerald-300/15 bg-emerald-300/5 text-white/65' : 'border-amber-300/20 bg-amber-300/5 text-amber-100/65'}`}>
          <span className="mr-1">{g.pass ? 'PASS' : 'REVIEW'}</span>{g.label}
        </div>)}
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 font-mono text-[6px] text-white/45">
        <span>MEASURED <b className="text-white/75">{metrics.measured}</b></span>
        <span>QUARANTINED <b className="text-white/75">{metrics.quarantined}</b></span>
        <span>CONFLICTS <b className="text-white/75">{metrics.conflicts}</b></span>
        <span>RELIABILITY <b className="text-white/75">{metrics.reliabilityPct == null ? '—' : `${metrics.reliabilityPct}%`}</b></span>
        <span>CALIBRATION <b className="text-white/75">{metrics.calibrationPct == null ? '—' : `${metrics.calibrationPct}%`}</b></span>
      </div>
      {runtimeCapacity && <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-[7px] text-white/45">
        RUNTIME BUDGET · SAFE CAPACITY <b style={{ color }}>{runtimeCapacity.safeCapacity}</b> · ACTIVE <b className="text-white/75">{runtimeCapacity.activeTargets}</b> · PRESSURE <b className="text-white/75">{runtimeCapacity.pressurePct}%</b> · FRAME <b className="text-white/75">{runtimeCapacity.frameMs == null ? '—' : `${runtimeCapacity.frameMs.toFixed(1)}ms`}</b>
        <div className="mt-1">MAX FPS <b className="text-white/75">{runtimeCapacity.recommendedMaxFps ?? '—'}</b> · MAX TARGETS <b className="text-white/75">{runtimeCapacity.recommendedMaxTargets ?? '—'}</b> · THROTTLE <b className={runtimeCapacity.shouldThrottle ? 'text-amber-300' : 'text-white/75'}>{runtimeCapacity.throttleAdvice || 'NOMINAL'}</b></div>
      </div>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {!evaluationMode ? <button type="button" onClick={evaluation.start} className="min-h-[36px] rounded-lg border border-white/10 bg-white/5 px-3 font-mono text-[7px] text-white/70"><Play className="inline w-3 h-3 mr-1" />START EVALUATION</button> : <button type="button" onClick={evaluation.stop} className="min-h-[36px] rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 font-mono text-[7px] text-amber-100/75"><Square className="inline w-3 h-3 mr-1" />STOP / FREEZE RUN</button>}
        <button type="button" onClick={evaluation.exportRun} className="min-h-[36px] rounded-lg border border-white/10 px-3 font-mono text-[7px] text-white/60"><Download className="inline w-3 h-3 mr-1" />EXPORT EVIDENCE RUN</button>
        <button type="button" onClick={evaluation.reset} className="min-h-[36px] rounded-lg border border-white/5 px-3 font-mono text-[7px] text-white/35"><RotateCcw className="inline w-3 h-3 mr-1" />RESET</button>
        <button type="button" onClick={evaluation.toggleTraining} className={`min-h-[36px] rounded-lg border px-3 font-mono text-[7px] ${evaluation.trainingMode ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100/80' : 'border-white/10 text-white/55'}`}>{evaluation.trainingMode ? 'TRAINING ON' : 'TRAINING OFF'}</button>
      </div>
      <div className="mt-2 border-t border-white/10 pt-2 font-mono text-[6px] leading-relaxed text-white/35">
        REVIEWER MODE: every evaluation should produce measurable pass/fail criteria, provenance, conflicts, uncertainty, calibration and a portable evidence-run record. This mode never turns predictions into measured facts.
      </div>
    </section>
  );
}