// VeloMesh Interactive Awwwards Product Experience Engine
// 1. 60fps Neural Capability Mesh Canvas + Cursor Physics
// 2. Live 1-Prompt Full-Stack Architecture Synthesizer
// 3. Real-Time Vision Clarity Analyzer ("VeloMesh Cannot Read Your Mind")
// 4. GSAP + ScrollTrigger Choreography & Cursor Spotlight Cards

const BLUEPRINTS = {
  treasury: {
    prompt:
      "Build PulseLedger, a multi-tenant AI treasury & runway platform for Series-A CFOs. Use a dark Linear + Stripe editorial aesthetic with interactive WebGL cashflow projection graphs and GSAP scroll reveals. Build the backend in FastAPI + PostgreSQL with row-level security, live Stripe & Plaid webhook ingestion, and full Playwright E2E verification.",
    frontend: {
      skills: ["frontend-design", "impeccable", "design-system-references", "ui-ux-pro-max"],
      code: `// Design System: Linear + Stripe Obsidian Tokens
// Surface: #090A10 | Specular: 1px rgba(255,255,255,0.14)
<RunwayForecastCanvas
  burnRateSeries={tenantMetrics.burn30d}
  shader="cashflow-ribbon-glsl"
  reducedMotionFallback={true}
/>`
    },
    motion: {
      skills: ["gsap-core", "gsap-scrolltrigger", "emil-design-eng"],
      code: `// Choreography: cubic-bezier(0.16, 1, 0.3, 1)
gsap.fromTo(".kpi-ledger-card",
  { y: 28, opacity: 0, rotateX: 6 },
  { y: 0, opacity: 1, rotateX: 0, stagger: 0.06, duration: 0.75, ease: "expo.out" }
);`
    },
    backend: {
      skills: ["backend-patterns", "api-connector-builder", "security-review"],
      code: `# FastAPI + HMAC Webhook Verification + RBAC
@router.post("/v1/webhooks/stripe", status_code=202)
async def ingest_stripe_event(
    payload: bytes = Depends(verify_stripe_signature),
    tenant: TenantCtx = Depends(require_cfo_role),
):
    return await ledger_engine.project_runway_delta(tenant.id, payload)`
    },
    database: {
      skills: ["postgres-patterns", "prisma-patterns", "database-migrations"],
      code: `-- PostgreSQL 16 + Row-Level Security (RLS)
CREATE TABLE treasury_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  amount_cents BIGINT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE treasury_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON treasury_ledger_entries
  USING (tenant_id = current_setting('app.current_tenant')::uuid);`
    },
    mcp: {
      skills: ["discover_and_install_capability", "mcp-stripe-server", "mcp-postgres"],
      code: `[00.08s] Querying GitHub Mesh: "stripe webhook mcp" + "plaid api"
[00.24s] Provisioned & hot-linked: stripe/agent-toolkit (MCP)
[00.39s] Synthesized capability wrapper: mcp-plaid-treasury-sync
[00.41s] Linked across Claude Code, Cursor, Codex, Copilot & Antigravity`
    },
    qa: {
      skills: ["test-driven-development", "browser-qa", "verification-before-completion"],
      code: `✔ Vitest / Pytest: 24/24 unit & tenant RLS isolation tests PASS
✔ Playwright Desktop (1440x900) & Mobile (390x844): 0 layout shifts
✔ axe-core WCAG 2.2 AA Audit: 0 contrast or keyboard violations`
    }
  },
  webglStudio: {
    prompt:
      "Create Kinetix, a real-time collaborative motion-design & shader studio in the browser inspired by Framer and Raycast. Include a 60fps node-graph timeline with GSAP scrubbers, WebSockets CRDT state sync in Node.js, PostgreSQL + Redis asset versioning, and S3 presigned uploads.",
    frontend: {
      skills: ["frontend-design", "emil-design-eng", "design-system-references"],
      code: `// Framer + Raycast Floating Glass Inspector
<ShaderViewportCanvas
  fpsTarget={60}
  crdtPeers={activeCursors}
  colorSpace="display-p3"
/>`
    },
    motion: {
      skills: ["gsap-core", "gsap-scrolltrigger", "gsap-utils"],
      code: `// Magnetic Timeline Scrubber + Spring Snapping
const snapFrame = gsap.utils.snap(1 / 60);
gsap.to(playhead, { x: snapFrame(cursorX), duration: 0.22, ease: "power3.out" });`
    },
    backend: {
      skills: ["backend-patterns", "api-connector-builder", "security-review"],
      code: `// WebSocket CRDT Delta Broadcast + Presigned S3 Pipeline
wsServer.on("keyframe:mutate", async (session, delta) => {
  const merged = crdtDoc.applyValidatedDelta(session.userId, delta);
  await redisPub.publish(\`room:\${session.projectId}\`, merged);
});`
    },
    database: {
      skills: ["postgres-patterns", "prisma-patterns"],
      code: `-- Immutable Shader Scene Snapshots + GiST Indexing
CREATE TABLE scene_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  crdt_vector BYTEA NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_scene_proj_time ON scene_revisions(project_id, created_at DESC);`
    },
    mcp: {
      skills: ["discover_and_install_capability", "mcp-aws-s3", "mcp-redis"],
      code: `[00.06s] Querying GitHub Mesh: "cloudflare r2 s3 presigned mcp"
[00.21s] Provisioned & validated: modelcontextprotocol/server-aws-kb
[00.34s] Hot-linked 4 capability wrappers into active agent session`
    },
    qa: {
      skills: ["test-driven-development", "browser-qa", "performance-lab"],
      code: `✔ CRDT Concurrent Merge Fuzz Suite: 1,000/1,000 ops deterministic
✔ Frame Budget Audit: 59.8 FPS sustained during 12-cursor scrub
✔ Lighthouse Performance: 98 | Accessibility: 100`
    }
  },
  clinical: {
    prompt:
      "Build AetherMD, a HIPAA-compliant ambient clinical triage & diagnostic portal for emergency physicians. Use high-contrast Apple & Stripe typography, real-time HL7/FHIR patient vitals streaming, FastAPI backend with audit-logged PostgreSQL encryption, and RBAC session controls.",
    frontend: {
      skills: ["frontend-design", "ui-ux-pro-max", "fixing-accessibility"],
      code: `// High-Contrast Zero-Latency Triage Telemetry Grid
<PatientVitalsCard
  acuityLevel="ESI-1"
  waveformStream={hl7Stream}
  aria-live="assertive"
/>`
    },
    motion: {
      skills: ["emil-design-eng", "gsap-core"],
      code: `// Instantaneous Clinical Drawer Transition (<140ms)
gsap.to(".triage-drawer", {
  xPercent: 0,
  duration: 0.14,
  ease: "cubic-bezier(0.22, 1, 0.36, 1)"
});`
    },
    backend: {
      skills: ["hipaa-compliance", "backend-patterns", "security-review"],
      code: `# HIPAA PHI Access Interceptor + Immutable Audit Envelope
@router.get("/v1/fhir/Patient/{patient_id}")
async def read_patient_chart(
    patient_id: UUID,
    clinician: Clinician = Depends(verify_mfa_session),
):
    await phi_audit_log.record_access(clinician.id, patient_id, reason="ER_TRIAGE")
    return await fhir_repo.fetch_decrypted_chart(patient_id)`
    },
    database: {
      skills: ["postgres-patterns", "security-review"],
      code: `-- Tamper-Evident HIPAA Audit Trail + pgcrypto Envelope
CREATE TABLE phi_access_audit_log (
  event_id BIGSERIAL PRIMARY KEY,
  clinician_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  prev_hash CHAR(64) NOT NULL,
  entry_hash CHAR(64) NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);`
    },
    mcp: {
      skills: ["discover_and_install_capability", "mcp-fhir-hl7"],
      code: `[00.09s] Querying GitHub Mesh: "hl7 fhir r4 mcp server"
[00.28s] Synthesized validated wrapper: mcp-fhir-clinical-schema
[00.37s] Enforced zero-PHI-in-logs security guardrail across harnesses`
    },
    qa: {
      skills: ["test-driven-development", "security-review", "browser-qa"],
      code: `✔ HIPAA PHI Redaction & Audit-Chain Integrity Tests: 18/18 PASS
✔ WCAG 2.2 AAA High-Contrast & Keyboard-Only Navigation: PASS
✔ Zero unauthenticated FHIR endpoint exposure verified`
    }
  }
};

