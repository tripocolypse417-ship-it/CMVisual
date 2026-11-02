/**
 * Deterministic, incident-scoped replay policy.
 *
 * This module filters already-authorized evidence records. It does not grant
 * access, verify sensor truth, or infer missing observations.
 *
 * AS_KNOWN_THEN: set asOf to the historical knowledge cutoff.
 * BEST_EVIDENCE_NOW: set asOf to the current review cutoff and eventThrough
 * to the historical event boundary. Later-arriving evidence is marked hindsight.
 */
const toEpoch = (value, field) => {
  const epoch = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(epoch)) throw new TypeError(`Invalid ${field} timestamp`);
  return epoch;
};

const normalizeRecord = (record) => {
  if (!record || typeof record !== 'object') throw new TypeError('Evidence record must be an object');
  const eventValue = record.eventTime?.timestamp ?? record.eventTime ?? record.event_time?.timestamp ?? record.event_time;
  const receivedValue = record.receivedAt ?? record.received_at;
  const eventTime = toEpoch(eventValue, 'eventTime');
  const receivedAt = toEpoch(receivedValue, 'receivedAt');
  const id = record.evidenceId ?? record.evidence_id ?? record.observation_id ?? record.id;
  const incidentId = record.incidentId ?? record.incident_id;
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('Evidence record requires a stable ID');
  if (typeof incidentId !== 'string' || !incidentId.trim()) throw new TypeError(`Evidence record ${id} requires an incident ID`);
  return { record, id, incidentId, eventTime, receivedAt };
};

const sortTimeline = (items) => [...items].sort((a, b) =>
  a.eventTime - b.eventTime || a.receivedAt - b.receivedAt || a.id.localeCompare(b.id)
);

export function buildIncidentReplay(records, { incidentId, mode, asOf, eventThrough = asOf } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (typeof incidentId !== 'string' || !incidentId.trim()) throw new TypeError('incidentId is required');
  if (mode !== 'AS_KNOWN_THEN' && mode !== 'BEST_EVIDENCE_NOW') {
    throw new TypeError('mode must be AS_KNOWN_THEN or BEST_EVIDENCE_NOW');
  }
  const asOfMs = toEpoch(asOf, 'asOf');
  const eventThroughMs = toEpoch(eventThrough, 'eventThrough');
  const normalized = records.map(normalizeRecord);
  const seen = new Set();
  for (const item of normalized) {
    if (seen.has(item.id)) throw new TypeError(`Duplicate evidence ID: ${item.id}`);
    seen.add(item.id);
  }

  const included = [];
  const excluded = [];
  for (const item of normalized) {
    if (item.incidentId !== incidentId) {
      excluded.push({ evidenceId: item.id, reason: 'DIFFERENT_INCIDENT' });
      continue;
    }
    const eventIsInWindow = item.eventTime <= eventThroughMs;
    const receivedByReviewCutoff = item.receivedAt <= asOfMs;
    const receivedByHistoricalCutoff = mode !== 'AS_KNOWN_THEN' || receivedByReviewCutoff;
    const include = eventIsInWindow && receivedByReviewCutoff && receivedByHistoricalCutoff;
    if (!include) {
      excluded.push({
        evidenceId: item.id,
        reason: !eventIsInWindow ? 'EVENT_AFTER_SELECTED_TIME' : 'RECEIVED_AFTER_REVIEW_CUTOFF',
      });
      continue;
    }
    included.push(item);
  }

  return {
    incidentId,
    mode,
    asOf: new Date(asOfMs).toISOString(),
    eventThrough: new Date(eventThroughMs).toISOString(),
    records: sortTimeline(included).map((item) => ({
      ...item.record,
      replay: {
        evidenceId: item.id,
        incidentId: item.incidentId,
        eventTimeMs: item.eventTime,
        receivedAtMs: item.receivedAt,
        arrivedAfterAsKnownCutoff: mode === 'BEST_EVIDENCE_NOW' && item.receivedAt > eventThroughMs,
        hindsightOnly: mode === 'BEST_EVIDENCE_NOW' && item.receivedAt > eventThroughMs,
      },
    })),
    excluded,
    policyVersion: '1.1.0',
  };
}
