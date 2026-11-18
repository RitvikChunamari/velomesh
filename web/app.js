// VeloMesh — Pure Black & White 21st.dev Swiss Product Experience

const WORKBENCH_BLUEPRINTS = {
  treasury: {
    prompt:
      "Build PulseLedger, a multi-tenant AI treasury platform for Series-A CFOs with Black and White Swiss typography, interactive spring cashflow graphs, FastAPI + PostgreSQL RLS, and Stripe webhooks.",
    layers: {
      frontend: {
        file: "components/RunwayCanvas.tsx",
        skills: ["frontend-design", "impeccable", "design-system", "apple-design"],
        code: `// Synthesized Frontend Layer — Achromatic Swiss Tokens
import { useEffect, useRef } from "react";
import { mountCashflowMesh } from "../shaders/cashflowRibbon";

export function RunwayForecastStage({ tenantId, burnSeries }: RunwayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    return mountCashflowMesh(canvasRef.current, {
      series: burnSeries,
      strokeColor: "#F8F8FA",
      gridColor: "#222226",
      respectReducedMotion: true,
    });
  }, [burnSeries]);

  return (
    <section className="runway-stage" aria-label="36-Month Cashflow Projection">
      <canvas ref={canvasRef} width={960} height={360} />
    </section>
  );
}`
      },
      motion: {
        file: "motion/choreography.ts",
        skills: ["apple-design", "emil-design-eng", "gsap-core"],
        code: `// Synthesized Motion Layer — Critically Damped Spring + Reduced Motion
export function stepDampedSpring(pos: number, vel: number, target: number) {
  const stiffness = 0.085;
  const damping = 0.84;
  const nextVel = (vel + (target - pos) * stiffness) * damping;
  return { pos: pos + nextVel, vel: nextVel };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}`
      },
      backend: {
        file: "api/webhooks_stripe.py",
        skills: ["backend-patterns", "api-connector-builder", "security-review"],
        code: `# Synthesized Backend Layer — FastAPI + HMAC Verification + RBAC
from fastapi import APIRouter, Depends
from app.security import verify_stripe_hmac, require_cfo_session
from app.services.runway import recompute_tenant_runway

router = APIRouter(prefix="/v1/webhooks", tags=["treasury-webhooks"])

@router.post("/stripe", status_code=202)
async def ingest_stripe_invoice_event(
    payload: bytes = Depends(verify_stripe_hmac),
    tenant = Depends(require_cfo_session),
):
    delta = await recompute_tenant_runway(tenant_id=tenant.id, raw_event=payload)
    return {"status": "accepted", "runway_months": delta.runway_months}`
      },
      database: {
        file: "migrations/001_rls_ledger.sql",
        skills: ["postgres-patterns", "prisma-patterns", "database-migrations"],
        code: `-- Synthesized Database Layer — PostgreSQL 16 + Strict Row-Level Security
CREATE TABLE treasury_ledger_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_code VARCHAR(32) NOT NULL,
  amount_cents BIGINT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_ledger_tenant_occurred
  ON treasury_ledger_entries (tenant_id, occurred_at DESC);

ALTER TABLE treasury_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY enforce_tenant_isolation ON treasury_ledger_entries
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);`
      },
      mcp: {
        file: "velomesh-mcp.lock.json",
        skills: ["find-skills", "skill-scout", "mcp-connector-forge"],
        code: `{
  "velomesh_internet_provisioning": [
    "[00.07s] Querying GitHub + 21st.dev + Context7: stripe webhook mcp",
    "[00.22s] Discovered & validated: stripe/agent-toolkit (MCP Server)",
    "[00.36s] Synthesized local skill wrapper: plaid-treasury-sync",
    "[00.41s] Wired across Claude Code, Cursor, Codex, Copilot, Antigravity & OpenCode"
  ]
}`
      },
      qa: {
        file: "qa/verification-receipt.txt",
        skills: ["tdd", "browser-qa", "impeccable"],
        code: `VELOMESH AUTONOMOUS VERIFICATION RECEIPT
========================================
[PASS] pytest tests/test_rls_isolation.py        -- 18/18 cross-tenant checks passed
[PASS] node --test tests/website.test.mjs        -- 3/3 monochrome & contract checks passed
[PASS] playwright --viewport=1440,390,320        -- Zero layout overflow across viewports
[PASS] impeccable detect http://localhost:4173   -- 0 anti-patterns, 0 advisories`
      }
    }
  },
  webglStudio: {
    prompt:
      "Create Kinetix, a real-time collaborative shader & UI studio in Black and White Swiss minimalism with WebSockets CRDT state sync in Node.js, PostgreSQL versioning, and R2 uploads.",
    layers: {
      frontend: {
        file: "components/ShaderViewport.tsx",
        skills: ["frontend-design", "rcs-frontend", "apple-design"],
        code: `// Synthesized Frontend Layer — Achromatic Retina Canvas Stage
export function ShaderViewport({ sceneGraph, peers }: ViewportProps) {
  return (
    <section className="shader-stage" aria-label="Interactive Monochrome Viewport">
      <canvas id="kinetix-surface" width={1280} height={720} />
      <aside aria-label="Active Editors">{peers.length} synced</aside>
    </section>
  );
}`
      },
      motion: {
        file: "motion/timeline.ts",
        skills: ["apple-design", "animate-expo", "emil-design-eng"],
        code: `// Synthesized Motion Layer — Pointer Velocity Handoff
export function projectMomentum(velocityPxPerSec: number, decel = 0.994): number {
  return (velocityPxPerSec / 1000) * decel / (1 - decel);
}`
      },
      backend: {
        file: "api/crdt_ws.ts",
        skills: ["backend-patterns", "security-review"],
        code: `// Synthesized Backend Layer — WebSocket CRDT Room Sync
export function handleCrdtUpdate(roomId: string, update: Uint8Array, actorId: string) {
  assertTenantMember(roomId, actorId);
  const clock = mergeStateVector(roomId, update);
  broadcastExcept(roomId, actorId, update);
  return { mergedClock: clock };
}`
      },
      database: {
        file: "migrations/002_shader_revisions.sql",
        skills: ["postgres-patterns", "database-migrations"],
        code: `-- Synthesized Database Layer — Immutable Shader Revision History
CREATE TABLE shader_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  crdt_snapshot BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);`
      },
      mcp: {
        file: "velomesh-mcp.lock.json",
        skills: ["find-skills", "skill-scout"],
        code: `{
  "velomesh_internet_provisioning": [
    "[00.09s] Resolved 21st.dev Swiss Canvas & WebSockets CRDT patterns",
    "[00.28s] Bound Context7 docs: Yjs + CloudFlare R2 presigned PUT",
    "[00.44s] Active across Claude Code, Cursor, Codex, Copilot, Antigravity & OpenCode"
  ]
}`
      },
      qa: {
        file: "qa/verification-receipt.txt",
        skills: ["tdd", "impeccable", "web-design-guidelines"],
        code: `VELOMESH CRDT STUDIO VERIFICATION
=================================
[PASS] CRDT convergence property test (500 concurrent ops)
[PASS] Reduced-motion static fallback verified
[PASS] Zero console errors and zero overflow at 320px/390px/1440px`
      }
    }
  },
  clinical: {
    prompt:
      "Build AetherMD, a HIPAA-aligned clinical triage portal for emergency physicians with crisp monochrome Swiss typography, FastAPI FHIR integration, chained audit log DB, and WCAG AA contrast.",
    layers: {
      frontend: {
        file: "components/TriageBoard.tsx",
        skills: ["frontend-design", "ui-ux-pro-max", "hallmark"],
        code: `// Synthesized Frontend Layer — High-Contrast Clinical Triage Matrix
export function TriageBoard({ queue }: { queue: TriagePatient[] }) {
  return (
    <table className="swiss-triage-table" aria-label="Emergency Acuity Queue">
      <thead><tr><th>Acuity</th><th>Patient</th><th>Wait</th></tr></thead>
      <tbody>{queue.map(renderPatientRow)}</tbody>
    </table>
  );
}`
      },
      motion: {
        file: "motion/focusPolicy.ts",
        skills: ["apple-design", "fixing-accessibility"],
        code: `// Clinical UI Motion Policy: zero distraction loops, instant focus feedback
export const CLINICAL_TRANSITION_MS = 140;
export const ALLOW_AMBIENT_LOOP = false;`
      },
      backend: {
        file: "api/fhir_triage.py",
        skills: ["backend-patterns", "hipaa-compliance", "security-review"],
        code: `# Synthesized Backend Layer — PHI Audit-Logged FastAPI Triage Route
@router.post("/v1/triage", status_code=201)
async def record_triage(bundle: FhirObservationIn, clinician = Depends(require_md)):
    entry = await write_chained_audit_event(actor=clinician.id, payload=bundle)
    return {"observation_id": entry.id, "audit_hash": entry.sha256}`
      },
      database: {
        file: "migrations/003_audit_chain.sql",
        skills: ["postgres-patterns", "hipaa-compliance"],
        code: `-- Synthesized Database Layer — Append-Only Chained PHI Audit Ledger
CREATE TABLE phi_access_ledger (
  seq BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id UUID NOT NULL,
  prev_hash CHAR(64) NOT NULL,
  row_hash CHAR(64) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);`
      },
      mcp: {
        file: "velomesh-mcp.lock.json",
        skills: ["find-skills", "skill-scout"],
        code: `{
  "velomesh_internet_provisioning": [
    "[00.06s] Activated hipaa-compliance + security-review skills",
    "[00.25s] Attached Context7 FastAPI + Pydantic v2 schemas",
    "[00.39s] Verified PHI redaction hook across all coding harnesses"
  ]
}`
      },
      qa: {
        file: "qa/verification-receipt.txt",
        skills: ["tdd", "impeccable", "security-review"],
        code: `AETHERMD COMPLIANCE & QA RECEIPT
================================
[PASS] 0 PHI secrets leaked in logs or network payloads
[PASS] WCAG 2.2 AA contrast >= 7.2:1 on every triage state
[PASS] Append-only audit trigger blocks UPDATE/DELETE`
      }
    }
  }
};

