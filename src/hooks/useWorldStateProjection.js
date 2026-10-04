import { useMemo } from 'react';
import useWorldDataQuality from './useWorldDataQuality';

const finite = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const evidenceClass = (d) => String(
  d?.evidenceClass || d?.evidence_class || (d?.source ? 'MEASURED' : 'UNAVAILABLE')
).toUpperCase();

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
  const cleanLive = quality.accepted;
  return useMemo(() => {
    const measured = (Array.isArray(cleanLive) ? cleanLive : []).map((d, i) => projectObservation(d, i, 'MEASURED')).filter(Boolean);
    const federatedMeasured = (Array.isArray(federated) ? federated : []).map((d, i) => projectObservation(d, i, 'FEDERATED_MEASURED')).filter(Boolean);
    const historical = (Array.isArray(replay) ? replay : []).map((d, i) => projectObservation(d, i, 'HISTORICAL')).filter(Boolean);
    const predicted = (Array.isArray(predictions) ? predictions : []).flatMap((p) => {
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
    const objectiveHazards = (Array.isArray(hazards) ? hazards : []).filter(Boolean).map((h, i) => ({ ...h, id: String(h.id || `hazard-${i}`), layer: 'HAZARD' }));
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
      dataQuality: quality.stats,
      quarantined: quality.quarantined.map(q => ({ id: q.id, reasons: q.reasons, ageMs: q.ageMs })),
      policyVersion: quality.policyVersion,
      coordinateSystem: federatedMeasured.length ? 'SHARED_WORLD_FRAME_WITH_LOCAL_SESSION' : 'SESSION_LOCAL_POLAR_TO_XZ',
      semantics: { measured: 'current validated observation input in the local session frame', federatedMeasured: 'validated remote observation explicitly expressed in the configured shared world frame and transformed by explicit calibration', historical: 'previously recorded observation', predicted: 'derived forecast; never measured truth', hazards: 'objective hazard records only' },
    };
  }, [cleanLive, federated, replay, predictions, hazards, quality]);
}