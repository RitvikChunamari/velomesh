---
name: stripe-webhooks-billing
description: Secure Stripe Checkout, Subscriptions, Connect, PaymentIntents, and raw-body HMAC-verified idempotent webhook ingestion.
---

# Stripe Billing & Verified Webhooks

Implement production-safe Stripe payment flows and webhook processors without deprecated Charge APIs.

## Checklist
1. Verify `Stripe-Signature` against the **raw unparsed request bytes** using constant-time comparison (`stripe.webhooks.constructEvent` / `hmac.compare_digest`), rejecting tolerance skew >300s.
2. Persist processed `event.id` in an idempotency table inside the same DB transaction as balance/subscription updates to tolerate retries safely.
3. Store monetary amounts strictly as integer minor units (`bigint` cents) — never floating-point dollars.
4. Never trust client-supplied prices or tenant IDs; derive entitlements exclusively from server-verified Checkout Sessions / Invoices.
