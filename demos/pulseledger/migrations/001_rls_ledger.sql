-- PulseLedger Multi-Tenant Treasury Schema — PostgreSQL 16 + Strict Row-Level Security
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stage VARCHAR(32) NOT NULL DEFAULT 'Series A',
  cash_reserve_cents BIGINT NOT NULL DEFAULT 0,
  monthly_gross_burn_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE treasury_ledger_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_code VARCHAR(32) NOT NULL,
  category VARCHAR(32) NOT NULL,
  amount_cents BIGINT NOT NULL,
  stripe_event_id VARCHAR(64),
  description TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_ledger_tenant_occurred
  ON treasury_ledger_entries (tenant_id, occurred_at DESC);

CREATE UNIQUE INDEX idx_ledger_tenant_stripe_event
  ON treasury_ledger_entries (tenant_id, stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

ALTER TABLE treasury_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_ledger_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY enforce_tenant_isolation ON treasury_ledger_entries
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
