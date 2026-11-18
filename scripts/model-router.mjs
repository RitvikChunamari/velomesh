import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { dataDir } from './state.mjs';

export const VELOMESH_MODELS = [
  {
    id: 'velomesh/auto',
    object: 'model',
    owned_by: 'velomesh',
    description: 'Dynamic Turn-by-Turn Multi-Model Orchestrator (switches across reasoning, frontend, fast, and review models mid-execution).'
  },
  {
    id: 'velomesh/architect',
    object: 'model',
    owned_by: 'velomesh',
    description: 'Frontier System Architecture, Reasoning & PostgreSQL RLS Schema Tier.'
  },
  {
    id: 'velomesh/frontend',
    object: 'model',
    owned_by: 'velomesh',
    description: 'Visual Craft, Swiss Typography UI, Motion Physics & Design Engineering Tier.'
  },
  {
    id: 'velomesh/fast',
    object: 'model',
    owned_by: 'velomesh',
    description: 'Low-Latency Search, Terminal Diagnostics, Boilerplate & Tool Tier.'
  },
  {
    id: 'velomesh/review',
    object: 'model',
    owned_by: 'velomesh',
    description: 'Cross-Family Independent Security & Code Verification Tier.'
  }
];

export const PHASE_CATALOG = {
  architecture: {
    primaryCandidates: ['claude-opus-4-6', 'gpt-5.4', 'grok-4', 'gemini-3.1-pro'],
    antigravityTier: 'pro',
    cliPreferred: ['claude', 'codex', 'opencode', 'gemini'],
    rationale: 'Deep system design, RLS isolation, and multi-service tradeoffs'
  },
  frontend: {
    primaryCandidates: ['claude-sonnet-4-6', 'gemini-3.1-pro', 'gpt-5.4', 'grok-4'],
    antigravityTier: 'pro',
    cliPreferred: ['claude', 'gemini', 'opencode', 'codex'],
    rationale: 'Swiss typography precision, responsive craft, and interactive motion'
  },
  implementation: {
    primaryCandidates: ['gpt-5.3-codex', 'claude-sonnet-4-6', 'grok-4', 'gemini-3.1-pro'],
    antigravityTier: 'pro',
    cliPreferred: ['codex', 'claude', 'opencode', 'gemini'],
    rationale: 'High-throughput typed code synthesis and tool execution'
  },
  fast: {
    primaryCandidates: ['gemini-3-flash', 'grok-code-fast-1', 'claude-haiku-4-5', 'gpt-5-mini'],
    antigravityTier: 'flash_lite',
    cliPreferred: ['gemini', 'opencode', 'codex', 'claude'],
    rationale: 'Sub-second triage, search, formatting, and quick explanations'
  },
  review: {
    primaryCandidates: ['gpt-5.3-codex', 'claude-opus-4-6', 'grok-4', 'gemini-3.1-pro'],
    antigravityTier: 'pro',
    cliPreferred: ['codex', 'claude', 'gemini', 'opencode'],
    rationale: 'Independent cross-family verification to prevent self-grading bias'
  }
};

const MODEL_FAMILY = {
  'claude-opus-4-6': 'anthropic',
  'claude-sonnet-4-6': 'anthropic',
  'claude-haiku-4-5': 'anthropic',
  'gpt-5.4': 'openai',
  'gpt-5.3-codex': 'openai',
  'gpt-5-mini': 'openai',
  'grok-4': 'xai',
  'grok-code-fast-1': 'xai',
  'gemini-3.1-pro': 'google',
  'gemini-3-flash': 'google'
};

const PROVIDER_META = {
  anthropic: { endpoint: 'https://api.anthropic.com/v1/messages', envKey: 'ANTHROPIC_API_KEY', cli: 'claude' },
  openai: { endpoint: 'https://api.openai.com/v1/chat/completions', envKey: 'OPENAI_API_KEY', cli: 'codex' },
  xai: { endpoint: 'https://api.x.ai/v1/chat/completions', envKey: 'XAI_API_KEY', cli: 'grok' },
  google: { endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', envKey: 'GEMINI_API_KEY', cli: 'gemini' },
  openrouter: { endpoint: 'https://openrouter.ai/api/v1/chat/completions', envKey: 'OPENROUTER_API_KEY', cli: 'opencode' }
};

export function inferModelFamily(modelName) {
  if (!modelName) return null;
  const lower = String(modelName).toLowerCase();
  if (MODEL_FAMILY[lower]) return MODEL_FAMILY[lower];
  if (lower.includes('claude')) return 'anthropic';
  if (lower.includes('gpt') || lower.includes('codex') || lower.includes('o1') || lower.includes('o3')) return 'openai';
  if (lower.includes('grok')) return 'xai';
  if (lower.includes('gemini')) return 'google';
  return 'multi';
}

function extractTextFromContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || part?.content || ''))
      .join(' ');
  }
  return '';
}

