// VeloMesh Interactive Full-Stack Workbench & Vision Clarity Engine

const WORKBENCH_BLUEPRINTS = {
  treasury: {
    prompt:
      "Build PulseLedger, a multi-tenant AI treasury & runway platform for Series-A CFOs. Use a Linear + Stripe architectural aesthetic with interactive WebGL cashflow projection graphs and GSAP scroll reveals. Build the backend in FastAPI + PostgreSQL with row-level security, live Stripe & Plaid webhook ingestion, and full Playwright E2E verification.",
    layers: {
      frontend: {
        file: "components/RunwayCanvas.tsx",
        skills: ["frontend-design", "impeccable", "design-system-references", "ui-ux-pro-max"],
        code: `// Synthesized Frontend Layer — Linear + Stripe Design System Tokens
import { useEffect, useRef } from "react";
import { mountCashflowShader } from "../shaders/cashflowRibbon";

export function RunwayForecastStage({ tenantId, burnSeries }: RunwayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    return mountCashflowShader(canvasRef.current, {
      series: burnSeries,
      strokeColor: "#E04006",
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
        code: `// Synthesized Motion Layer — Emil Kowalski Custom Easing & GSAP ScrollTrigger
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function initLedgerChoreography(container: HTMLElement) {
  const rows = container.querySelectorAll("[data-ledger-row]");
  gsap.fromTo(
    rows,
    { y: 16, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.42,
      stagger: 0.035,
      ease: "cubic-bezier(0.23, 1, 0.32, 1)",
      scrollTrigger: { trigger: container, start: "top 82%" },
    }
  );
}`
      },
      backend: {
        file: "api/webhooks_stripe.py",
        skills: ["backend-patterns", "api-connector-builder", "security-review"],
        code: `# Synthesized Backend Layer — FastAPI + HMAC Webhook Verification + RBAC
from fastapi import APIRouter, Depends, Header, HTTPException
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
  "velomesh_Internet_Provisioning_Trace": [
    "[00.07s] Querying GitHub Mesh for missing capabilities: stripe webhook mcp + plaid api",
    "[00.22s] Discovered & validated: stripe/agent-toolkit (MCP Server, 4.8k stars)",
    "[00.36s] Synthesized capability wrapper: mcp-plaid-treasury-sync",
    "[00.41s] Hot-linked across Claude Code, Cursor, Codex, GitHub Copilot, Antigravity & OpenCode"
  ]
}`
      },
      qa: {
        file: "qa/verification-receipt.txt",
        skills: ["test-driven-development", "browser-qa", "verification-before-completion"],
        code: `VELOMESH AUTONOMOUS VERIFICATION RECEIPT
========================================
[PASS] pytest tests/test_rls_isolation.py        — 18/18 cross-tenant SQL leak checks passed
[PASS] vitest run src/components/RunwayCanvas    — 12/12 unit & shader fallback checks passed
[PASS] playwright test --project=desktop,mobile  — Zero layout overflow at 1440px & 390px
[PASS] impeccable detect http://localhost:4173   — 0 anti-pattern violations, 0 advisories`
      }
    }
  },
  webglStudio: {
    prompt:
      "Create Kinetix, a real-time collaborative motion-design & shader studio in the browser inspired by Framer and Raycast. Include a 60fps node-graph timeline with GSAP scrubbers, WebSockets CRDT state sync in Node.js, PostgreSQL + Redis asset versioning, and S3 presigned uploads.",
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
    ease: "cubic-bezier(0.23, 1, 0.32, 1)",
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
  "velomesh_Internet_Provisioning_Trace": [
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
[PASS] CRDT Concurrent Merge Fuzz Suite          — 1,000/1,000 concurrent ops deterministic
[PASS] Chrome DevTools Frame Budget Audit        — 59.8 FPS sustained across 12 peer cursors
[PASS] impeccable detect http://localhost:4173   — 0 anti-pattern violations, 0 advisories`
      }
    }
  },
  clinical: {
    prompt:
      "Build AetherMD, a HIPAA-compliant ambient clinical triage & diagnostic portal for emergency physicians. Use high-contrast Swiss & Stripe typography, real-time HL7/FHIR patient vitals streaming, FastAPI backend with audit-logged PostgreSQL encryption, and RBAC session controls.",
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
    ease: "cubic-bezier(0.32, 0.72, 0, 1)",
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
  "velomesh_Internet_Provisioning_Trace": [
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
[PASS] HIPAA PHI Redaction & Hash-Chain Suite    — 22/22 tamper-evidence checks passed
[PASS] axe-core WCAG 2.2 AAA High-Contrast       — 0 contrast or keyboard-trap findings
[PASS] impeccable detect http://localhost:4173   — 0 anti-pattern violations, 0 advisories`
      }
    }
  }
};

