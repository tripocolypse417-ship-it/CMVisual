import assert from 'node:assert/strict';
import { buildUnifiedIncidentReadModel } from '../src/lib/unifiedIncidentReadModel.js';

const incidentId = 'training-one-os';
const make = (id, received, type = 'OBSERVATION') => ({
  schema_version: '1.0.0',
  incident_id: incidentId,
  event_id: id,
  event_type: type,
  source: { source_id: 'synthetic-guardian-x', adapter_id: 'test', adapter_version: '1' },
  timing: {
    observed_at: null,
    observed_clock_domain: 'DEVICE_MONOTONIC',
    observed_monotonic_ns: 1000000,
    received_at: received,
  },
  provenance: {
    evidence_class: 'SIMULATED', integrity_state: 'UNASSESSED',
    collection_method: 'SYNTHETIC_FIXTURE', parent_event_ids: [],
  },
  spatial: { pose_status: 'UNAVAILABLE', position: null },
  evidence: { raw_payload_ref: null, raw_payload_sha256: null },
  payload: { data: { source: 'synthetic', value: id } },
});
const first = make('event-01', '2026-11-22T02:00:00Z');
const pending = make('event-02', '2026-11-22T02:01:00Z', 'PREDICTION');
const reference = JSON.stringify([first, pending]);

// Local sees both originals offline. Command only sees records durably
// accepted by Core; source receive time may be much earlier.
const snapshot = buildUnifiedIncidentReadModel({
  incidentId,
  localEnvelopes: [first, pending],
  coreEvents: [{ envelope: structuredClone(first), serverAcceptedAt: '2026-11-22T02:10:00Z' }],
  asKnownAt: '2026-11-22T02:05:00Z',
});
assert.equal(snapshot.ok, true);
assert.deepEqual(snapshot.field.shared.map(x => x.eventId), ['event-01']);
assert.deepEqual(snapshot.command.shared.map(x => x.eventId), ['event-01']);
assert.deepEqual(snapshot.field.pendingLocal.map(x => x.eventId), ['event-02']);
assert.equal(snapshot.replay.asKnownThen.length, 0, 'delayed sync must not rewrite historical Command knowledge');
assert.equal(snapshot.replay.bestCurrentReconstruction.length, 1);
assert.equal(snapshot.field.shared[0].receivedAt, '2026-11-22T02:00:00.000Z', 'source/client received time preserved');
assert.equal(snapshot.field.shared[0].serverAcceptedAt, '2026-11-22T02:10:00.000Z');
assert.equal(snapshot.field.shared[0].capturedAt, null, 'monotonic source time is not wall UTC');
assert.equal(snapshot.field.shared[0].evidenceClass, 'SIMULATED');
assert.equal(snapshot.field.shared[0].integrityState, 'UNASSESSED');
assert.equal(snapshot.field.shared[0].provenance.independentValidation, false);
assert.equal(snapshot.field.shared[0].payload.originalEnvelope.spatial.pose_status, 'UNAVAILABLE');
assert.equal(snapshot.command.shared[0].payload.originalEnvelope.spatial.position, null);
assert.equal(JSON.stringify([first, pending]), reference, 'original source records unchanged');

// Read models are isolated copies, not independent stores or mutable authority.
snapshot.field.shared[0].payload.originalEnvelope.source.source_id = 'altered-ui';
assert.equal(snapshot.command.shared[0].sourceId, 'synthetic-guardian-x');
assert.equal(snapshot.replay.bestCurrentReconstruction[0].payload.originalEnvelope.source.source_id, 'synthetic-guardian-x');

// Correct server cutoff, not client receipt time.
const postSync = buildUnifiedIncidentReadModel({
  incidentId, localEnvelopes: [first],
  coreEvents: [{ envelope: first, serverAcceptedAt: '2026-11-22T02:10:00Z' }],
  asKnownAt: '2026-11-22T02:11:00Z',
});
assert.deepEqual(postSync.replay.asKnownThen.map(x => x.eventId), ['event-01']);

