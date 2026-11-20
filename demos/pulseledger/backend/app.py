"""PulseLedger — Multi-Tenant AI Treasury Backend & PostgreSQL RLS Policy Engine.

Zero-dependency core domain logic with optional FastAPI router bindings for
Series-A CFO runway forecasting, HMAC-SHA256 Stripe webhook ingestion, and strict
session-scoped tenant Row-Level Security enforcement.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
from dataclasses import dataclass, field


def verify_stripe_hmac(
    payload: bytes,
    sig_header: str,
    secret: str,
    tolerance_sec: int = 300,
    now_ts: int | None = None,
) -> dict:
    """Verify a Stripe-Signature header (`t=<unix>,v1=<hex>`) and return decoded JSON payload."""
    if not sig_header or not secret:
        raise PermissionError("Missing Stripe signature header or webhook secret")

    parts = {}
    for segment in sig_header.split(","):
        if "=" in segment:
            k, v = segment.strip().split("=", 1)
            parts[k] = v

    if "t" not in parts or "v1" not in parts:
        raise PermissionError("Malformed Stripe-Signature header")

    try:
        ts = int(parts["t"])
    except ValueError as exc:
        raise PermissionError("Invalid Stripe signature timestamp") from exc

    current_ts = int(now_ts if now_ts is not None else time.time())
    if abs(current_ts - ts) > tolerance_sec:
        raise PermissionError("Expired Stripe webhook timestamp outside tolerance window")

    signed_payload = f"{ts}.".encode("utf-8") + payload
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, parts["v1"]):
        raise PermissionError("Invalid Stripe HMAC-SHA256 signature")

    return json.loads(payload.decode("utf-8"))


def step_damped_spring(
    pos: float,
    vel: float,
    target: float,
    stiffness: float = 0.085,
    damping: float = 0.84,
) -> tuple[float, float]:
    """Critically damped spring solver for smooth, physics-driven cashflow transitions."""
    next_vel = (vel + (target - pos) * stiffness) * damping
    return (pos + next_vel, next_vel)


@dataclass
class TenantOrg:
    tenant_id: str
    slug: str
    name: str
    stage: str
    cash_reserve_cents: int
    monthly_gross_burn_cents: int
    monthly_mrr_cents: int


@dataclass
class LedgerEntry:
    entry_id: str
    tenant_id: str
    account_code: str
    category: str
    amount_cents: int
    stripe_event_id: str | None
    description: str
    occurred_at: str


class TenantRlsLedger:
    """In-process PostgreSQL RLS simulator matching `001_rls_ledger.sql` semantics."""

    def __init__(self) -> None:
        self._current_tenant_id: str | None = None
        self.organizations: dict[str, TenantOrg] = {
            "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d": TenantOrg(
                tenant_id="9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                slug="kinetix",
                name="Kinetix Labs Inc.",
                stage="Series A",
                cash_reserve_cents=1_420_000_000,
                monthly_gross_burn_cents=510_000_00,
                monthly_mrr_cents=125_000_00,
            ),
            "4c9f71c2-88a1-4f3d-b711-90a21e68f412": TenantOrg(
                tenant_id="4c9f71c2-88a1-4f3d-b711-90a21e68f412",
                slug="aether",
                name="Aether Compute Systems",
                stage="Series A",
                cash_reserve_cents=980_000_000,
                monthly_gross_burn_cents=465_000_00,
                monthly_mrr_cents=155_000_00,
            ),
            "7d2e108a-55c4-419e-82d0-119b4c772e09": TenantOrg(
                tenant_id="7d2e108a-55c4-419e-82d0-119b4c772e09",
                slug="veridian",
                name="Veridian Bio Instruments",
                stage="Seed+",
                cash_reserve_cents=540_000_000,
                monthly_gross_burn_cents=240_000_00,
                monthly_mrr_cents=45_000_00,
            ),
        }
        self._entries: list[LedgerEntry] = [
            LedgerEntry(
                entry_id="ent_kx_001",
                tenant_id="9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                account_code="4100-SAAS",
                category="revenue",
                amount_cents=12_500_000,
                stripe_event_id="evt_1QkxStripe001",
                description="Enterprise cohort invoice settlement",
                occurred_at="2026-11-18T10:14:00Z",
            ),
            LedgerEntry(
                entry_id="ent_kx_002",
                tenant_id="9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                account_code="6200-CLOUD",
                category="infrastructure",
                amount_cents=-6_840_000,
                stripe_event_id=None,
                description="GPU cluster reserved capacity",
                occurred_at="2026-11-17T22:05:00Z",
            ),
            LedgerEntry(
                entry_id="ent_ae_001",
                tenant_id="4c9f71c2-88a1-4f3d-b711-90a21e68f412",
                account_code="4100-SAAS",
                category="revenue",
                amount_cents=15_500_000,
                stripe_event_id="evt_1QaeStripe009",
                description="Annual compute reservation paid",
                occurred_at="2026-11-18T09:40:00Z",
            ),
            LedgerEntry(
                entry_id="ent_vb_001",
                tenant_id="7d2e108a-55c4-419e-82d0-119b4c772e09",
                account_code="4100-SAAS",
                category="revenue",
                amount_cents=4_500_000,
                stripe_event_id="evt_1QvbStripe004",
                description="Diagnostics lab licensing payout",
                occurred_at="2026-11-18T08:12:00Z",
            ),
        ]

    def set_tenant_context(self, tenant_id: str) -> None:
        if tenant_id not in self.organizations:
            raise ValueError(f"Unknown tenant UUID: {tenant_id}")
        self._current_tenant_id = tenant_id

    def _assert_rls(self, requested_tenant_id: str) -> TenantOrg:
        if not self._current_tenant_id:
            raise PermissionError("RLS policy violation: app.current_tenant_id session setting is unset")
        if requested_tenant_id != self._current_tenant_id:
            raise PermissionError(
                f"RLS policy blocked cross-tenant access: session={self._current_tenant_id} requested={requested_tenant_id}"
            )
        return self.organizations[requested_tenant_id]

    def list_ledger_entries(self, requested_tenant_id: str) -> list[LedgerEntry]:
        self._assert_rls(requested_tenant_id)
        return [e for e in self._entries if e.tenant_id == self._current_tenant_id]

    def ingest_stripe_webhook(
        self,
        requested_tenant_id: str,
        payload: bytes,
        sig_header: str,
        secret: str,
        now_ts: int | None = None,
    ) -> dict:
        org = self._assert_rls(requested_tenant_id)
        event = verify_stripe_hmac(payload, sig_header, secret, now_ts=now_ts)
        event_id = str(event.get("id") or f"evt_{uuid.uuid4().hex[:14]}")

        for existing in self._entries:
            if existing.tenant_id == org.tenant_id and existing.stripe_event_id == event_id:
                return {"status": "duplicate_ignored", "entry_id": existing.entry_id, **self.recompute_tenant_runway(org.tenant_id)}

        event_type = str(event.get("type") or "invoice.paid")
        amount_cents = int(event.get("data", {}).get("object", {}).get("amount_paid", 0))
        if event_type in ("charge.refunded", "payout.failed", "infra.settlement") and amount_cents > 0:
            amount_cents = -amount_cents

        entry = LedgerEntry(
            entry_id=f"ent_{uuid.uuid4().hex[:8]}",
            tenant_id=org.tenant_id,
            account_code="4100-SAAS" if amount_cents >= 0 else "6200-INFRA",
            category="stripe_webhook",
            amount_cents=amount_cents,
            stripe_event_id=event_id,
            description=str(event.get("data", {}).get("object", {}).get("description") or f"Stripe {event_type}"),
            occurred_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
        self._entries.insert(0, entry)
        org.cash_reserve_cents += amount_cents
        runway = self.recompute_tenant_runway(org.tenant_id)
        return {"status": "accepted", "http_status": 202, "entry_id": entry.entry_id, **runway}

    def recompute_tenant_runway(self, requested_tenant_id: str, horizon_months: int = 36) -> dict:
        org = self._assert_rls(requested_tenant_id)
        net_burn_cents = max(1, org.monthly_gross_burn_cents - org.monthly_mrr_cents)
        runway_months = round(org.cash_reserve_cents / net_burn_cents, 1)

        projection = []
        cash = float(org.cash_reserve_cents)
        mrr = float(org.monthly_mrr_cents)
        gross_burn = float(org.monthly_gross_burn_cents)
        for m in range(1, horizon_months + 1):
            projection.append({
                "month": m,
                "cash_cents": max(0, int(round(cash))),
                "net_burn_cents": int(round(gross_burn - mrr)),
            })
            # Conservative 2.2% monthly compounding ARR efficiency
            mrr *= 1.022
            cash = max(0.0, cash - max(0.0, gross_burn - mrr))

        return {
            "tenant_id": org.tenant_id,
            "slug": org.slug,
            "cash_reserve_cents": org.cash_reserve_cents,
            "net_burn_cents": net_burn_cents,
            "runway_months": runway_months,
            "projection": projection,
        }


def build_fastapi_router(ledger: TenantRlsLedger | None = None):
    """Attach routes to FastAPI APIRouter when FastAPI is installed."""
    from fastapi import APIRouter, Header, HTTPException, Request

    service = ledger or TenantRlsLedger()
    router = APIRouter(prefix="/v1", tags=["pulseledger"])

    @router.post("/webhooks/stripe", status_code=202)
    async def ingest_stripe(
        request: Request,
        x_tenant_id: str = Header(...),
        stripe_signature: str = Header(...),
    ):
        raw = await request.body()
        secret = "whsec_pulseledger_demo"
        try:
            service.set_tenant_context(x_tenant_id)
            return service.ingest_stripe_webhook(x_tenant_id, raw, stripe_signature, secret)
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc

    return router
