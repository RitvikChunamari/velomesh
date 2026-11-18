#!/usr/bin/env node
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  VELOMESH_MODELS,
  PHASE_CATALOG,
  discoverUpstreams,
  selectModelForTurn,
  getRoutingTelemetry
} from './model-router.mjs';

export const VELOMESH_ASCII_EMBLEM = [
  ' ██╗   ██╗ ███╗   ███╗   VELOMESH ORCHESTRATOR GATEWAY // velomesh/auto',
  '  ██╗ ██╔╝ ████╗ ████║   Dynamic Mid-Execution Model Switching & Failover',
  '   ████╔╝  ██╔████╔██║   OpenAI /v1/chat/completions · /v1/responses · Anthropic /v1/messages',
  '    ██╔╝   ██║ ╚██╔╝██║  Adaptive Routing: Architecture -> Frontend -> Fast -> Cross-Family Review'
].join('\n');

const CLI_EXEC_ARGS = {
  claude: (prompt) => ({ cmd: 'claude', args: ['-p', prompt] }),
  codex: (prompt) => ({ cmd: 'codex', args: ['exec', '--sandbox', 'read-only', prompt] }),
  gemini: (prompt) => ({ cmd: 'gemini', args: ['-p', prompt] }),
  opencode: (prompt) => ({ cmd: 'opencode', args: ['run', prompt] })
};

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

function normalizeOpenAIMessages(body) {
  if (Array.isArray(body.messages)) return body.messages;
  if (typeof body.input === 'string') return [{ role: 'user', content: body.input }];
  if (Array.isArray(body.input)) {
    return body.input.map((item) => ({
      role: item.role || 'user',
      content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content || '')
    }));
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

function promptFromMessages(messages) {
  return messages
    .map((m) => {
      const role = String(m.role || 'user').toUpperCase();
      const text = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.map((c) => c?.text || c?.content || '').join(' ')
          : JSON.stringify(m.content || '');
      return `${role}: ${text}`;
    })
    .join('\n\n')
    .slice(0, 32000);
}

function runCliBridge(provider, prompt, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const adapter = CLI_EXEC_ARGS[provider];
    if (!adapter) return reject(new Error(`Unsupported CLI bridge provider: ${provider}`));
    const { cmd, args } = adapter(prompt);
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.trim() || err.message));
      const text = String(stdout || '').trim();
      if (!text) return reject(new Error(`${provider} returned empty output`));
      resolve(text);
    });
  });
}

async function callUpstreamApi({ endpoint, model, messages, maxTokens = 4096, env = process.env }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    if (endpoint.includes('anthropic.com')) {
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
      const systemMsg = messages.find((m) => m.role === 'system')?.content;
      const chatMsgs = messages.filter((m) => m.role !== 'system');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, system: systemMsg, messages: chatMsgs }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
      const data = await res.json();
      const text = (data.content || []).map((c) => c.text || '').join('');
      return { text, usage: { inputTokens: data.usage?.input_tokens || 12, outputTokens: data.usage?.output_tokens || 32 } };
    }

    let apiKey = env.OPENAI_API_KEY || env.VELOMESH_API_KEY || 'velomesh-local';
    if (endpoint.includes('api.x.ai')) apiKey = env.XAI_API_KEY || apiKey;
    else if (endpoint.includes('generativelanguage.googleapis.com')) apiKey = env.GEMINI_API_KEY || apiKey;
    else if (endpoint.includes('openrouter.ai')) apiKey = env.OPENROUTER_API_KEY || apiKey;

    const normalizedUrl = endpoint.endsWith('/chat/completions')
      ? endpoint
      : `${endpoint.replace(/\/+$/, '')}/chat/completions`;

    const res = await fetch(normalizedUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return {
      text,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 12,
        outputTokens: data.usage?.completion_tokens || 32
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function executeTurn(decision, messages, { simulate = false, env = process.env } = {}) {
  const promptText = promptFromMessages(messages);
  const attempts = [
    {
      model: decision.selectedModel,
      family: decision.selectedFamily,
      transport: decision.transport,
      endpoint: decision.endpoint,
      cliProvider: decision.cliProvider
    },
    ...(decision.fallbackChain || [])
  ];

  let failoverCount = 0;

  if (simulate || decision.transport === 'simulator') {
    const text = `[VeloMesh Orchestrator -> ${decision.selectedModel} (${decision.phase})] ${decision.switchReason}. Simulated execution complete (antigravityTier=${decision.antigravityTier}, switched=${decision.switched}).`;
    return {
      text,
      executedModel: decision.selectedModel,
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
          model: step.model,
          messages,
          env
        });
        return {
          text: result.text,
          executedModel: step.model,
          transport: step.transport,
          failoverCount,
          usage: result.usage
        };
      }
      if (step.transport === 'cli' && step.cliProvider && env.VELOMESH_ENABLE_CLI_BRIDGE !== '0') {
        const text = await runCliBridge(step.cliProvider, promptText);
        return {
          text,
          executedModel: step.model,
          transport: 'cli',
          failoverCount,
          usage: {
            inputTokens: Math.max(8, Math.ceil(promptText.length / 4)),
            outputTokens: Math.max(8, Math.ceil(text.length / 4))
          }
        };
      }
    } catch {
      // Fall through to next backend in ladder on 429/5xx/CLI unavailability
    }
  }

  const fallbackText = `[VeloMesh Orchestrator -> ${decision.selectedModel} (${decision.phase})] Upstream endpoints unavailable or unauthenticated; returned deterministic orchestration trace (${decision.switchReason}).`;
  return {
    text: fallbackText,
    executedModel: decision.selectedModel,
    transport: 'simulator',
    failoverCount,
    usage: { inputTokens: Math.max(8, Math.ceil(promptText.length / 4)), outputTokens: Math.ceil(fallbackText.length / 4) }
  };
}

