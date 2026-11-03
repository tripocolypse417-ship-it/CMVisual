/**
 * PostgreSQL adapter for WaveRadar incident evidence.
 *
 * Supply a pg-compatible pool/client. The authenticated tenant ID must come
 * from trusted server-side auth middleware, never from request JSON.
 * RLS is reinforced by transaction-local waveradar.tenant_id.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assertUuid = (value, field) => {
  if (typeof value !== 'string' || !UUID.test(value)) throw new TypeError(`${field} must be a UUID`);
};

const toDbRow = (record) => ({
  tenantId: record.tenant_id,
  incidentId: record.incident_id,
  observationId: record.observation_id,
  eventTime: record.event_time.timestamp,
  receivedAt: record.received_at,
  evidenceClass: record.evidence_class,
  sourceType: record.source.source_type,
  sourceId: record.source.source_id,
  contentDigest: record.provenance.content_digest ?? null,
  envelope: record,
});

const fromDbRow = (row) => row?.envelope ?? null;

export function createPostgresIncidentEvidenceAdapter({ pool, tenantId, authorizeIncident }) {
  if (!pool || typeof pool.connect !== 'function') throw new TypeError('A PostgreSQL pool with connect() is required');
  assertUuid(tenantId, 'tenantId');
  if (typeof authorizeIncident !== 'function') throw new TypeError('authorizeIncident(incidentId, operation) is required');

  async function withIncident(incidentId, operation, work) {
    assertUuid(incidentId, 'incidentId');
    const allowed = await authorizeIncident(incidentId, operation);
    if (!allowed) throw new Error('INCIDENT_ACCESS_DENIED');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('waveradar.tenant_id', $1, true)", [tenantId]);
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original failure */ }
      throw error;
    } finally {
      client.release();
    }
  }

  return Object.freeze({
    async append(record) {
      const row = toDbRow(record);
      assertUuid(row.incidentId, 'incident_id');
      assertUuid(row.observationId, 'observation_id');
      return withIncident(row.incidentId, 'write', async (client) => {
        const inserted = await client.query(
          `INSERT INTO waveradar_evidence_records
            (tenant_id, incident_id, observation_id, event_time, received_at,
             evidence_class, source_type, source_id, content_digest, envelope)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
           ON CONFLICT (tenant_id, incident_id, observation_id) DO NOTHING
           RETURNING envelope`,
          [tenantId, row.incidentId, row.observationId, row.eventTime, row.receivedAt,
            row.evidenceClass, row.sourceType, row.sourceId, row.contentDigest, JSON.stringify(row.envelope)],
        );
        if (inserted.rows[0]) return fromDbRow(inserted.rows[0]);
        const existing = await client.query(
          `SELECT envelope FROM waveradar_evidence_records
           WHERE tenant_id=$1 AND incident_id=$2 AND observation_id=$3`,
          [tenantId, row.incidentId, row.observationId],
        );
        if (!existing.rows[0]) throw new Error('EVIDENCE_INSERT_CONFLICT');
        const prior = fromDbRow(existing.rows[0]);
        if (JSON.stringify(prior) !== JSON.stringify(record)) throw new Error('OBSERVATION_ID_COLLISION');
        return prior;
      });
    },

    async get(incidentId, observationId) {
      assertUuid(observationId, 'observationId');
      return withIncident(incidentId, 'read', async (client) => {
        const result = await client.query(
          `SELECT envelope FROM waveradar_evidence_records
           WHERE tenant_id=$1 AND incident_id=$2 AND observation_id=$3`,
          [tenantId, incidentId, observationId],
        );
        return fromDbRow(result.rows[0]);
      });
    },

    async list(incidentId) {
      return withIncident(incidentId, 'read', async (client) => {
        const result = await client.query(
          `SELECT envelope FROM waveradar_evidence_records
           WHERE tenant_id=$1 AND incident_id=$2
           ORDER BY event_time, received_at, observation_id`,
          [tenantId, incidentId],
        );
        return result.rows.map(fromDbRow);
      });
    },
  });
}