function extractTurnText({ messages = [], prompt = '' }) {
  if (prompt && String(prompt).trim()) return String(prompt).trim();
  if (!Array.isArray(messages) || messages.length === 0) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && (msg.role === 'user' || msg.role === 'tool')) {
      const txt = extractTextFromContent(msg.content).trim();
      if (txt) return txt;
    }
  }
  return extractTextFromContent(messages[messages.length - 1]?.content).trim();
}

export function normalizeVirtualModel(requestedModel) {
  const raw = String(requestedModel || '').trim();
  if (!raw) return 'velomesh/auto';
  const bare = ['auto', 'architect', 'frontend', 'fast', 'review'];
  if (bare.includes(raw)) return `velomesh/${raw}`;
  return raw;
}

export function classifyTurnIntent({ messages = [], prompt = '', requestedModel = 'velomesh/auto', turnIndex = 0 } = {}) {
  const req = normalizeVirtualModel(requestedModel);
  const pinnedMap = {
    'velomesh/architect': 'architecture',
    'velomesh/frontend': 'frontend',
    'velomesh/fast': 'fast',
    'velomesh/review': 'review'
  };

  if (pinnedMap[req]) {
    return {
      phase: pinnedMap[req],
      reason: 'Explicit virtual model pin',
      confidence: 0.99,
      pinned: true
    };
  }

  const text = extractTurnText({ messages, prompt });
  const lower = text.toLowerCase();

  if (/\b(review|audit|security|vulnerability|verify|verification|regression|cve|owasp|pentest|inspect diff|qa receipt)\b/i.test(lower)) {
    return {
      phase: 'review',
      reason: 'Verification, security, or code audit intent detected',
      confidence: 0.94,
      pinned: false
    };
  }

  if (/\b(architect|architecture|schema|database|postgres|rls|migration|system design|distributed|consensus|orchestrat|scalab|tradeoff|deadlock|concurrency)\b/i.test(lower)) {
    return {
      phase: 'architecture',
      reason: 'System architecture, database schema, or deep planning intent detected',
      confidence: 0.93,
      pinned: false
    };
  }

  if (/\b(css|html|ui|ux|ui design|web design|visual design|design system|typography|swiss|font|layout|responsive|animation|gsap|canvas|webgl|shader|component|navbar|footer|bento|modal|tailwind|theme|contrast|a11y)\b/i.test(lower)) {
    return {
      phase: 'frontend',
      reason: 'UI craftsmanship, CSS layout, or motion intent detected',
      confidence: 0.92,
      pinned: false
    };
  }

  if (/\b(plan)\b/i.test(lower)) {
    return {
      phase: 'architecture',
      reason: 'Architecture planning intent detected',
      confidence: 0.89,
      pinned: false
    };
  }

  if (text.length < 140 && /\b(list|find|grep|search|rename|format|lint|status|ping|hello|quick|summarize|explain briefly)\b/i.test(lower)) {
    return {
      phase: 'fast',
      reason: 'Lightweight lookup, status, or short turnaround task detected',
      confidence: 0.9,
      pinned: false
    };
  }

  const normalizedTurn = Number.isFinite(Number(turnIndex)) ? Number(turnIndex) : (Array.isArray(messages) ? messages.length : 0);
  if (normalizedTurn === 0 && text.length > 280) {
    return {
      phase: 'architecture',
      reason: 'Complex initial build prompt routed to frontier planning tier',
      confidence: 0.87,
      pinned: false
    };
  }

  return {
    phase: 'implementation',
    reason: 'Core code synthesis and iterative tool execution turn',
    confidence: 0.86,
    pinned: false
  };
}

