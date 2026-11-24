#!/usr/bin/env node
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  VELOMESH_MODELS,
  PHASE_CATALOG,
  discoverUpstreams,
  selectModelForTurn,
  getRoutingTelemetry,
  resolveCliBinary,
  buildExpandedPath
} from './model-router.mjs';
import { discover } from './catalog.mjs';
import { optimizePrompt } from './prompt-optimizer.mjs';

export const VELOMESH_ASCII_EMBLEM = [
  ' ██╗   ██╗ ███╗   ███╗   VELOMESH ORCHESTRATOR GATEWAY // velomesh/auto',
  '  ██╗ ██╔╝ ████╗ ████║   Dynamic Mid-Execution Model Switching & Failover',
  '   ████╔╝  ██╔████╔██║   OpenAI /v1/chat/completions · /v1/responses · Anthropic /v1/messages',
  '    ██╔╝   ██║ ╚██╔╝██║  Adaptive Routing: Architecture -> Frontend -> Fast -> Cross-Family Review'
].join('\n');

function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request payload exceeds 2MB limit'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

function flattenContentParts(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || part?.input_text || part?.content || ''))
      .filter(Boolean)
      .join(' ');
  }
  if (content && typeof content === 'object') {
    return content.text || content.content || JSON.stringify(content);
  }
  return '';
}

function normalizeOpenAIMessages(body) {
  if (Array.isArray(body.messages)) {
    return body.messages.map((m) => ({
      role: m?.role || 'user',
      content: flattenContentParts(m?.content)
    }));
  }
  if (typeof body.input === 'string') return [{ role: 'user', content: body.input }];
  if (Array.isArray(body.input)) {
    const out = [];
    for (const item of body.input) {
      if (!item || typeof item !== 'object') continue;
      if (item.type === 'function_call_output' || item.type === 'tool_result') {
        out.push({ role: 'tool', content: flattenContentParts(item.output ?? item.content) });
        continue;
      }
      const role = item.role || (item.type === 'message' ? 'user' : 'user');
      const text = flattenContentParts(item.content);
      if (text) out.push({ role, content: text });
    }
    return out;
  }
  if (typeof body.prompt === 'string') return [{ role: 'user', content: body.prompt }];
  return [];
}

function normalizeAnthropicMessages(body) {
  const out = [];
  if (body.system) {
    out.push({
      role: 'system',
      content: typeof body.system === 'string' ? body.system : JSON.stringify(body.system)
    });
  }
  if (Array.isArray(body.messages)) {
    for (const m of body.messages) {
      out.push({
        role: m.role || 'user',
        content: m.content
      });
    }
  }
  return out;
}

function isHarnessBoilerplate(text) {
  const s = String(text || '').trim();
  if (!s) return true;
  if (
    s.startsWith('<environment_context>') ||
    s.startsWith('<permissions instructions>') ||
    s.startsWith('# AGENTS.md instructions') ||
    s.startsWith('<collaboration_mode>') ||
    s.startsWith('<skills_instructions>')
  ) {
    return true;
  }
  return s.length > 5000 && (s.includes('<skill>') || s.includes('<!-- VELOMESH:START -->'));
}

function promptFromMessages(messages) {
  const cleaned = [];
  for (const m of messages) {
    const role = String(m?.role || 'user').toUpperCase();
    if (role === 'SYSTEM' || role === 'DEVELOPER') continue;
    const text = flattenContentParts(m?.content).trim();
    if (!text || isHarnessBoilerplate(text)) continue;
    cleaned.push(`${role}: ${text}`);
  }
  const list = cleaned.length
    ? cleaned
    : messages.slice(-2).map((m) => `${String(m?.role || 'user').toUpperCase()}: ${flattenContentParts(m?.content).trim()}`);
  const combined = list.slice(-6).join('\n\n');
  return combined.length > 24000 ? combined.slice(-24000) : combined;
}