// No Core events means no shared command facts, even when a phone has local measurements.
const offline = buildUnifiedIncidentReadModel({ incidentId, localEnvelopes: [first, pending] });
assert.equal(offline.field.pendingLocal.length, 2);
assert.equal(offline.command.shared.length, 0);

// Reject missing or forged-looking server time, rather than using local timestamp.
const invalidReceipt = buildUnifiedIncidentReadModel({
  incidentId,
  coreEvents: [{ envelope: first, serverAcceptedAt: '2026-11-22T02:00:00' }],
});
assert.equal(invalidReceipt.command.shared.length, 0);
assert.equal(invalidReceipt.quarantine[0].reason, 'TRUSTED_SERVER_RECEIPT_REQUIRED');

// Same ID + different content must not silently win.
const altered = structuredClone(first);
altered.payload.data.value = 'tampered';
const collided = buildUnifiedIncidentReadModel({
  incidentId,
  localEnvelopes: [first],
  coreEvents: [{ envelope: altered, serverAcceptedAt: '2026-11-22T02:10:00Z' }],
});
assert.equal(collided.command.shared.length, 0);
assert.equal(collided.field.pendingLocal.length, 0);
assert.equal(collided.quarantine[0].reason, 'LOCAL_CORE_ID_CONTENT_CONFLICT');

const serverConflict = buildUnifiedIncidentReadModel({
  incidentId,
  coreEvents: [
    { envelope: first, serverAcceptedAt: '2026-11-22T02:10:00Z' },
    { envelope: altered, serverAcceptedAt: '2026-11-22T02:10:00Z' },
  ],
});
assert.equal(serverConflict.command.shared.length, 0);
assert.equal(serverConflict.quarantine[0].reason, 'CORE_ID_CONTENT_OR_TIME_CONFLICT');

const wrongIncident = structuredClone(first);
wrongIncident.incident_id = 'other-incident';
assert.equal(buildUnifiedIncidentReadModel({
  incidentId, localEnvelopes: [wrongIncident],
}).quarantine[0].reason, 'INCIDENT_ID_MISMATCH_OR_MISSING');

const unsupported = structuredClone(first);
unsupported.event_type = 'SCENE_ENTITY_UPSERT';
assert.equal(buildUnifiedIncidentReadModel({
  incidentId, localEnvelopes: [unsupported],
}).quarantine[0].reason, 'UNSUPPORTED_EVENT_TYPE');

// No input-validation bypasses for an invalid cutoff or nonarray stream.
assert.equal(buildUnifiedIncidentReadModel({
  incidentId, asKnownAt: 'yesterday',
}).reason, 'INVALID_KNOWLEDGE_CUTOFF');
assert.equal(buildUnifiedIncidentReadModel({
  incidentId, coreEvents: {},
}).reason, 'ARRAY_INPUTS_REQUIRED');

// Different key order is still the same original JSON content.
const reordered = {
  payload: first.payload, evidence: first.evidence, spatial: first.spatial,
  provenance: first.provenance, timing: first.timing, source: first.source,
  event_type: first.event_type, event_id: first.event_id,
  incident_id: first.incident_id, schema_version: first.schema_version,
};
const reorderedModel = buildUnifiedIncidentReadModel({
  incidentId, localEnvelopes: [first],
  coreEvents: [{ envelope: reordered, serverAcceptedAt: '2026-11-22T02:10:00Z' }],
});
assert.equal(reorderedModel.command.shared.length, 1);
assert.equal(reorderedModel.quarantine.length, 0);

console.log(JSON.stringify({
  result: 'PASS',
  scope: 'SYNTHETIC_READ_ONLY_PROJECTION_ONLY',
  fieldCommandReplayCanonicalSharedIds: true,
  delayedUploadNotBackdated: true,
  clockDomainAndEvidenceTruthPreserved: true,
  collisionQuarantined: true,
  physicalSensorVerified: false,
  liveCoreIntegrationVerified: false,
  nativeSQLiteDurabilityVerified: false,
}, null, 2));