export function buildExpandedPath(env = process.env, homeDir = os.homedir()) {
  const extras = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    path.join(homeDir, '.local', 'bin'),
    path.join(homeDir, '.npm-global', 'bin'),
    path.join(homeDir, '.bun', 'bin'),
    path.join(homeDir, '.volta', 'bin')
  ];
  const nvmDir = path.join(homeDir, '.nvm', 'versions', 'node');
  try {
    if (fs.existsSync(nvmDir)) {
      for (const entry of fs.readdirSync(nvmDir)) {
        extras.push(path.join(nvmDir, entry, 'bin'));
      }
    }
  } catch {
    // Ignore unreadable nvm dir
  }
  const existing = String(env.PATH || '').split(path.delimiter).filter(Boolean);
  return [...new Set([...extras, ...existing])].join(path.delimiter);
}

function commandExists(cmd, env = process.env, homeDir = os.homedir()) {
  try {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(checker, [cmd], {
      env: { ...env, PATH: buildExpandedPath(env, homeDir) },
      stdio: 'ignore',
      timeout: 1500
    });
    return true;
  } catch {
    return false;
  }
}

export function mapModelForLocalRouter(candidateModel, router) {
  const models = Array.isArray(router?.models) ? router.models : [];
  if (!models.length) return candidateModel;
  if (models.includes(candidateModel)) return candidateModel;

  const lower = String(candidateModel).toLowerCase();
  const findFirst = (preds) => {
    for (const pred of preds) {
      const hit = models.find((m) => pred(m.toLowerCase()));
      if (hit) return hit;
    }
    return null;
  };

  let mapped = null;
  if (lower.includes('claude-opus')) {
    mapped = findFirst([
      (m) => m.includes('claude-opus-4-6'),
      (m) => m.includes('claude-opus') && m.includes('high'),
      (m) => m.includes('claude-opus')
    ]);
  } else if (lower.includes('claude-sonnet')) {
    mapped = findFirst([
      (m) => m.includes('claude-sonnet-4-6'),
      (m) => m.includes('claude-sonnet')
    ]);
  } else if (lower.includes('claude-haiku')) {
    mapped = findFirst([
      (m) => m.includes('claude-haiku'),
      (m) => m.includes('flash-high'),
      (m) => m.includes('flash')
    ]);
  } else if (lower.includes('gemini-3.1-pro')) {
    mapped = findFirst([
      (m) => m.includes('gemini-3.1-pro-high'),
      (m) => m.includes('gemini-3.1-pro'),
      (m) => m.includes('gemini') && m.includes('pro')
    ]);
  } else if (lower.includes('gemini-3-flash')) {
    mapped = findFirst([
      (m) => m.includes('gemini-3.7-flash-high'),
      (m) => m.includes('gemini') && m.includes('flash')
    ]);
  } else if (lower.includes('codex') || lower.includes('gpt-5')) {
    mapped = findFirst([
      (m) => m.includes('codex'),
      (m) => m.includes('gpt-oss-120b'),
      (m) => m.includes('kimi-k2.7-code'),
      (m) => m === 'auto/best-coding'
    ]);
  } else if (lower.includes('grok')) {
    mapped = findFirst([
      (m) => m.includes('grok'),
      (m) => m === 'auto/best-coding'
    ]);
  }

  return mapped || findFirst([(m) => m === 'auto/best-coding', (m) => m === 'auto', (m) => m === 'fusion']) || models[0];
}

function readOpenCodeRouters(homeDir) {
  const ocPath = path.join(homeDir, '.config', 'opencode', 'opencode.json');
  const routers = [];
  if (!fs.existsSync(ocPath)) return routers;
  try {
    const parsed = JSON.parse(fs.readFileSync(ocPath, 'utf8'));
    const providers = parsed?.providers;
    if (!providers || typeof providers !== 'object') return routers;
    for (const [name, cfg] of Object.entries(providers)) {
      if (name === 'velomesh' || !cfg || typeof cfg !== 'object') continue;
      const baseURL = cfg.settings?.baseURL || cfg.baseURL || null;
      const models = cfg.models && typeof cfg.models === 'object' ? Object.keys(cfg.models) : [];
      if (baseURL || models.length) {
        routers.push({
          name,
          baseURL,
          models: models.slice(0, 20),
          envVars: Array.isArray(cfg.env) ? cfg.env : []
        });
      }
    }
  } catch {
    // Ignore unreadable or JSONC config silently
  }
  return routers;
}