function runCliBridge(provider, prompt, { model = '', phase = 'implementation', env = process.env, homeDir = os.homedir(), timeoutMs = 45000 } = {}) {
  return new Promise((resolve, reject) => {
    const cmdPath = resolveCliBinary(provider, env, homeDir);
    if (!cmdPath) return reject(new Error(`CLI binary not found for provider: ${provider}`));

    const childEnv = {
      ...env,
      PATH: buildExpandedPath(env, homeDir),
      VELOMESH_INTERNAL_BRIDGE: '1'
    };

    if (provider === 'codex') {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'velomesh-codex-'));
      const outFile = path.join(tmpDir, 'last-message.txt');
      const reasoningEffort = phase === 'architecture' || phase === 'review' ? 'medium' : 'low';
      const args = [
        'exec',
        '-c',
        'model_provider="openai"',
        '-c',
        'mcp_servers={}',
        '-c',
        'features.hooks=false',
        '-c',
        'features.memories=false',
        '-c',
        `model_reasoning_effort="${reasoningEffort}"`,
        ...(model ? ['-m', model] : []),
        '--sandbox',
        'read-only',
        '--skip-git-repo-check',
        '-o',
        outFile,
        prompt
      ];
      const child = execFile(cmdPath, args, { env: childEnv, timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
        let text = '';
        try {
          if (fs.existsSync(outFile)) {
            text = fs.readFileSync(outFile, 'utf8').trim();
          }
        } catch {
          text = '';
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
        if (!text) text = String(stdout || '').trim();
        if (err && !text) return reject(new Error(stderr?.trim() || err.message));
        if (!text) return reject(new Error('codex returned empty output'));
        resolve(text);
      });
      child.stdin?.end();
      return;
    }

    const argsMap = {
      claude: ['-p', ...(model ? ['--model', model] : []), prompt],
      gemini: ['-p', ...(model ? ['-m', model] : []), prompt],
      opencode: ['run', ...(model ? ['-m', model] : []), prompt]
    };
    const args = argsMap[provider];
    if (!args) return reject(new Error(`Unsupported CLI bridge provider: ${provider}`));

    const child = execFile(cmdPath, args, { env: childEnv, timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.trim() || err.message));
      const text = String(stdout || '').trim();
      if (!text) return reject(new Error(`${provider} returned empty output`));
      resolve(text);
    });
    child.stdin?.end();
  });
}

