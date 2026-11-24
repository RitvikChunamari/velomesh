import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  VELOMESH_MODELS,
  classifyTurnIntent,
  selectModelForTurn,
  inferModelFamily,
  mapModelForLocalRouter
} from '../scripts/model-router.mjs';
import { createGatewayServer } from '../scripts/gateway.mjs';
import { routeTask } from '../scripts/router.mjs';
import { call as mcpCall } from '../scripts/mcp-server.mjs';
import { spawn } from 'node:child_process';

test('classifyTurnIntent and selectModelForTurn dynamically route across architecture, frontend, fast, and cross-family review phases', () => {
  const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'velomesh-gw-test-'));
  const prevDir = process.env.VELOMESH_DATA_DIR;
  process.env.VELOMESH_DATA_DIR = tmpData;

  try {
    const cleanEnv = {};
    const turn1 = selectModelForTurn({
      prompt: 'Design distributed multi-tenant PostgreSQL architecture and RLS migration strategy.',
      requestedModel: 'velomesh/auto',
      env: cleanEnv,
      homeDir: tmpData,
      checkClis: false,
      record: true
    });
    assert.equal(turn1.phase, 'architecture');
    assert.equal(turn1.switched, false);
    assert.equal(turn1.antigravityTier, 'pro');

    const turn2 = selectModelForTurn({
      prompt: 'Build Swiss typography layout with responsive CSS grid, navbar modal, and GSAP motion.',
      requestedModel: 'velomesh/auto',
      previousModel: turn1.selectedModel,
      previousFamily: turn1.selectedFamily,
      env: cleanEnv,
      homeDir: tmpData,
      checkClis: false,
      record: true
    });
    assert.equal(turn2.phase, 'frontend');
    assert.notEqual(turn2.selectedModel, turn1.selectedModel);
    assert.equal(turn2.switched, true);

    const turn3 = selectModelForTurn({
      prompt: 'find files in directory',
      requestedModel: 'velomesh/auto',
      previousModel: turn2.selectedModel,
      previousFamily: turn2.selectedFamily,
      env: cleanEnv,
      homeDir: tmpData,
      checkClis: false,
      record: true
    });
    assert.equal(turn3.phase, 'fast');
    assert.equal(turn3.antigravityTier, 'flash_lite');
    assert.equal(turn3.switched, true);

    const turn4 = selectModelForTurn({
      prompt: 'Audit and review authentication code and RLS SQL diff for security vulnerabilities.',
      requestedModel: 'velomesh/auto',
      previousModel: 'claude-opus-4-6',
      previousFamily: 'anthropic',
      env: cleanEnv,
      homeDir: tmpData,
      checkClis: false,
      record: true
    });
    assert.equal(turn4.phase, 'review');
    assert.notEqual(inferModelFamily(turn4.selectedModel), 'anthropic');
    assert.equal(turn4.switched, true);
    assert.match(turn4.switchReason, /Cross-family handoff/i);

    const pinned = classifyTurnIntent({
      prompt: 'simple list command',
      requestedModel: 'velomesh/architect'
    });
    assert.equal(pinned.phase, 'architecture');
    assert.equal(pinned.pinned, true);

    // Bare virtual model name normalization ('architect', 'auto') for OpenCode v2.1.4 keys
    const barePinned = classifyTurnIntent({
      prompt: 'simple list command',
      requestedModel: 'architect'
    });
    assert.equal(barePinned.phase, 'architecture');
    assert.equal(barePinned.pinned, true);

    // Local router upstream model mapping
    assert.equal(
      mapModelForLocalRouter('claude-opus-4-6', { models: ['ag/claude-opus-4-6-thinking', 'ag/gemini-3.1-pro-high'] }),
      'ag/claude-opus-4-6-thinking'
    );
    assert.equal(
      mapModelForLocalRouter('gpt-5.4', { models: ['auto', 'fusion'] }),
      'auto'
    );
  } finally {
    if (prevDir === undefined) delete process.env.VELOMESH_DATA_DIR;
    else process.env.VELOMESH_DATA_DIR = prevDir;
    fs.rmSync(tmpData, { recursive: true, force: true });
  }
});