export function discoverUpstreams({ env = process.env, homeDir = os.homedir(), checkClis = true } = {}) {
  const apis = {
    anthropic: { configured: Boolean(env.ANTHROPIC_API_KEY), endpoint: PROVIDER_META.anthropic.endpoint },
    openai: { configured: Boolean(env.OPENAI_API_KEY), endpoint: PROVIDER_META.openai.endpoint },
    xai: { configured: Boolean(env.XAI_API_KEY), endpoint: PROVIDER_META.xai.endpoint },
    gemini: { configured: Boolean(env.GEMINI_API_KEY), endpoint: PROVIDER_META.google.endpoint },
    openrouter: { configured: Boolean(env.OPENROUTER_API_KEY), endpoint: PROVIDER_META.openrouter.endpoint }
  };

  const localRouters = readOpenCodeRouters(homeDir);
  const cliNames = ['claude', 'codex', 'gemini', 'opencode', 'grok'];
  const clis = {};
  for (const cli of cliNames) {
    clis[cli] = { installed: checkClis ? commandExists(cli, env, homeDir) : false };
  }

  return { apis, localRouters, clis };
}

function candidateTransport(candidateModel, upstreams, preferCli) {
  const family = inferModelFamily(candidateModel);
  const meta = PROVIDER_META[family] || PROVIDER_META.openai;
  const apiKeyName = family === 'google' ? 'gemini' : family;
  const hasDirectApi = Boolean(upstreams.apis[apiKeyName]?.configured || upstreams.apis.openrouter?.configured);
  const matchingRouter =
    upstreams.localRouters.find((r) => r.baseURL && r.models.includes(candidateModel)) ||
    upstreams.localRouters.find((r) => r.baseURL && r.models.some((m) => m.includes(family === 'google' ? 'gemini' : family === 'anthropic' ? 'claude' : 'gpt'))) ||
    upstreams.localRouters.find((r) => r.baseURL && r.models.some((m) => m.includes('auto')));
  const hasCli = Boolean(meta.cli && upstreams.clis[meta.cli]?.installed);

  if (preferCli && hasCli) {
    return {
      selectedModel: candidateModel,
      upstreamModel: candidateModel,
      selectedFamily: family,
      transport: 'cli',
      endpoint: null,
      cliProvider: meta.cli === 'grok' ? null : meta.cli
    };
  }
  if (hasDirectApi && upstreams.apis[apiKeyName]?.configured) {
    return {
      selectedModel: candidateModel,
      upstreamModel: candidateModel,
      selectedFamily: family,
      transport: 'api',
      endpoint: meta.endpoint,
      cliProvider: hasCli && meta.cli !== 'grok' ? meta.cli : null
    };
  }
  if (hasDirectApi && upstreams.apis.openrouter?.configured) {
    return {
      selectedModel: candidateModel,
      upstreamModel: candidateModel,
      selectedFamily: family,
      transport: 'api',
      endpoint: PROVIDER_META.openrouter.endpoint,
      cliProvider: hasCli && meta.cli !== 'grok' ? meta.cli : null
    };
  }
  if (matchingRouter) {
    return {
      selectedModel: candidateModel,
      upstreamModel: mapModelForLocalRouter(candidateModel, matchingRouter),
      selectedFamily: family,
      transport: 'local-router',
      endpoint: matchingRouter.baseURL,
      cliProvider: hasCli && meta.cli !== 'grok' ? meta.cli : null
    };
  }
  if (hasCli) {
    return {
      selectedModel: candidateModel,
      upstreamModel: candidateModel,
      selectedFamily: family,
      transport: 'cli',
      endpoint: null,
      cliProvider: meta.cli === 'grok' ? null : meta.cli
    };
  }
  return {
    selectedModel: candidateModel,
    upstreamModel: candidateModel,
    selectedFamily: family,
    transport: 'simulator',
    endpoint: null,
    cliProvider: null
  };
}

