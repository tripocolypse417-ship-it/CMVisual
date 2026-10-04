import { useMemo } from 'react';

const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const text = (v) => v == null ? '' : String(v);

/**
 * Compresses the evidence supporting an inference into a small, auditable
 * bundle. The bundle references source observations rather than copying them.
 * This is an indexing/presentation layer, not a new source of evidence.
 */
export default function useEvidenceBundle({ inferenceId, trackId, observations = [], predictionCalibration = null } = {}) {
  return useMemo(() => {
    const rows = Array.isArray(observations) ? observations.filter(Boolean) : [];
    const ranked = rows.map((o, index) => {
      const confidence = finite(o.confidence);
      const validation = finite(o.validationScore ?? o.validation?.score);
      const corroboration = finite(o.corroborationScore ?? o.corroboration?.score);
      const uncertainty = finite(o.uncertainty);
      const measured = String(o.evidenceClass || o.evidence_class || '').toUpperCase().includes('MEASURED');
      const conflict = Boolean(o.conflict || o.disagreement || o.sensorConflict);
      const score = (measured ? 50 : 20) + (confidence == null ? 0 : confidence * 30) +
        (validation == null ? 0 : validation * 0.1) + (corroboration == null ? 0 : corroboration * 0.1) -
        (uncertainty == null ? 0 : Math.min(20, uncertainty * 5)) - (conflict ? 30 : 0);
      return {
        eventId: text(o.eventId || o.id || `observation-${index}`),
        trackId: text(o.trackId || o.id || trackId),
        sourceId: text(o.sourceId || o.source || o.sensorType || 'UNKNOWN'),
        sensorType: text(o.sensorType || o.type || 'UNKNOWN'),
        observedAt: o.observedAt || o.timestamp || null,
        evidenceClass: text(o.evidenceClass || o.evidence_class || 'UNKNOWN').toUpperCase(),
        confidence,
        validationScore: validation,
        corroborationScore: corroboration,
        uncertainty,
        conflict,
        provenance: o.provenance || null,
        rankScore: Math.round(score * 10) / 10,
      };
    }).sort((a, b) => b.rankScore - a.rankScore);

    const strongestEvidence = ranked.filter(r => !r.conflict).slice(0, 4);
    const conflictingEvidence = ranked.filter(r => r.conflict).slice(0, 4);
    const missingEvidence = [];
    if (!ranked.length) missingEvidence.push('NO OBSERVATIONS');
    if (ranked.length && !ranked.some(r => r.evidenceClass.includes('MEASURED'))) missingEvidence.push('DIRECT MEASUREMENT');
    if (ranked.length && ranked.length < 2) missingEvidence.push('CORROBORATION');

    const confidences = ranked.map(r => r.confidence).filter(v => v != null);
    const uncertaintyValues = ranked.map(r => r.uncertainty).filter(v => v != null);
    const confidence = confidences.length ? Math.max(...confidences) : null;
    const uncertainty = uncertaintyValues.length ? Math.min(...uncertaintyValues) : null;

    return {
      version: 'evidence-bundle-v1',
      inferenceId: text(inferenceId),
      trackId: text(trackId),
      observationRefs: ranked.map(r => r.eventId),
      strongestEvidence,
      conflictingEvidence,
      missingEvidence,
      confidence,
      uncertainty,
      calibrationScore: finite(predictionCalibration?.calibrationScore),
      provenanceSummary: [...new Set(ranked.map(r => r.sourceId).filter(Boolean))].join(' · ') || 'UNKNOWN',
      qualitySummary: conflictingEvidence.length ? 'CONFLICT REVIEW' : strongestEvidence.length ? 'EVIDENCE AVAILABLE' : 'INSUFFICIENT DATA',
    };
  }, [inferenceId, trackId, observations, predictionCalibration]);
}