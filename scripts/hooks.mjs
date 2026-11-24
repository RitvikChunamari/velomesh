#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { discover, rankSkills } from './catalog.mjs';
import { recall } from './state.mjs';
import { routeTask } from './router.mjs';
import { optimizePrompt } from './prompt-optimizer.mjs';
import { resolveCliBinary } from './model-router.mjs';

export const VELOMESH_HOOK_CATALOG = [
  {
    id: 'rtk-token-killer',
    name: 'RTK Token Killer',
    event: 'PreToolUse',
    repo: 'rtk-ai/rtk',
    description: 'Routes noisy shell outputs (git status/diff/log, find, logs, tests) through Rust Token Killer (rtk) to save 60-90% tokens.'
  },
  {
    id: 'velomesh-prompt-optimizer',
    name: 'Prompt Optimizer',
    event: 'PreInvocation / UserPromptSubmit',
    repo: 'RitvikChunamari/velomesh',
    description: 'Enriches raw prompts with clarity upgrades, domain constraints, matched native platform skills, and optimal model routes.'
  },
  {
    id: 'security-command-guard',
    name: 'Security & Secret Exfiltration Guard',
    event: 'PreToolUse',
    repo: 'slavaspitsyn/claude-code-security-hooks',
    description: 'Fail-closed PreToolUse blocker against catastrophic deletes (rm -rf / or ~) and SSH/AWS/.env secret exfiltration.'
  },
  {
    id: 'impeccable-ui-gate',
    name: 'Impeccable UI Craft Gate',
    event: 'PostToolUse',
    repo: 'pbakaus/impeccable',
    description: 'Inspects modified HTML/CSS/JSX/TSX files for gradient-clip text, neon box glows, <12px text, raw emojis, and banned default fonts.'
  },
  {
    id: 'plankton-quality-gate',
    name: 'Plankton Format & Lint Gate',
    event: 'PostToolUse',
    repo: 'affaan-m/ECC',
    description: 'Flags unformatted edits or syntax hazards on PostToolUse and prompts targeted verification before completion.'
  },
  {
    id: 'context-credit-saver',
    name: 'Context & Credit Saver Guard',
    event: 'PreToolUse',
    repo: 'RitvikChunamari/velomesh',
    description: 'Steers slow recursive grep calls toward ripgrep (rg) and keeps file inspections within tight symbol ranges.'
  }
];

function evaluatePreTool(event) {
  const toolInput = event?.tool_input || event?.input || {};
  const cmd = String(toolInput.command || toolInput.cmd || '').trim();
  const filePath = String(toolInput.file_path || toolInput.path || '').trim();
  const rtkBin = resolveCliBinary('rtk');
  const rgBin = resolveCliBinary('rg');

  if (cmd) {
    // 1. Catastrophic deletion & fork bombs (fail-closed)
    const catastrophic =
      /(?:^|\s|;|&&|\|)rm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(?:\/(?:\s|$|\*)|~(?:\s|$|\/)|\$HOME(?:\s|$|\/))/.test(cmd) ||
      /:\(\)\s*\{\s*:\|\s*:\s*&\s*\}\s*;\s*:/.test(cmd);
    if (catastrophic) {
      const reason = 'Blocked by VeloMesh Security Guard: catastrophic filesystem deletion or fork bomb detected.';
      return {
        decision: 'block',
        reason,
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason
        }
      };
    }

    // 2. Credential / private key exfiltration over network utilities (fail-closed)
    const readsSecret = /(~\/\.ssh|~\/\.aws|id_rsa|id_ed25519|\.env\b|credentials\.json|\.netrc)/i.test(cmd);
    const sendsNet = /\b(curl|wget|nc|ncat|scp|rsync|ssh|python[23]?\s+-c)\b/i.test(cmd);
    if (readsSecret && sendsNet) {
      const reason = 'Blocked by VeloMesh Security Guard: potential credential or private-key exfiltration across network boundary.';
      return {
        decision: 'block',
        reason,
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason
        }
      };
    }

    // 3. RTK Token Killer optimization hint for unwrapped noisy commands
    const hints = [];
    if (rtkBin && !/^\s*rtk\b/.test(cmd)) {
      if (/^\s*(git\s+(status|diff|log)|find\s+\.|ls\s+-[a-z]*l)/i.test(cmd)) {
        hints.push(`RTK Token Killer available at ${rtkBin}: prefix with 'rtk ${cmd.split(/\s+/).slice(0, 2).join(' ')}' to compress output tokens by 60-90%.`);
      }
    }
    if (rgBin && /(?:^|\s|;|&&|\|)grep\s+-[a-zA-Z]*r/.test(cmd)) {
      hints.push(`Context Credit Saver: prefer 'rg' (${rgBin}) instead of recursive 'grep -r' so node_modules and .git are automatically skipped.`);
    }
    if (hints.length) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: hints.join(' ')
        }
      };
    }
  }

  if (filePath && /(^|\/)\.env(?:\.production|\.local)?$/i.test(filePath) && String(event?.tool_name || '').toLowerCase().includes('write')) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: 'Security Guard Notice: avoid committing or logging .env secrets in tracked files or outputs.'
      }
    };
  }

  return {};
}