function setVeloMeshHeaders(res, decision, execution) {
  res.setHeader('X-VeloMesh-Virtual-Model', decision.virtualModel);
  res.setHeader('X-VeloMesh-Model', execution.executedModel || decision.selectedModel);
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

export function createGatewayServer(options = {}) {
  const server = http.createServer(async (req, res) => {
    const urlPath = (req.url || '/').split('?')[0];

    try {
      if (req.method === 'GET' && (urlPath === '/health' || urlPath === '/v1/status')) {
        return sendJson(res, 200, {
          ok: true,
          service: 'velomesh-gateway',
          version: '4.1.0',
          emblem: '/brand/velomesh-mark.svg',
          models: VELOMESH_MODELS,
          upstreams: discoverUpstreams({ ...options, checkClis: options.checkClis ?? !options.simulate }),
          telemetry: getRoutingTelemetry().slice(-10)
        });
      }

      if (req.method === 'GET' && urlPath === '/v1/models') {
        return sendJson(res, 200, {
          object: 'list',
          data: VELOMESH_MODELS.map((m) => ({
            id: m.id,
            object: 'model',
            created: 1735689600,
            owned_by: 'velomesh',
            description: m.description
          }))
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
        const execution = await executeTurn(decision, messages, { simulate: forceSim });
        setVeloMeshHeaders(res, decision, execution);

        if (body.stream === true && urlPath === '/v1/chat/completions') {
          return sendOpenAISSE(res, execution.executedModel, execution.text);
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

        return sendJson(res, 200, {
          id: `chatcmpl-${crypto.randomBytes(8).toString('hex')}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: execution.executedModel,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: execution.text },
              finish_reason: 'stop'
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
        const execution = await executeTurn(decision, messages, { simulate: forceSim });
        setVeloMeshHeaders(res, decision, execution);

        if (body.stream === true) {
          return sendAnthropicSSE(res, execution.executedModel, execution.text, execution.usage);
        }

        return sendJson(res, 200, {
          id: `msg_${crypto.randomBytes(10).toString('hex')}`,
          type: 'message',
          role: 'assistant',
          model: execution.executedModel,
          content: [{ type: 'text', text: execution.text }],
          stop_reason: 'end_turn',
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
  const upstreams = discoverUpstreams({ checkClis: true });
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
    `  - Direct APIs : ${Object.entries(upstreams.apis).filter(([, v]) => v.configured).map(([k]) => k).join(', ') || 'none set in env (CLI Bridge & failover active)'}`,
    `  - Local Routers: ${upstreams.localRouters.map((r) => `${r.name}(${r.models.length} models)`).join(', ') || 'none'}`,
    `  - CLI Bridges  : ${Object.entries(upstreams.clis).filter(([, v]) => v.installed).map(([k]) => k).join(', ') || 'none detected'}`,
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