test('createGatewayServer serves /v1/models, /v1/chat/completions (JSON + SSE), /v1/responses (JSON + SSE), and /v1/messages (Anthropic) with dynamic switching headers', async () => {
  const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'velomesh-srv-test-'));
  const prevDir = process.env.VELOMESH_DATA_DIR;
  process.env.VELOMESH_DATA_DIR = tmpData;

  const server = createGatewayServer({ simulate: true, checkClis: false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. /v1/models lists velomesh/auto and all 5 virtual models
    const modelsRes = await fetch(`${baseUrl}/v1/models`);
    assert.equal(modelsRes.status, 200);
    const modelsJson = await modelsRes.json();
    const ids = modelsJson.data.map((m) => m.id);
    assert.equal(ids.length, VELOMESH_MODELS.length);
    assert.ok(ids.includes('velomesh/auto'));
    assert.ok(ids.includes('velomesh/architect'));
    assert.ok(ids.includes('velomesh/frontend'));
    assert.ok(ids.includes('velomesh/fast'));
    assert.ok(ids.includes('velomesh/review'));

    // 2. Turn 1: Architecture prompt via OpenAI /v1/chat/completions
    const archRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'velomesh/auto',
        messages: [{ role: 'user', content: 'Design database schema with PostgreSQL RLS and distributed migrations.' }]
      })
    });
    assert.equal(archRes.status, 200);
    const firstModel = archRes.headers.get('x-velomesh-model');
    assert.equal(archRes.headers.get('x-velomesh-phase'), 'architecture');
    assert.equal(archRes.headers.get('x-velomesh-switched'), 'false');
    const archBody = await archRes.json();
    assert.equal(archBody.object, 'chat.completion');
    assert.equal(archBody.model, firstModel);
    assert.ok(archBody.choices[0].message.content.includes(firstModel));

    // 3. Turn 2: Review prompt passing previous model switches cleanly cross-family
    const reviewRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-velomesh-previous-model': firstModel
      },
      body: JSON.stringify({
        model: 'velomesh/auto',
        messages: [{ role: 'user', content: 'Audit and review security vulnerabilities in the SQL diff.' }]
      })
    });
    assert.equal(reviewRes.status, 200);
    const secondModel = reviewRes.headers.get('x-velomesh-model');
    assert.equal(reviewRes.headers.get('x-velomesh-phase'), 'review');
    assert.equal(reviewRes.headers.get('x-velomesh-switched'), 'true');
    assert.notEqual(secondModel, firstModel);

    // 4. OpenAI Streaming SSE check
    const sseRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'velomesh/auto',
        stream: true,
        messages: [{ role: 'user', content: 'list files' }]
      })
    });
    assert.equal(sseRes.status, 200);
    assert.equal(sseRes.headers.get('x-velomesh-phase'), 'fast');
    const sseText = await sseRes.text();
    assert.ok(sseText.includes('data: {'));
    assert.ok(sseText.includes('data: [DONE]'));

    // 5. Anthropic /v1/messages wire compatibility for Claude Code
    const anthRes = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'velomesh/auto',
        system: 'You are a Swiss frontend architect.',
        messages: [{ role: 'user', content: 'Style a responsive bento CSS typography navbar.' }]
      })
    });
    assert.equal(anthRes.status, 200);
    assert.equal(anthRes.headers.get('x-velomesh-phase'), 'frontend');
    const anthBody = await anthRes.json();
    assert.equal(anthBody.type, 'message');
    assert.equal(anthBody.role, 'assistant');
    assert.equal(anthBody.stop_reason, 'end_turn');
    assert.equal(anthBody.content[0].type, 'text');

    // 6. OpenAI Responses API (/v1/responses) streaming SSE (required by Codex wire_api = "responses")
    const respSse = await fetch(`${baseUrl}/v1/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'auto',
        stream: true,
        input: 'Design distributed Postgres ledger schema.'
      })
    });
    assert.equal(respSse.status, 200);
    assert.equal(respSse.headers.get('x-velomesh-phase'), 'architecture');
    const respSseText = await respSse.text();
    assert.ok(respSseText.includes('event: response.created'));
    assert.ok(respSseText.includes('event: response.output_item.added'));
    assert.ok(respSseText.includes('event: response.content_part.added'));
    assert.ok(respSseText.includes('event: response.output_text.delta'));
    assert.ok(respSseText.includes('event: response.output_item.done'));
    assert.ok(respSseText.includes('event: response.completed'));
    assert.ok(respSseText.includes('data: [DONE]'));

    // 7. Prompt Optimizer endpoint (/v1/optimize)
    const optRes = await fetch(`${baseUrl}/v1/optimize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: 'build multi-tenant SaaS with stripe billing and supabase rls'
      })
    });
    assert.equal(optRes.status, 200);
    const optBody = await optRes.json();
    assert.ok(optBody.optimizedPrompt.includes('VeloMesh Optimized Engineering Spec'));
    assert.ok(optBody.upgradedScore >= optBody.clarityScore);
    assert.ok(optBody.matchedPlatformSkills.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (prevDir === undefined) delete process.env.VELOMESH_DATA_DIR;
    else process.env.VELOMESH_DATA_DIR = prevDir;
    fs.rmSync(tmpData, { recursive: true, force: true });
  }
});

