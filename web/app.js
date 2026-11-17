// VeloMesh — Swiss Editorial Product Experience (21st.dev Navbar Dropdowns + Lattice Hero + Halftone Wordmark Footer)

const WORKBENCH_BLUEPRINTS = {
  treasury: {
    prompt:
      "Build PulseLedger, a multi-tenant AI treasury & runway platform for Series-A CFOs. Use a Black Swiss architectural UI with interactive WebGL cashflow projection graphs and GSAP scroll reveals. Build the backend in FastAPI + PostgreSQL with row-level security, live Stripe & Plaid webhook ingestion, and full Playwright E2E verification.",
    layers: {
      frontend: {
        file: "components/RunwayCanvas.tsx",
        skills: ["frontend-design", "impeccable", "design-system-references", "ui-ux-pro-max"],
        code: `// Synthesized Frontend Layer — Black Swiss Design System Tokens
import { useEffect, useRef } from "react";
import { mountCashflowShader } from "../shaders/cashflowRibbon";

export function RunwayForecastStage({ tenantId, burnSeries }: RunwayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    return mountCashflowShader(canvasRef.current, {
      series: burnSeries,
      strokeColor: "#FF3B2F",
      gridColor: "#222220",
      respectReducedMotion: true,
    });
  }, [burnSeries]);

  return (
    <section className="runway-stage" aria-label="36-Month Cashflow Runway Projection">
      <canvas ref={canvasRef} width={960} height={360} />
    </section>
  );
}`
      },
      motion: {
        file: "motion/choreography.ts",
        skills: ["gsap-core", "gsap-scrolltrigger", "emil-design-eng"],
        code: `// Synthesized Motion Layer — Reduced-Motion Safe GSAP MatchMedia
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function initLedgerChoreography(container: HTMLElement) {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const rows = container.querySelectorAll("[data-ledger-row]");
    gsap.from(rows, {
      y: 12,
      duration: 0.36,
      stagger: 0.03,
      ease: "power3.out",
      scrollTrigger: { trigger: container, start: "top 85%" },
    });
  });
  return () => mm.revert();
}`
      },
      backend: {
        file: "api/webhooks_stripe.py",
        skills: ["backend-patterns", "api-connector-builder", "security-review"],
        code: `# Synthesized Backend Layer — FastAPI + HMAC Webhook Verification + RBAC
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
        code: `-- Synthesized Database Layer — PostgreSQL 16 + Strict Row-Level Security (RLS)
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
        skills: ["discover_and_install_capability", "mcp-stripe-toolkit", "mcp-postgres"],
        code: `{
  "velomesh_internet_provisioning": [
    "[00.07s] Querying GitHub Mesh: stripe webhook mcp + plaid api",
    "[00.22s] Discovered & validated: stripe/agent-toolkit (MCP Server)",
    "[00.36s] Synthesized capability wrapper: mcp-plaid-treasury-sync",
    "[00.41s] Hot-linked across Claude Code, Cursor, Codex, Copilot, Antigravity & OpenCode"
  ]
}`
      },
      qa: {
        file: "qa/verification-receipt.txt",
        skills: ["test-driven-development", "browser-qa", "verification-before-completion"],
        code: `VELOMESH AUTONOMOUS VERIFICATION RECEIPT
========================================
[PASS] pytest tests/test_rls_isolation.py        -- 18/18 cross-tenant checks passed
[PASS] vitest run src/components/RunwayCanvas    -- 12/12 unit & fallback checks passed
[PASS] playwright test --project=desktop,mobile  -- Zero layout overflow at 1440px & 390px
[PASS] impeccable detect http://localhost:4173   -- 0 anti-patterns, 0 advisories`
      }
    }
  },
  webglStudio: {
    prompt:
      "Create Kinetix, a real-time collaborative motion-design & shader studio in the browser inspired by Swiss editorial grids. Include a 60fps node-graph timeline with GSAP scrubbers, WebSockets CRDT state sync in Node.js, PostgreSQL + Redis asset versioning, and S3 presigned uploads.",
    layers: {
      frontend: {
        file: "components/ShaderViewport.tsx",
        skills: ["frontend-design", "emil-design-eng", "design-system-references"],
        code: `// Synthesized Frontend Layer — 60fps Display-P3 WebGL Viewport + Peer Cursors
export function ShaderViewport({ sceneGraph, activePeers }: ViewportProps) {
  return (
    <div className="shader-viewport-frame" data-color-space="display-p3">
      <WebGLNodeSurface graph={sceneGraph} targetFps={60} />
      <CollaborativeCursorOverlay peers={activePeers} />
    </div>
  );
}`
      },
      motion: {
        file: "motion/timelineScrubber.ts",
        skills: ["gsap-core", "gsap-utils", "emil-design-eng"],
        code: `// Synthesized Motion Layer — Frame-Accurate 60fps Timeline Scrubber
import gsap from "gsap";

const snapToFrame = gsap.utils.snap(1 / 60);

export function scrubPlayhead(playheadEl: HTMLElement, normalizedTime: number) {
  const snapped = snapToFrame(normalizedTime);
  gsap.to(playheadEl, {
    xPercent: snapped * 100,
    duration: 0.16,
    ease: "power3.out",
  });
}`
      },
      backend: {
        file: "server/crdtSync.ts",
        skills: ["backend-patterns", "api-connector-builder", "security-review"],
        code: `// Synthesized Backend Layer — WebSocket CRDT State Sync + S3 Presigned Upload
wsRouter.on("scene:keyframe:delta", async (socket, payload) => {
  const verifiedDelta = validateCrdtEnvelope(socket.session, payload);
  const mergedState = await sceneCrdtStore.applyDelta(verifiedDelta);
  await redisPub.publish(\`scene:\${socket.projectId}\`, mergedState);
});`
      },
      database: {
        file: "migrations/002_scene_revisions.sql",
        skills: ["postgres-patterns", "prisma-patterns"],
        code: `-- Synthesized Database Layer — Immutable CRDT Scene Snapshots
CREATE TABLE scene_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crdt_vector BYTEA NOT NULL,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scene_revisions_lookup
  ON scene_revisions (project_id, created_at DESC);`
      },
      mcp: {
        file: "velomesh-mcp.lock.json",
        skills: ["discover_and_install_capability", "mcp-cloudflare-r2", "mcp-redis"],
        code: `{
  "velomesh_internet_provisioning": [
    "[00.05s] Querying GitHub Mesh: cloudflare r2 s3 presigned mcp + yjs crdt",
    "[00.19s] Provisioned & validated: modelcontextprotocol/server-aws-kb",
    "[00.31s] Hot-linked 4 capability wrappers into active coding agent"
  ]
}`
      },
      qa: {
        file: "qa/verification-receipt.txt",
        skills: ["test-driven-development", "browser-qa", "performance-lab"],
        code: `VELOMESH AUTONOMOUS VERIFICATION RECEIPT
========================================
[PASS] CRDT Concurrent Merge Fuzz Suite          -- 1,000/1,000 concurrent ops deterministic
[PASS] Chrome DevTools Frame Budget Audit        -- 59.8 FPS sustained across 12 peer cursors
[PASS] impeccable detect http://localhost:4173   -- 0 anti-patterns, 0 advisories`
      }
    }
  },
  clinical: {
    prompt:
      "Build AetherMD, a HIPAA-compliant ambient clinical triage & diagnostic portal for emergency physicians. Use high-contrast Swiss typography, real-time HL7/FHIR patient vitals streaming, FastAPI backend with audit-logged PostgreSQL encryption, and RBAC session controls.",
    layers: {
      frontend: {
        file: "components/TriageVitalsGrid.tsx",
        skills: ["frontend-design", "ui-ux-pro-max", "fixing-accessibility"],
        code: `// Synthesized Frontend Layer — High-Contrast Zero-Latency ER Triage Grid
export function TriageVitalsGrid({ patientId, hl7Stream }: TriageProps) {
  return (
    <article className="triage-panel" aria-live="polite">
      <header className="triage-header">
        <h3>Acuity Level ESI-1 — Continuous Telemetry</h3>
      </header>
      <WaveformCanvas stream={hl7Stream} highContrast={true} />
    </article>
  );
}`
      },
      motion: {
        file: "motion/drawerTransition.ts",
        skills: ["emil-design-eng", "gsap-core"],
        code: `// Synthesized Motion Layer — Sub-140ms Clinical Drawer Response
import gsap from "gsap";

export function openDiagnosticDrawer(drawerEl: HTMLElement) {
  gsap.to(drawerEl, {
    xPercent: 0,
    duration: 0.14,
    ease: "power3.out",
  });
}`
      },
      backend: {
        file: "api/fhir_patient.py",
        skills: ["hipaa-compliance", "backend-patterns", "security-review"],
        code: `# Synthesized Backend Layer — HIPAA PHI Access Interceptor + Audit Envelope
@router.get("/v1/fhir/Patient/{patient_id}")
async def get_patient_record(
    patient_id: UUID,
    clinician: Clinician = Depends(require_mfa_clinician),
):
    await phi_audit_ledger.append_access(clinician.id, patient_id, reason="ER_TRIAGE")
    return await fhir_repository.read_decrypted_patient(patient_id)`
      },
      database: {
        file: "migrations/003_hipaa_audit.sql",
        skills: ["postgres-patterns", "security-review"],
        code: `-- Synthesized Database Layer — Tamper-Evident Chained HIPAA Audit Log
CREATE TABLE phi_access_audit_log (
  sequence_id BIGSERIAL PRIMARY KEY,
  clinician_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  prev_chain_hash CHAR(64) NOT NULL,
  entry_hash CHAR(64) NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);`
      },
      mcp: {
        file: "velomesh-mcp.lock.json",
        skills: ["discover_and_install_capability", "mcp-hl7-fhir-r4"],
        code: `{
  "velomesh_internet_provisioning": [
    "[00.08s] Querying GitHub Mesh: hl7 fhir r4 mcp server + hipaa phi audit",
    "[00.25s] Synthesized validated wrapper: mcp-fhir-clinical-schema",
    "[00.34s] Enforced zero-PHI-in-logs security guardrail across all harnesses"
  ]
}`
      },
      qa: {
        file: "qa/verification-receipt.txt",
        skills: ["test-driven-development", "security-review", "browser-qa"],
        code: `VELOMESH AUTONOMOUS VERIFICATION RECEIPT
========================================
[PASS] HIPAA PHI Redaction & Hash-Chain Suite    -- 22/22 tamper-evidence checks passed
[PASS] axe-core WCAG 2.2 AAA High-Contrast       -- 0 contrast or keyboard-trap findings
[PASS] impeccable detect http://localhost:4173   -- 0 anti-patterns, 0 advisories`
      }
    }
  }
};

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
      if (viaHover && wasClosed) {
        openedByHoverAt = performance.now();
      }
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
        const firstLink = panel.querySelector('a, button');
        firstLink?.focus();
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