function initNeuralCanvas() {
  const canvas = document.getElementById("mesh-canvas");
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const mouse = { x: width * 0.5, y: height * 0.35, active: false };
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const nodeCount = Math.min(48, Math.max(24, Math.floor(width / 34)));
  const colors = ["#f59e0b", "#38bdf8", "#10b981", "#a855f7"];
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    radius: i % 5 === 0 ? 3.2 : 1.8,
    color: colors[i % colors.length]
  }));

  const pulses = [];
  function triggerPulseBurst() {
    for (let i = 0; i < 8; i++) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      const b = nodes[Math.floor(Math.random() * nodes.length)];
      if (a && b && a !== b) {
        pulses.push({ a, b, t: 0, speed: 0.025 + Math.random() * 0.02, color: "#fbbf24" });
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      if (mouse.active) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 220 && dist > 1) {
          n.x += (dx / dist) * 0.35;
          n.y += (dy / dist) * 0.35;
        }
      }

      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const dx = n.x - m.x;
        const dy = n.y - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 165) {
          const alpha = (1 - dist / 165) * 0.18;
          ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (Math.random() < 0.08 && pulses.length < 18) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      const b = nodes[Math.floor(Math.random() * nodes.length)];
      if (a && b && a !== b) {
        pulses.push({ a, b, t: 0, speed: 0.018, color: a.color });
      }
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += p.speed;
      if (p.t >= 1) {
        pulses.splice(i, 1);
        continue;
      }
      const px = p.a.x + (p.b.x - p.a.x) * p.t;
      const py = p.a.y + (p.b.y - p.a.y) * p.t;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  return triggerPulseBurst;
}

