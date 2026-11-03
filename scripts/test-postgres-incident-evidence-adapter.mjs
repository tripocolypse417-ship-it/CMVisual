import assert from 'node:assert/strict';
import { createPostgresIncidentEvidenceAdapter } from '../src/lib/postgresIncidentEvidenceAdapter.js';

const tenantId = '11111111-1111-4111-8111-111111111111';
const incidentId = '22222222-2222-4222-8222-222222222222';
const observationId = '33333333-3333-4333-8333-333333333333';
const record = {
  schema_version: '1.0.0', observation_id: observationId, incident_id: incidentId,
  source: { source_type: 'ANDROID_SENSOR', source_id: 'device-1' },
  event_time: { timestamp: '2026-11-02T14:00:00Z', uncertainty_ms: 15 },
  received_at: '2026-11-02T14:00:01Z', evidence_class: 'MEASURED',
  payload: { value: 17 }, provenance: { capture_method: 'device-api', content_digest: 'sha256:' + 'a'.repeat(64) },
};
const rows = new Map();
const calls = [];
const client = {
  async query(sql, values = []) {
    calls.push({ sql, values });
    if (sql.startsWith('INSERT INTO')) {
      const key = values[1] + ':' + values[2];
      if (rows.has(key)) return { rows: [] };
      rows.set(key, { envelope: JSON.parse(values[9]) });
      return { rows: [{ envelope: rows.get(key).envelope }] };
    }
    if (sql.includes('SELECT envelope')) {
      if (sql.includes('observation_id=$3')) {
        const row = rows.get(values[1] + ':' + values[2]);
        return { rows: row ? [{ ...row, same_payload: JSON.stringify(row.envelope) === JSON.stringify(JSON.parse(values[3])) }] : [] };
      }
      return { rows: [...rows.entries()].filter(([key]) => key.startsWith(values[1] + ':')).map(([, row]) => row) };
    }
    return { rows: [] };
  },
  release() {},
};
const pool = { async connect() { return client; } };
let authorized = true;
const adapter = createPostgresIncidentEvidenceAdapter({
  pool, tenantId,
  authorizeIncident: async (id, operation) => authorized && id === incidentId && ['read', 'write'].includes(operation),
});
assert.deepEqual(await adapter.append(record), record);
assert.deepEqual(await adapter.append(record), record, 'identical retries are idempotent');
assert.deepEqual(await adapter.get(incidentId, observationId), record);
assert.deepEqual(await adapter.list(incidentId), [record]);
assert.ok(calls.some(({ sql, values }) => sql.includes("set_config('waveradar.tenant_id'") && values[0] === tenantId));
assert.ok(calls.some(({ sql, values }) => sql.startsWith('INSERT INTO') && values[0] === tenantId));
authorized = false;
await assert.rejects(() => adapter.list(incidentId), /INCIDENT_ACCESS_DENIED/);
assert.throws(() => createPostgresIncidentEvidenceAdapter({ pool, tenantId: 'bad', authorizeIncident: async () => true }), /tenantId must be a UUID/);
console.log('PostgreSQL evidence adapter contract checks passed with a query-level test double; no live database was used.');
