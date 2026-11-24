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
  openrouter: { endpoint: 'https://openrouter.ai/api/v1/chat/completions', envKey: 'OPENROUTER_API_KEY', cli: 'opencode' },
  openweights: { endpoint: 'https://openrouter.ai/api/v1/chat/completions', envKey: 'OPENROUTER_API_KEY', cli: 'opencode' }
};

const _tcpProbeCache = new Map();

export function inferModelFamily(modelName) {
  if (!modelName) return null;
  const lower = String(modelName).toLowerCase();
  if (MODEL_FAMILY[lower]) return MODEL_FAMILY[lower];
  if (lower.includes('claude')) return 'anthropic';
  if (
    lower.includes('gpt') ||
    lower.includes('codex') ||
    lower.includes('o1') ||
    lower.includes('o3') ||
    lower.includes('o4') ||
    /-(sol|astra|terra|luna)$/.test(lower)
  ) {
    return 'openai';
  }
  if (lower.includes('grok')) return 'xai';
  if (lower.includes('gemini')) return 'google';
  if (lower.includes('kimi') || lower.includes('qwen') || lower.includes('deepseek') || lower.includes('minimax')) {
    return 'openweights';
  }
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
    if (msg && msg.role === 'user') {
      const txt = extractTextFromContent(msg.content).trim();
      if (txt) return txt;
    }
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && msg.role === 'tool') {
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

export function isVirtualModel(modelName) {
  const req = normalizeVirtualModel(modelName);
  return req.startsWith('velomesh/');
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
      pinned: !isVirtualModel(req)
    };
  }

  if (/\b(architect|architecture|schema|database|postgres|supabase|rls|migration|system design|distributed|consensus|orchestrat|scalab|tradeoff|deadlock|concurrency)\b/i.test(lower)) {
    return {
      phase: 'architecture',
      reason: 'System architecture, database schema, or deep planning intent detected',
      confidence: 0.93,
      pinned: !isVirtualModel(req)
    };
  }

  if (/\b(css|html|ui|ux|ui design|web design|visual design|design system|typography|swiss|font|layout|responsive|animation|gsap|canvas|webgl|shader|component|navbar|footer|bento|modal|tailwind|theme|contrast|a11y)\b/i.test(lower)) {
    return {
      phase: 'frontend',
      reason: 'UI craftsmanship, CSS layout, or motion intent detected',
      confidence: 0.92,
      pinned: !isVirtualModel(req)
    };
  }

  if (/\b(plan)\b/i.test(lower)) {
    return {
      phase: 'architecture',
      reason: 'Architecture planning intent detected',
      confidence: 0.89,
      pinned: !isVirtualModel(req)
    };
  }

  if (text.length < 140 && /\b(list|find|grep|search|rename|format|lint|status|ping|hello|quick|summarize|explain briefly)\b/i.test(lower)) {
    return {
      phase: 'fast',
      reason: 'Lightweight lookup, status, or short turnaround task detected',
      confidence: 0.9,
      pinned: !isVirtualModel(req)
    };
  }

  const normalizedTurn = Number.isFinite(Number(turnIndex)) ? Number(turnIndex) : (Array.isArray(messages) ? messages.length : 0);
  if (normalizedTurn === 0 && text.length > 280) {
    return {
      phase: 'architecture',
      reason: 'Complex initial build prompt routed to frontier planning tier',
      confidence: 0.87,
      pinned: !isVirtualModel(req)
    };
  }

  return {
    phase: 'implementation',
    reason: 'Core code synthesis and iterative tool execution turn',
    confidence: 0.86,
    pinned: !isVirtualModel(req)
  };
}

