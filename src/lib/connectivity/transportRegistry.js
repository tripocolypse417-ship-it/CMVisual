export const TRANSPORT_KINDS = Object.freeze(['WIFI','CELLULAR','LMR_GATEWAY','SIDELINK','MESH','SATELLITE','ETHERNET','BLUETOOTH']);
const DEFAULT_MAX_AGE_MS = 15000;

function finiteNonNegative(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
}
function timestampMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function fresh(at, nowMs, maxAgeMs) {
  const age = nowMs - at;
  return age >= 0 && age <= maxAgeMs;
}

/** Normalize an explicit adapter report; this is not a radio driver. */
export function normalizeTransportReport(report, options = {}) {
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const maxAgeMs = finiteNonNegative(options.maxAgeMs) ?? DEFAULT_MAX_AGE_MS;
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { transportId: null, kind: null, state: 'UNKNOWN', reason: 'NO_VALID_REPORT' };
  }
  const transportId = typeof report.transportId === 'string' && report.transportId.trim() ? report.transportId.trim() : null;
  const kind = TRANSPORT_KINDS.includes(report.kind) ? report.kind : null;
  if (!transportId || !kind) return { transportId, kind, state: 'UNKNOWN', reason: 'IDENTITY_OR_KIND_MISSING' };
  const observedAt = timestampMs(report.observedAt);
  if (report.supported === false) return { transportId, kind, state: 'UNAVAILABLE', reason: 'ADAPTER_REPORTS_UNSUPPORTED', observedAt };
  if (report.authorized === false || report.permissionGranted === false) return { transportId, kind, state: 'UNAUTHORIZED', reason: 'AUTHORIZATION_OR_PERMISSION_MISSING', observedAt };
  if (report.configured !== true) return { transportId, kind, state: 'NOT_CONFIGURED', reason: 'TRANSPORT_NOT_CONFIGURED', observedAt };
  if (report.linkState !== 'CONNECTED') return { transportId, kind, state: 'DISCONNECTED', reason: 'NO_ACTIVE_LINK', observedAt };
  if (observedAt == null || !fresh(observedAt, nowMs, maxAgeMs)) {
    return { transportId, kind, state: 'STALE', reason: observedAt == null ? 'OBSERVATION_TIME_UNKNOWN' : 'REPORT_EXPIRED', observedAt };
  }
  const signalQuality = finiteNonNegative(report.signalQuality);
  const packetLossPct = finiteNonNegative(report.packetLossPct);
  const latencyMs = finiteNonNegative(report.latencyMs);
  const degraded = report.health === 'DEGRADED' || (packetLossPct != null && packetLossPct > 10) || (signalQuality != null && signalQuality < 0.2);
  return {
    transportId, kind, state: degraded ? 'DEGRADED' : 'CONNECTED',
    reason: degraded ? 'ADAPTER_REPORTED_OR_DERIVED_DEGRADATION' : null,
    observedAt, signalQuality, packetLossPct, latencyMs,
    encrypted: report.encrypted === true,
    authenticatedPeer: report.authenticatedPeer === true,
    acknowledgementSupported: report.acknowledgementSupported === true,
    operationalUseValidated: report.operationalUseValidated === true,
    supportedMessageClasses: Array.isArray(report.supportedMessageClasses)
      ? [...new Set(report.supportedMessageClasses.filter(value => typeof value === 'string'))] : []
  };
}

/** Select from an explicit preference order. This does not connect or transmit. */
export function selectEligibleTransport(reports, policy = {}, options = {}) {
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const maxAgeMs = finiteNonNegative(options.maxAgeMs) ?? DEFAULT_MAX_AGE_MS;
  const normalized = (Array.isArray(reports) ? reports : []).map(report => normalizeTransportReport(report, { nowMs, maxAgeMs }));
  const byId = new Map(normalized.map(item => [item.transportId, item]));
  const order = Array.isArray(policy.preferenceOrder) ? policy.preferenceOrder : [];
  const messageClass = typeof policy.messageClass === 'string' ? policy.messageClass : null;
  const safetyCritical = policy.safetyCritical === true;
  for (const id of order) {
    const candidate = byId.get(id);
    if (!candidate || candidate.state !== 'CONNECTED') continue;
    if (messageClass && !candidate.supportedMessageClasses.includes(messageClass)) continue;
    if (safetyCritical && (
      candidate.encrypted !== true || candidate.authenticatedPeer !== true ||
      candidate.acknowledgementSupported !== true || candidate.operationalUseValidated !== true
    )) continue;
    return { selectedTransportId: candidate.transportId, kind: candidate.kind, state: 'ELIGIBLE', reason: 'MATCHED_EXPLICIT_POLICY', deliveryGuaranteed: false, normalizedReports: normalized };
  }
  return {
    selectedTransportId: null, kind: null, state: 'NO_ELIGIBLE_TRANSPORT',
    reason: safetyCritical ? 'NO_TRANSPORT_PASSES_SAFETY_POLICY' : 'NO_TRANSPORT_MATCHES_POLICY',
    deliveryGuaranteed: false, normalizedReports: normalized
  };
}

export function buildConnectivitySnapshot(reports, options = {}) {
  const normalized = (Array.isArray(reports) ? reports : []).map(report => normalizeTransportReport(report, options));
  return {
    observedTransportCount: normalized.length,
    connectedCount: normalized.filter(item => item.state === 'CONNECTED').length,
    degradedCount: normalized.filter(item => item.state === 'DEGRADED').length,
    unavailableCount: normalized.filter(item => item.state === 'UNAVAILABLE').length,
    unknownCount: normalized.filter(item => item.state === 'UNKNOWN' || item.state === 'STALE').length,
    transports: normalized,
    generatedAt: Number.isFinite(options.nowMs) ? options.nowMs : Date.now(),
    evidenceClass: 'DERIVED',
    operationalReadiness: 'NOT_ESTABLISHED'
  };
}
