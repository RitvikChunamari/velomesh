# VeloMesh Project Memory (`PROJECT_MEMORY.md`)

## Project Purpose & Architecture
- **VeloMesh** (`Agent Fusion Universal v4`) is an open-source, autonomous Full-Stack & Internet Capability Engine for AI coding agents (`Claude Code`, `Cursor`, `OpenAI Codex`, `GitHub Copilot`, `Google Antigravity`, and `OpenCode`).
- It operates automatically on every prompt via global rules (`RULE_BLOCK` / `rule_body()`) and `PreInvocation` hooks (`scripts/hooks.mjs`), orchestrating complete full-stack software builds (**Awwwards-grade Frontend UI + GSAP/WebGL Motion + Production Backend APIs + PostgreSQL/Prisma Schemas + Live Internet MCP/API Provisioning + Autonomous TDD & Browser QA**) from a single elaborated prompt.
- **Vision Elaboration Principle:** VeloMesh automates 100% of the *engineering stack, skills, MCP servers, APIs, and subagents*, but **cannot get inside the user's brain to see their product vision**. Underspecified prompts are flagged by `assessVisionClarity()` / `recommend_fullstack_bundle()` (`NEEDS_ELABORATION`) to trigger `brainstorming` / `grilling` clarifying questions before generating code; vision-elaborated prompts (`READY_FOR_FULLSTACK_EXECUTION`) execute end-to-end in one shot.

## Core Technologies & Entrypoints
- **Python CLI & Provisioning Engine:** [`scripts/velomesh.py`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/velomesh.py) (zero external pip dependencies; Python 3.9+ stdlib).
- **Node.js MCP Server & Hook Engine:** [`scripts/mcp-server.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/mcp-server.mjs), [`scripts/hooks.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/hooks.mjs), [`scripts/router.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/router.mjs), [`scripts/catalog.mjs`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/scripts/catalog.mjs) (zero external npm runtime dependencies; Node.js 18+ stdlib).
- **1-Command Global Installers:** [`install.sh`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/install.sh) (macOS/Linux) and [`install.ps1`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/install.ps1) (Windows PowerShell).
- **Awwwards Interactive Product Website:** [`web/index.html`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/index.html), [`web/styles.css`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/styles.css), [`web/app.js`](file:///Users/ritvik/.gemini/antigravity/scratch/velomesh/web/app.js) (mirrored to `docs/` for GitHub Pages at `https://ritvikchunamari.github.io/velomesh/`).

## Verification Commands
- Python unit tests: `python3 tests/test_velomesh.py`
- Node hook & routing tests: `node --test tests/hooks.test.mjs`
- Full-stack bundle synthesis preview: `python3 scripts/velomesh.py bundle "<prompt>"`
