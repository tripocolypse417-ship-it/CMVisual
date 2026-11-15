import { useMemo } from 'react';
import useWorldDataQuality from './useWorldDataQuality';
import { normalizeEvidenceClass, DATA_CONTRACT_VERSION } from '@/lib/dataContract';
import { partitionFreshBuildRecords, FRESH_BUILD_GENERATION, FRESH_BUILD_POLICY_VERSION } from '@/lib/freshBuildBoundary';

const finite = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const evidenceClass = (d) => normalizeEvidenceClass(d?.evidenceClass || d?.evidence_class || (d?.source ? 'MEASURED' : 'UNKNOWN'));

const projectObservation = (d, index, layer = 'MEASURED') => {
  const distanceM = finite(d?.distanceM ?? d?.distance);
  const angleDeg = finite(d?.angleDeg ?? d?.angle);
  const position = d?.position && finite(d.position.x) != null && finite(d.position.z) != null
    ? { x: finite(d.position.x), y: finite(d.position.y) ?? 0, z: finite(d.position.z) }
    : distanceM != null && angleDeg != null
      ? (() => { const r = angleDeg * Math.PI / 180; return { x: distanceM * Math.cos(r), y: 0, z: distanceM * Math.sin(r) }; })()
      : null;
  if (!position) return null;
  const id = String(d?.trackId ?? d?.id ?? `observation-${index}`);
  return {
    id,
    trackId: id,
    layer,
    type: d?.type || 'unknown',
    position,
    distanceM,
    angleDeg,
    moving: typeof d?.moving === 'boolean' ? d.moving : null,
    speedMps: finite(d?.speedMps ?? d?.speed ?? d?.derivedTrack?.speedMps),
    headingDeg: finite(d?.headingDeg ?? d?.derivedTrack?.headingDeg),
    confidence: finite(d?.confidence),
    uncertaintyM: finite(d?.uncertaintyM),
    source: d?.source || 'LOCAL INPUT',
    provenance: d?.provenance || null,
    evidenceClass: layer === 'PREDICTED' ? 'PREDICTED' : evidenceClass(d),
    observedAt: d?.observedAt || d?.measuredAt || d?.timestamp || null,
    geo: d?.geo || null,
    raw: d,
  };
};