async function callUpstreamApi({ endpoint, model, messages, maxTokens = 4096, tools, toolChoice, temperature, topP, env = process.env }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    if (endpoint.includes('anthropic.com')) {
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
      const systemMsg = messages.find((m) => m.role === 'system')?.content;
      const chatMsgs = messages.filter((m) => m.role !== 'system');
      const anthPayload = { model, max_tokens: maxTokens, system: systemMsg, messages: chatMsgs };
      if (Array.isArray(tools) && tools.length) anthPayload.tools = tools;
      if (toolChoice !== undefined) anthPayload.tool_choice = toolChoice;
      if (typeof temperature === 'number') anthPayload.temperature = temperature;
      if (typeof topP === 'number') anthPayload.top_p = topP;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(anthPayload),
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
      const data = await res.json();
      const blocks = Array.isArray(data.content) ? data.content : [];
      const text = blocks.filter((c) => c.type === 'text' || c.text).map((c) => c.text || '').join('');
      const toolCalls = blocks
        .filter((c) => c.type === 'tool_use')
        .map((c) => ({
          id: c.id || `call_${crypto.randomBytes(6).toString('hex')}`,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.input || {}) }
        }));
      return { text, toolCalls, usage: { inputTokens: data.usage?.input_tokens || 12, outputTokens: data.usage?.output_tokens || 32 } };
    }

    let apiKey = env.OPENAI_API_KEY || env.VELOMESH_API_KEY || 'velomesh-local';
    if (endpoint.includes('api.x.ai')) apiKey = env.XAI_API_KEY || apiKey;
    else if (endpoint.includes('generativelanguage.googleapis.com')) apiKey = env.GEMINI_API_KEY || apiKey;
    else if (endpoint.includes('openrouter.ai')) apiKey = env.OPENROUTER_API_KEY || apiKey;

    const normalizedUrl = endpoint.endsWith('/chat/completions')
      ? endpoint
      : `${endpoint.replace(/\/+$/, '')}/chat/completions`;

    const openaiPayload = { model, messages, max_tokens: maxTokens };
    if (Array.isArray(tools) && tools.length) openaiPayload.tools = tools;
    if (toolChoice !== undefined) openaiPayload.tool_choice = toolChoice;
    if (typeof temperature === 'number') openaiPayload.temperature = temperature;
    if (typeof topP === 'number') openaiPayload.top_p = topP;

    const res = await fetch(normalizedUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(openaiPayload),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    const data = await res.json();
    const msg = data.choices?.[0]?.message || {};
    const text = msg.content || '';
    const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    return {
      text,
      toolCalls,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 12,
        outputTokens: data.usage?.completion_tokens || 32
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function executeTurn(decision, messages, { simulate = false, tools, toolChoice, temperature, topP, maxTokens, env = process.env, homeDir = os.homedir() } = {}) {
  const promptText = promptFromMessages(messages);
  const attempts = [
    {
      model: decision.selectedModel,
      upstreamModel: decision.upstreamModel || decision.selectedModel,
      family: decision.selectedFamily,
      transport: decision.transport,
      endpoint: decision.endpoint,
      cliProvider: decision.cliProvider
    },
    ...(decision.fallbackChain || [])
  ];

  let failoverCount = 0;
  const cliFailCounts = new Map();

  if (simulate || decision.transport === 'simulator') {
    const text = `[VeloMesh Orchestrator -> ${decision.selectedModel} (${decision.phase})] ${decision.switchReason}. Simulated execution complete (antigravityTier=${decision.antigravityTier}, switched=${decision.switched}).`;
    return {
      text,
      toolCalls: [],
      executedModel: decision.selectedModel,
      upstreamModel: decision.upstreamModel || decision.selectedModel,
      transport: 'simulator',
      failoverCount,
      usage: { inputTokens: Math.max(8, Math.ceil(promptText.length / 4)), outputTokens: Math.ceil(text.length / 4) }
    };
  }

  for (let i = 0; i < attempts.length; i++) {
    const step = attempts[i];
    if (i > 0) failoverCount += 1;

    try {
      if ((step.transport === 'api' || step.transport === 'local-router') && step.endpoint) {
        const result = await callUpstreamApi({
          endpoint: step.endpoint,
          model: step.upstreamModel || step.model,
          messages,
          maxTokens: maxTokens || 4096,
          tools,
          toolChoice,
          temperature,
          topP,
          env
        });
        return {
          text: result.text,
          toolCalls: result.toolCalls || [],
          executedModel: step.model,
          upstreamModel: step.upstreamModel || step.model,
          transport: step.transport,
          failoverCount,
          usage: result.usage
        };
      }
      if (step.transport === 'cli' && step.cliProvider && env.VELOMESH_ENABLE_CLI_BRIDGE !== '0') {
        if ((cliFailCounts.get(step.cliProvider) || 0) >= 2) {
          continue;
        }
        const chosenModel = step.upstreamModel || step.model;
        try {
          const text = await runCliBridge(step.cliProvider, promptText, {
            model: chosenModel,
            phase: decision.phase,
            env,
            homeDir
          });
          return {
            text,
            toolCalls: [],
            executedModel: step.model,
            upstreamModel: chosenModel,
            transport: 'cli',
            failoverCount,
            usage: {
              inputTokens: Math.max(8, Math.ceil(promptText.length / 4)),
              outputTokens: Math.max(8, Math.ceil(text.length / 4))
            }
          };
        } catch (cliErr) {
          cliFailCounts.set(step.cliProvider, (cliFailCounts.get(step.cliProvider) || 0) + 1);
          throw cliErr;
        }
      }
    } catch {
      // Fall through to next backend in ladder on 429/5xx/CLI unavailability
    }
  }

  const fallbackText = `[VeloMesh Orchestrator -> ${decision.selectedModel} (${decision.phase})] Upstream endpoints unavailable or unauthenticated; returned deterministic orchestration trace (${decision.switchReason}).`;
  return {
    text: fallbackText,
    toolCalls: [],
    executedModel: decision.selectedModel,
    upstreamModel: decision.upstreamModel || decision.selectedModel,
    transport: 'simulator',
    failoverCount,
    usage: { inputTokens: Math.max(8, Math.ceil(promptText.length / 4)), outputTokens: Math.ceil(fallbackText.length / 4) }
  };
}

function setVeloMeshHeaders(res, decision, execution) {
  res.setHeader('X-VeloMesh-Virtual-Model', decision.virtualModel);
  res.setHeader('X-VeloMesh-Model', execution.executedModel || decision.selectedModel);
  res.setHeader('X-VeloMesh-Upstream-Model', execution.upstreamModel || decision.upstreamModel || decision.selectedModel);
  res.setHeader('X-VeloMesh-Phase', decision.phase);
  res.setHeader('X-VeloMesh-Transport', execution.transport || decision.transport);
  res.setHeader('X-VeloMesh-Switched', String(Boolean(decision.switched)));
  res.setHeader('X-VeloMesh-Switch-Reason', String(decision.switchReason || '').slice(0, 180));
  res.setHeader('X-VeloMesh-Failover-Count', String(execution.failoverCount || 0));
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function sendOpenAISSE(res, model, text) {
  const id = `chatcmpl-${crypto.randomBytes(8).toString('hex')}`;
  const created = Math.floor(Date.now() / 1000);
  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache');
  res.setHeader('connection', 'keep-alive');

  const chunk1 = {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: { role: 'assistant', content: text }, finish_reason: null }]
  };
  const chunk2 = {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
  };

  res.write(`data: ${JSON.stringify(chunk1)}\n\n`);
  res.write(`data: ${JSON.stringify(chunk2)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

function sendAnthropicSSE(res, model, text, usage) {
  const id = `msg_${crypto.randomBytes(10).toString('hex')}`;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache');
  res.setHeader('connection', 'keep-alive');

  const emit = (event, payload) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  emit('message_start', {
    type: 'message_start',
    message: {
      id,
      type: 'message',
      role: 'assistant',
      model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: usage.inputTokens, output_tokens: 0 }
    }
  });
  emit('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
  emit('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } });
  emit('content_block_stop', { type: 'content_block_stop', index: 0 });
  emit('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: usage.outputTokens } });
  emit('message_stop', { type: 'message_stop' });
  res.end();
}

function sendOpenAIResponsesSSE(res, model, text, usage) {
  const respId = `resp_${crypto.randomBytes(10).toString('hex')}`;
  const itemId = `msg_${crypto.randomBytes(8).toString('hex')}`;
  const createdAt = Math.floor(Date.now() / 1000);
  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache');
  res.setHeader('connection', 'keep-alive');

  let seq = 0;
  const emit = (event, payload) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify({ ...payload, sequence_number: seq++ })}\n\n`);
  };

  const baseResponse = {
    id: respId,
    object: 'response',
    created_at: createdAt,
    status: 'in_progress',
    model,
    output: []
  };

  emit('response.created', { type: 'response.created', response: baseResponse });
  emit('response.in_progress', { type: 'response.in_progress', response: baseResponse });
  emit('response.output_item.added', {
    type: 'response.output_item.added',
    output_index: 0,
    item: {
      id: itemId,
      type: 'message',
      status: 'in_progress',
      role: 'assistant',
      content: []
    }
  });
  emit('response.content_part.added', {
    type: 'response.content_part.added',
    item_id: itemId,
    output_index: 0,
    content_index: 0,
    part: { type: 'output_text', text: '', annotations: [] }
  });
  emit('response.output_text.delta', {
    type: 'response.output_text.delta',
    item_id: itemId,
    output_index: 0,
    content_index: 0,
    delta: text
  });
  emit('response.output_text.done', {
    type: 'response.output_text.done',
    item_id: itemId,
    output_index: 0,
    content_index: 0,
    text
  });
  emit('response.content_part.done', {
    type: 'response.content_part.done',
    item_id: itemId,
    output_index: 0,
    content_index: 0,
    part: { type: 'output_text', text, annotations: [] }
  });
  const completedItem = {
    id: itemId,
    type: 'message',
    status: 'completed',
    role: 'assistant',
    content: [{ type: 'output_text', text, annotations: [] }]
  };
  emit('response.output_item.done', {
    type: 'response.output_item.done',
    output_index: 0,
    item: completedItem
  });
  emit('response.completed', {
    type: 'response.completed',
    response: {
      id: respId,
      object: 'response',
      created_at: createdAt,
      status: 'completed',
      model,
      output_text: text,
      output: [completedItem],
      usage: {
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        total_tokens: usage.inputTokens + usage.outputTokens
      }
    }
  });
  res.write('data: [DONE]\n\n');
  res.end();
}

