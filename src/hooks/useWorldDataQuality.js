import { useMemo } from 'react';

const finite = (v) => Number.isFinite(Number(v));

function inspect(observation, now) {
  const distance = observation?.distanceM ?? observation?.distance;
  const angle = observation?.angleDeg ?? observation?.angle;
  const timestamp = observation?.measuredAt ?? observation?.observedAt ?? observation?.timestamp;
  const parsedTimestamp = timestamp == null ? null : (Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.parse(timestamp));
  const ageMs = Number.isFinite(parsedTimestamp) ? Math.max(0, now - parsedTimestamp) : 0;
  const reasons = [];
  if (!finite(distance) || Number(distance) < 0) reasons.push('INVALID_RANGE');
  if (!finite(angle) || Number(angle) < -360 || Number(angle) > 360) reasons.push('INVALID_BEARING');
  if (timestamp != null && !Number.isFinite(parsedTimestamp)) reasons.push('INVALID_TIMESTAMP');
  if (ageMs > 15000) reasons.push('STALE');
  const limitedProvenance = !observation?.source && !observation?.provenance;
  return { accepted: reasons.length === 0, reasons, ageMs, limitedProvenance };
}

export default function useWorldDataQuality(observations = []) {
  return useMemo(() => {
    const now = Date.now();
    const accepted = [];
    const quarantined = [];
    const seen = new Set();
    (Array.isArray(observations) ? observations : []).forEach((o, index) => {
      const id = String(o?.eventId ?? o?.trackId ?? o?.id ?? `observation-${index}`);
      const result = inspect(o, now);
      if (seen.has(id)) {
        quarantined.push({ observation: o, id, ...result, reasons: [...result.reasons, 'DUPLICATE'] });
        return;
      }
      seen.add(id);
      (result.accepted ? accepted : quarantined).push({ observation: o, id, ...result });
    });
    return {
      accepted: accepted.map(x => x.observation),
      quarantined,
      stats: {
        input: accepted.length + quarantined.length,
        accepted: accepted.length,
        quarantined: quarantined.length,
        limitedProvenance: accepted.filter(x => x.limitedProvenance).length,
        acceptancePct: accepted.length + quarantined.length ? Math.round(accepted.length / (accepted.length + quarantined.length) * 100) : null,
      },
      policyVersion: 'quality-firewall-v1',
    };
  }, [observations]);
}