export function buildExpandedPath(env = process.env, homeDir = os.homedir()) {
  const extras = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS',
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

export function resolveCliBinary(cmd, env = process.env, homeDir = os.homedir()) {
  if (!cmd) return null;
  const searchDirs = buildExpandedPath(env, homeDir).split(path.delimiter).filter(Boolean);
  for (const dir of searchDirs) {
    const candidate = path.join(dir, cmd);
    try {
      const st = fs.statSync(candidate);
      if (st.isFile() && (process.platform === 'win32' || (st.mode & 0o111) !== 0)) {
        return candidate;
      }
    } catch {
      // Not present in this PATH segment
    }
  }
  try {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const out = execFileSync(checker, [cmd], {
      env: { ...env, PATH: searchDirs.join(path.delimiter) },
      encoding: 'utf8',
      timeout: 1200
    }).trim().split(/\r?\n/)[0];
    return out || null;
  } catch {
    return null;
  }
}

function commandExists(cmd, env = process.env, homeDir = os.homedir()) {
  return Boolean(resolveCliBinary(cmd, env, homeDir));
}

function isLocalRouterOnline(baseURL, checkNetwork = true) {
  if (!baseURL) return false;
  if (!checkNetwork) return true;
  let parsed;
  try {
    parsed = new URL(baseURL);
  } catch {
    return false;
  }
  const host = parsed.hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    return true;
  }
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  const cacheKey = `${host}:${port}`;
  const now = Date.now();
  const cached = _tcpProbeCache.get(cacheKey);
  if (cached && now - cached.ts < 3000) {
    return cached.online;
  }
  let online = false;
  try {
    execFileSync('nc', ['-z', '-w', '1', host, String(port)], { stdio: 'ignore', timeout: 300 });
    online = true;
  } catch {
    online = false;
  }
  _tcpProbeCache.set(cacheKey, { ts: now, online });
  return online;
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
  } else if (lower.includes('codex') || lower.includes('gpt-')) {
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

function readOpenCodeRouters(homeDir, checkNetwork = true) {
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
          online: isLocalRouterOnline(baseURL, checkNetwork),
          models: models.slice(0, 24),
          envVars: Array.isArray(cfg.env) ? cfg.env : []
        });
      }
    }
  } catch {
    // Ignore unreadable or JSONC config silently
  }
  return routers;
}

function bucketCodexModelPhase(slug, priority = 99) {
  const lower = String(slug || '').toLowerCase();
  if (lower.includes('auto-review') || lower.includes('review')) return { phase: 'review', rank: 100 - priority };
  if (lower.includes('-sol') || lower.includes('reserve')) return { phase: 'architecture', rank: 100 - priority };
  if (lower.includes('-astra')) return { phase: 'frontend', rank: 100 - priority };
  if (lower.includes('-terra') || lower.includes('codex')) return { phase: 'implementation', rank: 100 - priority };
  if (lower.includes('-luna') || lower.includes('mini')) return { phase: 'fast', rank: 100 - priority };
  return { phase: 'implementation', rank: 50 - priority };
}

