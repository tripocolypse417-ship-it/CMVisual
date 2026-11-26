/**
 * Read-only convergence adapter for the ONE WaveRadar incident.
 *
 * Works over the existing native envelope -> replay adapter; it is NOT
 * another durable store, sync worker, authentication mechanism or Core API.
 *
 * The caller MUST populate coreEvents solely from an authenticated,
 * owner/incident-scoped Core snapshot. This pure helper cannot independently
 * authenticate the source of a supplied serverAcceptedAt timestamp.
 *
 * Do not merge source/client received_at with true server-acceptance time.
 * An offline capture can be visible to its local Field view while NOT yet
 * known by incident Command or a strict "as known then" replay.
 */
import { projectNativeEnvelopeToLedger } from './nativeEnvelopeLedgerAdapter.js';

const isText = value => typeof value === 'string' && value.trim().length > 0;
// Core timestamps use at most PostgreSQL microsecond precision. Keep the
// original sub-millisecond significance instead of rounding through Date.
function iso(value) {
  if (!isText(value)) return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, base, fraction = '', zone] = match;
  if (base.startsWith('0000') || zone === '-00:00') return null;
  const localMillis = Date.parse(base + 'Z');
  if (!Number.isFinite(localMillis) || new Date(localMillis).toISOString().slice(0, 19) !== base) return null;
  const millis = Date.parse(base + zone);
  if (!Number.isFinite(millis)) return null;
  const utc = new Date(millis).toISOString();
  if (!/^\d{4}-/.test(utc) || utc.startsWith('0000')) return null;
  const micros = fraction.padEnd(6, '0');
  const normalized = micros.endsWith('000') ? micros.slice(0, 3) : micros;
  return utc.slice(0, 19) + '.' + normalized + 'Z';
}
const knowledgeKey = time => time.slice(0, 19) + '.' + time.slice(20, -1).padEnd(6, '0') + 'Z';
function compareKnowledgeTime(a, b) {
  const left = knowledgeKey(a), right = knowledgeKey(b);
  return left < right ? -1 : left > right ? 1 : 0;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}
const serialize = value => JSON.stringify(canonical(value));
const clone = value => JSON.parse(JSON.stringify(value));

function assemble(envelope, incidentId) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { ok: false, reason: 'INVALID_ENVELOPE' };
  }
  // Cross-client identity must be explicit. Unscoped legacy records need a
  // controlled migration, never silently assigned to the current incident.
  if (envelope.incident_id !== incidentId) {
    return { ok: false, reason: 'INCIDENT_ID_MISMATCH_OR_MISSING' };
  }
  const projected = projectNativeEnvelopeToLedger(envelope, incidentId);
  if (!projected.accepted) return { ok: false, reason: projected.reason };
  try {
    const fingerprint = serialize(projected.event.payload.originalEnvelope);
    return {
      ok: true,
      id: projected.event.eventId,
      fingerprint,
      event: projected.event,
    };
  } catch {
    return { ok: false, reason: 'NON_SERIALIZABLE_ENVELOPE' };
  }
}

function collect(items, incidentId, server = false) {
  const accepted = new Map();
  const conflicts = new Set();
  const quarantine = [];
  for (const [index, item] of items.entries()) {
    const envelope = server ? item?.envelope : item;
    const result = assemble(envelope, incidentId);
    const ref = result.id || envelope?.event_id || null;
    if (!result.ok) {
      quarantine.push({ eventId: ref, reason: result.reason, index, source: server ? 'core' : 'local' });
      continue;
    }
    const receipt = server ? iso(item?.serverAcceptedAt) : null;
    if (server && !receipt) {
      quarantine.push({ eventId: result.id, reason: 'TRUSTED_SERVER_RECEIPT_REQUIRED', index, source: 'core' });
      continue;
    }
    if (conflicts.has(result.id)) continue;
    const prior = accepted.get(result.id);
    if (prior) {
      if (prior.fingerprint !== result.fingerprint || (server && prior.serverAcceptedAt !== receipt)) {
        conflicts.add(result.id);
        accepted.delete(result.id);
        quarantine.push({
          eventId: result.id, reason: server ? 'CORE_ID_CONTENT_OR_TIME_CONFLICT' : 'LOCAL_ID_CONTENT_CONFLICT',
          index, source: server ? 'core' : 'local',
        });
      }
      continue;
    }
    accepted.set(result.id, { ...result, serverAcceptedAt: receipt });
  }
  return { accepted, conflicts, quarantine };
}

