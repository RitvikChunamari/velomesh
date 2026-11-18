import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  VELOMESH_MODELS,
  classifyTurnIntent,
  selectModelForTurn,
  inferModelFamily
} from '../scripts/model-router.mjs';
import { createGatewayServer } from '../scripts/gateway.mjs';
import { routeTask } from '../scripts/router.mjs';
import { call as mcpCall } from '../scripts/mcp-server.mjs';

test('classifyTurnIntent and selectModelForTurn dynamically route across architecture, frontend, fast, and cross-family review phases', () => {
  const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'velomesh-gw-test-'));
  const prevDir = process.env.AGENT_FUSION_DATA_DIR;
  process.env.AGENT_FUSION_DATA_DIR = tmpData;

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
  } finally {
    if (prevDir === undefined) delete process.env.AGENT_FUSION_DATA_DIR;
    else process.env.AGENT_FUSION_DATA_DIR = prevDir;
    fs.rmSync(tmpData, { recursive: true, force: true });
  }
});

test('createGatewayServer serves /v1/models, /v1/chat/completions (JSON + SSE), and /v1/messages (Anthropic) with dynamic switching headers', async () => {
  const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'velomesh-srv-test-'));
  const prevDir = process.env.AGENT_FUSION_DATA_DIR;
  process.env.AGENT_FUSION_DATA_DIR = tmpData;

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
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (prevDir === undefined) delete process.env.AGENT_FUSION_DATA_DIR;
    else process.env.AGENT_FUSION_DATA_DIR = prevDir;
    fs.rmSync(tmpData, { recursive: true, force: true });
  }
});

test('routeTask and MCP server expose modelOrchestration, per-stage modelRoute, select_model_route, and gateway_status', async () => {
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
});