const FLOW_STAGES = [
  {
    tag: "Stage 01 / Vision Intake",
    status: "Clarity Gate Active",
    title: "Your product vision anchors every downstream choice.",
    summary:
      "VeloMesh inspects your prompt before writing code: clear domain, workflows, and aesthetic cues proceed in one shot; vague one-liners prompt focused clarification.",
    rows: [
      ["Target Users", "Series-A CFOs & Finance Teams"],
      ["Core Workflows", "Stripe Webhooks · RLS Ledger · Projections"],
      ["Design Direction", "Obsidian Monochrome Swiss Typography"]
    ]
  },
  {
    tag: "Stage 02 / Mesh Discovery",
    status: "Live Internet Provisioning",
    title: "Fetches exact skills, docs, and MCP servers at runtime.",
    summary:
      "Never name skills manually. VeloMesh scans local plugins, queries Context7 API docs, pulls verified 21st.dev UI structures, and wires missing MCPs live.",
    rows: [
      ["21st.dev Registry", "Navbar Dropdowns · Bento · Halftone Footer"],
      ["Context7 Docs", "FastAPI · PostgreSQL RLS · Stripe Toolkit"],
      ["Active Harnesses", "Claude Code · Cursor · Codex · Copilot"]
    ]
  },
  {
    tag: "Stage 03 / Coordinated Compile",
    status: "6 Layers Unified",
    title: "Frontend, motion physics, APIs, and schemas stay in sync.",
    summary:
      "Changes share one source of truth: API Pydantic models match SQL column types, UI states cover empty/loading/error paths, and motion respects reduced motion.",
    rows: [
      ["UI & Tokens", "Switzer Scale · Achromatic Tokens · >=12px"],
      ["Backend Contract", "POST /v1/webhooks/stripe (HMAC Verified)"],
      ["Database DDL", "ROW LEVEL SECURITY Policy on tenant_id"]
    ]
  },
  {
    tag: "Stage 04 / Browser & Test Proof",
    status: "Zero-Slop Verified",
    title: "Shipped only after real desktop, mobile, and unit checks pass.",
    summary:
      "Runs Python and Node tests, executes anti-slop craft audits, inspects screenshots in Chrome at 1440px, 390px, and 320px, and verifies zero console errors.",
    rows: [
      ["Unit & Hook Suites", "16 Python Tests + Node Regression Tests PASS"],
      ["Craft & Slop Audit", "0 Anti-Patterns · 0 Advisories · 0 FAIL"],
      ["Live Chrome QA", "1440x900 / 390x844 / 320x640 Overflow = 0"]
    ]
  }
];

