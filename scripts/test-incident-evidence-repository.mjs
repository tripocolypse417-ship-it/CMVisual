import assert from 'node:assert/strict';
import { createIncidentEvidenceRepository, validateIncidentEvidence } from '../src/lib/incidentEvidenceRepository.js';

const envelope = (id, eventTime = '2026-11-02T14:00:00Z', incidentId = 'incident-1') => ({
  schema_version: '1.0.0',
  observation_id: id,
  incident_id: incidentId,
  source: { source_type: 'ANDROID_SENSOR', source_id: 'device-01' },
  event_time: { timestamp: eventTime, clock_basis: 'UTC', uncertainty_ms: 20 },
  received_at: '2026-11-02T14:00:02Z',
  evidence_class: 'MEASURED',
  payload: { sample: 42 },
  provenance: { capture_method: 'authorized-device-api' },
});

const db = new Map();
const adapter = {
  async append(record) {
    const key = `${record.incident_id}:${record.observation_id}`;
    if (db.has(key)) throw new Error('DUPLICATE_OBSERVATION');
    db.set(key, structuredClone(record));
    return structuredClone(record);
  },
  async get(incidentId, observationId) {
    return structuredClone(db.get(`${incidentId}:${observationId}`) ?? null);
  },
  async list(incidentId) {
    return [...db.values()].filter((item) => item.incident_id === incidentId).map((item) => structuredClone(item));
  },
};

const repository = createIncidentEvidenceRepository(adapter);
await repository.append(envelope('later', '2026-11-02T14:02:00Z'));
await repository.append(envelope('earlier', '2026-11-02T14:01:00Z'));
await repository.append(envelope('other', '2026-11-02T14:00:30Z', 'incident-2'));

const ordered = await repository.list('incident-1');
assert.deepEqual(ordered.map((item) => item.observation_id), ['earlier', 'later']);
assert.equal(await repository.get('incident-1', 'earlier').then((item) => item.incident_id), 'incident-1');
assert.equal(await repository.get('incident-1', 'missing'), null);
assert.equal((await repository.list('incident-2')).length, 1);

// Validation rejects unknown evidence classes and missing provenance.
assert.throws(() => validateIncidentEvidence({ ...envelope('bad'), evidence_class: 'TRUTH' }), /evidence_class/);
assert.throws(() => validateIncidentEvidence({ ...envelope('bad'), provenance: {} }), /capture_method/);
assert.throws(() => validateIncidentEvidence({ ...envelope('bad'), event_time: { timestamp: 'not-a-date' } }), /event_time/);
assert.throws(() => createIncidentEvidenceRepository({ append() {} }), /get\(\)/);

// The repository detects a misbehaving adapter that leaks another incident's records.
const leaking = createIncidentEvidenceRepository({
  append: async (record) => record,
  get: async () => envelope('leak', undefined, 'incident-2'),
  list: async () => [envelope('leak', undefined, 'incident-2')],
});
await assert.rejects(() => leaking.get('incident-1', 'leak'), /outside the requested identity scope/);
await assert.rejects(() => leaking.list('incident-1'), /outside the requested incident scope/);

console.log('Incident evidence repository contract checks passed. Adapter tests use an in-memory test double, not production persistence.');
