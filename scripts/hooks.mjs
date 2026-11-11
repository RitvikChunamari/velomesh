#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import { discover } from './catalog.mjs';
import { recall } from './state.mjs';
import { routeTask } from './router.mjs';

let src = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  src += chunk;
  if (src.length > 256000) src = src.slice(-256000);
});

process.stdin.on('end', () => {
  const empty = () => process.stdout.write(JSON.stringify({ injectSteps: [] }) + '\n');
  try {
    const event = JSON.parse(src || '{}');
    const workspaces = Array.isArray(event.workspacePaths) ? event.workspacePaths : [];
    const ws = (workspaces.find(x => typeof x === 'string' && x.startsWith('/'))) || process.cwd() || os.homedir();

    const cat = discover(ws);
    const eligible = cat.agents.filter(a => a.eligible && a.host === 'antigravity');
    const prompt = typeof event.prompt === 'string' ? event.prompt : '';

    let routedNote = '';
    if (prompt && prompt.length > 5) {
      try {
        const route = routeTask(prompt, cat, { currentHost: 'antigravity', workspacePath: ws });
        if (route && route.selectedAgents && route.selectedAgents.length > 0) {
          routedNote = `\nAuto-matched specialists for this prompt: ${route.selectedAgents.map(a => `${a.name} (${a.matchedDomains.join(',')})`).join(', ')}.`;
        }
      } catch {}
    }

    const memo = recall(ws, 5).map(x => `[${x.kind}] ${x.text.slice(0, 200)}`).join('\n');
    const instruction = `# Agent Fusion Universal v4 (Always-On Global Orchestration)
You are powered by Agent Fusion. You must autonomously orchestrate every task:
1. Automatically inspect the user's prompt and invoke relevant skills (using-superpowers, ECC patterns, frontend/design) without requiring manual slash commands.
2. If this task involves implementation, architecture, debugging, or research, call 'fusion_start' or use native subagents (${eligible.slice(0, 20).map(a => a.name).join(', ')}).
3. If a required skill, tool, or MCP is missing locally, automatically call 'discover_and_install_capability' to fetch and hot-link it on the fly.${routedNote}${memo ? '\nProject memory:\n' + memo : ''}`;

    process.stdout.write(JSON.stringify({
      injectSteps: [{
        ephemeralMessage: instruction.slice(0, 4500)
      }]
    }) + '\n');
  } catch {
    empty();
  }
});
