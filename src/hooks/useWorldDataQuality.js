import { useMemo } from 'react';
import { normalizeObservation, getModalityDefinition, DATA_CONTRACT_VERSION } from '@/lib/dataContract';

const finite = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const parseTime = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const parsed = Date.parse(String(v));
  return Number.isFinite(parsed) ? parsed : null;
};

function inspect(observation, now) {
  const rawTimestamp = observation?.observedAt ?? observation?.measuredAt ?? observation?.timestamp;
  const normalized = normalizeObservation(observation, { now });
  const modality = getModalityDefinition(normalized.modality || normalized.sensorFamily);
  const distance = normalized.distanceM ?? normalized.distance;
  const angle = normalized.angleDeg ?? normalized.angle;
  const timestamp = normalized.timestamp ?? parseTime(normalized.observedAt);
  const ageMs = Number.isFinite(timestamp) ? now - timestamp : null;
  const reasons = [];

  if (rawTimestamp == null || rawTimestamp === '') reasons.push('UNKNOWN_TIMESTAMP');
  else if (!Number.isFinite(timestamp)) reasons.push('INVALID_TIMESTAMP');
  if (ageMs != null && ageMs < -30000) reasons.push('FUTURE_TIMESTAMP');

  // Freshness is a policy threshold, not a sensor-accuracy claim. A source may
  // supply a task-specific window; otherwise the conservative default applies.
  const configuredWindow = normalized.freshnessWindowMs;
  const staleAfterMs = finite(configuredWindow) && Number(configuredWindow) > 0
    ? Number(configuredWindow)
    : 15000;
  if (ageMs != null && ageMs > staleAfterMs) reasons.push('STALE');

  if (modality.supports?.includes('range') && (!finite(distance) || Number(distance) < 0)) reasons.push('INVALID_RANGE');
  if (modality.supports?.includes('bearing') && (!finite(angle) || Number(angle) < -360 || Number(angle) > 360)) reasons.push('INVALID_BEARING');

  if (modality.supports?.includes('position')) {
    const p = normalized.position || normalized.geo;
    const lat = finite(p?.lat ?? p?.latitude) ? Number(p.lat ?? p.latitude) : null;
    const lon = finite(p?.lon ?? p?.lng ?? p?.longitude) ? Number(p.lon ?? p.lng ?? p.longitude) : null;
    const hasLatLon = lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    const hasLocalPosition = finite(p?.x) && finite(p?.z) && (p?.y == null || finite(p.y));
    if (!hasLatLon && !hasLocalPosition) reasons.push('INVALID_POSITION');
  }

  const hasPayload = Boolean(
    normalized.value != null ||
    normalized.attributes != null ||
    normalized.bbox != null ||
    normalized.position != null ||
    normalized.geo != null ||
    distance != null ||
    angle != null
  );
  if (!hasPayload) reasons.push('NO_USABLE_PAYLOAD');

  const hasSource = Boolean(observation?.source || observation?.sensorType || observation?.modality || observation?.sensorFamily);
  const hasProvenance = Boolean(observation?.provenance?.source || observation?.provenance?.deviceId || observation?.deviceId);
  return {
    accepted: reasons.length === 0,
    reasons,
    ageMs: ageMs == null ? null : Math.max(0, ageMs),
    limitedProvenance: !hasSource || !hasProvenance,
    normalized,
    schemaVersion: DATA_CONTRACT_VERSION,
    freshnessPolicy: configuredWindow ? 'SOURCE_CONFIGURED' : 'DEFAULT_15000MS_NOT_MODALITY_VALIDATED',
  };
}

export default function useWorldDataQuality(observations = []) {
  return useMemo(() => {
    const now = Date.now();
    const accepted = [];
    const quarantined = [];
    const seen = new Set();
    (Array.isArray(observations) ? observations : []).forEach((o, index) => {
      const id = String(o?.eventId ?? o?.observationId ?? o?.trackId ?? o?.id ?? `observation-${index}`);
      const result = inspect(o, now);
      if (seen.has(id)) {
        quarantined.push({ observation: o, id, ...result, reasons: [...result.reasons, 'DUPLICATE'] });
        return;
      }
      seen.add(id);
      (result.accepted ? accepted : quarantined).push({ observation: result.normalized, id, ...result });
    });
    return {
      accepted: accepted.map(x => x.observation),
      quarantined,
      stats: {
        input: accepted.length + quarantined.length,
        accepted: accepted.length,
        quarantined: quarantined.length,
        limitedProvenance: accepted.filter(x => x.limitedProvenance).length,
        acceptancePct: accepted.length + quarantined.length
          ? Math.round(accepted.length / (accepted.length + quarantined.length) * 100)
          : null,
        schemaVersion: DATA_CONTRACT_VERSION,
      },
      policyVersion: 'quality-v3-timestamp-safe',
    };
  }, [observations]);
}