// Adapted from 21st.dev bevelui Lattice Hero [id: 26027]
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
  let nodeCount = window.innerWidth < 768 ? 140 : 240;
  let kNeighbors = window.innerWidth < 768 ? 3 : 4;
  let radius = 1.72;
  let pts = fibonacciSphere(nodeCount, radius);
  let edges = nearestEdges(pts, kNeighbors);
  let seeds = new Float32Array(nodeCount);
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
    const baseRgb = light ? [18, 18, 16] : [237, 232, 223];
    const lineRgb = light ? [110, 110, 102] : [92, 90, 99];
    const hotRgb = light ? [184, 24, 13] : [255, 59, 47];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const desktop = w >= 920;
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

  const ro = new ResizeObserver(() => {
    resize();
    if (reduced) drawFrame(performance.now());
  });
  ro.observe(hero || canvas);

  const io = new IntersectionObserver((entries) => {
    visible = entries[0] ? entries[0].isIntersecting : true;
    if (visible && !reduced && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(drawFrame);
    }
  });
  io.observe(hero || canvas);

  new MutationObserver(() => {
    if (reduced) drawFrame(performance.now());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  resize();
  drawFrame(performance.now());
}

// Adapted from 21st.dev kedhareswer Halftone Wordmark Footer [id: 37628]
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
      ? { bg: '#f5f2eb', ink: [18, 17, 16], warm: [184, 24, 13] }
      : { bg: '#08080a', ink: [243, 239, 230], warm: [255, 59, 47] };
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
    const dock = document.querySelector('.bf-floating-dock');
    if (dock) {
      dock.classList.toggle('dock-at-footer', Boolean(entries[0]?.isIntersecting && entries[0].intersectionRatio > 0.25));
    }
    if (visible) wake();
  }, { threshold: [0, 0.25, 0.5] }).observe(root);

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
    'linear', 'vercel', 'stripe', 'raycast', 'framer', 'apple', 'awwwards', 'dark', 'black', 'minimal',
    'editorial', 'swiss', 'architectural', 'cinematic', 'react', 'nextjs', 'fastapi', 'postgres',
    'postgresql', 'supabase', 'tailwind', 'gsap', 'webgl', 'three', 'typescript', 'node', 'python'
  ].filter((w) => wordSet.has(w)).length;

  const domainScore = Math.min(100, Math.round(domainHits * 38 + Math.min(40, words.length * 1.5)));
  const workflowScore = Math.min(100, Math.round(workflowHits * 34 + Math.min(35, words.length * 1.2)));
  const aestheticScore = Math.min(100, Math.round(aestheticHits * 36 + Math.min(30, words.length)));

  const ready = words.length >= 12 && domainScore >= 55 && workflowScore >= 50 && aestheticScore >= 45;
  return { domainScore, workflowScore, aestheticScore, ready };
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbarDropdowns();
  initLatticeHeroMesh();
  initHalftoneWordmarkFooter();

  // 1. Polarity Circle Toggle (Black <-> White) + theme-color meta sync
  const themeBtn = document.getElementById('theme-toggle-btn');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      if (next === 'light') {
        document.documentElement.dataset.theme = 'light';
        if (metaTheme) metaTheme.setAttribute('content', '#f5f2eb');
      } else {
        delete document.documentElement.dataset.theme;
        if (metaTheme) metaTheme.setAttribute('content', '#08080a');
      }
    });
  }

  // 2. Responsive Mobile Menu Drawer
  const drawer = document.getElementById('bf-menu-drawer');
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

  // 4. Floating Dock & Berger Fohr Works Grid Controls (Cols, Grid, Labels, Filters)
  const worksGrid = document.getElementById('works-grid');
  const scaleBtns = document.querySelectorAll('.scale-step-btn');
  const filterPills = document.querySelectorAll('.filter-pill');
  const dockGridBtn = document.getElementById('dock-grid-btn');
  const dockLabelsBtn = document.getElementById('dock-labels-btn');
  let activeCols = 3;
  let activeFilter = 'all';

  function refreshWorksGridLayout() {
    if (!worksGrid) return;
    const effectiveCols = window.innerWidth <= 720 ? 1 : window.innerWidth <= 1080 ? Math.min(2, activeCols) : activeCols;
    document.documentElement.style.setProperty('--archive-cols', String(activeCols));

    const visibleCells = [];
    worksGrid.querySelectorAll('.work-cell').forEach((cell) => {
      const matches = activeFilter === 'all' || cell.dataset.category === activeFilter;
      cell.hidden = !matches;
      cell.removeAttribute('data-last-in-row');
      if (matches) visibleCells.push(cell);
    });

    visibleCells.forEach((cell, idx) => {
      if ((idx + 1) % effectiveCols === 0 || idx === visibleCells.length - 1) {
        cell.setAttribute('data-last-in-row', 'true');
      }
    });
  }

  scaleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCols = Number(btn.dataset.cols) || 3;
      scaleBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      refreshWorksGridLayout();
    });
  });

  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      activeFilter = pill.dataset.filter || 'all';
      filterPills.forEach((p) => p.classList.toggle('active', p === pill));
      refreshWorksGridLayout();
    });
  });

  window.addEventListener('resize', refreshWorksGridLayout);
  refreshWorksGridLayout();

  dockGridBtn?.addEventListener('click', () => {
    const active = document.body.classList.toggle('show-grid');
    dockGridBtn.setAttribute('aria-pressed', String(active));
  });

  dockLabelsBtn?.addEventListener('click', () => {
    const hidden = document.body.classList.toggle('hide-labels');
    dockLabelsBtn.setAttribute('aria-pressed', String(!hidden));
  });

  // 5. OS Installer Switcher
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

  // 6. Interactive Multi-File Workbench
  let currentBlueprint = 'treasury';
  let currentLayer = 'frontend';
  const promptInput = document.getElementById('synth-prompt-input');
  const skillsStrip = document.getElementById('active-skills-strip');
  const codeOutput = document.getElementById('workbench-code-output');
  const blueprintBtns = document.querySelectorAll('.preset-btn');
  const fileBtns = document.querySelectorAll('.file-btn');

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
    if (skillsStrip) {
      skillsStrip.innerHTML =
        '<span>Auto-linked skills &amp; MCPs:</span>' +
        activeData.skills.map((s) => `<span class="skill-tag">${s}</span>`).join('');
    }
    if (codeOutput) codeOutput.textContent = activeData.code;
  }

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

  // 7. Interactive Vision Clarity Gate
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
          'Product vision is clear. VeloMesh compiles Frontend UI, GSAP Motion, Backend API, PostgreSQL RLS Schema, Live Internet MCPs, and Browser QA in one shot.';
      } else {
        visionBadge.className = 'verdict-chip chip-fail';
        visionBadge.textContent = 'Vague prompt needs elaboration (cannot read your mind)';
        visionGuidance.textContent =
          'VeloMesh automates 100% of skills, MCP servers, APIs, and databases, yet cannot read your mind. Elaborate target users, workflows, and aesthetic direction.';
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
