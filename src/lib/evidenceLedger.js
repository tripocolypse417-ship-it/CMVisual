/**
 * WaveRadar append-only temporal evidence ledger.
 *
 * Preserves source events, capture/receipt time, provenance and competing
 * hypotheses. It is a deterministic in-memory core, not durable storage,
 * cryptographic verification, clock synchronization or a safety certification.
 */
import { parseTimestamp, normalizeEvidenceClass } from './dataContract.js';

export const EVIDENCE_EVENT_TYPES = Object.freeze([
  'OBSERVATION', 'DERIVATION', 'HYPOTHESIS', 'CONFLICT', 'RETRACTION',
]);
const KNOWN_TYPES = new Set(EVIDENCE_EVENT_TYPES);
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const finite = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function jsonClone(value) {
  if (value === undefined) return null;
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new TypeError('event fields must be JSON-serializable');
  return JSON.parse(encoded);
}

export function normalizeEvidenceEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('event must be an object');
  const eventId = text(input.eventId);
  const incidentId = text(input.incidentId);
  const eventType = text(input.eventType)?.toUpperCase();
  if (!eventId) throw new TypeError('eventId is required');
  if (!incidentId) throw new TypeError('incidentId is required');
  if (!KNOWN_TYPES.has(eventType)) throw new TypeError('unsupported eventType');
  const capturedAt = parseTimestamp(input.capturedAt ?? input.observedAt ?? input.timestamp);
  const receivedAt = parseTimestamp(input.receivedAt ?? input.ingestedAt);
  const sequence = finite(input.sequence);
  const sourceEventIds = [...new Set((Array.isArray(input.sourceEventIds) ? input.sourceEventIds : []).map(text).filter(Boolean))];
  const payload = jsonClone(input.payload ?? null);
  const provenance = input.provenance && typeof input.provenance === 'object' ? jsonClone(input.provenance) : {};
  const normalized = {
    schemaVersion: 'waveradar-evidence-event-v1',
    eventId,
    incidentId,
    eventType,
    sourceId: text(input.sourceId),
    capturedAt,
    receivedAt,
    clockDomain: text(input.clockDomain),
    sequence,
    evidenceClass: normalizeEvidenceClass(input.evidenceClass, 'UNKNOWN'),
    integrityState: text(input.integrityState) || 'UNASSESSED',
    coordinateFrame: text(input.coordinateFrame),
    calibrationRef: text(input.calibrationRef),
    rawEvidenceRef: text(input.rawEvidenceRef),
    rawEvidenceHash: text(input.rawEvidenceHash),
    sourceEventIds,
    hypothesisGroupId: text(input.hypothesisGroupId),
    hypothesisStatus: text(input.hypothesisStatus) || (eventType === 'HYPOTHESIS' ? 'OPEN' : null),
    payload,
    provenance,
  };
  return deepFreeze(normalized);
}

export function createEvidenceLedger(events = []) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  const accepted = [];
  const rejected = [];
  const byId = new Map();

  for (let index = 0; index < events.length; index += 1) {
    let event;
    try {
      event = normalizeEvidenceEvent(events[index]);
    } catch (error) {
      rejected.push({ index, eventId: text(events[index]?.eventId), reason: 'INVALID_EVENT', detail: error.message });
      continue;
    }
    const prior = byId.get(event.eventId);
    if (prior) {
      if (stableStringify(prior) === stableStringify(event)) {
        rejected.push({ index, eventId: event.eventId, reason: 'DUPLICATE_IDEMPOTENT_EVENT' });
      } else {
        rejected.push({ index, eventId: event.eventId, reason: 'EVENT_ID_COLLISION' });
      }
      continue;
    }
    byId.set(event.eventId, event);
    accepted.push(event);
  }

  const knownIds = new Set(accepted.map(event => event.eventId));
  const edges = [];
  const danglingReferences = [];
  for (const event of accepted) {
    for (const sourceEventId of event.sourceEventIds) {
      if (knownIds.has(sourceEventId)) edges.push({ from: sourceEventId, to: event.eventId, relation: 'DERIVED_FROM' });
      else danglingReferences.push({ eventId: event.eventId, sourceEventId });
    }
  }

  const hypotheses = new Map();
  for (const event of accepted) {
    if (event.eventType !== 'HYPOTHESIS' || !event.hypothesisGroupId) continue;
    const group = hypotheses.get(event.hypothesisGroupId) || [];
    group.push(event);
    hypotheses.set(event.hypothesisGroupId, group);
  }

  return deepFreeze({
    schemaVersion: 'waveradar-evidence-ledger-v1',
    events: accepted,
    edges,
    rejected,
    danglingReferences,
    hypothesisGroups: [...hypotheses.entries()].map(([groupId, members]) => ({
      groupId,
      hypotheses: members.map(event => event.eventId),
      status: members.some(event => event.hypothesisStatus === 'OPEN') ? 'MULTIPLE_OR_OPEN' : 'CLOSED',
    })),
    counts: {
      accepted: accepted.length,
      rejected: rejected.length,
      hypotheses: accepted.filter(event => event.eventType === 'HYPOTHESIS').length,
      conflicts: accepted.filter(event => event.eventType === 'CONFLICT').length,
    },
  });
}

/**
 * Reconstructs the events known to the system by receipt time.
 * Events with unknown receipt time are excluded rather than assigned a time.
 */
export function eventsKnownAt(ledger, knowledgeTime) {
  const cutoff = parseTimestamp(knowledgeTime);
  if (!ledger || !Array.isArray(ledger.events) || cutoff == null) throw new TypeError('ledger and valid knowledgeTime are required');
  return ledger.events
    .filter(event => event.receivedAt != null && event.receivedAt <= cutoff)
    .slice()
    .sort((a, b) => a.receivedAt - b.receivedAt || (a.sequence ?? Infinity) - (b.sequence ?? Infinity) || a.eventId.localeCompare(b.eventId));
}

/**
 * Event-time view. Events without capture time or with a different clock
 * domain are excluded; this function does not align clocks.
 */
export function eventsAtCaptureTime(ledger, { start, end, clockDomain } = {}) {
  const from = start == null ? -Infinity : parseTimestamp(start);
  const to = end == null ? Infinity : parseTimestamp(end);
  if (!ledger || !Array.isArray(ledger.events) || from == null || to == null || from > to) throw new TypeError('valid ledger time range is required');
  const domain = text(clockDomain);
  return ledger.events
    .filter(event => event.capturedAt != null && (!domain || event.clockDomain === domain) && event.capturedAt >= from && event.capturedAt <= to)
    .slice()
    .sort((a, b) => a.capturedAt - b.capturedAt || (a.sequence ?? Infinity) - (b.sequence ?? Infinity) || a.eventId.localeCompare(b.eventId));
}