export default function useWorldStateProjection({ live = [], federated = [], replay = [], predictions = [], hazards = [] } = {}) {
  const quality = useWorldDataQuality(live);
  const livePartition = partitionFreshBuildRecords(quality.accepted);
  const federatedPartition = partitionFreshBuildRecords(federated);
  const replayPartition = partitionFreshBuildRecords(replay);
  const hazardPartition = partitionFreshBuildRecords(hazards);
  const cleanLive = livePartition.eligible;
  const trustedLiveIds = new Set(cleanLive.map(o => String(o?.eventId ?? o?.observationId ?? o?.id ?? '')).filter(Boolean));
  const cleanFederated = federatedPartition.eligible;
  const cleanReplay = replayPartition.eligible;
  const cleanHazards = hazardPartition.eligible;
  // Prediction records are kept separate from measurements and require explicit
  // lineage to fresh-generation source observations before they may be displayed.
  const cleanPredictions = (Array.isArray(predictions) ? predictions : []).filter(p =>
    p?.buildGeneration === FRESH_BUILD_GENERATION &&
    typeof p?.modelVersion === 'string' && p.modelVersion.trim() &&
    Array.isArray(p?.sourceObservationIds) && p.sourceObservationIds.length > 0 &&
    p.sourceObservationIds.every(id => trustedLiveIds.has(String(id))) &&
    (p?.observedAt || p?.generatedAt || p?.timestamp)
  );
  return useMemo(() => {
    const measured = (Array.isArray(cleanLive) ? cleanLive : []).map((d, i) => projectObservation(d, i, 'MEASURED')).filter(Boolean);
    const federatedMeasured = (Array.isArray(cleanFederated) ? cleanFederated : []).map((d, i) => projectObservation(d, i, 'FEDERATED_MEASURED')).filter(Boolean);
    const historical = (Array.isArray(cleanReplay) ? cleanReplay : []).map((d, i) => projectObservation(d, i, 'HISTORICAL')).filter(Boolean);
    const predicted = (Array.isArray(cleanPredictions) ? cleanPredictions : []).flatMap((p) => {
      const base = p?.position || p?.currentPosition || null;
      return (Array.isArray(p?.horizons) ? p.horizons : []).map((h, i) => {
        const pos = h?.position || (base && finite(h?.velocity?.x) != null && finite(h?.velocity?.z) != null ? {
          x: finite(base.x) + finite(h.velocity.x) * Number(h.horizonMs || 0) / 1000,
          y: finite(base.y) || 0,
          z: finite(base.z) + finite(h.velocity.z) * Number(h.horizonMs || 0) / 1000,
        } : null);
        if (!pos || finite(pos.x) == null || finite(pos.z) == null) return null;
        return {
          id: `${String(p.trackId || p.id || `prediction-${i}`)}:${h.horizonMs || i}`,
          trackId: String(p.trackId || p.id || `prediction-${i}`),
          layer: 'PREDICTED', type: p.type || 'unknown', position: { x: Number(pos.x), y: finite(pos.y) || 0, z: Number(pos.z) },
          horizonMs: finite(h.horizonMs), uncertaintyM: finite(h.uncertaintyM), confidence: finite(h.confidence),
          source: p.source || 'TRAJECTORY MODEL', provenance: p.provenance || null, evidenceClass: 'PREDICTED', raw: p,
        };
      }).filter(Boolean);
    });
    const objectiveHazards = (Array.isArray(cleanHazards) ? cleanHazards : []).filter(Boolean).map((h, i) => ({ ...h, id: String(h.id || `hazard-${i}`), layer: 'HAZARD' }));
    const byTrack = new Map();
    measured.forEach(o => byTrack.set(o.trackId, o));
    return {
      measured,
      federatedMeasured,
      historical,
      predicted,
      hazards: objectiveHazards,
      tracks: [...byTrack.values()],
      counts: { measured: measured.length, federatedMeasured: federatedMeasured.length, historical: historical.length, predicted: predicted.length, hazards: objectiveHazards.length },
      dataQuality: {
        input: quality.stats.input,
        accepted: livePartition.eligible.length,
        quarantined: quality.quarantined.length + livePartition.quarantined.length,
        limitedProvenance: 0,
        acceptancePct: quality.stats.input
          ? Math.round(livePartition.eligible.length / quality.stats.input * 100)
          : null,
        schemaVersion: DATA_CONTRACT_VERSION,
        trustPolicy: FRESH_BUILD_POLICY_VERSION,
      },
      quarantined: [
        ...quality.quarantined.map(q => ({ id: q.id, reasons: q.reasons, ageMs: q.ageMs })),
        ...livePartition.quarantined.map(q => ({ id: q.id, reasons: q.reasons, ageMs: null })),
        ...federatedPartition.quarantined.map(q => ({ id: q.id, reasons: q.reasons, ageMs: null })),
        ...replayPartition.quarantined.map(q => ({ id: q.id, reasons: q.reasons, ageMs: null })),
        ...hazardPartition.quarantined.map(q => ({ id: q.id, reasons: q.reasons, ageMs: null })),
      ],
      policyVersion: `${quality.policyVersion}+${FRESH_BUILD_POLICY_VERSION}`,
      buildGeneration: FRESH_BUILD_GENERATION,
      freshBuildBoundary: {
        liveInput: livePartition.inputCount, liveTrusted: livePartition.eligible.length,
        federatedInput: federatedPartition.inputCount, federatedTrusted: federatedPartition.eligible.length,
        replayInput: replayPartition.inputCount, replayTrusted: replayPartition.eligible.length,
        hazardsInput: hazardPartition.inputCount, hazardsTrusted: hazardPartition.eligible.length,
        predictionsInput: Array.isArray(predictions) ? predictions.length : 0,
        predictionsTrusted: cleanPredictions.length,
      },
      dataContractVersion: DATA_CONTRACT_VERSION,
      coordinateSystem: federatedMeasured.length ? 'SHARED_WORLD_FRAME_WITH_LOCAL_SESSION' : 'SESSION_LOCAL_POLAR_TO_XZ',
      semantics: { measured: 'current validated observation input in the local session frame', federatedMeasured: 'validated remote observation explicitly expressed in the configured shared world frame and transformed by explicit calibration', historical: 'previously recorded observation', predicted: 'derived forecast; never measured truth', hazards: 'objective hazard records only' },
    };
  }, [cleanLive, cleanFederated, cleanReplay, cleanPredictions, cleanHazards, predictions, quality, livePartition, federatedPartition, replayPartition, hazardPartition]);
}