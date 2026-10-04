import React from 'react';
import { Activity, CheckCircle2, CircleAlert, Gauge, Radio, ShieldCheck, Users } from 'lucide-react';

const stateMeta = {
  INSUFFICIENT_EVIDENCE: { label: 'INSUFFICIENT EVIDENCE', color: '#ffaa00' },
  STABLE: { label: 'STABLE', color: '#00ff88' },
  CHANGING: { label: 'CHANGING', color: '#00ccff' },
  ELEVATED_ACTIVITY: { label: 'ELEVATED ACTIVITY', color: '#ffaa00' },
  HIGH_CONCERN: { label: 'HIGH CONCERN', color: '#ff6633' },
};

function Metric({ icon: Icon, label, value, color = '#00ff88' }) {
  return <div className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
    <div className="flex items-center gap-1 text-[7px] font-mono tracking-wider text-white/45"><Icon className="h-3 w-3" style={{ color }} />{label}</div>
    <div className="mt-0.5 font-mono text-sm font-bold" style={{ color }}>{value}</div>
  </div>;
}

export default function EvidenceAssessmentPanel({ assessment, color = '#00ff88' }) {
  if (!assessment) return null;
  const meta = stateMeta[assessment.state] || stateMeta.INSUFFICIENT_EVIDENCE;
  return <section className="rounded-xl border border-white/10 bg-black/35 p-3" aria-label="validated evidence assessment">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" style={{ color }} />
        <div>
          <div className="font-mono text-[8px] tracking-[0.16em] text-white/45">EVIDENCE ASSESSMENT · {assessment.version}</div>
          <div className="font-mono text-sm font-bold tracking-wider" style={{ color: meta.color }}>{meta.label}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[7px] text-white/40">ACTIVITY / VALIDATION</div>
        <div className="font-mono text-xs font-bold" style={{ color: meta.color }}>{assessment.score} / {assessment.validationScore}</div>
      </div>
    </div>

    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Metric icon={Users} label="TARGETS" value={assessment.targetCount} />
      <Metric icon={Activity} label="MOVING" value={assessment.movingCount} color="#00ccff" />
      <Metric icon={Radio} label="CORROBORATED" value={assessment.corroboratedCount} color="#00ccff" />
      <Metric icon={Gauge} label="CONFIDENCE" value={`${assessment.confidence}%`} color={assessment.confidence >= 70 ? '#00ff88' : '#ffaa00'} />
    </div>

    <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[8px] text-white/55">
      <span>SIGNAL {assessment.signalQuality}%</span>
      <span>DISAGREE {assessment.sensorDisagreement}%</span>
      <span>PERSIST {assessment.persistenceCount}</span>
      <span>REPEATS {assessment.repeatedObservationSamples ?? 0}</span>
      <span>MAX {assessment.maxSpeed} m/s</span>
      <span>Δ BASE {assessment.changeFromBaseline >= 0 ? '+' : ''}{assessment.changeFromBaseline}</span>
      <span>FRESH {assessment.freshnessScore ?? 0}%</span>
      <span>HAZARD {assessment.hasObjectiveHazard ? 'VALIDATED' : 'NONE'}</span>
    </div>

    <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-black/25 p-2">
      {assessment.validationScore >= 65 ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-300" /> : <CircleAlert className="mt-0.5 h-3.5 w-3.5 text-amber-300" />}
      <div className="font-mono text-[8px] leading-relaxed text-white/65">
        Validation requires independent corroboration, current signal quality, provenance, and repeated observations. A high activity score is not a finding that a person is dangerous.
      </div>
    </div>

    {assessment.limitations?.length > 0 && <div className="mt-2">
      <div className="font-mono text-[7px] tracking-wider text-white/35">LIMITATIONS / MISSING EVIDENCE</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {assessment.limitations.slice(0, 5).map((x) => <span key={x} className="rounded-full border border-amber-300/20 bg-amber-300/5 px-2 py-1 font-mono text-[7px] text-amber-200/70">{x}</span>)}
      </div>
    </div>}
  </section>;
}