function evaluatePostTool(event) {
  const toolInput = event?.tool_input || event?.input || {};
  const filePath = String(toolInput.file_path || toolInput.path || '').trim();
  const ext = path.extname(filePath).toLowerCase();
  if (!['.html', '.css', '.tsx', '.jsx', '.vue', '.svelte'].includes(ext)) {
    return {};
  }

  let content = typeof toolInput.content === 'string' ? toolInput.content : '';
  if (!content && filePath && fs.existsSync(filePath)) {
    try {
      const st = fs.statSync(filePath);
      if (st.isFile() && st.size <= 131072) {
        content = fs.readFileSync(filePath, 'utf8');
      }
    } catch {
      return {};
    }
  }
  if (!content) return {};

  const warnings = [];
  if (/(-webkit-)?background-clip:\s*text/i.test(content)) {
    warnings.push('AI-slop warning [gradient-text]: avoid background-clip: text gradients.');
  }
  if (/font-size:\s*(?:[1-9]px|1[01]px|0\.[0-6]\d*rem)/i.test(content)) {
    warnings.push('Legibility floor [undersized-ui-text]: functional UI text must be >= 12px.');
  }
  if (/Plus Jakarta Sans|Syne|Fraunces|Space Grotesk/i.test(content)) {
    warnings.push('Typography guard [overused-font]: replace banned AI default display fonts.');
  }
  if (['.html', '.jsx', '.tsx'].includes(ext) && /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(content)) {
    warnings.push('Icon craft [emoji-in-ui]: use crisp monochrome SVG icons instead of raw emojis.');
  }

  if (!warnings.length) return {};
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `[VeloMesh UI Craft Gate on ${path.basename(filePath)}] ${warnings.join(' ')}`
    }
  };
}