export function createGatewayServer(options = {}) {
  const server = http.createServer(async (req, res) => {
    const urlPath = (req.url || '/').split('?')[0];

    try {
      if (req.method === 'GET' && (urlPath === '/health' || urlPath === '/v1/status')) {
        return sendJson(res, 200, {
          ok: true,
          service: 'velomesh-gateway',
          version: '4.3.0',
          emblem: '/brand/velomesh-mark.svg',
          models: VELOMESH_MODELS,
          upstreams: discoverUpstreams({ ...options, checkClis: options.checkClis ?? !options.simulate }),
          telemetry: getRoutingTelemetry().slice(-10)
        });
      }

      if (req.method === 'GET' && urlPath === '/v1/models') {
        const list = VELOMESH_MODELS.map((m) => ({
          id: m.id,
          object: 'model',
          created: 1735689600,
          owned_by: 'velomesh',
          description: m.description
        }));
        if (!options.simulate && options.checkClis !== false) {
          const up = discoverUpstreams({ ...options, checkClis: true, checkNetwork: false });
          for (const pm of up.platformModels?.all || []) {
            if (!list.some((x) => x.id === pm.id)) {
              list.push({
                id: pm.id,
                object: 'model',
                created: 1735689600,
                owned_by: pm.source || 'platform',
                description: pm.displayName || pm.id
              });
            }
          }
        }
        return sendJson(res, 200, {
          object: 'list',
          data: list
        });
      }

      if (req.method === 'POST' && urlPath === '/v1/route') {
        const body = await readJsonBody(req);
        const decision = selectModelForTurn({
          messages: body.messages || [],
          prompt: body.prompt || '',
          requestedModel: body.model || 'velomesh/auto',
          previousModel: body.previousModel || req.headers['x-velomesh-previous-model'] || null,
          previousFamily: body.previousFamily || req.headers['x-velomesh-previous-family'] || null,
          checkClis: options.checkClis ?? !options.simulate,
          record: options.record !== false
        });
        return sendJson(res, 200, decision);
      }

      if (req.method === 'POST' && urlPath === '/v1/optimize') {
        const body = await readJsonBody(req);
        const ws = typeof body.workspacePath === 'string' && path.isAbsolute(body.workspacePath) ? body.workspacePath : process.cwd();
        const result = optimizePrompt(body.prompt || '', {
          catalog: discover(ws),
          workspacePath: ws,
          currentHost: body.currentHost || 'antigravity',
          requestedModel: body.model || 'velomesh/auto',
          checkClis: options.checkClis ?? !options.simulate
        });
        return sendJson(res, 200, result);
      }

      if (req.method === 'POST' && (urlPath === '/v1/chat/completions' || urlPath === '/v1/responses')) {
        const body = await readJsonBody(req);
        const messages = normalizeOpenAIMessages(body);
        const forceSim = Boolean(options.simulate || req.headers['x-velomesh-simulate'] === '1');
        const decision = selectModelForTurn({
          messages,
          prompt: typeof body.prompt === 'string' ? body.prompt : '',
          requestedModel: body.model || 'velomesh/auto',
          previousModel: req.headers['x-velomesh-previous-model'] || body.previousModel || null,
          previousFamily: req.headers['x-velomesh-previous-family'] || body.previousFamily || null,
          checkClis: options.checkClis ?? !forceSim,
          record: options.record !== false
        });
        const execution = await executeTurn(decision, messages, {
          simulate: forceSim,
          tools: body.tools,
          toolChoice: body.tool_choice,
          temperature: body.temperature,
          topP: body.top_p,
          maxTokens: body.max_tokens || body.max_output_tokens
        });
        setVeloMeshHeaders(res, decision, execution);

        if (body.stream === true && urlPath === '/v1/chat/completions') {
          return sendOpenAISSE(res, execution.executedModel, execution.text);
        }

        if (body.stream === true && urlPath === '/v1/responses') {
          return sendOpenAIResponsesSSE(res, execution.executedModel, execution.text, execution.usage);
        }

        if (urlPath === '/v1/responses') {
          return sendJson(res, 200, {
            id: `resp_${crypto.randomBytes(10).toString('hex')}`,
            object: 'response',
            created_at: Math.floor(Date.now() / 1000),
            model: execution.executedModel,
            output_text: execution.text,
            output: [
              {
                type: 'message',
                role: 'assistant',
                content: [{ type: 'output_text', text: execution.text }]
              }
            ],
            usage: {
              input_tokens: execution.usage.inputTokens,
              output_tokens: execution.usage.outputTokens,
              total_tokens: execution.usage.inputTokens + execution.usage.outputTokens
            },
            velomesh: decision
          });
        }

        const openaiMessage = { role: 'assistant', content: execution.text };
        if (execution.toolCalls?.length) openaiMessage.tool_calls = execution.toolCalls;
        return sendJson(res, 200, {
          id: `chatcmpl-${crypto.randomBytes(8).toString('hex')}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: execution.executedModel,
          choices: [
            {
              index: 0,
              message: openaiMessage,
              finish_reason: execution.toolCalls?.length ? 'tool_calls' : 'stop'
            }
          ],
          usage: {
            prompt_tokens: execution.usage.inputTokens,
            completion_tokens: execution.usage.outputTokens,
            total_tokens: execution.usage.inputTokens + execution.usage.outputTokens
          },
          velomesh: decision
        });
      }

      if (req.method === 'POST' && urlPath === '/v1/messages') {
        const body = await readJsonBody(req);
        const messages = normalizeAnthropicMessages(body);
        const forceSim = Boolean(options.simulate || req.headers['x-velomesh-simulate'] === '1');
        const decision = selectModelForTurn({
          messages,
          requestedModel: body.model || 'velomesh/auto',
          previousModel: req.headers['x-velomesh-previous-model'] || null,
          previousFamily: req.headers['x-velomesh-previous-family'] || null,
          checkClis: options.checkClis ?? !forceSim,
          record: options.record !== false
        });
        const execution = await executeTurn(decision, messages, {
          simulate: forceSim,
          tools: body.tools,
          toolChoice: body.tool_choice,
          temperature: body.temperature,
          topP: body.top_p,
          maxTokens: body.max_tokens
        });
        setVeloMeshHeaders(res, decision, execution);

        if (body.stream === true) {
          return sendAnthropicSSE(res, execution.executedModel, execution.text, execution.usage);
        }

        const anthContent = [];
        if (execution.text || !execution.toolCalls?.length) {
          anthContent.push({ type: 'text', text: execution.text });
        }
        for (const tc of execution.toolCalls || []) {
          let inputObj = {};
          try { inputObj = JSON.parse(tc.function?.arguments || '{}'); } catch {}
          anthContent.push({ type: 'tool_use', id: tc.id, name: tc.function?.name || 'tool', input: inputObj });
        }
        return sendJson(res, 200, {
          id: `msg_${crypto.randomBytes(10).toString('hex')}`,
          type: 'message',
          role: 'assistant',
          model: execution.executedModel,
          content: anthContent,
          stop_reason: execution.toolCalls?.length ? 'tool_use' : 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: execution.usage.inputTokens,
            output_tokens: execution.usage.outputTokens
          }
        });
      }

      return sendJson(res, 404, { error: { message: `Not found: ${req.method} ${urlPath}`, type: 'not_found' } });
    } catch (err) {
      return sendJson(res, 400, { error: { message: String(err.message || err), type: 'invalid_request_error' } });
    }
  });

  return server;
}

function renderHud() {
  const upstreams = discoverUpstreams({ checkClis: true, checkNetwork: true });
  const lines = [
    '',
    VELOMESH_ASCII_EMBLEM,
    '================================================================================',
    ' VIRTUAL MODELS (Select in OpenCode / Codex / Claude Code / Cursor / CLI)',
    ...VELOMESH_MODELS.map((m) => `  - ${m.id.padEnd(20)} ${m.description}`),
    '',
    ' PHASE ROUTING MATRIX (Mid-Execution Dynamic Model Switching)',
    ...Object.entries(PHASE_CATALOG).map(([phase, cfg]) =>
      `  - ${phase.padEnd(15)} primary=${cfg.primaryCandidates.join(' -> ').padEnd(48)} tier=${cfg.antigravityTier}`
    ),
    '',
    ' DETECTED UPSTREAM TRANSPORTS',
    `  - Direct APIs    : ${Object.entries(upstreams.apis).filter(([, v]) => v.configured).map(([k]) => k).join(', ') || 'none set in env (CLI Bridge & failover active)'}`,
    `  - Local Routers  : ${upstreams.localRouters.map((r) => `${r.name}(${r.online ? 'ONLINE' : 'offline'}:${r.models.length})`).join(', ') || 'none'}`,
    `  - CLI Bridges    : ${Object.entries(upstreams.clis).filter(([, v]) => v.installed).map(([k]) => k).join(', ') || 'none detected'}`,
    `  - Platform Models: ${(upstreams.platformModels?.all || []).slice(0, 8).map((m) => m.id).join(', ') || 'none cached'}`,
    '================================================================================',
    ''
  ];
  return lines.join('\n');
}

async function mainCli() {
  const args = process.argv.slice(2);
  const portIdx = args.indexOf('--port');
  const port = portIdx >= 0 && args[portIdx + 1]
    ? Number(args[portIdx + 1])
    : Number(process.env.VELOMESH_PORT || 4190);

  if (args.includes('--hud')) {
    process.stdout.write(renderHud());
    return;
  }

  if (args.includes('--status')) {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json();
    process.stdout.write(JSON.stringify(body, null, 2) + '\n');
    return;
  }

  const simulate = args.includes('--simulate');
  const server = createGatewayServer({ simulate });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(renderHud());
    process.stdout.write(`Listening on http://127.0.0.1:${port}/v1\n`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mainCli().catch((err) => {
    process.stderr.write(`VeloMesh gateway error: ${err.message}\n`);
    process.exit(1);
  });
}
