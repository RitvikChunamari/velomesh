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
    let modelNote = '';
    let visionNote = '';
    if (prompt && prompt.length > 3) {
      try {
        const route = routeTask(prompt, cat, { currentHost: 'antigravity', workspacePath: ws });
        if (route && route.selectedAgents && route.selectedAgents.length > 0) {
          routedNote = `\nAuto-matched specialists for this prompt: ${route.selectedAgents.map(a => `${a.name} (${a.matchedDomains.join(',')})`).join(', ')}.`;
        }
        if (route && route.modelOrchestration && route.modelOrchestration.initialDecision) {
          const d = route.modelOrchestration.initialDecision;
          modelNote = `\n[VeloMesh Model Route: phase=${d.phase} -> ${d.selectedModel} (tier=${d.antigravityTier})]`;
        }
        if (route && route.visionCheck && route.visionCheck.status !== 'NOT_A_BUILD_PROMPT') {
          visionNote = `\n[Vision Clarity Check: ${route.visionCheck.status}] ${route.visionCheck.guidance}`;
        }
      } catch {}
    }

    const memo = recall(ws, 5).map(x => `[${x.kind}] ${x.text.slice(0, 200)}`).join('\n');
    const instruction = `# VeloMesh v4.2 (Always-On Multi-Model & Full-Stack Orchestrator)
You are powered by VeloMesh. You must autonomously orchestrate every task from a single prompt:
1. **One Prompt Builds Everything (Full-Stack Execution):** Automatically compose skills across Frontend UI (frontend-design, impeccable, ui-ux-pro-max, design-system-references), Interactive Motion (gsap-core, gsap-scrolltrigger, emil-design-eng, Canvas/WebGL), Backend APIs (backend-patterns, api-connector-builder, security-review), Database Schemas (postgres-patterns, prisma-patterns), and QA (test-driven-development, browser-qa). Never output flat static AI-slop tables or generic dark boxes.
2. **Vision Elaboration Rule (VeloMesh Cannot Read Your Mind):** VeloMesh automates 100% of skills, MCPs, APIs, databases, and model routing, but it cannot get inside the user's brain to see their product vision. If a build prompt is underspecified, ask 2-3 high-leverage clarifying questions via 'brainstorming' before generating code; once elaborated, execute the entire full-stack software end-to-end.
3. **Autonomous Internet Provisioning, Model Routing & Subagents:** Call 'select_model_route' to coordinate mid-execution model tier switches, 'discover_and_install_capability' to fetch/hot-link missing MCPs or skills on the fly, or delegate to native subagents (${eligible.slice(0, 16).map(a => a.name).join(', ')}).${routedNote}${modelNote}${visionNote}${memo ? '\nProject memory:\n' + memo : ''}`;

    process.stdout.write(JSON.stringify({
      injectSteps: [{
        ephemeralMessage: instruction.slice(0, 4500)
      }]
    }) + '\n');
  } catch {
    empty();
  }
});
