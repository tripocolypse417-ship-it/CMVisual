import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'cmvisual.situationPicture.v2';
const VERSION = 'shared-operational-evidence-v2';

const ROLES = {
  firefighter: { label: 'Firefighter', priorities: ['nearest verified observations', 'movement/change', 'hazard evidence', 'freshness'], compact: 'WHERE · WHAT CHANGED · HOW SURE' },
  commander: { label: 'Incident Commander', priorities: ['area coverage', 'team designations', 'conflicts', 'validated hazards', 'decision history'], compact: 'SITUATION · COVERAGE · RISK · DECISIONS' },
  medic: { label: 'EMS / Medic', priorities: ['location', 'movement', 'freshness', 'handoff evidence'], compact: 'LOCATION · CHANGE · HANDOFF' },
  rescue: { label: 'Search & Rescue', priorities: ['last known position', 'track continuity', 'sensor corroboration', 'uncertainty'], compact: 'WHERE · TRAIL · CORROBORATION' },
  security: { label: 'Security / Facility', priorities: ['verified observations', 'zone changes', 'sensor health', 'audit history'], compact: 'OBSERVATION · ZONE · AUDIT' },
  researcher: { label: 'Research / Validation', priorities: ['provenance', 'calibration', 'conflicts', 'replayability', 'data gaps'], compact: 'EVIDENCE · CALIBRATION · REPLAY' },
  investor: { label: 'Investor / Reviewer', priorities: ['measured utility', 'validation status', 'repeatability', 'deployment readiness', 'commercial path'], compact: 'UTILITY · VALIDATION · SCALE' },
};

const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"role":"firefighter","decisions":[]}'); } catch { return { role: 'firefighter', decisions: [] }; } };
const write = (v) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {} };
const n = (v) => Number.isFinite(Number(v)) ? Number(v) : null;