function renderBlueprint(key, customPromptText = null) {
  const bp = BLUEPRINTS[key] || BLUEPRINTS.treasury;
  const promptInput = document.getElementById("synth-prompt-input");
  if (promptInput && !customPromptText) {
    promptInput.value = bp.prompt;
  }

  const bindings = [
    ["frontend", bp.frontend],
    ["motion", bp.motion],
    ["backend", bp.backend],
    ["database", bp.database],
    ["mcp", bp.mcp],
    ["qa", bp.qa]
  ];

  bindings.forEach(([layer, data]) => {
    const skillsEl = document.getElementById(`skills-${layer}`);
    const codeEl = document.getElementById(`code-${layer}`);
    if (skillsEl) {
      skillsEl.innerHTML = data.skills
        .map((s) => `<span class="skill-pill">${s}</span>`)
        .join("");
    }
    if (codeEl) {
      codeEl.textContent = data.code;
    }
  });

  if (window.gsap) {
    window.gsap.fromTo(
      ".synth-card",
      { y: 14, opacity: 0.35 },
      { y: 0, opacity: 1, stagger: 0.045, duration: 0.42, ease: "power2.out" }
    );
  }
}

function evaluateLiveVisionClarity(text) {
  const clean = String(text || "").trim();
  const words = clean.toLowerCase().split(/[^a-z0-9_-]+/).filter(Boolean);
  const wordSet = new Set(words);

  const domainHits = [
    "saas", "dashboard", "fintech", "cfo", "healthcare", "clinical", "ecommerce", "marketplace",
    "crm", "developer", "cli", "studio", "platform", "analytics", "workflow", "treasury", "billing",
    "portfolio", "fitness", "booking", "editor", "collab", "multitenant", "multi-tenant", "b2b", "portal"
  ].filter((w) => wordSet.has(w)).length;

  const featureHits = [
    "auth", "login", "webhook", "stripe", "chart", "graph", "forecast", "table", "search", "upload",
    "realtime", "websocket", "notification", "export", "crud", "ledger", "payment", "pipeline",
    "subscription", "onboarding", "interactive", "canvas", "webgl", "api", "schema", "rls", "fhir", "crdt"
  ].filter((w) => wordSet.has(w)).length;

  const aestheticHits = [
    "linear", "vercel", "stripe", "raycast", "framer", "apple", "awwwards", "dark", "minimal",
    "editorial", "glass", "brutalist", "cinematic", "react", "nextjs", "fastapi", "postgres",
    "postgresql", "supabase", "tailwind", "gsap", "webgl", "three", "typescript", "node", "python"
  ].filter((w) => wordSet.has(w)).length;

  const domainScore = Math.min(100, Math.round((domainHits * 38) + Math.min(40, words.length * 1.5)));
  const featureScore = Math.min(100, Math.round((featureHits * 34) + Math.min(35, words.length * 1.2)));
  const aestheticScore = Math.min(100, Math.round((aestheticHits * 36) + Math.min(30, words.length)));

  const ready = words.length >= 12 && (domainScore >= 55 && featureScore >= 50 && aestheticScore >= 45);
  return { words: words.length, domainScore, featureScore, aestheticScore, ready };
}

