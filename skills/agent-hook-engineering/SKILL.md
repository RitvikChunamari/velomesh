---
name: agent-hook-engineering
description: Author deterministic PreToolUse, UserPromptSubmit, PostToolUse, and Stop lifecycle hooks for Claude Code, Codex, Cursor, and Antigravity without clobbering existing hooks.
---

# Agent Hook Engineering

Design deterministic guardrails across agentic harnesses (`PreToolUse`, `UserPromptSubmit`, `PostToolUse`, `Stop`).

## Standards
1. Parse stdin JSON defensively with bounded buffer size; emit valid harness-specific JSON even on edge inputs.
2. Merge hooks additively into `~/.claude/settings.json`, `~/.codex/hooks.json`, and `~/.cursor/hooks.json` without removing user hooks like `rtk hook` or `impeccable`.
3. Fail-closed for catastrophic shell/secret-exfiltration guards; advise non-destructively for optimization/lint hints.
4. Never log raw secrets, API keys, or OAuth tokens into telemetry or `additionalContext`.
