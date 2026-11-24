---
name: supabase-rls-architect
description: Production PostgreSQL and Supabase Row-Level Security (RLS), tenant isolation, indexing, connection pooling, and Edge Function architecture patterns.
---

# Supabase & PostgreSQL RLS Architect

Design zero-leakage multi-tenant PostgreSQL schemas and Supabase backends.

## Non-Negotiable Invariants
1. Enable RLS on every tenant-owned table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) and force RLS even for table owners when appropriate.
2. Scope policies via session context (`current_setting('app.tenant_id', true)` or `auth.uid()`), using indexes on every `(tenant_id, ...)` foreign key and policy predicate column.
3. Never use `SELECT *` in hot paths; select explicit columns and add composite partial indexes for queue/webhook status scans.
4. Enforce idempotent ledger/webhook ingestion with unique `(tenant_id, external_event_id)` constraints.
