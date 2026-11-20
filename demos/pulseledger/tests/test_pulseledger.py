import hashlib
import hmac
import json
import sys
import time
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app import TenantRlsLedger, step_damped_spring, verify_stripe_hmac


def sign_stripe_payload(payload: bytes, secret: str, ts: int) -> str:
    signed = f"{ts}.".encode("utf-8") + payload
    sig = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return f"t={ts},v1={sig}"


class TestPulseLedgerTreasury(unittest.TestCase):
    def setUp(self):
        self.ledger = TenantRlsLedger()
        self.kinetix_id = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
        self.aether_id = "4c9f71c2-88a1-4f3d-b711-90a21e68f412"
        self.secret = "whsec_test_secret_123"

    def test_strict_tenant_rls_isolation_blocks_cross_tenant_reads_and_writes(self):
        # Unset session context must fail closed
        with self.assertRaises(PermissionError):
            self.ledger.list_ledger_entries(self.kinetix_id)

        # Active session scoped to Kinetix cannot read Aether's rows
        self.ledger.set_tenant_context(self.kinetix_id)
        kx_rows = self.ledger.list_ledger_entries(self.kinetix_id)
        self.assertTrue(len(kx_rows) >= 2)
        self.assertTrue(all(r.tenant_id == self.kinetix_id for r in kx_rows))

        with self.assertRaises(PermissionError) as ctx:
            self.ledger.list_ledger_entries(self.aether_id)
        self.assertIn("cross-tenant", str(ctx.exception).lower())

    def test_stripe_hmac_webhook_accepts_valid_and_rejects_tampered_or_expired(self):
        now_ts = int(time.time())
        body = json.dumps({
            "id": "evt_test_paid_48000",
            "type": "invoice.paid",
            "data": {"object": {"amount_paid": 4_800_000, "description": "Series-A Enterprise Expansion"}}
        }).encode("utf-8")
        sig = sign_stripe_payload(body, self.secret, now_ts)

        self.ledger.set_tenant_context(self.kinetix_id)
        before = self.ledger.recompute_tenant_runway(self.kinetix_id)
        res = self.ledger.ingest_stripe_webhook(self.kinetix_id, body, sig, self.secret, now_ts=now_ts)
        self.assertEqual(res["status"], "accepted")
        self.assertEqual(res["http_status"], 202)
        self.assertEqual(res["cash_reserve_cents"], before["cash_reserve_cents"] + 4_800_000)
        self.assertEqual(len(res["projection"]), 36)

        # Tampered payload signature must fail
        with self.assertRaises(PermissionError):
            verify_stripe_hmac(body + b" ", sig, self.secret, now_ts=now_ts)

        # Expired timestamp (> 300s) must fail
        old_sig = sign_stripe_payload(body, self.secret, now_ts - 600)
        with self.assertRaises(PermissionError):
            verify_stripe_hmac(body, old_sig, self.secret, now_ts=now_ts)

    def test_damped_spring_converges_cleanly(self):
        pos, vel = 0.0, 0.0
        for _ in range(120):
            pos, vel = step_damped_spring(pos, vel, 100.0)
        self.assertAlmostEqual(pos, 100.0, delta=0.05)


if __name__ == "__main__":
    unittest.main()