export function discoverPlatformModels({ homeDir = os.homedir(), env = process.env, checkClis = true } = {}) {
  const codex = [];
  const codexCachePath = path.join(homeDir, '.codex', 'models_cache.json');
  const codexCustomCatalog = path.join(homeDir, '.codex', 'velomesh-models.json');
  const cacheSource = fs.existsSync(codexCachePath) ? codexCachePath : codexCustomCatalog;
  if (fs.existsSync(cacheSource)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cacheSource, 'utf8'));
      const models = Array.isArray(parsed?.models) ? parsed.models : [];
      for (const m of models) {
        const slug = String(m?.slug || '').trim();
        if (!slug || slug.startsWith('velomesh/')) continue;
        const bucket = bucketCodexModelPhase(slug, Number.isFinite(Number(m.priority)) ? Number(m.priority) : 50);
        codex.push({
          id: slug,
          displayName: m.display_name || slug,
          family: inferModelFamily(slug),
          source: 'codex-models-cache',
          preferredPhase: bucket.phase,
          visibility: m.visibility || 'list',
          priority: Number.isFinite(Number(m.priority)) ? Number(m.priority) : 50
        });
      }
    } catch {
      // Ignore malformed cache
    }
  }

  const claude = [];
  const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json');
  if (fs.existsSync(claudeSettingsPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
      if (parsed?.model && !String(parsed.model).startsWith('velomesh/')) {
        claude.push({ id: parsed.model, family: inferModelFamily(parsed.model), source: 'claude-settings' });
      }
      const opts = parsed?.modelPicker?.options;
      if (Array.isArray(opts)) {
        for (const o of opts) {
          if (o?.model && !String(o.model).startsWith('velomesh/') && !claude.some((x) => x.id === o.model)) {
            claude.push({ id: o.model, family: inferModelFamily(o.model), source: 'claude-settings' });
          }
        }
      }
    } catch {
      // Ignore malformed settings
    }
  }

  const localRouters = readOpenCodeRouters(homeDir, checkClis);
  const opencode = [];
  for (const r of localRouters) {
    for (const m of r.models) {
      if (!m.startsWith('velomesh/') && !opencode.some((x) => x.id === m)) {
        opencode.push({
          id: m,
          family: inferModelFamily(m),
          source: `opencode:${r.name}`,
          routerOnline: r.online
        });
      }
    }
  }

  const all = [...codex, ...claude, ...opencode];
  const byId = new Map();
  for (const m of all) {
    if (!byId.has(m.id)) byId.set(m.id, m);
  }

  return {
    codex,
    claude,
    opencode,
    all: [...byId.values()],
    envConfigured: Boolean(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.XAI_API_KEY || env.GEMINI_API_KEY || env.OPENROUTER_API_KEY)
  };
}

export function discoverUpstreams({ env = process.env, homeDir = os.homedir(), checkClis = true, checkNetwork = checkClis } = {}) {
  const apis = {
    anthropic: { configured: Boolean(env.ANTHROPIC_API_KEY), endpoint: PROVIDER_META.anthropic.endpoint },
    openai: { configured: Boolean(env.OPENAI_API_KEY), endpoint: PROVIDER_META.openai.endpoint },
    xai: { configured: Boolean(env.XAI_API_KEY), endpoint: PROVIDER_META.xai.endpoint },
    gemini: { configured: Boolean(env.GEMINI_API_KEY), endpoint: PROVIDER_META.google.endpoint },
    openrouter: { configured: Boolean(env.OPENROUTER_API_KEY), endpoint: PROVIDER_META.openrouter.endpoint }
  };

  const localRouters = readOpenCodeRouters(homeDir, checkNetwork);
  const cliNames = ['claude', 'codex', 'gemini', 'opencode', 'grok'];
  const clis = {};
  for (const cli of cliNames) {
    const bin = checkClis ? resolveCliBinary(cli, env, homeDir) : null;
    clis[cli] = { installed: Boolean(bin), path: bin };
  }

  const platformModels = discoverPlatformModels({ homeDir, env, checkClis: checkNetwork });

  return { apis, localRouters, clis, platformModels };
}

