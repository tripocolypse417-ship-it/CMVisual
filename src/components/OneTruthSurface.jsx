import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShieldCheck, Clock, TrendingUp, AlertTriangle, FileCheck, History } from 'lucide-react';

const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;

function CardField({ label, value, tone = 'text-white/80' }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 sm:px-2.5 sm:py-2">
      <div className="font-mono text-[6px] tracking-[0.14em] text-white/35 truncate">{label}</div>
      <div className={`mt-0.5 font-mono text-[9px] font-semibold truncate ${tone}`}>{value}</div>
    </div>
  );
}

export default function OneTruthSurface({ situationPicture, selectedDetection, color = '#00ff88' }) {
  const [open, setOpen] = useState({ evidence: false, history: false, prediction: false, missing: false, decisions: false });
  const p = situationPicture?.picture;
  if (!p) return null;

  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));
  const card = p.card || {};
  const exp = p.expandable || {};

  return (
    <section className="glass-panel rounded-2xl p-3 relative corner-decoration" aria-label="One Truth Surface — shared operational evidence">
      {/* Header + role selector */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[8px] tracking-[0.16em] text-white/45 truncate">SHARED OPERATIONAL EVIDENCE</div>
          <div className="font-display text-sm tracking-wider truncate" style={{ color }}>ONE TRUTH SURFACE</div>
        </div>
        <select
          value={situationPicture.role}
          onChange={e => situationPicture.setRole(e.target.value)}
          className="flex-shrink-0 max-w-[45%] bg-black/40 border border-white/10 rounded px-1.5 py-1 font-mono text-[8px] text-white/70">
          {Object.entries(situationPicture.roles).map(([id, role]) => (
            <option key={id} value={id}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Compact target card: what / where / confidence / source / change / next */}
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        <CardField label="WHAT" value={card.what || '—'} tone="text-emerald-300" />
        <CardField label="WHERE" value={card.where || '—'} />
        <CardField label="CONFIDENCE" value={card.confidence || '—'} tone={finite(p.confidence) != null && p.confidence >= 70 ? 'text-emerald-300' : 'text-amber-300'} />
        <CardField label="SOURCE" value={card.source || '—'} />
        <CardField label="CHANGE" value={card.change || '—'} tone={card.change === 'MOVING' ? 'text-amber-300' : 'text-white/80'} />
        <CardField label="NEXT" value={card.next || '—'} tone="text-white/65" />
      </div>

      {/* State summary row */}
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <CardField label="STATE" value={p.quality} />
        <CardField label="MEASURED" value={p.counts?.measured ?? 0} />
        <CardField label="CONF AVG" value={p.confidence == null ? '—' : `${p.confidence}%`} />
        <CardField label="FRESH" value={p.freshnessSec == null ? '—' : `${p.freshnessSec}s`} />
      </div>

      {/* Counts strip */}
      <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[7px] text-white/50">
        <span className="rounded border border-white/10 px-2 py-1">{p.compact}</span>
        <span className="rounded border border-white/10 px-2 py-1">DERIVED {p.counts?.derived ?? 0}</span>
        <span className="rounded border border-white/10 px-2 py-1">PREDICTED {p.counts?.predicted ?? 0}</span>
        <span className="rounded border border-white/10 px-2 py-1">CONFLICTS {p.counts?.conflicts ?? 0}</span>
        <span className="rounded border border-white/10 px-2 py-1">STALE {p.counts?.stale ?? 0}</span>
        <span className="rounded border border-white/10 px-2 py-1">TEAM {p.counts?.activeTeam ?? 0}</span>
        {p.runtime?.shouldThrottle && <span className="rounded border border-amber-300/30 px-2 py-1 text-amber-300/80">THROTTLE · {p.runtime.throttleAdvice}</span>}
      </div>

      {/* Expandable: Evidence chain */}
      <div className="mt-2">
        <button onClick={() => toggle('evidence')} className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[7px] tracking-wider text-white/55"><ShieldCheck className="w-3 h-3" style={{ color }} /> EVIDENCE CHAIN</span>
          <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open.evidence ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {open.evidence && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-1 p-2 rounded-lg border border-white/10 bg-black/20 space-y-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <CardField label="REFERENCES" value={exp.evidence?.refs ?? 0} />
                  <CardField label="QUALITY" value={exp.evidence?.quality || 'UNKNOWN'} />
                  <CardField label="CONFIDENCE" value={exp.evidence?.confidence == null ? '—' : `${Math.round(exp.evidence.confidence * 100)}%`} />
                  <CardField label="PROVENANCE" value={exp.evidence?.provenance || 'UNKNOWN'} />
                </div>
                {exp.evidence?.strongest?.length > 0 && (
                  <div className="font-mono text-[6px] text-white/40">
                    STRONGEST: {exp.evidence.strongest.slice(0, 4).map(e => `${e.sourceId}(${e.evidenceClass})`).join(' · ')}
                  </div>
                )}
                {exp.evidence?.conflicts?.length > 0 && (
                  <div className="flex items-center gap-1.5 font-mono text-[6px] text-amber-200/70"><AlertTriangle className="w-3 h-3" /> CONFLICTS: {exp.evidence.conflicts.map(e => e.sourceId).join(' · ')}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable: History */}
      <div className="mt-1.5">
        <button onClick={() => toggle('history')} className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[7px] tracking-wider text-white/55"><History className="w-3 h-3" style={{ color }} /> HISTORY · {exp.history?.totalEvents ?? 0} EVENTS</span>
          <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open.history ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {open.history && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-1 p-2 rounded-lg border border-white/10 bg-black/20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <CardField label="TOTAL EVENTS" value={exp.history?.totalEvents ?? 0} />
                  <CardField label="MEASURED" value={exp.history?.measuredCount ?? 0} />
                  <CardField label="STALE" value={exp.history?.staleCount ?? 0} />
                  <CardField label="FRESHNESS" value={exp.history?.freshnessSec == null ? '—' : `${exp.history.freshnessSec}s`} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable: Prediction */}
      <div className="mt-1.5">
        <button onClick={() => toggle('prediction')} className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[7px] tracking-wider text-white/55"><TrendingUp className="w-3 h-3" style={{ color }} /> PREDICTION · {exp.prediction?.forecastCount ?? 0} FORECASTS</span>
          <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open.prediction ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {open.prediction && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-1 p-2 rounded-lg border border-white/10 bg-black/20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <CardField label="FORECASTS" value={exp.prediction?.forecastCount ?? 0} />
                  <CardField label="HAZARDS" value={exp.prediction?.hazardCount ?? 0} />
                  <CardField label="CALIBRATION" value={exp.prediction?.calibrationScore == null ? '—' : `${exp.prediction.calibrationScore}%`} />
                  <CardField label="PHYSICAL" value={exp.prediction?.physicalForecasts ?? 0} />
                </div>
                <div className="mt-1 font-mono text-[6px] text-white/35">PHYSICAL OUTCOME FORECASTS DESCRIBE OBSERVABLE MOTION ONLY — NOT INTENT OR PSYCHOLOGICAL STATE</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable: Missing evidence */}
      {exp.missingEvidence?.length > 0 && (
        <div className="mt-1.5">
          <button onClick={() => toggle('missing')} className="w-full flex items-center justify-between rounded-lg border border-amber-300/20 bg-amber-300/5 px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 font-mono text-[7px] tracking-wider text-amber-200/70"><AlertTriangle className="w-3 h-3" /> MISSING EVIDENCE · {exp.missingEvidence.length}</span>
            <ChevronDown className={`w-3 h-3 text-amber-200/50 transition-transform ${open.missing ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {open.missing && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-1 p-2 rounded-lg border border-amber-300/15 bg-amber-300/5">
                  <div className="flex flex-wrap gap-1.5">
                    {exp.missingEvidence.map((gap, i) => (
                      <span key={i} className="rounded border border-amber-300/25 bg-amber-300/10 px-2 py-1 font-mono text-[7px] text-amber-200/80">{gap}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Expandable: Decision history */}
      <div className="mt-1.5">
        <button onClick={() => toggle('decisions')} className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[7px] tracking-wider text-white/55"><FileCheck className="w-3 h-3" style={{ color }} /> DECISION HISTORY · {p.decisions?.length ?? 0}</span>
          <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${open.decisions ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {open.decisions && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-1 p-2 rounded-lg border border-white/10 bg-black/20 max-h-[180px] overflow-y-auto space-y-1">
                {(p.decisions || []).length === 0 ? (
                  <div className="font-mono text-[7px] text-white/35 text-center py-2">No decisions recorded yet.</div>
                ) : (
                  p.decisions.map((d) => (
                    <div key={d.id} className="flex items-start gap-2 rounded border border-white/5 bg-black/30 px-2 py-1.5">
                      <Clock className="w-2.5 h-2.5 mt-0.5 text-white/30 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[7px] font-bold" style={{ color }}>{d.action}</span>
                          <span className="font-mono text-[6px] text-white/35">{new Date(d.at).toLocaleTimeString()}</span>
                          {d.trackId && <span className="font-mono text-[6px] text-white/30">· {String(d.trackId).slice(0, 12)}</span>}
                        </div>
                        {d.note && <div className="mt-0.5 font-mono text-[6px] text-white/45 leading-relaxed">{d.note}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Record decision + boundary notice */}
      <div className="mt-2 flex items-center gap-2">
        {selectedDetection && (
          <button
            onClick={() => situationPicture.recordDecision({ action: 'VERIFY_SELECTED_TARGET', note: 'Operator requested verification from the shared evidence picture.' })}
            className="rounded border px-2 py-1.5 font-mono text-[8px]"
            style={{ borderColor: `${color}40`, color, background: `${color}08` }}>
            RECORD DECISION
          </button>
        )}
        <span className="font-mono text-[6px] text-white/35 leading-relaxed">SOURCE · TIME · LOCATION · UNCERTAINTY · CONFIDENCE · VALIDATION remain distinct. Predictions ≠ measurements.</span>
      </div>
    </section>
  );
}