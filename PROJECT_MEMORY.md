# VeloMesh Project Memory (`PROJECT_MEMORY.md`)

## Project Purpose & Architecture
- **VeloMesh** (`Agent Fusion Universal v4`) is an open-source, autonomous Full-Stack & Internet Capability Engine for AI coding agents (`Claude Code`, `Cursor`, `OpenAI Codex`, `GitHub Copilot`, `Google Antigravity`, and `OpenCode`).
- It operates automatically on every prompt via global rules (`RULE_BLOCK` / `rule_body()`) and `PreInvocation` hooks (`scripts/hooks.mjs`), orchestrating complete full-stack software builds (**Awwwards-grade Frontend UI + GSAP/WebGL Motion + Production Backend APIs + PostgreSQL/Prisma Schemas + Live Internet MCP/API Provisioning + Autonomous TDD & Browser QA**) from a single elaborated prompt.
- **Vision Elaboration Principle:** VeloMesh automates 100% of the *engineering stack, skills, MCP servers, APIs, and subagents*, but **cannot get inside the user's brain to see their product vision**. Underspecified prompts are flagged by `assessVisionClarity()` / `recommend_fullstack_bundle()` (`NEEDS_ELABORATION`) to trigger `brainstorming` / `grilling` clarifying questions before generating code; vision-elaborated prompts (`READY_FOR_FULLSTACK_EXECUTION`) execute end-to-end in one shot.

## Core Technologies & Entrypoints
- **Python CLI & Provisioning Engine:** [`scripts/velomesh.py`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/velomesh.py) (zero external pip dependencies; Python 3.9+ stdlib).
- **Node.js MCP Server & Hook Engine:** [`scripts/mcp-server.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/mcp-server.mjs), [`scripts/hooks.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/hooks.mjs), [`scripts/router.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/router.mjs), [`scripts/catalog.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/catalog.mjs) (zero external npm runtime dependencies; Node.js 18+ stdlib).
- **1-Command Global Installers:** [`install.sh`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/install.sh) (macOS/Linux) and [`install.ps1`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/install.ps1) (Windows PowerShell).
## Design System & Frontend Architecture (Obsidian Swiss Editorial Edition)
- **Visual Direction & Sourced 21st.dev Patterns:** Inspired by Swiss editorial typography on Warm Obsidian (`#08080a` / `#f3efe6`, toggleable to `#f5f2eb` / `#121110` Warm Chalk polarity via `#theme-toggle-btn`) with Swiss Vermilion (`#ff3b2f` / `#b8180d`) accent. Zero VeloMesh geometric emblem anywhere on the marketing site.
- **21st.dev Components Adapted:**
  - **Swiss Navbar & Accessible Dropdowns** (adapted from `Navbar Section 2 [18120]`, `Rich Navigation Menu [18191]`, and `Navbar with Dropdowns [606]`): typographic `VELOMESH` wordmark, centered segmented nav pill (`Capabilities` 2-column mega-menu + `Harnesses` dropdown + direct section links), hover/click/keyboard (`Esc`, `ArrowDown`, `ArrowUp`) support, and responsive mobile drawer with expandable accordions.
  - **Lattice Hero** (adapted from `Lattice Hero [26027]` + `Hero Minimalism [6999]`): runtime Fibonacci geodesic sphere & nearest-neighbor edge mesh pulsing in vermilion (`<canvas id="lattice-mesh-canvas">`, reduced-motion aware), paired with monumental `Switzer` display type, Vision Elaboration rule, and 1-command CLI installer.
  - **Halftone Wordmark Footer** (adapted from `Halftone Wordmark Footer [37628]`): 4-column Swiss footer (`System / Install / Source`) with `Back to top ↑` and bottom-cropped interactive halftone-dotted `velomesh` canvas with spring pointer physics and click shockwave ring.
- **Preserved Interactive Sections:** `#works-index` open construction archive (`Cols: 2/3/6`, `Grid`, `Labels`, category filters, floating dock auto-hiding over footer), `#workbench` 6-layer synthesizer, and `#vision-spec` Vision Clarity Gate.
- **Typography:** Self-hosted **Switzer** (`web/fonts/Switzer-{400,500,600,700}.woff2` mirrored to `docs/fonts/`) paired with `JetBrains Mono`. Strict `>= 12px` functional UI text floor.
- **UI Craft Verification:** Passes `impeccable detect http://localhost:4173`, `python3 scripts/velomesh.py audit-ui web` (`0` violations), and `sloplint` (`0 FAIL`).
- **Website Entrypoints:** [`web/index.html`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/index.html), [`web/styles.css`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/styles.css), [`web/app.js`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/app.js) (mirrored to `docs/` for GitHub Pages at `https://ritvikchunamari.github.io/velomesh/`).

## Verification Commands
- Python unit tests: `python3 tests/test_velomesh.py`
- Node hook & routing tests: `node --test tests/hooks.test.mjs`
- Anti-slop UI craft audit: `python3 scripts/velomesh.py audit-ui web`
- Full-stack bundle synthesis preview: `python3 scripts/velomesh.py bundle "<prompt>"`
