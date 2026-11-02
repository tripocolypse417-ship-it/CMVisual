/**
 * Deterministic incident replay policy.
 *
 * This module filters already-authorized evidence records. It does not grant
 * access, verify sensor truth, or infer missing observations.
 */
const toEpoch = (value, field) => {
  const epoch = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(epoch)) throw new TypeError(`Invalid ${field} timestamp`);
  return epoch;
};

const normalizeRecord = (record) => {
  if (!record || typeof record !== 'object') throw new TypeError('Evidence record must be an object');
  const eventTime = toEpoch(record.eventTime ?? record.event_time, 'eventTime');
  const receivedAt = toEpoch(record.receivedAt ?? record.received_at, 'receivedAt');
  const id = record.evidenceId ?? record.evidence_id ?? record.id;
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('Evidence record requires a stable ID');
  return { record, id, eventTime, receivedAt };
};

const sortTimeline = (items) => items.sort((a, b) =>
  a.eventTime - b.eventTime || a.receivedAt - b.receivedAt || a.id.localeCompare(b.id)
);

export function buildIncidentReplay(records, { mode, asOf, eventThrough = asOf } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
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
    const eventIsInWindow = item.eventTime <= eventThroughMs;
    const wasKnownAtCutoff = item.receivedAt <= asOfMs;
    const include = eventIsInWindow && (mode === 'BEST_EVIDENCE_NOW' || wasKnownAtCutoff);
    if (!include) {
      excluded.push({
        evidenceId: item.id,
        reason: !eventIsInWindow ? 'EVENT_AFTER_SELECTED_TIME' : 'RECEIVED_AFTER_AS_KNOWN_CUTOFF',
      });
      continue;
    }
    included.push({
      ...item.record,
      replay: {
        evidenceId: item.id,
        eventTimeMs: item.eventTime,
        receivedAtMs: item.receivedAt,
        arrivedAfterAsKnownCutoff: item.receivedAt > asOfMs,
        hindsightOnly: mode === 'BEST_EVIDENCE_NOW' && item.receivedAt > asOfMs,
      },
    });
  }

  return {
    mode,
    asOf: new Date(asOfMs).toISOString(),
    eventThrough: new Date(eventThroughMs).toISOString(),
    records: sortTimeline(included),
    excluded,
    policyVersion: '1.0.0',
  };
}