export default function useSituationPicture({ observations = [], selected = null, evidenceBundle = null, aiAnalysis = null, runtimeCapacity = null, worldProjection = null, teamTargetLocks = null, workspaceMode = 'live', scanning = false } = {}) {
  const [state, setState] = useState(read);

  useEffect(() => write(state), [state]);

  const setRole = useCallback((role) => setState(s => ({ ...s, role: ROLES[role] ? role : 'firefighter' })), []);

  const recordDecision = useCallback(({ action = 'OBSERVE', note = '' } = {}) => {
    const row = {
      id: globalThis.crypto?.randomUUID?.() || `decision-${Date.now()}`,
      at: new Date().toISOString(),
      action: String(action).slice(0, 80),
      note: String(note).slice(0, 500),
      role: state.role,
      trackId: selected?.trackId ?? selected?.id ?? null,
      evidenceRefs: Array.isArray(evidenceBundle?.observationRefs) ? evidenceBundle.observationRefs.slice(0, 16) : [],
      situationVersion: VERSION,
    };
    setState(s => ({ ...s, decisions: [row, ...(s.decisions || [])].slice(0, 100) }));
    return row;
  }, [state.role, selected, evidenceBundle]);

  const picture = useMemo(() => {
    const rows = Array.isArray(observations) ? observations : [];
    const measured = rows.filter(o => String(o?.evidenceClass || o?.evidence_class || '').toUpperCase().includes('MEASURED'));
    const derived = rows.filter(o => String(o?.evidenceClass || o?.evidence_class || '').toUpperCase().includes('DERIVED'));
    const predicted = rows.filter(o => String(o?.evidenceClass || o?.evidence_class || '').toUpperCase().includes('PREDICTED'));
    const conflicts = rows.filter(o => o?.conflict || o?.sensorConflict || o?.disagreement).length;
    const stale = rows.filter(o => {
      const t = Date.parse(o?.observedAt || o?.timestamp || '');
      return Number.isFinite(t) && Date.now() - t > 15000;
    }).length;
    const latest = rows.map(o => Date.parse(o?.observedAt || o?.timestamp || '')).filter(Number.isFinite).sort((a,b) => b-a)[0];
    const confidenceValues = rows.map(o => n(o?.confidence)).filter(v => v != null);
    const avgConfidence = confidenceValues.length ? Math.round((confidenceValues.reduce((a,b)=>a+b,0) / confidenceValues.length) * 100) : null;
    const activeTeam = Array.isArray(teamTargetLocks?.designations) ? teamTargetLocks.designations.filter(d => !['CANCELLED','EXPIRED','LOST'].includes(d.status)).length : 0;
    const acquiredTeam = Number(teamTargetLocks?.acquired?.length) || 0;
    const forecastCount = Array.isArray(aiAnalysis?.targets) ? aiAnalysis.targets.reduce((sum, t) => sum + (t.hypotheses?.filter(h => h.status === 'PREDICTED').length || 0), 0) : 0;
    const hazardCount = Number(worldProjection?.counts?.hazards) || 0;
    const quality = conflicts || stale ? 'REVIEW' : rows.length ? 'OPERATIONAL' : 'WAITING';
    const freshness = latest ? Math.max(0, Math.round((Date.now() - latest) / 1000)) : null;

    // Compact role-adaptive target card: what / where / confidence / source / change / next
    const sel = selected;
    const card = {
      what: sel ? String(sel.type || 'UNKNOWN').toUpperCase() : (rows.length ? `${measured.length} MEASURED` : 'NO TARGETS'),
      where: sel
        ? (n(sel.distance) != null ? `${n(sel.distance).toFixed(1)}m` : 'RANGE ?') + (n(sel.angle) != null ? ` · ${Math.round(n(sel.angle))}°` : '')
        : (rows.length ? `${rows.length} OBSERVATIONS` : 'AWAITING INPUT'),
      confidence: sel ? (n(sel.confidence) != null ? `${Math.round(n(sel.confidence) * 100)}%` : '—') : (avgConfidence != null ? `${avgConfidence}%` : '—'),
      source: sel ? (sel.source || 'LOCAL') : (rows.length ? [...new Set(rows.map(r => r.source).filter(Boolean))].slice(0, 3).join(' · ') || 'MIXED' : 'NONE'),
      change: sel ? (sel.moving == null ? 'UNAVAILABLE' : sel.moving ? 'MOVING' : 'STATIONARY') : (stale ? `${stale} STALE` : 'STABLE'),
      next: quality === 'WAITING'
        ? 'Acquire real sensor or camera input'
        : conflicts
          ? 'Resolve sensor disagreement'
          : stale
            ? 'Refresh stale observations'
            : sel
              ? 'Open evidence chain before acting'
              : 'Select a target to inspect',
    };

    // Expandable detail sections
    const expandable = {
      evidence: evidenceBundle ? {
        quality: evidenceBundle.qualitySummary,
        refs: evidenceBundle.observationRefs?.length || 0,
        strongest: evidenceBundle.strongestEvidence || [],
        conflicts: evidenceBundle.conflictingEvidence || [],
        gaps: evidenceBundle.missingEvidence || [],
        confidence: n(evidenceBundle.confidence),
        provenance: evidenceBundle.provenanceSummary || 'UNKNOWN',
      } : { quality: 'NO BUNDLE', refs: 0, strongest: [], conflicts: [], gaps: ['NO OBSERVATIONS'], confidence: null, provenance: 'UNKNOWN' },
      history: {
        totalEvents: Number(worldProjection?.counts?.historical) || 0,
        measuredCount: measured.length,
        staleCount: stale,
        freshnessSec: freshness,
      },
      prediction: {
        forecastCount,
        hazardCount,
        calibrationScore: n(aiAnalysis?.calibrationScore),
        physicalForecasts: Array.isArray(aiAnalysis?.targets) ? aiAnalysis.targets.length : 0,
      },
      missingEvidence: (evidenceBundle?.missingEvidence || []).concat(
        !rows.length ? ['NO OBSERVATIONS'] : [],
        rows.length && !measured.length ? ['DIRECT MEASUREMENT'] : [],
        rows.length && rows.length < 2 ? ['CORROBORATION'] : [],
      ).filter((v, i, a) => a.indexOf(v) === i),
    };

    return {
      version: VERSION,
      role: state.role,
      roleLabel: ROLES[state.role]?.label || 'Operator',
      compact: ROLES[state.role]?.compact || ROLES.firefighter.compact,
      quality,
      counts: { total: rows.length, measured: measured.length, derived: derived.length, predicted: predicted.length, conflicts, stale, activeTeam, acquiredTeam, forecastCount, hazardCount },
      confidence: avgConfidence,
      freshnessSec: freshness,
      runtime: { pressurePct: n(runtimeCapacity?.pressurePct), headroomPct: n(runtimeCapacity?.headroomPct), safeCapacity: n(runtimeCapacity?.safeCapacity), activeTargets: n(runtimeCapacity?.activeTargets), shouldThrottle: runtimeCapacity?.shouldThrottle, throttleAdvice: runtimeCapacity?.throttleAdvice },
      selected: selected ? {
        id: selected.trackId ?? selected.id ?? null,
        type: selected.type || 'UNKNOWN',
        source: selected.source || 'UNKNOWN',
        distanceM: n(selected.distance),
        confidencePct: n(selected.confidence) == null ? null : Math.round(n(selected.confidence) * 100),
        uncertaintyM: n(selected.uncertaintyM),
        moving: selected.moving == null ? null : Boolean(selected.moving),
      } : null,
      card,
      expandable,
      recommendations: quality === 'WAITING'
        ? ['Acquire real sensor or camera input before making a target claim.']
        : conflicts
          ? ['Resolve sensor disagreement before treating the situation as settled.']
          : stale
            ? ['Refresh or reacquire stale observations before acting on them.']
            : ['Use the shared evidence picture; open the evidence chain before making a high-consequence decision.'],
      decisions: state.decisions || [],
      workspaceMode,
      scanning,
    };
  }, [observations, selected, evidenceBundle, aiAnalysis, runtimeCapacity, worldProjection, teamTargetLocks, state.role, state.decisions, workspaceMode, scanning]);

  return { picture, roles: ROLES, role: state.role, setRole, recordDecision };
}