function initNavbarDropdowns() {
  const nav = document.getElementById('site-navbar');
  if (!nav) return;

  const items = Array.from(nav.querySelectorAll('.nav-item-dropdown'));
  let closeTimer = null;
  let openedByHoverAt = 0;

  const closeAll = (restoreTrigger = null) => {
    items.forEach((item) => {
      const btn = item.querySelector('.nav-trigger-btn');
      const panel = item.querySelector('.nav-dropdown-panel');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    });
    openedByHoverAt = 0;
    if (restoreTrigger) restoreTrigger.focus();
  };

  const openItem = (item, viaHover = false) => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    const trigger = item.querySelector('.nav-trigger-btn');
    const wasClosed = trigger?.getAttribute('aria-expanded') !== 'true';
    items.forEach((other) => {
      if (other !== item) {
        const b = other.querySelector('.nav-trigger-btn');
        const p = other.querySelector('.nav-dropdown-panel');
        if (b) b.setAttribute('aria-expanded', 'false');
        if (p) p.hidden = true;
      }
    });
    const btn = item.querySelector('.nav-trigger-btn');
    const panel = item.querySelector('.nav-dropdown-panel');
    if (btn && panel) {
      btn.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      if (viaHover && wasClosed) openedByHoverAt = performance.now();
    }
  };

  items.forEach((item) => {
    const btn = item.querySelector('.nav-trigger-btn');
    const panel = item.querySelector('.nav-dropdown-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        if (performance.now() - openedByHoverAt < 650) {
          openedByHoverAt = 0;
          return;
        }
        closeAll();
      } else {
        openItem(item, false);
      }
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openItem(item, false);
        panel.querySelector('a, button')?.focus();
      } else if (e.key === 'Escape') {
        closeAll(btn);
      }
    });

    panel.addEventListener('keydown', (e) => {
      const links = Array.from(panel.querySelectorAll('a, button'));
      const idx = links.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAll(btn);
      } else if (e.key === 'ArrowDown' && links.length) {
        e.preventDefault();
        links[(idx + 1) % links.length].focus();
      } else if (e.key === 'ArrowUp' && links.length) {
        e.preventDefault();
        links[(idx - 1 + links.length) % links.length].focus();
      }
    });

    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      openItem(item, true);
    });

    item.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      closeTimer = setTimeout(() => closeAll(), 140);
    });
  });

  nav.querySelectorAll('[data-nav-close]').forEach((el) => {
    el.addEventListener('click', () => closeAll());
  });

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAll();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openBtn = nav.querySelector('.nav-trigger-btn[aria-expanded="true"]');
      if (openBtn) closeAll(openBtn);
    }
  });
}