function scoreVisionClarity(promptText) {
  const clean = String(promptText || "").trim();
  const words = clean.toLowerCase().split(/[^a-z0-9_-]+/).filter(Boolean);
  const wordSet = new Set(words);

  const domainHits = [
    "saas", "dashboard", "fintech", "cfo", "healthcare", "clinical", "ecommerce", "marketplace",
    "crm", "developer", "cli", "studio", "platform", "analytics", "workflow", "treasury", "billing",
    "portfolio", "fitness", "booking", "editor", "collab", "multitenant", "multi-tenant", "b2b", "portal", "athletes"
  ].filter((w) => wordSet.has(w)).length;

  const workflowHits = [
    "auth", "login", "webhook", "stripe", "chart", "graph", "forecast", "table", "search", "upload",
    "realtime", "websocket", "notification", "export", "crud", "ledger", "payment", "pipeline",
    "subscription", "onboarding", "interactive", "canvas", "webgl", "api", "schema", "rls", "fhir", "crdt"
  ].filter((w) => wordSet.has(w)).length;

  const aestheticHits = [
    "linear", "vercel", "stripe", "raycast", "framer", "apple", "awwwards", "dark", "minimal",
    "editorial", "swiss", "architectural", "cinematic", "react", "nextjs", "fastapi", "postgres",
    "postgresql", "supabase", "tailwind", "gsap", "webgl", "three", "typescript", "node", "python"
  ].filter((w) => wordSet.has(w)).length;

  const domainScore = Math.min(100, Math.round(domainHits * 38 + Math.min(40, words.length * 1.5)));
  const workflowScore = Math.min(100, Math.round(workflowHits * 34 + Math.min(35, words.length * 1.2)));
  const aestheticScore = Math.min(100, Math.round(aestheticHits * 36 + Math.min(30, words.length)));

  const ready = words.length >= 12 && domainScore >= 55 && workflowScore >= 50 && aestheticScore >= 45;
  return { domainScore, workflowScore, aestheticScore, ready };
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. OS 1-Command Installer Switcher
  const osBtns = document.querySelectorAll(".os-btn");
  const installCodeEl = document.getElementById("install-cmd-code");
  const copyBtn = document.getElementById("copy-install-btn");
  const commands = {
    unix: "curl -fsSL https://raw.githubusercontent.com/RitvikChunamari/velomesh/main/install.sh | bash",
    windows: "irm https://raw.githubusercontent.com/RitvikChunamari/velomesh/main/install.ps1 | iex"
  };
  let currentOs = "unix";

  osBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      osBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentOs = btn.dataset.os || "unix";
      if (installCodeEl) installCodeEl.textContent = commands[currentOs];
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(commands[currentOs]);
        copyBtn.textContent = "Copied";
        setTimeout(() => {
          copyBtn.textContent = "Copy Command";
        }, 1800);
      } catch {
        copyBtn.textContent = "Ready";
      }
    });
  }

  // 2. Interactive Multi-File Full-Stack Workbench
  let currentBlueprint = "treasury";
  let currentLayer = "frontend";

  const promptInput = document.getElementById("synth-prompt-input");
  const skillsStrip = document.getElementById("active-skills-strip");
  const codeOutput = document.getElementById("workbench-code-output");
  const blueprintTabs = document.querySelectorAll(".blueprint-tab");
  const fileTabs = document.querySelectorAll(".file-tab-btn");

  function renderWorkbench(updatePromptText = true) {
    const bp = WORKBENCH_BLUEPRINTS[currentBlueprint] || WORKBENCH_BLUEPRINTS.treasury;
    if (promptInput && updatePromptText) {
      promptInput.value = bp.prompt;
    }

    // Update file names on sidebar tabs
    fileTabs.forEach((tab) => {
      const layerKey = tab.dataset.layer;
      const nameSpan = tab.querySelector(".file-tab-name");
      if (layerKey && bp.layers[layerKey] && nameSpan) {
        nameSpan.textContent = bp.layers[layerKey].file;
      }
      tab.classList.toggle("active", layerKey === currentLayer);
    });

    const activeData = bp.layers[currentLayer] || bp.layers.frontend;
    if (skillsStrip) {
      skillsStrip.innerHTML =
        `<span>Auto-linked skills &amp; MCPs:</span>` +
        activeData.skills.map((s) => `<span class="skill-chip">${s}</span>`).join("");
    }
    if (codeOutput) {
      codeOutput.textContent = activeData.code;
    }

    // Pulse SVG schematic path in Hero if GSAP is loaded
    if (window.gsap) {
      window.gsap.fromTo(
        ".signal-node",
        { attr: { r: 6 } },
        { attr: { r: 4.5 }, duration: 0.35, stagger: 0.04, ease: "power2.out" }
      );
    }
  }

  blueprintTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      blueprintTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentBlueprint = btn.dataset.blueprint || "treasury";
      renderWorkbench(true);
    });
  });

  fileTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      currentLayer = tab.dataset.layer || "frontend";
      renderWorkbench(false);
    });
  });

  const runSynthBtn = document.getElementById("run-synth-btn");
  if (runSynthBtn && promptInput) {
    runSynthBtn.addEventListener("click", () => {
      const text = promptInput.value.toLowerCase();
      if (text.includes("shader") || text.includes("webgl") || text.includes("kinetix")) {
        currentBlueprint = "webglStudio";
      } else if (text.includes("hipaa") || text.includes("clinical") || text.includes("fhir")) {
        currentBlueprint = "clinical";
      } else {
        currentBlueprint = "treasury";
      }
      blueprintTabs.forEach((b) =>
        b.classList.toggle("active", b.dataset.blueprint === currentBlueprint)
      );
      renderWorkbench(false);
    });
  }

  renderWorkbench(true);

  // 3. Interactive Vision Clarity Inspector ("VeloMesh Cannot Read Your Mind")
  const visionInput = document.getElementById("live-vision-input");
  const visionBadge = document.getElementById("live-vision-badge");
  const visionGuidance = document.getElementById("live-vision-guidance");
  const barDomain = document.getElementById("bar-domain");
  const barWorkflow = document.getElementById("bar-workflow");
  const barAesthetic = document.getElementById("bar-aesthetic");
  const valDomain = document.getElementById("val-domain");
  const valWorkflow = document.getElementById("val-workflow");
  const valAesthetic = document.getElementById("val-aesthetic");

  function refreshVisionInspector() {
    if (!visionInput) return;
    const result = scoreVisionClarity(visionInput.value);
    if (barDomain) barDomain.style.width = `${result.domainScore}%`;
    if (barWorkflow) barWorkflow.style.width = `${result.workflowScore}%`;
    if (barAesthetic) barAesthetic.style.width = `${result.aestheticScore}%`;
    if (valDomain) valDomain.textContent = `${result.domainScore}%`;
    if (valWorkflow) valWorkflow.textContent = `${result.workflowScore}%`;
    if (valAesthetic) valAesthetic.textContent = `${result.aestheticScore}%`;

    if (visionBadge && visionGuidance) {
      if (result.ready) {
        visionBadge.className = "ledger-status status-verified";
        visionBadge.textContent = "READY_FOR_FULLSTACK_EXECUTION (One-Shot Autonomous Build)";
        visionGuidance.textContent =
          "Product vision is clear. VeloMesh chains Frontend UI, GSAP Motion, Backend API, PostgreSQL RLS Schema, Live Internet MCPs, and Browser QA in one shot without slash commands.";
      } else {
        visionBadge.className = "ledger-status status-blocked";
        visionBadge.textContent = "NEEDS_ELABORATION — VeloMesh Cannot Read Your Mind";
        visionGuidance.textContent =
          "VeloMesh automates 100% of skills, MCP servers, APIs, and databases—but it cannot get inside your brain. Elaborate who it is for, core workflows, and aesthetic direction so VeloMesh doesn't have to guess.";
      }
    }
  }

  if (visionInput) {
    visionInput.addEventListener("input", refreshVisionInspector);
    refreshVisionInspector();
  }

  document.querySelectorAll(".vision-sample-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!visionInput) return;
      document.querySelectorAll(".vision-sample-btn").forEach((b) => b.classList.remove("btn-signal"));
      btn.classList.add("btn-signal");
      visionInput.value = btn.dataset.sample || "";
      refreshVisionInspector();
    });
  });
});