function candidateTransport(candidateModel, upstreams, preferCli) {
  const family = inferModelFamily(candidateModel);
  const meta = PROVIDER_META[family] || PROVIDER_META.openai;
  const apiKeyName = family === 'google' ? 'gemini' : family;
  const hasDirectApi = Boolean(upstreams.apis[apiKeyName]?.configured || upstreams.apis.openrouter?.configured);
  const onlineRouters = upstreams.localRouters.filter((r) => r.baseURL && r.online !== false);
  const matchingRouter =
    onlineRouters.find((r) => r.models.includes(candidateModel)) ||
    onlineRouters.find((r) => r.models.some((m) => m.includes(family === 'google' ? 'gemini' : family === 'anthropic' ? 'claude' : 'gpt'))) ||
    onlineRouters.find((r) => r.models.some((m) => m.includes('auto')));
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
  if (matchingRouter) {
    return {
      selectedModel: candidateModel,
      upstreamModel: mapModelForLocalRouter(candidateModel, matchingRouter),
      selectedFamily: family,
      transport: 'local-router',
      endpoint: matchingRouter.baseURL,
      cliProvider: null
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

function buildPhasePlatformCandidates(phase, upstreams) {
  const base = [...(PHASE_CATALOG[phase]?.primaryCandidates || PHASE_CATALOG.implementation.primaryCandidates)];
  const codexModels = upstreams.platformModels?.codex || [];
  if (!codexModels.length) return base;

  const codexByPhase = (targetPhase) =>
    codexModels
      .filter((m) => m.preferredPhase === targetPhase)
      .sort((a, b) => a.priority - b.priority)
      .map((m) => m.id);

  let phaseSpecific = [];
  if (phase === 'architecture') {
    phaseSpecific = [...codexByPhase('architecture'), ...codexByPhase('implementation')];
  } else if (phase === 'frontend') {
    phaseSpecific = [...codexByPhase('frontend'), ...codexByPhase('architecture')];
  } else if (phase === 'implementation') {
    phaseSpecific = [...codexByPhase('implementation'), ...codexByPhase('frontend')];
  } else if (phase === 'fast') {
    phaseSpecific = [...codexByPhase('fast'), ...codexByPhase('frontend')];
  } else if (phase === 'review') {
    phaseSpecific = [...codexByPhase('review'), ...codexByPhase('architecture'), ...codexByPhase('frontend')];
  }

  // Put discovered Codex models ahead of generic gpt-* placeholders while keeping cross-family APIs/CLIs intact
  const merged = [];
  for (const m of [...base.filter((x) => inferModelFamily(x) !== 'openai'), ...phaseSpecific, ...base]) {
    if (m && !merged.includes(m)) merged.push(m);
  }
  return merged;
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
  checkNetwork = checkClis,
  record = true
} = {}) {
  const virtualModel = normalizeVirtualModel(requestedModel);
  const classification = classifyTurnIntent({ messages, prompt, requestedModel: virtualModel, turnIndex });
  const phase = classification.phase;
  const spec = PHASE_CATALOG[phase] || PHASE_CATALOG.implementation;
  const upstreams = discoverUpstreams({ env, homeDir, checkClis, checkNetwork });

  let orderedCandidates;
  if (!isVirtualModel(virtualModel)) {
    orderedCandidates = [virtualModel, ...buildPhasePlatformCandidates(phase, upstreams).filter((m) => m !== virtualModel)];
  } else {
    orderedCandidates = buildPhasePlatformCandidates(phase, upstreams);
    const prevFam = previousFamily || inferModelFamily(previousModel);
    if (phase === 'review' && prevFam) {
      const crossFamily = orderedCandidates.filter((m) => inferModelFamily(m) !== prevFam);
      const distinctSameFamily = orderedCandidates.filter((m) => inferModelFamily(m) === prevFam && m !== previousModel);
      const exactPrev = previousModel && orderedCandidates.includes(previousModel) ? [previousModel] : [];
      orderedCandidates = [...crossFamily, ...distinctSameFamily, ...exactPrev];
    }
  }

  const resolvedChain = orderedCandidates.map((candidate) => candidateTransport(candidate, upstreams, preferCli));
  const transportRank = (item) => {
    if (preferCli) {
      return item.transport === 'cli' ? 0 : item.transport === 'api' ? 1 : item.transport === 'local-router' ? 2 : 3;
    }
    return item.transport === 'api' ? 0 : item.transport === 'local-router' ? 1 : item.transport === 'cli' ? 2 : 3;
  };

  let primary = resolvedChain[0];
  if (isVirtualModel(virtualModel)) {
    const sortedByAvailability = [...resolvedChain].sort((a, b) => transportRank(a) - transportRank(b));
    if (sortedByAvailability[0] && sortedByAvailability[0].transport !== 'simulator') {
      primary = sortedByAvailability[0];
    }
  } else {
    // Explicit native model keeps requested model at index 0 unless completely unreachable on non-simulator runs
    primary = resolvedChain[0];
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

  const prevFam = previousFamily || inferModelFamily(previousModel);
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
    platformCatalogModels: (upstreams.platformModels?.all || []).slice(0, 16).map((m) => m.id),
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