function sanitizePromptSnippet(text) {
  return String(text || '')
    .replace(/(sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{8,}|xai-[A-Za-z0-9_-]{8,})/g, '[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function telemetryFilePath() {
  return path.join(dataDir(), 'routing-telemetry.json');
}

function recordTelemetryEvent(entry) {
  try {
    const filePath = telemetryFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    let items = [];
    if (fs.existsSync(filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        items = [];
      }
    }
    items.push(entry);
    items = items.slice(-50);
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(tmp, filePath);
  } catch {
    // Non-fatal telemetry write error
  }
}

export function getRoutingTelemetry() {
  try {
    const filePath = telemetryFilePath();
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed.slice(-50) : [];
  } catch {
    return [];
  }
}

export function selectModelForTurn({
  messages = [],
  prompt = '',
  requestedModel = 'velomesh/auto',
  previousModel = null,
  previousFamily = null,
  turnIndex = 0,
  env = process.env,
  homeDir = os.homedir(),
  preferCli = env.VELOMESH_PREFER_CLI === '1',
  checkClis = true,
  record = true
} = {}) {
  const virtualModel = normalizeVirtualModel(requestedModel);
  const classification = classifyTurnIntent({ messages, prompt, requestedModel: virtualModel, turnIndex });
  const phase = classification.phase;
  const spec = PHASE_CATALOG[phase] || PHASE_CATALOG.implementation;
  const upstreams = discoverUpstreams({ env, homeDir, checkClis });

  let orderedCandidates = [...spec.primaryCandidates];
  const prevFam = previousFamily || inferModelFamily(previousModel);
  if (phase === 'review' && prevFam) {
    const crossFamily = orderedCandidates.filter((m) => inferModelFamily(m) !== prevFam);
    const sameFamily = orderedCandidates.filter((m) => inferModelFamily(m) === prevFam);
    orderedCandidates = [...crossFamily, ...sameFamily];
  }

  const resolvedChain = orderedCandidates.map((candidate) => candidateTransport(candidate, upstreams, preferCli));
  const transportRank = (item) => {
    if (preferCli) {
      return item.transport === 'cli' ? 0 : item.transport === 'api' ? 1 : item.transport === 'local-router' ? 2 : 3;
    }
    return item.transport === 'api' ? 0 : item.transport === 'local-router' ? 1 : item.transport === 'cli' ? 2 : 3;
  };

  let primary = resolvedChain[0];
  const sortedByAvailability = [...resolvedChain].sort((a, b) => transportRank(a) - transportRank(b));
  if (sortedByAvailability[0] && sortedByAvailability[0].transport !== 'simulator') {
    primary = sortedByAvailability[0];
  }

  // Prefer phase cliPreferred order if multiple CLI-only options exist without API keys
  if (primary.transport === 'cli' && !primary.cliProvider) {
    const firstCli = spec.cliPreferred.find((cli) => upstreams.clis[cli]?.installed);
    if (firstCli) primary.cliProvider = firstCli;
  }

  const fallbackChain = resolvedChain
    .filter((item) => item.selectedModel !== primary.selectedModel)
    .map((item) => ({
      model: item.selectedModel,
      upstreamModel: item.upstreamModel || item.selectedModel,
      family: item.selectedFamily,
      transport: item.transport,
      endpoint: item.endpoint,
      cliProvider: item.cliProvider
    }));

  const switched = Boolean(previousModel && previousModel !== primary.selectedModel);
  let switchReason = classification.reason;
  if (switched) {
    switchReason = phase === 'review' && prevFam && prevFam !== primary.selectedFamily
      ? `Cross-family handoff (${previousModel} -> ${primary.selectedModel}) to prevent self-grading bias`
      : `Mid-execution phase transition (${previousModel} -> ${primary.selectedModel}) for ${phase}`;
  }

  const timestamp = new Date().toISOString();
  const decision = {
    virtualModel,
    phase,
    selectedModel: primary.selectedModel,
    upstreamModel: primary.upstreamModel || primary.selectedModel,
    selectedFamily: primary.selectedFamily,
    transport: primary.transport,
    endpoint: primary.endpoint,
    cliProvider: primary.cliProvider,
    antigravityTier: spec.antigravityTier,
    fallbackChain,
    switched,
    switchReason,
    confidence: classification.confidence,
    timestamp
  };

  if (record) {
    const rawSnippet = extractTurnText({ messages, prompt });
    recordTelemetryEvent({
      timestamp,
      virtualModel,
      phase,
      selectedModel: primary.selectedModel,
      selectedFamily: primary.selectedFamily,
      transport: primary.transport,
      switched,
      switchReason,
      promptSnippet: sanitizePromptSnippet(rawSnippet)
    });
  }

  return decision;
}
