---
name: velomesh
description: VeloMesh Universal Multi-Model, Prompt Optimizer, Platform Skill Mesh & Super-Hooks Orchestrator. Autonomously selects and switches real platform models mid-execution via velomesh/auto, indexes all native platform skills alongside GitHub skills/MCPs, upgrades raw prompts automatically, enforces RTK/security/UI-craft hooks, and builds Awwwards-level full-stack web apps from one elaborated prompt across Claude Code, Cursor, Codex, GitHub Copilot, Antigravity, and OpenCode.
---

# VeloMesh — Autonomous Multi-Model, Platform Skill & Hook Super-Tool

VeloMesh turns a single user prompt into an optimized engineering spec routed across **real platform-native models (`velomesh/auto`)**, **unified platform + internet skills**, **RTK / Security / UI-Craft Hooks**, **Frontend UI**, **Interactive Motion (GSAP / WebGL / Canvas)**, **Backend APIs**, **PostgreSQL / Supabase RLS Schemas**, and **Autonomous Browser QA**.

## Core Operating Principles

1. **Unified Platform + Internet Skill Mesh:**
   - Automatically discovers and ranks skills already installed on your agentic AI platform (`~/.gemini/config/skills`, plugins, `~/.codex/skills`, `~/.claude/plugins`, `~/.cursor/skills`, `~/.config/opencode/skills`, `~/.copilot/skills`) right alongside VeloMesh's hub and GitHub repositories.
2. **Automatic Prompt Optimization & Vision Elaboration (`optimize_prompt`):**
   - Automatically upgrades raw prompts with matched platform skills, engineering constraints, and verification gates.
   - **Vision Elaboration Rule:** VeloMesh automates 100% of skills, model routing, hooks, MCPs, APIs, and databases—but **it cannot get inside the user's brain to invent their product vision**. If an app/build prompt is underspecified, run `brainstorming` / `grilling` to ask 2–3 high-leverage clarifying questions before scaffolding code.
3. **Platform-Native Multi-Model Switching (`velomesh/auto`):**
   - Dynamically discovers real runnable models installed/cached on the host (`~/.codex/models_cache.json`, OpenCode routers, Claude Code pickers, API keys, and CLI bridges) and switches models mid-execution across `architecture`, `frontend`, `implementation`, `fast`, and independent `review` phases (`select_model_route`).
4. **Super-Hooks Suite (`rtk` + Guardrails):**
   - Wires `RTK Token Killer` (`PreToolUse`), `Prompt Optimizer` (`UserPromptSubmit`), `Security & Secret Guard`, `Impeccable UI Craft Gate` (`PostToolUse`), `Plankton Lint Gate`, and `Context Credit Saver` additively across Claude Code, Codex, and Antigravity without overwriting user hooks.
5. **Anti-AI-Slop Awwwards Frontend Standard:**
   - Never output flat static HTML tables, generic dark SaaS cards, `background-clip: text` gradients, neon box glows, `<12px` text, raw emojis, or `[nested-cards]`.
