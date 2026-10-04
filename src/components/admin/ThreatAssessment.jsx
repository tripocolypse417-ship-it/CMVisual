import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Activity, Radio, Gauge, Navigation, Sparkles, RefreshCw, AlertTriangle, ArrowRight, Zap, FileText, Calendar } from 'lucide-react';
import generateDetectionReport from '@/lib/generateDetectionReport';
import generateMonthlySummary from '@/lib/generateMonthlySummary';

// Evidence-state mapping. This intentionally does not infer intent,
// dangerousness, mental state, identity, or physiology from appearance.
function levelFromEvidence(e) {
  if (!e) return { label: 'INSUFFICIENT EVIDENCE', color: '#ffaa00', idx: 0 };
  if (e.state === 'HIGH_CONCERN') return { label: 'HIGH CONCERN', color: '#ff6633', idx: 3 };
  if (e.state === 'ELEVATED_ACTIVITY') return { label: 'ELEVATED ACTIVITY', color: '#ffaa00', idx: 2 };
  if (e.state === 'CHANGING') return { label: 'CHANGING', color: '#00ccff', idx: 1 };
  if (e.state === 'STABLE') return { label: 'STABLE', color: '#00ff88', idx: 0 };
  return { label: 'INSUFFICIENT EVIDENCE', color: '#ffaa00', idx: 0 };
}

const PRIORITY = {
  critical: { color: '#ff2222', label: 'CRITICAL' },
  high: { color: '#ff6633', label: 'HIGH' },
  medium: { color: '#ffaa00', label: 'MEDIUM' },
  low: { color: '#00ccff', label: 'LOW' },
};

function bearingLabel(angle) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((angle % 360) / 45)) % 8];
}

function safeJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return ['Assessment limitations could not be parsed from the stored record'];
  }
}

function safeJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function Stat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}25` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="font-mono text-[8px] tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="font-display text-lg font-bold" style={{ color }}>{value}</div>
      {sub && <div className="font-mono text-[8px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ThreatAssessment({ color = '#00ff88' }) {
  const [events, setEvents] = useState([]);
  const [evidenceRecords, setEvidenceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DetectionEvent.list('-created_date', 100);
      const evidence = await base44.entities.EvidenceAssessment.list('-created_date', 30).catch(() => []);
      setEvents(data);
      setEvidenceRecords(evidence);
    } catch {
      /* bubble */
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const unsub = base44.entities.DetectionEvent.subscribe(() => { load(); });
    return unsub;
  }, []);

  const assess = useMemo(() => {
    const recent = events.slice(0, 40);
    if (!recent.length) return null;
    const latestEvidence = evidenceRecords[0] || null;
    const level = levelFromEvidence(latestEvidence);
    const avg = Number(latestEvidence?.score ?? 0);
    const peak = Math.max(avg, ...recent.map((e) => Number(e.evidence_score ?? 0)));
    const movers = recent.filter((e) => e.moving).length;
    const humans = recent.filter((e) => e.target_type === 'human').length;
    const nearest = recent.reduce((min, e) => ((e.distance ?? 99) < (min.distance ?? 99) ? e : min), recent[0]);
    const speeds = recent.map((e) => e.speed ?? 0).filter(Boolean);
    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const buckets = {};
    recent.forEach((e) => { const b = bearingLabel(e.bearing ?? 0); buckets[b] = (buckets[b] || 0) + 1; });
    const dominant = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0];
    const rawConfidence = Number(latestEvidence?.confidence ?? 0);
    const confidence = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
    const metrics = safeJsonObject(latestEvidence?.metrics_json);
    return { recent, avg, peak, movers, humans, nearest, avgSpeed, dominant, level, count: recent.length, validation: Number(latestEvidence?.validation_score ?? 0), confidence, limitations: safeJsonArray(latestEvidence?.limitations_json), freshness: Number(metrics.freshnessScore ?? metrics.freshness ?? 0), hasObjectiveHazard: !!metrics.hasObjectiveHazard };
  }, [events, evidenceRecords]);

  const ruleOptions = useMemo(() => {
    if (!assess) return [];
    const opts = [];
    const { level, nearest, avgSpeed, movers } = assess;
    if (level.idx >= 3) {
      opts.push({ action: 'Prioritize non-confrontational safety: create distance, identify a safe exit, and contact appropriate emergency services if an observable hazard is present.', priority: 'critical' });
    }
    if (level.idx >= 2) {
      opts.push({ action: 'Preserve the current evidence snapshot and notify the designated operator/team so the observation can be independently reviewed.', priority: 'high' });
    }
    if (nearest && (nearest.distance ?? 99) < 3) {
      opts.push({ action: `Measured/estimated nearest contact is ${(nearest.distance ?? 0).toFixed(1)}m ${bearingLabel(nearest.bearing ?? 0)} — maintain observation without treating proximity alone as hostile behavior.`, priority: 'high' });
    }
    if (avgSpeed > 0.8) {
      opts.push({ action: 'Movement is elevated — increase observation cadence and preserve repeated measurements before drawing conclusions.', priority: 'medium' });
    }
    if (movers > 2) {
      opts.push({ action: `${movers} moving observations — widen the field of view and retain separate tracks so the evidence is not conflated.`, priority: 'medium' });
    }
    if (level.idx <= 1) {
      opts.push({ action: 'No validated objective hazard is currently established — continue observation and collect corroborating measurements.', priority: 'low' });
    }
    opts.push({ action: 'Export a session report documenting measurements, validation limits, uncertainty, and the assessment state.', priority: 'low' });
    return opts;
  }, [assess]);

  const generateBrief = async () => {
    if (briefLoading || !assess) return;
    setBriefLoading(true);
    setBrief(null);
    try {
      const payload = assess.recent.slice(0, 25).map((e) => ({
        type: e.event_type,
        target: e.target_type,
        distance_m: +(e.distance ?? 0).toFixed(1),
        bearing_deg: Math.round(e.bearing ?? 0),
        moving: !!e.moving,
        speed_mps: +(e.speed ?? 0).toFixed(2),
        intensity: Math.round(e.intensity ?? 0),
        summary: e.summary,
      }));
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a safety-focused situational-evidence assistant for CMVisual. Analyze only the supplied observable measurements: movement, distance, bearing, speed, event type, and summary. Do NOT infer identity, intent, hostility, dangerousness, mental state, neural state, personality, gender, or probability of violence from motion, gait, appearance, proximity, or sensor signatures. Treat through-wall/radio-derived observations as evidence only when their provenance and validation support them. Distinguish measured facts from derived interpretation and explicitly state uncertainty or missing corroboration. Return a concise assessment of what is observable, the evidence state, objective hazards if explicitly validated, and proportionate non-confrontational safety actions. Events JSON:\n${JSON.stringify(payload)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            situation_summary: { type: 'string' },
            situational_state: { type: 'string', enum: ['INSUFFICIENT_EVIDENCE', 'STABLE', 'CHANGING', 'ELEVATED_ACTIVITY', 'HIGH_CONCERN'] },
            key_findings: { type: 'array', items: { type: 'string' } },
            recommended_actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                },
              },
            },
          },
          required: ['situation_summary', 'situational_state', 'key_findings', 'recommended_actions'],
        },
      });
      setBrief(res);
    } catch {
      /* bubble */
    }
    setBriefLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" style={{ color }} />
          <h2 className="font-display text-xs tracking-wider" style={{ color }}>EVIDENCE ASSESSMENT</h2>
          <span className="font-mono text-[8px] text-muted-foreground">validated observations · live</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateBrief} disabled={briefLoading || !assess}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-wider transition-all disabled:opacity-40"
            style={{ border: `1px solid ${color}50`, background: `${color}12`, color }}>
            <Sparkles className="w-3 h-3" /> {briefLoading ? 'ANALYZING…' : 'AI SITUATIONAL BRIEF'}
          </button>
          <button onClick={() => { if (monthlyLoading || !events.length) return; setMonthlyLoading(true); try { generateMonthlySummary(events); } catch {} setTimeout(() => setMonthlyLoading(false), 500); }} disabled={monthlyLoading || !events.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-wider transition-all disabled:opacity-40"
            style={{ border: `1px solid ${color}50`, background: `${color}12`, color }}>
            <Calendar className="w-3 h-3" /> {monthlyLoading ? 'BUILDING…' : 'MONTHLY SUMMARY'}
          </button>
          <button onClick={() => { if (reportLoading || !events.length) return; setReportLoading(true); try { generateDetectionReport(events, assess?.level?.label); } catch {} setTimeout(() => setReportLoading(false), 500); }} disabled={reportLoading || !events.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-wider transition-all disabled:opacity-40"
            style={{ border: `1px solid ${color}50`, background: `${color}12`, color }}>
            <FileText className="w-3 h-3" /> {reportLoading ? 'BUILDING…' : 'PDF REPORT'}
          </button>
          <button onClick={load} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : !assess ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Activity className="w-10 h-10 text-muted-foreground opacity-30" />
          <div className="font-mono text-[10px] text-muted-foreground max-w-xs">No current detection events are available. The assessment remains INSUFFICIENT EVIDENCE until real observations are received.</div>
        </div>
      ) : (
        <>
          {/* evidence state banner */}
          <div className="rounded-2xl p-4 relative corner-decoration"
            style={{ background: `${assess.level.color}10`, border: `1px solid ${assess.level.color}50` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[8px] tracking-wider text-muted-foreground">CURRENT EVIDENCE STATE</div>
                <div className="font-display text-2xl font-bold tracking-widest" style={{ color: assess.level.color, textShadow: `0 0 14px ${assess.level.color}` }}>
                  {assess.level.label}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[8px] tracking-wider text-muted-foreground">SCORE</div>
                <div className="font-mono text-xl font-bold" style={{ color: assess.level.color }}>{Math.round(assess.avg)}/100</div>
                <div className="font-mono text-[8px] text-muted-foreground">peak {Math.round(assess.peak)}</div>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: assess.level.color, boxShadow: `0 0 8px ${assess.level.color}` }}
                initial={{ width: 0 }} animate={{ width: `${assess.avg}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>

          {/* situational intelligence */}
          <div>
            <div className="font-mono text-[9px] tracking-wider text-muted-foreground mb-2">SITUATIONAL INTELLIGENCE</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Stat icon={Radio} label="EVENTS" value={assess.count} color={color} />
              <Stat icon={Activity} label="MOVING" value={assess.movers} color="#00ccff" />
              <Stat icon={Navigation} label="NEAREST" value={`${(assess.nearest?.distance ?? 0).toFixed(1)}m`} sub={bearingLabel(assess.nearest?.bearing ?? 0)} color="#ff6633" />
              <Stat icon={Gauge} label="AVG SPEED" value={`${assess.avgSpeed.toFixed(2)}m/s`} color="#ffaa00" />
              <Stat icon={Navigation} label="DOMINANT" value={assess.dominant || '—'} sub="bearing" color={color} />
            </div>
          </div>

          {/* recommended options */}
          <div>
            <div className="font-mono text-[9px] tracking-wider text-muted-foreground mb-2">RECOMMENDED OPTIONS</div>
            <div className="space-y-2">
              <AnimatePresence>
                {ruleOptions.map((o, i) => {
                  const p = PRIORITY[o.priority];
                  return (
                    <motion.div key={i} layout
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${p.color}30` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${p.color}15`, border: `1px solid ${p.color}40` }}>
                        {o.priority === 'critical' ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: p.color }} /> : <ArrowRight className="w-3.5 h-3.5" style={{ color: p.color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full"
                            style={{ color: p.color, background: `${p.color}15`, border: `1px solid ${p.color}40` }}>{p.label}</span>
                        </div>
                        <div className="font-mono text-[10px] text-foreground leading-relaxed">{o.action}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* AI situational brief */}
          <AnimatePresence>
            {briefLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 py-6">
                <Zap className="w-4 h-4 animate-pulse" style={{ color }} />
                <span className="font-mono text-[10px] text-muted-foreground">Generating situational brief…</span>
              </motion.div>
            )}
            {brief && !briefLoading && (
              <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                className="rounded-2xl p-4 relative corner-decoration"
                style={{ background: `${color}08`, border: `1px solid ${color}30` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4" style={{ color }} />
                  <h3 className="font-display text-xs tracking-wider" style={{ color }}>AI SITUATIONAL BRIEF</h3>
                  {brief.situational_state && (() => {
                  const lvl = levelFromEvidence({ state: brief.situational_state });
                  return (
                    <span className="font-mono text-[8px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: lvl.color, background: `${lvl.color}15` }}>
                      {brief.situational_state}
                    </span>
                  );
                })()}
                </div>
                <p className="font-mono text-[10px] text-foreground leading-relaxed mb-3">{brief.situation_summary}</p>
                {brief.key_findings?.length > 0 && (
                  <div className="mb-3">
                    <div className="font-mono text-[8px] tracking-wider text-muted-foreground mb-1.5">KEY FINDINGS</div>
                    <ul className="space-y-1">
                      {brief.key_findings.map((f, i) => (
                        <li key={i} className="font-mono text-[10px] text-foreground/90 flex items-start gap-2">
                          <span style={{ color }}>•</span><span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.recommended_actions?.length > 0 && (
                  <div>
                    <div className="font-mono text-[8px] tracking-wider text-muted-foreground mb-1.5">AI RECOMMENDED ACTIONS</div>
                    <div className="space-y-2">
                      {brief.recommended_actions.map((a, i) => {
                        const p = PRIORITY[a.priority] || PRIORITY.low;
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${p.color}25` }}>
                            <span className="font-mono text-[8px] font-bold mt-0.5" style={{ color: p.color }}>{p.label}</span>
                            <span className="font-mono text-[10px] text-foreground leading-relaxed">{a.action}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}