/**
 * @param {object} args
 * @param {string} args.incidentId
 * @param {object[]} args.localEnvelopes - persisted local ORIGINAL envelopes.
 * @param {{envelope:object,serverAcceptedAt:string}[]} args.coreEvents
 *   Must originate from a separate authenticated Core snapshot; NEVER trust
 *   acceptance time passed directly by a device or simulation in field mode.
 * @param {string|null} args.asKnownAt - UTC timestamp for strict server knowledge.
 *
 * @returns Projected, independent Field/Command/Replay read models plus a
 * quarantine report. No source bytes or records are modified.
 */
export function buildUnifiedIncidentReadModel({
  incidentId,
  localEnvelopes = [],
  coreEvents = [],
  asKnownAt = null,
} = {}) {
  if (!isText(incidentId)) return { ok: false, reason: 'INCIDENT_ID_REQUIRED' };
  if (!Array.isArray(localEnvelopes) || !Array.isArray(coreEvents)) {
    return { ok: false, reason: 'ARRAY_INPUTS_REQUIRED' };
  }
  const cutoff = asKnownAt === null ? null : iso(asKnownAt);
  if (asKnownAt !== null && !cutoff) return { ok: false, reason: 'INVALID_KNOWLEDGE_CUTOFF' };

  const local = collect(localEnvelopes, incidentId, false);
  const remote = collect(coreEvents, incidentId, true);
  const quarantine = [...local.quarantine, ...remote.quarantine];

  const localOnly = [];
  const shared = [];
  for (const [id, record] of local.accepted) {
    const matching = remote.accepted.get(id);
    if (matching) {
      if (matching.fingerprint !== record.fingerprint) {
        quarantine.push({ eventId: id, reason: 'LOCAL_CORE_ID_CONTENT_CONFLICT', source: 'cross-store' });
      }
      // Wait for an independently reconciled event, do not display a
      // conflicting same-ID event as if it was safely synchronized.
      continue;
    }
    if (remote.conflicts.has(id)) {
      quarantine.push({ eventId: id, reason: 'CORE_EVENT_CONFLICT', source: 'cross-store' });
      continue;
    }
    localOnly.push({ ...record.event, serverAcceptedAt: null, deliveryState: 'LOCAL_ONLY' });
  }
  for (const [id, record] of remote.accepted) {
    if (local.conflicts.has(id) || remote.conflicts.has(id)) continue;
    const matching = local.accepted.get(id);
    if (matching && matching.fingerprint !== record.fingerprint) continue;
    shared.push({
      ...record.event,
      // receivedAt remains the ORIGINAL envelope's client receipt time.
      serverAcceptedAt: record.serverAcceptedAt,
      deliveryState: 'CORE_ACCEPTED',
    });
  }

  const eventOrder = (a, b) =>
    compareKnowledgeTime(a.serverAcceptedAt, b.serverAcceptedAt) || a.eventId.localeCompare(b.eventId);
  shared.sort(eventOrder);
  localOnly.sort((a, b) =>
    a.receivedAt.localeCompare(b.receivedAt) || a.eventId.localeCompare(b.eventId));

  // These three displays use the SAME accepted incident records. Each has
  // its own copied read model so accidental rendering edits cannot propagate.
  const knowledge = shared.filter(record => cutoff === null || compareKnowledgeTime(record.serverAcceptedAt, cutoff) <= 0);
  return {
    ok: true,
    incidentId,
    contract: 'waveradar-event-envelope-v1',
    status: 'PROJECTION_ONLY_NOT_LIVE_INTEGRATION',
    field: { shared: clone(shared), pendingLocal: clone(localOnly) },
    command: { shared: clone(shared) },
    replay: {
      asKnownAt: cutoff,
      asKnownThen: clone(knowledge),
      bestCurrentReconstruction: clone(shared),
    },
    quarantine,
    counts: {
      localPending: localOnly.length,
      coreAccepted: shared.length,
      asKnownThen: knowledge.length,
      quarantinedEntries: quarantine.length,
    },
    limits: [
      'No live device, WIS, helmet, Lab, authentication or server connection is performed here.',
      'Core acceptance timestamps must come from an authenticated, scoped upstream response.',
      'Delivery acceptance is not physical sensor calibration or independent validation.',
      'Local-only events are not represented as already known by incident command.',
    ],
  };
}