// 21st.dev Lattice Hero [id: 26027] — Pure Black & White Fibonacci Mesh
function fibonacciSphere(count, radius) {
  const pts = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts[i * 3] = Math.cos(theta) * r * radius;
    pts[i * 3 + 1] = y * radius;
    pts[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return pts;
}

function nearestEdges(pts, k) {
  const n = pts.length / 3;
  const seen = new Set();
  const edges = [];
  const d2 = [];
  for (let i = 0; i < n; i++) {
    d2.length = 0;
    const ax = pts[i * 3];
    const ay = pts[i * 3 + 1];
    const az = pts[i * 3 + 2];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = pts[j * 3] - ax;
      const dy = pts[j * 3 + 1] - ay;
      const dz = pts[j * 3 + 2] - az;
      d2.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    d2.sort((p, q) => p.d - q.d);
    for (let m = 0; m < k && m < d2.length; m++) {
      const j = d2[m].j;
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  }
  return edges;
}

function pulseWeight(seed, wave) {
  const f = (seed - wave + 0.5) - Math.floor(seed - wave + 0.5);
  const d = Math.abs(f - 0.5) * 2.0;
  return Math.pow(1.0 - d, 9.0);
}

function initLatticeHeroMesh() {
  const canvas = document.getElementById('lattice-mesh-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = canvas.closest('.lattice-hero');
  let w = 1;
  let h = 1;
  let dpr = 1;
  const nodeCount = window.innerWidth < 768 ? 140 : 240;
  const kNeighbors = window.innerWidth < 768 ? 3 : 4;
  const radius = 1.72;
  const pts = fibonacciSphere(nodeCount, radius);
  const edges = nearestEdges(pts, kNeighbors);
  const seeds = new Float32Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    seeds[i] = (pts[i * 3 + 1] / radius) * 0.5 + 0.5;
  }

  let rotY = 0.42;
  let rotX = 0.22;
  let pointerX = 0;
  let pointerY = 0;
  let wave = 0.28;
  let visible = true;
  let raf = 0;
  let last = performance.now();

  const projX = new Float32Array(nodeCount);
  const projY = new Float32Array(nodeCount);
  const projZ = new Float32Array(nodeCount);

  const resize = () => {
    const rect = (hero || canvas).getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };

  const drawFrame = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    if (!reduced) {
      wave = (wave + dt * 0.055) % 1;
      rotY += dt * 0.075;
      rotX += (pointerY * 0.16 + 0.2 - rotX) * Math.min(1, dt * 2.4);
    }

    const light = document.documentElement.dataset.theme === 'light';
    const baseRgb = light ? [110, 110, 118] : [132, 132, 140];
    const lineRgb = light ? [150, 150, 158] : [78, 78, 86];
    const hotRgb = light ? [9, 9, 11] : [250, 250, 252];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const desktop = w >= 960;
    const cx = desktop ? w * 0.72 + pointerX * 14 : w * 0.52;
    const cy = desktop ? h * 0.5 : h * 0.28;
    const scale = Math.min(w, h) * (desktop ? 0.36 : 0.29);
    const camZ = 5.4;

    const sinY = Math.sin(rotY);
    const cosY = Math.cos(rotY);
    const sinX = Math.sin(rotX);
    const cosX = Math.cos(rotX);

    for (let i = 0; i < nodeCount; i++) {
      const px0 = pts[i * 3];
      const py0 = pts[i * 3 + 1];
      const pz0 = pts[i * 3 + 2];

      const x1 = px0 * cosY - pz0 * sinY;
      const z1 = px0 * sinY + pz0 * cosY;
      const y2 = py0 * cosX - z1 * sinX;
      const z2 = py0 * sinX + z1 * cosX;

      const persp = camZ / (camZ - z2);
      projX[i] = cx + x1 * scale * persp;
      projY[i] = cy - y2 * scale * persp;
      projZ[i] = z2;
    }

    ctx.lineWidth = 1;
    for (let e = 0; e < edges.length; e++) {
      const a = edges[e][0];
      const b = edges[e][1];
      const avgZ = (projZ[a] + projZ[b]) * 0.5;
      const depth = Math.max(0.14, Math.min(1, (avgZ + radius) / (radius * 2)));
      const g = Math.max(pulseWeight(seeds[a], wave), pulseWeight(seeds[b], wave));
      const rCol = Math.round(lineRgb[0] + (hotRgb[0] - lineRgb[0]) * g);
      const gCol = Math.round(lineRgb[1] + (hotRgb[1] - lineRgb[1]) * g);
      const bCol = Math.round(lineRgb[2] + (hotRgb[2] - lineRgb[2]) * g);
      const alpha = (0.14 + 0.34 * depth) * (0.45 + 1.25 * g);
      ctx.strokeStyle = `rgba(${rCol},${gCol},${bCol},${Math.min(0.88, alpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(projX[a], projY[a]);
      ctx.lineTo(projX[b], projY[b]);
      ctx.stroke();
    }

    for (let i = 0; i < nodeCount; i++) {
      const depth = Math.max(0.15, Math.min(1, (projZ[i] + radius) / (radius * 2)));
      const g = pulseWeight(seeds[i], wave);
      const rCol = Math.round(baseRgb[0] + (hotRgb[0] - baseRgb[0]) * g);
      const gCol = Math.round(baseRgb[1] + (hotRgb[1] - baseRgb[1]) * g);
      const bCol = Math.round(baseRgb[2] + (hotRgb[2] - baseRgb[2]) * g);
      const nodeR = (1.35 + 1.65 * depth) * (1 + g * 1.15);
      const alpha = (0.28 + 0.58 * depth) * (0.55 + 0.45 * g);
      ctx.fillStyle = `rgba(${rCol},${gCol},${bCol},${Math.min(0.98, alpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(projX[i], projY[i], nodeR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduced && visible) {
      raf = requestAnimationFrame(drawFrame);
    } else {
      raf = 0;
    }
  };

  hero?.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    pointerX = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    pointerY = -(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
  });

  new ResizeObserver(() => {
    resize();
    if (reduced) drawFrame(performance.now());
  }).observe(hero || canvas);

  new IntersectionObserver((entries) => {
    visible = entries[0] ? entries[0].isIntersecting : true;
    if (visible && !reduced && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(drawFrame);
    }
  }).observe(hero || canvas);

  new MutationObserver(() => {
    if (reduced) drawFrame(performance.now());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  resize();
  drawFrame(performance.now());
}

// 21st.dev Bento Grid Interactive Specimens + Monochrome Spring Curve
function initBentoModules() {
  // 1. Typography / Token specimen switcher
  const tokenOutput = document.getElementById('bento-token-preview');
  const tokenModes = {
    scale: [
      ['Display h1', 'Switzer 700 / 76px / -0.045em'],
      ['Body copy', 'Switzer 400 / 17px / 1.56lh'],
      ['Code mono', 'JetBrains Mono / 13px / tabular']
    ],
    contrast: [
      ['Primary ink on dark', '#F8F8FA on #070708 (19.2:1 AAA)'],
      ['Muted ink on dark', '#9898A0 on #0F0F11 (6.3:1 AA)'],
      ['Inverted CTA fill', '#F8F8FA / #070708 (19.2:1 AAA)']
    ],
    tokens: [
      ['--bg / --ink', '#070708 / #F8F8FA'],
      ['--rule / --rule-strong', '#222226 / #3F3F46'],
      ['--ease-swiss', 'cubic-bezier(0.22, 1, 0.36, 1)']
    ]
  };
  document.querySelectorAll('[data-token-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-token-mode]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const rows = tokenModes[btn.dataset.tokenMode] || tokenModes.scale;
      if (tokenOutput) {
        tokenOutput.innerHTML = rows
          .map(([k, v]) => `<div class="specimen-row"><span>${k}</span><strong>${v}</strong></div>`)
          .join('');
      }
    });
  });

  // 2. Live monochrome spring waveform canvas
  const springCanvas = document.getElementById('bento-spring-canvas');
  const impulseBtn = document.getElementById('bento-impulse-btn');
  if (springCanvas) {
    const ctx = springCanvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let phase = 0;
    let amp = 0.85;
    let raf = 0;

    const drawWave = () => {
      if (!ctx) return;
      const w = springCanvas.width;
      const h = springCanvas.height;
      const light = document.documentElement.dataset.theme === 'light';
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = light ? 'rgba(9,9,11,0.16)' : 'rgba(248,248,250,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      ctx.strokeStyle = light ? '#09090b' : '#f8f8fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const t = x / w;
        const env = Math.exp(-t * 3.4) * amp;
        const y = h / 2 + Math.sin(t * 24 - phase) * env * (h * 0.38);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!reduced && amp > 0.25) {
        phase += 0.12;
        amp = Math.max(0.24, amp * 0.992);
        raf = requestAnimationFrame(drawWave);
      } else {
        raf = 0;
      }
    };

    impulseBtn?.addEventListener('click', () => {
      amp = 1.0;
      phase = 0;
      if (!reduced && !raf) raf = requestAnimationFrame(drawWave);
      else drawWave();
    });

    new MutationObserver(drawWave).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    drawWave();
  }

  // 3. Database RLS toggle
  const sqlPreview = document.getElementById('bento-sql-preview');
  const sqlSnippets = {
    rls: "ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;\nUSING (tenant_id = current_setting('app.tenant')::uuid);",
    index: "CREATE INDEX idx_ledger_tenant_occurred\n  ON ledger (tenant_id, occurred_at DESC);"
  };
  document.querySelectorAll('[data-rls-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rls-mode]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (sqlPreview) sqlPreview.textContent = sqlSnippets[btn.dataset.rlsMode] || sqlSnippets.rls;
    });
  });

  // 4. Harness target switcher
  const harnessPath = document.getElementById('bento-harness-path');
  const harnessMap = {
    claude: "Active: ~/.claude/CLAUDE.md + PreInvocation hook",
    cursor: "Active: ~/.cursor/rules/velomesh.mdc (alwaysApply: true)",
    codex: "Active: ~/.codex/AGENTS.md + discover_and_install_capability",
    opencode: "Active: ~/.config/opencode/AGENTS.md + stdio MCP mesh"
  };
  document.querySelectorAll('[data-harness-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-harness-target]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (harnessPath) harnessPath.textContent = harnessMap[btn.dataset.harnessTarget] || harnessMap.claude;
    });
  });
}

