// VeloMesh — Berger Fohr Inspired Black Swiss Product Experience + Brushed-Gold 3D Emblem
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <path d="M8 20 H26 L49 61.82 Q60 81.82 71 61.82 L94 20 H112 L72 92.73 Q60 112 48 92.73 Z"/>
  <path d="M36 20 H51 L54.5 26.36 Q60 36.36 65.5 26.36 L69 20 H84 L66.5 51.82 Q60 63.64 53.5 51.82 Z"/>
</svg>`;

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

function initHero3DLogo() {
  const viewport = document.getElementById('hero-logo-viewport');
  const canvas = document.getElementById('hero-logo-canvas');
  if (!viewport || !canvas) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const room = new RoomEnvironment();
    const addBounce = (color, intensity, pos, scale, rot) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
      p.position.set(...pos);
      p.scale.set(...scale);
      p.rotation.set(...rot);
      room.add(p);
    };
    addBounce('#fff3d4', 1.65, [3.2, 2.2, 7.5], [10, 6, 1], [-0.15, -0.35, 0]);
    addBounce('#ffe8b3', 1.45, [-5.0, 2.2, 5.5], [8, 7, 1], [0, 0.7, 0]);
    addBounce('#ffe4aa', 2.4, [0, 7.5, -1.5], [14, 10, 1], [Math.PI / 2, 0, 0]);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight('#fff6e5', 1.45);
    key.position.set(2.8, 3.2, 5.8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#ffe4ad', 1.15);
    rim.position.set(-4.2, 3.5, -2.5);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 0.14, 5.2);

    const svg = new SVGLoader().parse(LOGO_SVG);
    const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: 11,
      bevelEnabled: true,
      bevelThickness: 0.55,
      bevelSize: 0.55,
      bevelSegments: 10,
      curveSegments: 64
    });
    geometry.center();
    geometry.scale(1, -1, 1);
    geometry.computeVertexNormals();

    // Fine brushed anisotropy map
    const brushCanvas = document.createElement('canvas');
    brushCanvas.width = 512;
    brushCanvas.height = 512;
    const bg = brushCanvas.getContext('2d');
    bg.fillStyle = '#848484';
    bg.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1600; i++) {
      const y = (i * 73) % 512;
      const x = (i * 197) % 512;
      const len = 80 + (i % 180);
      const v = 118 + (i % 34);
      bg.fillStyle = `rgba(${v},${v},${v},0.35)`;
      bg.fillRect(x, y, len, 1);
    }
    const brushTex = new THREE.CanvasTexture(brushCanvas);
    brushTex.wrapS = THREE.RepeatWrapping;
    brushTex.wrapT = THREE.RepeatWrapping;
    brushTex.repeat.set(0.02, 0.02);

    const boxSize = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position).getSize(new THREE.Vector3());
    const fit = 1.9 / Math.max(boxSize.x, boxSize.y);
    const mark = new THREE.Mesh(
      geometry,
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#f4d072'),
        metalness: 0.90,
        roughness: 0.34,
        roughnessMap: brushTex,
        bumpMap: brushTex,
        bumpScale: 0.004,
        clearcoat: 0.22,
        clearcoatRoughness: 0.28,
        envMapIntensity: 1.45
      })
    );
    mark.scale.setScalar(fit);

    const group = new THREE.Group();
    group.add(mark);
    group.rotation.set(-0.08, 0.34, 0);
    scene.add(group);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;

    const resize = () => {
      const w = viewport.clientWidth || 540;
      const h = viewport.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    const start = performance.now();
    window.odScene = { rotate: !prefersReduced, scene, camera, renderer, controls, focus: group };

    renderer.setAnimationLoop((now) => {
      if (viewport.dataset.mode !== 'grid') {
        if (!prefersReduced && window.odScene.rotate) {
          group.rotation.y = 0.34 + (((now - start) / 1000) / 14) * Math.PI * 2;
        }
        controls.update();
        renderer.render(scene, camera);
      }
    });
  } catch {
    viewport.classList.add('no-webgl');
  }
}

function initSwissStationClock() {
  const ticksGroup = document.getElementById('clock-ticks');
  const numeralsGroup = document.getElementById('clock-numerals');
  const hourHand = document.getElementById('clock-hour');
  const minuteHand = document.getElementById('clock-minute');
  const secondHand = document.getElementById('clock-second');
  const readout = document.getElementById('clock-readout');
  if (!ticksGroup || !numeralsGroup) return;

  const ns = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6) * (Math.PI / 180);
    const isMajor = i % 5 === 0;
    const r1 = isMajor ? 68 : 71;
    const r2 = 75;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', (80 + Math.sin(angle) * r1).toFixed(2));
    line.setAttribute('y1', (80 - Math.cos(angle) * r1).toFixed(2));
    line.setAttribute('x2', (80 + Math.sin(angle) * r2).toFixed(2));
    line.setAttribute('y2', (80 - Math.cos(angle) * r2).toFixed(2));
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', isMajor ? '1.8' : '0.8');
    ticksGroup.appendChild(line);
  }

  for (let h = 1; h <= 12; h++) {
    const angle = (h * 30) * (Math.PI / 180);
    const r = 56;
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', (80 + Math.sin(angle) * r).toFixed(2));
    text.setAttribute('y', (80 - Math.cos(angle) * r + 3.4).toFixed(2));
    text.textContent = String(h).padStart(2, '0');
    numeralsGroup.appendChild(text);
  }

  const updateClock = () => {
    const now = new Date();
    const sec = now.getSeconds();
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;

    if (hourHand) hourHand.setAttribute('transform', `rotate(${hr * 30} 80 80)`);
    if (minuteHand) minuteHand.setAttribute('transform', `rotate(${min * 6} 80 80)`);
    if (secondHand) secondHand.setAttribute('transform', `rotate(${sec * 6} 80 80)`);
    if (readout) {
      readout.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };

  updateClock();
  setInterval(updateClock, 1000);
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
  initHero3DLogo();
  initSwissStationClock();

  // 1. Berger Fohr Polarity Circle Toggle (Black <-> White)
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      if (next === 'light') {
        document.documentElement.dataset.theme = 'light';
      } else {
        delete document.documentElement.dataset.theme;
      }
    });
  }

  // 2. Berger Fohr Menu Square Drawer
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

  // 3. Hero Logo Mode Toggle (3D Brushed Gold <-> 2D Swiss Construction Grid)
  const logoViewport = document.getElementById('hero-logo-viewport');
  const mode3dBtn = document.getElementById('mode-3d-btn');
  const modeGridBtn = document.getElementById('mode-grid-btn');
  if (logoViewport && mode3dBtn && modeGridBtn) {
    mode3dBtn.addEventListener('click', () => {
      logoViewport.dataset.mode = '3d';
      mode3dBtn.classList.add('active');
      modeGridBtn.classList.remove('active');
    });
    modeGridBtn.addEventListener('click', () => {
      logoViewport.dataset.mode = 'grid';
      modeGridBtn.classList.add('active');
      mode3dBtn.classList.remove('active');
    });
  }

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
  const commands = {
    unix: 'curl -fsSL https://raw.githubusercontent.com/RitvikChunamari/velomesh/main/install.sh | bash',
    windows: 'irm https://raw.githubusercontent.com/RitvikChunamari/velomesh/main/install.ps1 | iex'
  };
  let currentOs = 'unix';

  osTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      osTabs.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentOs = btn.dataset.os || 'unix';
      if (installCodeEl) installCodeEl.textContent = commands[currentOs];
    });
  });

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(commands[currentOs]);
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = 'Copy Command'; }, 1800);
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
    if (barDomain) barDomain.style.width = `${res.domainScore}%`;
    if (barWorkflow) barWorkflow.style.width = `${res.workflowScore}%`;
    if (barAesthetic) barAesthetic.style.width = `${res.aestheticScore}%`;
    if (valDomain) valDomain.textContent = `${res.domainScore}%`;
    if (valWorkflow) valWorkflow.textContent = `${res.workflowScore}%`;
    if (valAesthetic) valAesthetic.textContent = `${res.aestheticScore}%`;

    if (visionBadge && visionGuidance) {
      if (res.ready) {
        visionBadge.className = 'verdict-chip chip-pass';
        visionBadge.textContent = 'READY_FOR_FULLSTACK_EXECUTION (One-Shot Build)';
        visionGuidance.textContent =
          'Product vision is clear. VeloMesh compiles Frontend UI, GSAP Motion, Backend API, PostgreSQL RLS Schema, Live Internet MCPs, and Browser QA in one shot.';
      } else {
        visionBadge.className = 'verdict-chip chip-fail';
        visionBadge.textContent = 'NEEDS_ELABORATION — VeloMesh Cannot Read Your Mind';
        visionGuidance.textContent =
          'VeloMesh automates 100% of skills, MCP servers, APIs, and databases—but it cannot get inside your brain. Elaborate who it serves, key workflows, and aesthetic style.';
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
