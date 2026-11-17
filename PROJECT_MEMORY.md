# VeloMesh Project Memory (`PROJECT_MEMORY.md`)

## Project Purpose & Architecture
- **VeloMesh** (`Agent Fusion Universal v4`) is an open-source, autonomous Full-Stack & Internet Capability Engine for AI coding agents (`Claude Code`, `Cursor`, `OpenAI Codex`, `GitHub Copilot`, `Google Antigravity`, and `OpenCode`).
- It operates automatically on every prompt via global rules (`RULE_BLOCK` / `rule_body()`) and `PreInvocation` hooks (`scripts/hooks.mjs`), orchestrating complete full-stack software builds (**Awwwards-grade Frontend UI + GSAP/WebGL Motion + Production Backend APIs + PostgreSQL/Prisma Schemas + Live Internet MCP/API Provisioning + Autonomous TDD & Browser QA**) from a single elaborated prompt.
- **Vision Elaboration Principle:** VeloMesh automates 100% of the *engineering stack, skills, MCP servers, APIs, and subagents*, but **cannot get inside the user's brain to see their product vision**. Underspecified prompts are flagged by `assessVisionClarity()` / `recommend_fullstack_bundle()` (`NEEDS_ELABORATION`) to trigger `brainstorming` / `grilling` clarifying questions before generating code; vision-elaborated prompts (`READY_FOR_FULLSTACK_EXECUTION`) execute end-to-end in one shot.

## Core Technologies & Entrypoints
- **Python CLI & Provisioning Engine:** [`scripts/velomesh.py`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/velomesh.py) (zero external pip dependencies; Python 3.9+ stdlib).
- **Node.js MCP Server & Hook Engine:** [`scripts/mcp-server.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/mcp-server.mjs), [`scripts/hooks.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/hooks.mjs), [`scripts/router.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/router.mjs), [`scripts/catalog.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/catalog.mjs) (zero external npm runtime dependencies; Node.js 18+ stdlib).
- **1-Command Global Installers:** [`install.sh`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/install.sh) (macOS/Linux) and [`install.ps1`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/install.ps1) (Windows PowerShell).
## Design System & Frontend Architecture (Pure Black & White Visual Haven Swiss)
- **Visual Direction & Sourced 21st.dev Patterns:** Strict achromatic **Black & White** monochrome Visual Haven Swiss system (`#070708` Obsidian Black ↔ `#f8f8fa` Stark White polarity toggle via `#theme-toggle-btn`, **zero** chromatic accent colors, zero Berger Föhr navbar primitives, floating dock, or geometric symbol grid).
- **21st.dev Components Adapted:**
  - **Swiss Navbar & Accessible Dropdowns** (`Navbar Section 2 [18120]`, `Rich Navigation Menu [18191]`, `Navbar with Dropdowns [606]`): typographic `VELOMESH` wordmark, centered segmented nav trigger bar (`Capabilities` 760px mega-menu, `Harnesses` 400px dropdown, `Process`, `Workbench`, `Vision Gate`), clean B&W icon polarity switch, and responsive mobile drawer `#mobile-nav-drawer`.
  - **Lattice Hero** (`Lattice Hero [26027]` + `Hero Minimalism [6999]`): pure monochrome runtime Fibonacci geodesic sphere & nearest-neighbor edge mesh pulsing white (`<canvas id="lattice-mesh-canvas">`, reduced-motion aware) paired with monumental `Switzer` typography, Vision Elaboration rule, and 1-command CLI installer.
  - **Architecture Bento Matrix (`#architecture-bento`)** (`Bento Grid [622 / 6541]`): 5 interactive tiles with flattened hairline layouts (Type/Contrast/CSS Token switcher, interactive damped spring physics waveform `#bento-spring-canvas`, API route contracts, PostgreSQL RLS SQL toggle, Live Internet Mesh harness path switcher).
  - **Execution Flow Showcase (`#execution-flow`)** (`Feature Section [1368]` + `How It Works Timeline [26902]`): interactive 4-stage pipeline switcher (`Vision Intake`, `Mesh Discovery`, `Coordinated Compile`, `Browser & Test Proof`).
  - **Line-Numbered Multi-File Workbench (`#workbench`)** (`Code Block [36502]`): 3 blueprints, 6 layer files, focused line highlighting, and `Copy File` action.
  - **Closing CTA (`#closing-cta`) & Halftone Wordmark Footer (`#site-footer`)** (`Worth Keeping CTA [26705]` + `Halftone Wordmark Footer [37628]`): pure B&W centered monolith CTA over the 4-column Swiss footer and interactive spring-physics dotted `velomesh` canvas.
- **Typography:** Self-hosted **Switzer** (`web/fonts/Switzer-{400,500,600,700}.woff2` mirrored to `docs/fonts/`) paired with `JetBrains Mono`. Strict `>= 12px` functional UI text floor.
- **UI Craft Verification:** Passes `impeccable detect` (local + `http://localhost:4173`) with **0 anti-patterns and 0 advisories**, `python3 scripts/velomesh.py audit-ui web` (`0` violations), and [`tests/website.test.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/tests/website.test.mjs).
- **Website Entrypoints:** [`web/index.html`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/index.html), [`web/styles.css`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/styles.css), [`web/app.js`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/app.js) (mirrored to `docs/` for GitHub Pages at `https://ritvikchunamari.github.io/velomesh/`).

## Verification Commands
- Python unit tests: `python3 tests/test_velomesh.py`
- Node hook & website regression tests: `node --test tests/hooks.test.mjs tests/website.test.mjs`
- Anti-slop UI craft audit: `python3 scripts/velomesh.py audit-ui web`
- Full-stack bundle synthesis preview: `python3 scripts/velomesh.py bundle "<prompt>"`