document.addEventListener("DOMContentLoaded", () => {
  const triggerBurst = initNeuralCanvas();

  // 1. OS Installer Switcher & Copy Button
  const osTabs = document.querySelectorAll(".os-tab");
  const cmdTextEl = document.getElementById("install-cmd-code");
  const copyBtn = document.getElementById("copy-install-btn");
  const commands = {
    unix: "curl -fsSL https://raw.githubusercontent.com/RitvikChunamari/velomesh/main/install.sh | bash",
    windows: "irm https://raw.githubusercontent.com/RitvikChunamari/velomesh/main/install.ps1 | iex"
  };
  let activeOs = "unix";

  osTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      osTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeOs = tab.dataset.os || "unix";
      if (cmdTextEl) cmdTextEl.textContent = commands[activeOs];
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(commands[activeOs]);
        copyBtn.textContent = "Copied ✓";
        setTimeout(() => {
          copyBtn.textContent = "Copy 1-Command";
        }, 2000);
      } catch {
        copyBtn.textContent = "Ready";
      }
    });
  }

  // 2. Initialize 1-Prompt Full-Stack Synthesizer
  renderBlueprint("treasury");
  const presetBtns = document.querySelectorAll(".preset-btn");
  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      presetBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderBlueprint(btn.dataset.blueprint);
      triggerBurst();
    });
  });

  const synthRunBtn = document.getElementById("run-synth-btn");
  const synthInput = document.getElementById("synth-prompt-input");
  if (synthRunBtn && synthInput) {
    synthRunBtn.addEventListener("click", () => {
      const val = synthInput.value.toLowerCase();
      if (val.includes("shader") || val.includes("framer") || val.includes("kinetix")) {
        renderBlueprint("webglStudio", synthInput.value);
      } else if (val.includes("hipaa") || val.includes("clinical") || val.includes("patient")) {
        renderBlueprint("clinical", synthInput.value);
      } else {
        renderBlueprint("treasury", synthInput.value);
      }
      triggerBurst();
    });
  }

  // 3. Live Vision Clarity Analyzer ("VeloMesh Cannot Read Your Mind")
  const visionTester = document.getElementById("live-vision-input");
  const badgeOut = document.getElementById("live-vision-badge");
  const msgOut = document.getElementById("live-vision-guidance");
  const barDomain = document.getElementById("bar-domain");
  const barWorkflow = document.getElementById("bar-workflow");
  const barAesthetic = document.getElementById("bar-aesthetic");
  const valDomain = document.getElementById("val-domain");
  const valWorkflow = document.getElementById("val-workflow");
  const valAesthetic = document.getElementById("val-aesthetic");

  function updateVisionMeter() {
    if (!visionTester) return;
    const res = evaluateLiveVisionClarity(visionTester.value);
    if (barDomain) barDomain.style.width = `${res.domainScore}%`;
    if (barWorkflow) barWorkflow.style.width = `${res.featureScore}%`;
    if (barAesthetic) barAesthetic.style.width = `${res.aestheticScore}%`;
    if (valDomain) valDomain.textContent = `${res.domainScore}%`;
    if (valWorkflow) valWorkflow.textContent = `${res.featureScore}%`;
    if (valAesthetic) valAesthetic.textContent = `${res.aestheticScore}%`;

    if (badgeOut && msgOut) {
      if (res.ready) {
        badgeOut.className = "vision-status-badge status-ready";
        badgeOut.textContent = "✓ READY_FOR_FULLSTACK_EXECUTION (One-Shot Autonomous Build)";
        msgOut.textContent =
          "Your product vision is clear. VeloMesh autonomously chains Frontend + GSAP Motion + Backend API + PostgreSQL Schema + Live Internet MCPs + Browser QA in a single shot—zero slash commands required.";
      } else {
        badgeOut.className = "vision-status-badge status-warn";
        badgeOut.textContent = "⚠ NEEDS_ELABORATION — VeloMesh Cannot Read Your Mind";
        msgOut.textContent =
          "VeloMesh automates 100% of skills, MCPs, APIs, and databases—but it cannot get inside your brain to see your vision. Elaborate who it's for, core workflows, and visual vibe (or let VeloMesh's brainstorming gate ask you 2–3 sharp questions first).";
      }
    }
  }

  if (visionTester) {
    visionTester.addEventListener("input", updateVisionMeter);
    updateVisionMeter();
  }

  document.querySelectorAll(".vision-sample-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!visionTester) return;
      visionTester.value = btn.dataset.sample || "";
      updateVisionMeter();
      triggerBurst();
    });
  });

  // 4. Cursor Spotlight Tracking on Bento Cards
  document.querySelectorAll(".bento-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    });
  });

  // 5. GSAP + ScrollTrigger Entrance Choreography
  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.gsap.from(".hero-eyebrow, .hero-title, .hero-subtitle, .vision-callout-banner, .install-dock", {
      y: 26,
      opacity: 0,
      stagger: 0.08,
      duration: 0.85,
      ease: "power3.out"
    });
    window.gsap.from(".hero-visual-card", {
      y: 34,
      opacity: 0,
      duration: 0.95,
      delay: 0.2,
      ease: "power3.out"
    });
  }
});
