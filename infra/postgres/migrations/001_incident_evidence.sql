-- WaveRadar PostgreSQL reference migration.
-- REVIEW/DEPLOYMENT REQUIRED: this file is not executed by the application or CI.
-- Apply only to a new, isolated database after security review and backup/restore tests.
BEGIN;

CREATE TABLE IF NOT EXISTS waveradar_incidents (
  tenant_id uuid NOT NULL,
  incident_id uuid NOT NULL,
  incident_reference text,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, incident_id)
);

CREATE TABLE IF NOT EXISTS waveradar_evidence_records (
  tenant_id uuid NOT NULL,
  incident_id uuid NOT NULL,
  observation_id uuid NOT NULL,
  event_time timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  evidence_class text NOT NULL CHECK (
    evidence_class IN ('MEASURED','DERIVED','INFERRED','PREDICTED','SIMULATED','UNKNOWN','UNAVAILABLE')
  ),
  source_type text NOT NULL,
  source_id text NOT NULL,
  content_digest text,
  envelope jsonb NOT NULL CHECK (jsonb_typeof(envelope) = 'object'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, incident_id, observation_id),
  FOREIGN KEY (tenant_id, incident_id)
    REFERENCES waveradar_incidents (tenant_id, incident_id)
    ON DELETE RESTRICT,
  CHECK (jsonb_typeof(envelope->'event_time') = 'object'),
  CHECK (envelope->>'incident_id' = incident_id::text),
  CHECK (envelope->>'observation_id' = observation_id::text),
  CHECK (envelope->>'evidence_class' = evidence_class)
);

CREATE INDEX IF NOT EXISTS waveradar_evidence_timeline_idx
  ON waveradar_evidence_records (tenant_id, incident_id, event_time, received_at, observation_id);

CREATE INDEX IF NOT EXISTS waveradar_evidence_source_idx
  ON waveradar_evidence_records (tenant_id, source_type, source_id, received_at DESC);

-- Accepted evidence is append-only. Corrections must be inserted as new records
-- with explicit lineage in the envelope, never applied as UPDATE/DELETE.
CREATE OR REPLACE FUNCTION waveradar_reject_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'WaveRadar accepted evidence is append-only; create a linked correction record';
END;
$$;

DROP TRIGGER IF EXISTS waveradar_evidence_no_mutation ON waveradar_evidence_records;
CREATE TRIGGER waveradar_evidence_no_mutation
  BEFORE UPDATE OR DELETE ON waveradar_evidence_records
  FOR EACH ROW EXECUTE FUNCTION waveradar_reject_evidence_mutation();

ALTER TABLE waveradar_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE waveradar_incidents FORCE ROW LEVEL SECURITY;
ALTER TABLE waveradar_evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE waveradar_evidence_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waveradar_incident_tenant_scope ON waveradar_incidents;
CREATE POLICY waveradar_incident_tenant_scope ON waveradar_incidents
  USING (tenant_id = nullif(current_setting('waveradar.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('waveradar.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS waveradar_evidence_tenant_scope ON waveradar_evidence_records;
CREATE POLICY waveradar_evidence_tenant_scope ON waveradar_evidence_records
  USING (tenant_id = nullif(current_setting('waveradar.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('waveradar.tenant_id', true), '')::uuid);

COMMIT;