test('routeTask and MCP server expose velomesh serverInfo, modelOrchestration, per-stage modelRoute, select_model_route, and gateway_status', async () => {
  const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'velomesh-mcp-test-'));
  const prevDir = process.env.VELOMESH_DATA_DIR;
  process.env.VELOMESH_DATA_DIR = tmpData;

  try {
    const routed = routeTask(
      'Build a multi-tenant treasury SaaS UI with Swiss CSS design, PostgreSQL schema migrations, and security tests.',
      { agents: [], skills: [] }
    );
    assert.ok(routed.modelOrchestration);
    assert.equal(routed.modelOrchestration.virtualModel, 'velomesh/auto');
    assert.equal(routed.modelOrchestration.dynamicSwitching, true);
    assert.ok(Array.isArray(routed.modelOrchestration.stageModels));
    assert.ok(routed.modelOrchestration.stageModels.length >= 2);
    for (const stage of routed.stages) {
      assert.ok(stage.modelRoute?.model);
      assert.ok(stage.modelRoute?.phase);
    }

    const routeResult = await mcpCall('select_model_route', {
      prompt: 'Review security vulnerabilities in webhook signature validation',
      previousModel: 'claude-opus-4-6'
    });
    assert.equal(routeResult.phase, 'review');
    assert.equal(routeResult.switched, true);

    const statusResult = await mcpCall('gateway_status', {});
    assert.ok(Array.isArray(statusResult.models));
    assert.equal(statusResult.models.length, 5);
    assert.equal(statusResult.defaultEndpoint, 'http://127.0.0.1:4190/v1');

    // Verify stdio initialize returns rebranded serverInfo.name === 'velomesh'
    const mcpPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../scripts/mcp-server.mjs');
    const initChild = spawn('node', [mcpPath]);
    initChild.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
    initChild.stdin.end();
    let initOut = '';
    for await (const chunk of initChild.stdout) initOut += chunk;
    const initJson = JSON.parse(initOut.trim().split('\n')[0]);
    assert.equal(initJson.result.serverInfo.name, 'velomesh');

    // Verify MCP optimize_prompt returns structured prompt enrichment and platform skills
    const optMcp = await mcpCall('optimize_prompt', {
      prompt: 'build supabase postgres rls multi-tenant app with stripe webhooks'
    });
    assert.ok(optMcp.optimizedPrompt.includes('VeloMesh Optimized Engineering Spec'));
    assert.ok(Array.isArray(optMcp.matchedPlatformSkills));
  } finally {
    if (prevDir === undefined) delete process.env.VELOMESH_DATA_DIR;
    else process.env.VELOMESH_DATA_DIR = prevDir;
    fs.rmSync(tmpData, { recursive: true, force: true });
  }
});