// 21st.dev Interactive Execution Flow Showcase [id: 1368 + 26902]
function initExecutionFlowShowcase() {
  const btns = Array.from(document.querySelectorAll('[data-flow-step]'));
  const tagEl = document.getElementById('flow-stage-tag');
  const statusEl = document.getElementById('flow-stage-status');
  const bodyEl = document.getElementById('flow-stage-body');
  if (!btns.length || !bodyEl) return;

  const renderStage = (idx) => {
    const stage = FLOW_STAGES[idx] || FLOW_STAGES[0];
    btns.forEach((b, i) => {
      const active = i === idx;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    if (tagEl) tagEl.textContent = stage.tag;
    if (statusEl) statusEl.textContent = stage.status;
    bodyEl.innerHTML = `
      <div>
        <h3 class="flow-artifact-title">${stage.title}</h3>
        <p class="bento-desc">${stage.summary}</p>
      </div>
      <ul class="flow-artifact-list">
        ${stage.rows.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join('')}
      </ul>
    `;
  };

  btns.forEach((btn, i) => {
    btn.addEventListener('click', () => renderStage(i));
  });
  renderStage(0);
}

// 21st.dev Halftone Wordmark Footer [id: 37628] — Pure Black & White
function hwfRadius(coverage, gap) {
  const c = coverage < 0 ? 0 : coverage > 1 ? 1 : coverage;
  return Math.sqrt(c) * gap * 0.56;
}

function hwfStep(x, y, vx, vy, hx, hy, px, py, r) {
  const dx = x - px;
  const dy = y - py;
  const d2 = dx * dx + dy * dy;
  if (r > 0 && d2 < r * r) {
    const d = Math.sqrt(d2) + 0.001;
    const f = (1 - d / r) * 2.6;
    vx += (dx / d) * f;
    vy += (dy / d) * f;
  }
  vx = (vx + (hx - x) * 0.05) * 0.84;
  vy = (vy + (hy - y) * 0.05) * 0.84;
  return [x + vx, y + vy, vx, vy];
}

function initHalftoneWordmarkFooter() {
  const root = document.getElementById('site-footer');
  const canvas = document.getElementById('halftone-footer-canvas');
  if (!root || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 1;
  let h = 1;
  let dpr = 1;
  let px = -1e5;
  let py = -1e5;
  let raf = 0;
  let visible = true;
  let awake = true;
  let ring = { x: 0, y: 0, t: -1 };
  let dots = new Float32Array(0);
  let count = 0;
  let grainTile = null;

  const palette = () => {
    const light = document.documentElement.dataset.theme === 'light';
    return light
      ? { bg: '#f8f8fa', ink: [42, 42, 48], warm: [9, 9, 11] }
      : { bg: '#070708', ink: [212, 212, 218], warm: [255, 255, 255] };
  };

  const layout = () => {
    const rect = root.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const m = mask.getContext('2d', { willReadFrequently: true });
    if (!m) return;

    const word = 'velomesh';
    const fontStack = "'Switzer', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    m.font = `700 100px ${fontStack}`;
    const measured = m.measureText(word).width || 400;
    const fit = Math.min((w * 0.96 / measured) * 100, h * 0.5);
    m.font = `700 ${fit}px ${fontStack}`;
    const box = m.measureText(word);
    const cap = box.actualBoundingBoxAscent || fit * 0.72;
    m.fillStyle = '#000';
    m.textBaseline = 'alphabetic';
    m.fillText(word, (w - box.width) / 2, h + cap * 0.16);
    const img = m.getImageData(0, 0, w, h).data;

    const gap = w < 640 ? 5 : 6;
    const cols = Math.ceil(w / gap);
    const rows = Math.ceil(h / gap);
    const tmp = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        let sum = 0;
        for (let sy = 0; sy < 3; sy++) {
          for (let sx = 0; sx < 3; sx++) {
            const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
            const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
            sum += img[(y * w + x) * 4 + 3];
          }
        }
        const cov = sum / (9 * 255);
        if (cov < 0.06) continue;
        const hx = gx * gap + gap / 2;
        const hy = gy * gap + gap / 2;
        tmp.push(hx, hy, 0, 0, hx, hy, hwfRadius(cov, gap));
      }
    }
    dots = new Float32Array(tmp);
    count = tmp.length / 7;

    if (!grainTile) {
      grainTile = document.createElement('canvas');
      grainTile.width = 256;
      grainTile.height = 256;
      const g = grainTile.getContext('2d');
      if (g) {
        const id = g.createImageData(256, 256);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = Math.random() * 255;
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
          id.data[i + 3] = Math.random() < 0.5 ? 0 : 255;
        }
        g.putImageData(id, 0, 0);
      }
    }
    awake = true;
  };

  const draw = (now) => {
    const pal = palette();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    const r = !reduced ? 80 : 0;
    const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
    const ringR = ringAge * 0.9;
    let moving = false;

    for (let i = 0; i < count; i++) {
      const j = i * 7;
      let x = dots[j];
      let y = dots[j + 1];
      let vx = dots[j + 2];
      let vy = dots[j + 3];
      const hx = dots[j + 4];
      const hy = dots[j + 5];

      if (!reduced) {
        if (ringAge < 900) {
          const dx = hx - ring.x;
          const dy = hy - ring.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
          if (band > 0) {
            const f = band * 3.2 * (1 - ringAge / 900);
            vx += (dx / d) * f;
            vy += (dy / d) * f;
          }
        }
        const s = hwfStep(x, y, vx, vy, hx, hy, px, py, r);
        x = s[0];
        y = s[1];
        vx = s[2];
        vy = s[3];
        if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) {
          moving = true;
        } else {
          x = hx;
          y = hy;
          vx = 0;
          vy = 0;
        }
        dots[j] = x;
        dots[j + 1] = y;
        dots[j + 2] = vx;
        dots[j + 3] = vy;
      }

      const k = Math.min(1, Math.hypot(x - hx, y - hy) / 28);
      if (k > 0.02) {
        const cr = Math.round(pal.ink[0] + (pal.warm[0] - pal.ink[0]) * k);
        const cg = Math.round(pal.ink[1] + (pal.warm[1] - pal.ink[1]) * k);
        const cb = Math.round(pal.ink[2] + (pal.warm[2] - pal.ink[2]) * k);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      } else {
        ctx.fillStyle = `rgb(${pal.ink[0]},${pal.ink[1]},${pal.ink[2]})`;
      }
      ctx.beginPath();
      ctx.arc(x, y, dots[j + 6], 0, 6.2832);
      ctx.fill();
    }

    if (grainTile) {
      ctx.globalAlpha = 0.05;
      ctx.globalCompositeOperation = 'overlay';
      const pat = ctx.createPattern(grainTile, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    awake = moving || ringAge < 900 || px > -1e4;
  };

  const loop = (now) => {
    raf = 0;
    if (!visible) return;
    draw(now);
    if (awake) raf = requestAnimationFrame(loop);
  };

  const wake = () => {
    awake = true;
    if (!raf && visible) raf = requestAnimationFrame(loop);
  };

  const toLocal = (e) => {
    const b = canvas.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  };

  root.addEventListener('pointermove', (e) => {
    const p = toLocal(e);
    px = p[0];
    py = p[1];
    wake();
  });

  root.addEventListener('pointerleave', () => {
    px = -1e5;
    py = -1e5;
    wake();
  });

  root.addEventListener('pointerdown', (e) => {
    if (reduced || e.target.closest('a,button')) return;
    const p = toLocal(e);
    ring = { x: p[0], y: p[1], t: performance.now() };
    wake();
  });

  new ResizeObserver(() => {
    layout();
    wake();
  }).observe(root);

  new IntersectionObserver((entries) => {
    visible = entries[0] ? entries[0].isIntersecting : true;
    if (visible) wake();
  }).observe(root);

  new MutationObserver(() => {
    draw(performance.now());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  document.fonts?.ready?.then(() => {
    layout();
    wake();
  });

  layout();
  draw(performance.now());
  wake();

  document.getElementById('hwf-back-to-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
}

function scoreVisionClarity(promptText) {
  const clean = String(promptText || '').trim();
  const words = clean.toLowerCase().split(/[^a-z0-9_-]+/).filter(Boolean);
  const wordSet = new Set(words);

  const domainHits = [
    'saas', 'dashboard', 'fintech', 'cfo', 'healthcare', 'clinical', 'ecommerce', 'marketplace',
    'crm', 'developer', 'cli', 'studio', 'platform', 'analytics', 'workflow', 'treasury', 'billing',
    'portfolio', 'fitness', 'booking', 'editor', 'collab', 'multitenant', 'multi-tenant', 'b2b', 'portal', 'athletes'
  ].filter((w) => wordSet.has(w)).length;

  const workflowHits = [
    'auth', 'login', 'webhook', 'stripe', 'chart', 'graph', 'forecast', 'table', 'search', 'upload',
    'realtime', 'websocket', 'notification', 'export', 'crud', 'ledger', 'payment', 'pipeline',
    'subscription', 'onboarding', 'interactive', 'canvas', 'webgl', 'api', 'schema', 'rls', 'fhir', 'crdt'
  ].filter((w) => wordSet.has(w)).length;

  const aestheticHits = [
    'linear', 'vercel', 'stripe', 'raycast', 'framer', 'apple', 'awwwards', 'dark', 'black', 'white',
    'monochrome', 'minimal', 'editorial', 'swiss', 'architectural', 'react', 'nextjs', 'fastapi', 'postgres',
    'postgresql', 'supabase', 'tailwind', 'gsap', 'webgl', 'typescript', 'node', 'python'
  ].filter((w) => wordSet.has(w)).length;

  const domainScore = Math.min(100, Math.round(domainHits * 38 + Math.min(40, words.length * 1.5)));
  const workflowScore = Math.min(100, Math.round(workflowHits * 34 + Math.min(35, words.length * 1.2)));
  const aestheticScore = Math.min(100, Math.round(aestheticHits * 36 + Math.min(30, words.length)));

  const ready = words.length >= 12 && domainScore >= 55 && workflowScore >= 50 && aestheticScore >= 45;
  return { domainScore, workflowScore, aestheticScore, ready };
}

function initModelOrchestratorAction() {
  const harnessCmdEl = document.getElementById('orch-harness-cmd');
  const harnessNoteEl = document.getElementById('orch-harness-note');
  const phaseEl = document.getElementById('orch-active-phase');
  const modelEl = document.getElementById('orch-active-model');
  const transportEl = document.getElementById('orch-active-transport');
  const headersEl = document.getElementById('orch-active-headers');
  const frameEl = document.getElementById('orch-action-frame');
  const harnessBtns = document.querySelectorAll('.orch-harness-btn');
  const turnBtns = document.querySelectorAll('.orch-turn-btn');
  const cycleBtn = document.getElementById('orch-cycle-btn');

  if (!harnessBtns.length && !turnBtns.length) return;

  const harnesses = {
    opencode: {
      cmd: 'Select "velomesh/auto" in OpenCode /model picker (~/.config/opencode/opencode.json)',
      note: 'Registers side-by-side alongside existing providers without replacing native OAuth or custom routers.'
    },
    codex: {
      cmd: 'codex -p velomesh  # Uses [profiles.velomesh] -> model = "velomesh/auto"',
      note: 'Appends an isolated profile in ~/.codex/config.toml while leaving your default Codex model intact.'
    },
    claude: {
      cmd: 'velomesh claude  # Scoped ANTHROPIC_BASE_URL=http://127.0.0.1:4190 (--model velomesh/auto)',
      note: 'Launches Claude Code routed through the local Anthropic /v1/messages adapter while keeping default OAuth untouched.'
    },
    cursor: {
      cmd: 'Base URL: http://127.0.0.1:4190/v1 | Model: velomesh/auto',
      note: 'Standard OpenAI Chat Completions & Responses endpoint compatible with Cursor BYOK and Grok / OpenAI CLI tools.'
    },
    antigravity: {
      cmd: 'MCP select_model_route + Subagent Tiers (pro / flash / flash_lite)',
      note: 'Google Antigravity uses a closed top UI dropdown; VeloMesh orchestrates multi-model delegation via MCP and subagents.'
    }
  };

  const turns = [
    {
      phase: 'architecture',
      model: 'claude-opus-4-6',
      transport: 'Direct API -> CLI Subscription Bridge Ready',
      headers: 'X-VeloMesh-Model: claude-opus-4-6 | X-VeloMesh-Switched: false'
    },
    {
      phase: 'frontend',
      model: 'gemini-3.1-pro',
      transport: 'Direct API -> CLI Subscription Bridge Ready',
      headers: 'X-VeloMesh-Model: gemini-3.1-pro | X-VeloMesh-Switched: true'
    },
    {
      phase: 'fast',
      model: 'grok-code-fast-1',
      transport: 'OpenRouter / xAI API -> Local CLI Bridge Ready',
      headers: 'X-VeloMesh-Model: grok-code-fast-1 | X-VeloMesh-Switched: true'
    },
    {
      phase: 'review',
      model: 'gpt-5.3-codex',
      transport: 'Cross-Family Verifier (API -> codex exec Bridge)',
      headers: 'X-VeloMesh-Model: gpt-5.3-codex | X-VeloMesh-Switched: true'
    }
  ];

  let activeTurn = 0;

  function renderTurn(idx, pulse = false) {
    activeTurn = ((idx % turns.length) + turns.length) % turns.length;
    const t = turns[activeTurn];
    turnBtns.forEach((b, i) => {
      const active = i === activeTurn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    if (phaseEl) phaseEl.textContent = t.phase;
    if (modelEl) modelEl.textContent = t.model;
    if (transportEl) transportEl.textContent = t.transport;
    if (headersEl) headersEl.textContent = t.headers;
    if (pulse && frameEl) {
      frameEl.classList.remove('is-switching');
      void frameEl.offsetWidth;
      frameEl.classList.add('is-switching');
      setTimeout(() => frameEl.classList.remove('is-switching'), 260);
    }
  }

  harnessBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.orchHarness || 'opencode';
      const data = harnesses[key] || harnesses.opencode;
      harnessBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      if (harnessCmdEl) harnessCmdEl.textContent = data.cmd;
      if (harnessNoteEl) harnessNoteEl.textContent = data.note;
    });
  });

  turnBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      renderTurn(Number(btn.dataset.orchTurn || 0), true);
    });
  });

  cycleBtn?.addEventListener('click', () => {
    renderTurn(activeTurn + 1, true);
  });

  renderTurn(0, false);
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbarDropdowns();
  initLatticeHeroMesh();
  initBentoModules();
  initModelOrchestratorAction();
  initExecutionFlowShowcase();
  initHalftoneWordmarkFooter();

  // Polarity Toggle (Obsidian Black <-> Stark White)
  const themeBtn = document.getElementById('theme-toggle-btn');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      if (next === 'light') {
        document.documentElement.dataset.theme = 'light';
        if (metaTheme) metaTheme.setAttribute('content', '#f8f8fa');
      } else {
        delete document.documentElement.dataset.theme;
        if (metaTheme) metaTheme.setAttribute('content', '#070708');
      }
    });
  }

  // Mobile Menu Drawer
  const drawer = document.getElementById('mobile-nav-drawer');
  const openDrawerBtn = document.getElementById('drawer-open-btn');
  const closeDrawerBtn = document.getElementById('drawer-close-btn');

  const closeDrawer = () => {
    if (!drawer || !openDrawerBtn) return;
    drawer.hidden = true;
    openDrawerBtn.setAttribute('aria-expanded', 'false');
    openDrawerBtn.focus();
  };

  if (openDrawerBtn && drawer) {
    openDrawerBtn.addEventListener('click', () => {
      drawer.hidden = false;
      openDrawerBtn.setAttribute('aria-expanded', 'true');
      closeDrawerBtn?.focus();
    });
  }
  closeDrawerBtn?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && !drawer.hidden) {
      closeDrawer();
    }
  });

  // OS Installer Switcher
  const osTabs = document.querySelectorAll('.os-tab-btn');
  const installCodeEl = document.getElementById('install-cmd-code');
  const copyBtn = document.getElementById('copy-install-btn');
  const copyStatusEl = document.getElementById('copy-status-live');
  const commands = {
    unix: 'curl -fsSL https://raw.githubusercontent.com/RitvikChunamari/velomesh/main/install.sh | bash',
    windows: 'irm https://raw.githubusercontent.com/RitvikChunamari/velomesh/main/install.ps1 | iex'
  };
  let currentOs = 'unix';

  osTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      osTabs.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentOs = btn.dataset.os || 'unix';
      if (installCodeEl) installCodeEl.textContent = commands[currentOs];
    });
  });

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(commands[currentOs]);
      copyBtn.textContent = 'Copied';
      if (copyStatusEl) copyStatusEl.textContent = 'Install command copied to clipboard.';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Command';
        if (copyStatusEl) copyStatusEl.textContent = '';
      }, 1800);
    } catch {
      copyBtn.textContent = 'Ready';
    }
  });

  // Interactive Line-Numbered Multi-File Workbench
  let currentBlueprint = 'treasury';
  let currentLayer = 'frontend';
  let currentCodeText = '';
  const promptInput = document.getElementById('synth-prompt-input');
  const skillsStrip = document.getElementById('active-skills-strip');
  const codeOutput = document.getElementById('workbench-code-output');
  const copyFileBtn = document.getElementById('copy-file-btn');
  const blueprintBtns = document.querySelectorAll('.preset-btn');
  const fileBtns = document.querySelectorAll('.file-btn');

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderWorkbench(updatePrompt = true) {
    const bp = WORKBENCH_BLUEPRINTS[currentBlueprint] || WORKBENCH_BLUEPRINTS.treasury;
    if (promptInput && updatePrompt) promptInput.value = bp.prompt;

    fileBtns.forEach((btn) => {
      const key = btn.dataset.layer;
      const nameSpan = btn.querySelector('.file-name');
      if (key && bp.layers[key] && nameSpan) nameSpan.textContent = bp.layers[key].file;
      btn.classList.toggle('active', key === currentLayer);
    });

    const activeData = bp.layers[currentLayer] || bp.layers.frontend;
    currentCodeText = activeData.code;

    if (skillsStrip) {
      skillsStrip.innerHTML =
        '<span>Auto-linked skills:</span>' +
        activeData.skills.map((s) => `<span class="skill-tag">${s}</span>`).join('');
    }

    if (codeOutput) {
      const lines = activeData.code.split('\n');
      codeOutput.innerHTML = lines
        .map((line, i) => {
          const highlight = i >= 2 && i <= 4 ? ' code-line-highlight' : '';
          return `<span class="code-line${highlight}">${escapeHtml(line) || ' '}</span>`;
        })
        .join('');
    }
  }

  copyFileBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentCodeText);
      copyFileBtn.textContent = 'Copied';
      setTimeout(() => { copyFileBtn.textContent = 'Copy File'; }, 1600);
    } catch {
      copyFileBtn.textContent = 'Ready';
    }
  });

  blueprintBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      blueprintBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentBlueprint = btn.dataset.blueprint || 'treasury';
      renderWorkbench(true);
    });
  });

  fileBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentLayer = btn.dataset.layer || 'frontend';
      renderWorkbench(false);
    });
  });

  document.querySelectorAll('[data-jump-layer]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      currentLayer = trigger.dataset.jumpLayer || 'frontend';
      renderWorkbench(false);
      document.getElementById('workbench')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.getElementById('run-synth-btn')?.addEventListener('click', () => {
    const val = (promptInput?.value || '').toLowerCase();
    if (val.includes('shader') || val.includes('webgl') || val.includes('kinetix')) {
      currentBlueprint = 'webglStudio';
    } else if (val.includes('hipaa') || val.includes('clinical') || val.includes('fhir')) {
      currentBlueprint = 'clinical';
    } else {
      currentBlueprint = 'treasury';
    }
    blueprintBtns.forEach((b) => b.classList.toggle('active', b.dataset.blueprint === currentBlueprint));
    renderWorkbench(false);
  });

  renderWorkbench(true);

  // Interactive Vision Clarity Gate
  const visionInput = document.getElementById('live-vision-input');
  const visionBadge = document.getElementById('live-vision-badge');
  const visionGuidance = document.getElementById('live-vision-guidance');
  const barDomain = document.getElementById('bar-domain');
  const barWorkflow = document.getElementById('bar-workflow');
  const barAesthetic = document.getElementById('bar-aesthetic');
  const valDomain = document.getElementById('val-domain');
  const valWorkflow = document.getElementById('val-workflow');
  const valAesthetic = document.getElementById('val-aesthetic');

  function refreshVisionInspector() {
    if (!visionInput) return;
    const res = scoreVisionClarity(visionInput.value);
    if (barDomain) barDomain.style.transform = `scaleX(${res.domainScore / 100})`;
    if (barWorkflow) barWorkflow.style.transform = `scaleX(${res.workflowScore / 100})`;
    if (barAesthetic) barAesthetic.style.transform = `scaleX(${res.aestheticScore / 100})`;
    if (valDomain) valDomain.textContent = `${res.domainScore}%`;
    if (valWorkflow) valWorkflow.textContent = `${res.workflowScore}%`;
    if (valAesthetic) valAesthetic.textContent = `${res.aestheticScore}%`;

    if (visionBadge && visionGuidance) {
      if (res.ready) {
        visionBadge.className = 'verdict-chip chip-pass';
        visionBadge.textContent = 'Ready for full-stack execution (One-Shot Build)';
        visionGuidance.textContent =
          'Product vision is clear. VeloMesh compiles UI, motion physics, backend API, PostgreSQL RLS, live Internet MCPs, and browser QA in one shot.';
      } else {
        visionBadge.className = 'verdict-chip chip-fail';
        visionBadge.textContent = 'Vague prompt needs elaboration (cannot read your mind)';
        visionGuidance.textContent =
          'VeloMesh automates 100% of skills, MCP servers, APIs, and databases, yet cannot read your mind. Elaborate target users, workflows, and design direction.';
      }
    }
  }

  visionInput?.addEventListener('input', refreshVisionInspector);
  refreshVisionInspector();

  document.querySelectorAll('.gate-sample-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!visionInput) return;
      document.querySelectorAll('.gate-sample-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      visionInput.value = btn.dataset.sample || '';
      refreshVisionInspector();
    });
  });
});
