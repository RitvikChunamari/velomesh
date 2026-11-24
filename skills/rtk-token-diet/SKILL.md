---
name: rtk-token-diet
description: Cuts CLI context bloat by 60-90% using RTK (Rust Token Killer) and compact ripgrep/git/test summaries across PreToolUse hooks and terminal workflows.
---

# RTK Token Diet

Keep the agent context window inside the Smart Zone by filtering noisy terminal output before it reaches the model.

## Rules
1. When `rtk` (`/opt/homebrew/bin/rtk`) is installed, route noisy read-only commands (`git status`, `git diff`, `git log`, `find`, `ls`, `test`, `err`) through `rtk`.
2. Only use `rtk bypass <cmd>` when full verbatim output is strictly required for debugging a truncated result.
3. Prefer `rg` over recursive `grep -rn` across `node_modules`, `.git`, or build artifacts.
4. Read targeted symbol line ranges instead of dumping multi-hundred-line files.