test('discoverPlatformModels reads native Codex models_cache, switches real platform models, and skips offline routers', async () => {
  const { discover } = await import('../scripts/catalog.mjs');
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'velomesh-plat-test-'));
  const prevDir = process.env.VELOMESH_DATA_DIR;
  process.env.VELOMESH_DATA_DIR = tmpHome;

  try {
    // Create mock ~/.codex/models_cache.json with real platform models
    const codexDir = path.join(tmpHome, '.codex');
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(
      path.join(codexDir, 'models_cache.json'),
      JSON.stringify({
        models: [
          { slug: 'gpt-6.2-sol', display_name: 'GPT-6.2 Sol', priority: 1 },
          { slug: 'gpt-6.2-astra', display_name: 'GPT-6.2 Astra', priority: 2 },
          { slug: 'gpt-6-luna', display_name: 'GPT-6 Luna', priority: 3 },
          { slug: 'codex-auto-review', display_name: 'Codex Review', priority: 4 }
        ]
      })
    );
    // Create offline local router pointing to closed ephemeral port
    const ocDir = path.join(tmpHome, '.config', 'opencode');
    fs.mkdirSync(ocDir, { recursive: true });
    fs.writeFileSync(
      path.join(ocDir, 'opencode.json'),
      JSON.stringify({
        providers: {
          deadrouter: {
            settings: { baseURL: 'http://127.0.0.1:59997/v1' },
            models: { 'ag/fake': {} }
          }
        }
      })
    );
    // Create fake codex executable in PATH so codex CLI bridge is discovered inside tmpHome
    const binDir = path.join(tmpHome, '.local', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const fakeCodex = path.join(binDir, 'codex');
    fs.writeFileSync(fakeCodex, '#!/bin/sh\necho ok\n', { mode: 0o755 });

    // Create symlinked & plugin-nested skills to test catalog.mjs platform skill discovery
    const hubSkill = path.join(tmpHome, '.agent-fusion', 'skill-hub-v4', 'skills', 'custom-rls-skill');
    fs.mkdirSync(hubSkill, { recursive: true });
    fs.writeFileSync(path.join(hubSkill, 'SKILL.md'), '---\nname: custom-rls-skill\ndescription: Custom Supabase RLS skill\n---\nBody');
    const codexSkillDir = path.join(tmpHome, '.codex', 'skills');
    fs.mkdirSync(codexSkillDir, { recursive: true });
    fs.symlinkSync(hubSkill, path.join(codexSkillDir, 'custom-rls-skill'));
    const nestedPluginSkill = path.join(tmpHome, '.codex', 'plugins', 'cache', 'demo', '1.0', 'skills', 'nested-edge-skill');
    fs.mkdirSync(nestedPluginSkill, { recursive: true });
    fs.writeFileSync(path.join(nestedPluginSkill, 'SKILL.md'), '---\nname: nested-edge-skill\ndescription: Nested plugin skill\n---\nBody');

    const cat = discover(tmpHome, { homeDir: tmpHome });
    assert.ok(cat.skills.some((s) => s.host === 'codex' && s.name === 'custom-rls-skill'), 'Must follow skill symlinks across Codex skills dir');
    assert.ok(cat.skills.some((s) => s.host === 'codex' && s.name === 'nested-edge-skill'), 'Must discover nested plugin skills in ~/.codex/plugins');

    const d1 = selectModelForTurn({
      prompt: 'Design multi-tenant PostgreSQL RLS database architecture',
      requestedModel: 'velomesh/auto',
      env: { PATH: '/usr/bin:/bin' },
      homeDir: tmpHome,
      checkClis: true,
      record: false
    });
    assert.equal(d1.selectedModel, 'gpt-6.2-sol');
    assert.equal(d1.cliProvider, 'codex');
    assert.notEqual(d1.transport, 'local-router', 'Must skip offline localhost routers');

    const d2 = selectModelForTurn({
      prompt: 'Style a Black and White Swiss UI with CSS grid and typography',
      requestedModel: 'velomesh/auto',
      previousModel: d1.selectedModel,
      previousFamily: d1.selectedFamily,
      env: { PATH: '/usr/bin:/bin' },
      homeDir: tmpHome,
      checkClis: true,
      record: false
    });
    assert.equal(d2.selectedModel, 'gpt-6.2-astra');
    assert.equal(d2.switched, true);

    const d3 = selectModelForTurn({
      prompt: 'Audit and review authentication security diff',
      requestedModel: 'velomesh/auto',
      previousModel: d1.selectedModel,
      previousFamily: d1.selectedFamily,
      env: { PATH: '/usr/bin:/bin' },
      homeDir: tmpHome,
      checkClis: true,
      record: false
    });
    assert.equal(d3.selectedModel, 'codex-auto-review');
    assert.equal(d3.switched, true);
  } finally {
    if (prevDir === undefined) delete process.env.VELOMESH_DATA_DIR;
    else process.env.VELOMESH_DATA_DIR = prevDir;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});