function evaluateInvocation(event, mode) {
  if (process.env.VELOMESH_INTERNAL_BRIDGE === '1') {
    return mode === 'prompt-submit' ? {} : { injectSteps: [] };
  }

  const workspaces = Array.isArray(event.workspacePaths) ? event.workspacePaths : [];
  const ws =
    (workspaces.find((x) => typeof x === 'string' && x.startsWith('/'))) ||
    (typeof event.cwd === 'string' && path.isAbsolute(event.cwd) ? event.cwd : null) ||
    process.cwd() ||
    os.homedir();

  const cat = discover(ws);
  const eligible = cat.agents.filter((a) => a.eligible && a.host === 'antigravity');
  const prompt = typeof event.prompt === 'string'
    ? event.prompt
    : typeof event.user_prompt === 'string'
      ? event.user_prompt
      : typeof event.message === 'string'
        ? event.message
        : '';

  let routedNote = '';
  let modelNote = '';
  let visionNote = '';
  let skillNote = '';
  let optimizerNote = '';

  if (prompt && prompt.length > 3) {
    try {
      const host = mode === 'prompt-submit' ? (event.host || 'codex') : 'antigravity';
      const route = routeTask(prompt, cat, { currentHost: host, workspacePath: ws });
      const opt = optimizePrompt(prompt, {
        catalog: cat,
        workspacePath: ws,
        currentHost: host,
        checkClis: true
      });
      if (route?.selectedAgents?.length) {
        routedNote = `\nAuto-matched specialists: ${route.selectedAgents.map((a) => `${a.name} (${a.matchedDomains.join(',')})`).join(', ')}.`;
      }
      if (opt?.matchedPlatformSkills?.length) {
        skillNote = `\nAuto-matched platform skills (${cat.uniqueSkillCount} indexed across ${cat.hosts.join(',')}): ${opt.matchedPlatformSkills.map((s) => s.name).join(', ')}.`;
      }
      if (opt?.modelRoute) {
        modelNote = `\n[VeloMesh Model Route: phase=${opt.modelRoute.phase} -> ${opt.modelRoute.selectedModel} (transport=${opt.modelRoute.transport}, tier=${opt.modelRoute.antigravityTier})]`;
      } else if (route?.modelOrchestration?.initialDecision) {
        const d = route.modelOrchestration.initialDecision;
        modelNote = `\n[VeloMesh Model Route: phase=${d.phase} -> ${d.selectedModel} (tier=${d.antigravityTier})]`;
      }
      if (opt?.addedConstraints?.length) {
        optimizerNote = `\n[VeloMesh Prompt Optimizer: clarity ${opt.clarityScore}% -> ${opt.upgradedScore}%] Constraints: ${opt.addedConstraints.slice(0, 2).join(' | ')}`;
      }
      if (route?.visionCheck && route.visionCheck.status !== 'NOT_A_BUILD_PROMPT') {
        visionNote = `\n[Vision Clarity Check: ${route.visionCheck.status}] ${route.visionCheck.guidance}`;
      }
    } catch {
      // Non-fatal routing enrichment fallback
    }
  }

  const memo = recall(ws, 5).map((x) => `[${x.kind}] ${x.text.slice(0, 200)}`).join('\n');
  const rtkStatus = resolveCliBinary('rtk') ? 'RTK Token Killer active' : 'install rtk for 60-90% CLI output compression';
  const instruction = `# VeloMesh v4.3 (Always-On Super-Tool: Platform Skills + Prompt Optimizer + Multi-Model Switcher + Hooks)
You are powered by VeloMesh (${rtkStatus}). Autonomously orchestrate every task:
1. **One Prompt Builds Everything:** Compose platform & mesh skills across Frontend UI, Motion (GSAP/Canvas/WebGL), Backend APIs, PostgreSQL/Supabase RLS, and Playwright QA.
2. **Vision Elaboration Rule (VeloMesh Cannot Read Your Mind):** If a build prompt is underspecified, ask 2-3 high-leverage clarifying questions via 'brainstorming' before generating code; once elaborated, ship end-to-end.
3. **Autonomous Provisioning, Optimization & Model Switching:** Call 'optimize_prompt', 'select_model_route', 'discover_and_install_capability', or delegate to native subagents (${eligible.slice(0, 12).map((a) => a.name).join(', ')}).${skillNote}${routedNote}${modelNote}${optimizerNote}${visionNote}${memo ? '\nProject memory:\n' + memo : ''}`;

  const clipped = instruction.slice(0, 4500);
  if (mode === 'prompt-submit' || event.hook_event_name === 'UserPromptSubmit') {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: clipped
      }
    };
  }
  return {
    injectSteps: [{
      ephemeralMessage: clipped
    }]
  };
}

function getHooksStatus() {
  const home = os.homedir();
  const binaries = {
    rtk: resolveCliBinary('rtk', process.env, home),
    rg: resolveCliBinary('rg', process.env, home),
    gitleaks: resolveCliBinary('gitleaks', process.env, home),
    'osv-scanner': resolveCliBinary('osv-scanner', process.env, home)
  };
  const files = {
    codexHooks: fs.existsSync(path.join(home, '.codex', 'hooks.json')),
    codexRtk: fs.existsSync(path.join(home, '.codex', 'RTK.md')),
    claudeSettings: fs.existsSync(path.join(home, '.claude', 'settings.json')),
    cursorHooks: fs.existsSync(path.join(home, '.cursor', 'hooks.json')),
    antigravityHooks: fs.existsSync(path.join(home, '.gemini', 'config', 'hooks.json'))
  };
  return { hooks: VELOMESH_HOOK_CATALOG, binaries, files };
}

const mode = (process.argv[2] || 'invocation').trim().toLowerCase();

if (mode === 'status') {
  process.stdout.write(JSON.stringify(getHooksStatus(), null, 2) + '\n');
} else {
  let src = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    src += chunk;
    if (src.length > 256000) src = src.slice(-256000);
  });

  process.stdin.on('end', () => {
    try {
      const event = JSON.parse(src || '{}');
      let out;
      if (mode === 'pre-tool' || event.hook_event_name === 'PreToolUse') {
        out = evaluatePreTool(event);
      } else if (mode === 'post-tool' || event.hook_event_name === 'PostToolUse') {
        out = evaluatePostTool(event);
      } else {
        out = evaluateInvocation(event, mode);
      }
      process.stdout.write(JSON.stringify(out) + '\n');
    } catch {
      const fallback = mode === 'pre-tool' || mode === 'post-tool' || mode === 'prompt-submit' ? {} : { injectSteps: [] };
      process.stdout.write(JSON.stringify(fallback) + '\n');
    }
  });
}
