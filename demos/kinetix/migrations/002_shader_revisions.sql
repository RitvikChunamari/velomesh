-- Kinetix Collaborative Shader Studio — PostgreSQL 16 + Immutable CRDT Revision & Cloudflare R2 Schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE shader_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_revision_id UUID REFERENCES shader_revisions(revision_id),
  author_id VARCHAR(64) NOT NULL,
  lamport_clock BIGINT NOT NULL,
  crdt_snapshot BYTEA NOT NULL,
  uniforms_json JSONB NOT NULL,
  r2_asset_key TEXT,
  sha256_checksum CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_shader_revisions_project_clock
  ON shader_revisions (project_id, lamport_clock DESC);

CREATE TABLE r2_asset_uploads (
  object_key TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content_type VARCHAR(64) NOT NULL,
  byte_length BIGINT NOT NULL CHECK (byte_length > 0),
  etag CHAR(64) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Enforce append-only immutability on committed shader revisions
CREATE OR REPLACE FUNCTION reject_revision_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'shader_revisions are immutable; commit a new revision instead of mutating revision_id=%', OLD.revision_id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_shader_revisions_immutable
  BEFORE UPDATE OR DELETE ON shader_revisions
  FOR EACH ROW EXECUTE FUNCTION reject_revision_mutation();
