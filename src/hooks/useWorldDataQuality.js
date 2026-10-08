import { useMemo } from 'react';
import { normalizeObservation, getModalityDefinition, DATA_CONTRACT_VERSION } from '@/lib/dataContract';

const finite = (v) => Number.isFinite(Number(v));
const parseTime = (v) => { if (v == null) return null; const n = Number(v); if (Number.isFinite(n)) return n; const p = Date.parse(String(v)); return Number.isFinite(p) ? p : null; };

function inspect(observation, now) {
  const normalized = normalizeObservation(observation, { now });
  const modality = getModalityDefinition(normalized.modality || normalized.sensorFamily);
  const distance = normalized.distanceM ?? normalized.distance;
  const angle = normalized.angleDeg ?? normalized.angle;
  const timestamp = normalized.timestamp ?? parseTime(normalized.observedAt);
  const ageMs = Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : 0;
  const reasons = [];
  if (modality.supports?.includes('range') && (!finite(distance) || Number(distance) < 0)) reasons.push('INVALID_RANGE');
  if (modality.supports?.includes('bearing') && (!finite(angle) || Number(angle) < -360 || Number(angle) > 360)) reasons.push('INVALID_BEARING');
  if (timestamp == null && observation?.timestamp != null) reasons.push('INVALID_TIMESTAMP');
  if (ageMs > 15000) reasons.push('STALE');
  const hasPayload = Boolean(normalized.value != null || normalized.attributes != null || normalized.bbox != null || normalized.position != null || normalized.geo != null || distance != null || angle != null);
  if (!hasPayload) reasons.push('NO_USABLE_PAYLOAD');
  return { accepted: reasons.length === 0, reasons, ageMs, limitedProvenance: !normalized.source || !normalized.provenance?.source, normalized, schemaVersion: DATA_CONTRACT_VERSION };
}

export default function useWorldDataQuality(observations = []) {
  return useMemo(() => {
    const now = Date.now(); const accepted = []; const quarantined = []; const seen = new Set();
    (Array.isArray(observations) ? observations : []).forEach((o, index) => {
      const id = String(o?.eventId ?? o?.observationId ?? o?.trackId ?? o?.id ?? `observation-${index}`);
      const result = inspect(o, now);
      if (seen.has(id)) { quarantined.push({ observation: o, id, ...result, reasons: [...result.reasons, 'DUPLICATE'] }); return; }
      seen.add(id); (result.accepted ? accepted : quarantined).push({ observation: result.normalized, id, ...result });
    });
    return { accepted: accepted.map(x => x.observation), quarantined, stats: { input: accepted.length + quarantined.length, accepted: accepted.length, quarantined: quarantined.length, limitedProvenance: accepted.filter(x => x.limitedProvenance).length, acceptancePct: accepted.length + quarantined.length ? Math.round(accepted.length / (accepted.length + quarantined.length) * 100) : null, schemaVersion: DATA_CONTRACT_VERSION }, policyVersion: 'quality-v2-canonical' };
  }, [observations]);
}
