/**
 * WaveRadar rescue evidence journey: DEPENDENCY-FREE SOFTWARE SIMULATION.
 *
 * Exercises the existing native-envelope -> replay projection adapter using a
 * synthetic incident and file-backed mock local/server logs. It does NOT test
 * Android SQLite, real device restarts, authenticated Core ingest, WIS/helmet
 * connections, sensor calibration, or physical ground truth.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  closeSync, existsSync, fsyncSync, mkdtempSync, openSync,
  readFileSync, rmSync, writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectNativeEnvelopeToLedger } from '../src/lib/nativeEnvelopeLedgerAdapter.js';

const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const incidentId = 'training-rescue-001';
const root = mkdtempSync(join(tmpdir(), 'waveradar-rescue-fixture-'));
const journalFile = join(root, 'local-originals.jsonl');
const acknowledgmentsFile = join(root, 'acknowledgments.jsonl');
const serverFile = join(root, 'mock-server-originals.jsonl');
const quarantineFile = join(root, 'quarantine.jsonl');

function appendDurably(file, item) {
  const descriptor = openSync(file, 'a');
  try {
    writeSync(descriptor, JSON.stringify(item) + '\n');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function rows(file) {
  return existsSync(file)
    ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
    : [];
}

function envelope(suffix, eventType, evidenceClass, receivedAt, monotonicNs, data) {
  return {
    schema_version: '1.0.0',
    event_id: '00000000-0000-4000-8000-00000000000' + suffix,
    event_type: eventType,
    incident_id: incidentId,
    source: {
      source_id: 'synthetic-test-phone', device_id: 'fixture-not-a-device',
      source_type: 'TEST_FIXTURE', adapter_id: 'fixture',
      adapter_version: '1', authorization_scope_id: 'fixture-only',
    },
    timing: {
      observed_at: null, observed_clock_domain: 'DEVICE_MONOTONIC',
      observed_monotonic_ns: monotonicNs, received_at: receivedAt,
      clock_uncertainty_ms: null,
    },
    provenance: {
      evidence_class: evidenceClass, integrity_state: 'UNASSESSED',
      collection_method: 'SYNTHETIC_FIXTURE', parent_event_ids: [],
      limitations: ['Simulation, not physical sensor or validated rescue evidence'],
    },
    spatial: { frame_id: null, position: null, pose_status: 'UNAVAILABLE', uncertainty_m: null },
    payload: { payload_schema: 'waveradar.synthetic-training-v1', data },
    evidence: {
      raw_payload_ref: null, raw_payload_sha256: sha256(data),
      retention_class: 'RESEARCH', redaction_applied: true,
    },
  };
}

function sealed(original) {
  return { original, digest: sha256(original) };
}

function readJournal() {
  return rows(journalFile).map(record => {
    assert.equal(sha256(record.original), record.digest, 'original record must match its stored digest');
    return record;
  });
}

// The file-backed mock server deduplicates by ID + exact digest, never by ID alone.
function mockIngest(record) {
  const matching = rows(serverFile).find(row => row.original.event_id === record.original.event_id);
  if (matching) {
    if (matching.digest !== record.digest) {
      appendDurably(quarantineFile, {
        event_id: record.original.event_id, digest: record.digest, reason: 'EVENT_ID_CONTENT_COLLISION',
      });
      return { id: record.original.event_id, accepted: false, reason: 'EVENT_ID_CONTENT_COLLISION' };
    }
    return { id: record.original.event_id, accepted: true, durable: true, duplicate: true };
  }
  appendDurably(serverFile, record);
  return { id: record.original.event_id, accepted: true, durable: true, duplicate: false };
}

function acknowledgeOnlyDurableReceipt(record, receipt) {
  if (receipt?.accepted !== true || receipt?.durable !== true || receipt.id !== record.original.event_id) {
    return false;
  }
  if (!rows(acknowledgmentsFile).some(row => row.id === receipt.id)) {
    appendDurably(acknowledgmentsFile, { id: receipt.id, digest: record.digest });
  }
  return true;
}

function pending() {
  const acknowledged = new Map(rows(acknowledgmentsFile).map(row => [row.id, row.digest]));
  return readJournal().filter(record => acknowledged.get(record.original.event_id) !== record.digest);
}

function replayAsKnownAt(originals, cutoff) {
  return originals.map(record => projectNativeEnvelopeToLedger(record.original, incidentId))
    .map(result => {
      assert.equal(result.accepted, true, result.reason || 'Projection rejected');
      return result.event;
    })
    .filter(event => event.receivedAt <= cutoff)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt) || a.eventId.localeCompare(b.eventId));
}

try {
  const fixture = [
    envelope('1', 'OBSERVATION', 'SIMULATED', '2026-11-21T18:00:00Z', 1000000, { motion: 'synthetic sample' }),
    envelope('2', 'ANNOTATION', 'SIMULATED', '2026-11-21T18:00:04Z', 5000000, { hazard: 'synthetic smoke marker' }),
    envelope('3', 'PREDICTION', 'SIMULATED', '2026-11-21T18:00:08Z', 9000000, { forecast: 'unverified scenario' }),
  ];
  const pristine = fixture.map(item => JSON.stringify(item));

  // Offline capture -> reconstructed local journal after simulated restart.
  fixture.forEach(item => appendDurably(journalFile, sealed(item)));
  assert.equal(readJournal().length, 3);
  let recovered = readJournal(); // Reopen disk, without reusing the capture objects.
  assert.deepEqual(recovered.map(r => r.original), fixture);
  assert.equal(pending().length, 3);

  // No network: local originals remain, no simulated acknowledgement.
  assert.equal(rows(serverFile).length, 0);
  assert.equal(acknowledgeOnlyDurableReceipt(recovered[0], { id: recovered[0].original.event_id, accepted: true }), false);
  assert.equal(acknowledgeOnlyDurableReceipt(recovered[0], { id: 'wrong-id', accepted: true, durable: true }), false);
  assert.equal(pending().length, 3);

  // First network upload succeeds durably, but the acknowledgement is lost.
  const firstReceipt = mockIngest(recovered[0]);
  assert.equal(firstReceipt.durable, true);
  assert.equal(pending().length, 3, 'missing acknowledgement must not clear pending local data');

  // Simulated reconnect: retry is idempotent; remaining originals are uploaded.
  const repeatedReceipt = mockIngest(recovered[0]);
  assert.equal(repeatedReceipt.duplicate, true);
  assert.equal(acknowledgeOnlyDurableReceipt(recovered[0], repeatedReceipt), true);
  recovered = readJournal(); // Another simulated restart.
  recovered.slice(1).forEach(record => {
    assert.equal(acknowledgeOnlyDurableReceipt(record, mockIngest(record)), true);
  });
  assert.equal(pending().length, 0);
  assert.equal(rows(serverFile).length, 3);
  assert.equal(rows(acknowledgmentsFile).length, 3);

  // Same ID + different content must quarantine the challenger, not mutate the original.
  const collision = structuredClone(recovered[0].original);
  collision.payload.data.motion = 'altered later';
  const priorServerCopy = JSON.stringify(rows(serverFile));
  const conflictReceipt = mockIngest(sealed(collision));
  assert.equal(conflictReceipt.accepted, false);
  assert.equal(conflictReceipt.reason, 'EVENT_ID_CONTENT_COLLISION');
  assert.equal(JSON.stringify(rows(serverFile)), priorServerCopy);
  assert.equal(rows(quarantineFile).length, 1);
  assert.equal(rows(quarantineFile)[0].reason, 'EVENT_ID_CONTENT_COLLISION');

  // Same canonical stream drives three simulated read-only role projections.
  const originals = rows(serverFile);
  const cutoff = '2026-11-21T18:00:05.000Z';
  const earlier = replayAsKnownAt(originals, cutoff);
  assert.equal(earlier.length, 2);
  const full = replayAsKnownAt(originals, '2026-11-21T18:01:00Z');
  const fieldIds = full.map(event => event.eventId);
  const commandIds = replayAsKnownAt(originals, '2026-11-21T18:01:00Z').map(event => event.eventId);
  const labIds = replayAsKnownAt(originals, '2026-11-21T18:01:00Z').map(event => event.eventId);
  assert.deepEqual(commandIds, fieldIds);
  assert.deepEqual(labIds, fieldIds);
  assert.equal(full[2].eventType, 'HYPOTHESIS');
  for (const event of full) {
    assert.equal(event.capturedAt, null, 'monotonic timestamp is not a UTC time');
    assert.equal(event.integrityState, 'UNASSESSED', 'fixture may not become verified');
    assert.equal(event.provenance.independentValidation, false);
    assert.equal(event.payload.originalEnvelope.spatial.pose_status, 'UNAVAILABLE');
    assert.equal(event.payload.originalEnvelope.spatial.position, null);
  }

  const unsupported = structuredClone(fixture[0]);
  unsupported.event_type = 'SCENE_ENTITY_DELETE';
  assert.equal(projectNativeEnvelopeToLedger(unsupported, incidentId).reason, 'UNSUPPORTED_EVENT_TYPE');
  assert.deepEqual(fixture.map(item => JSON.stringify(item)), pristine, 'fixture originals cannot be changed by projection');

  console.log(JSON.stringify({
    result: 'PASS', scope: 'SYNTHETIC_SOFTWARE_FIXTURE_ONLY', simulatedIncident: incidentId,
    captured: 3, recovered: 3, acknowledged: 3, serverOriginals: 3,
    duplicateRetriesSuppressed: 1, contentCollisionsQuarantined: 1,
    knowledgeTimeCutoffCount: earlier.length, replayCount: full.length,
    independentPhysicalValidation: false, liveAndroidDurability: 'NOT_TESTED',
    authenticatedCoreSync: 'NOT_TESTED', actualFieldCommandHelmetParity: 'NOT_TESTED',
  }, null, 2));
} finally {
  rmSync(root, { recursive: true, force: true });
}
