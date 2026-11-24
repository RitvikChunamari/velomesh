import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_ITEMS = 6000;
const EXCLUDE = new Set(['agent-fusion', 'unified-orchestrator', 'master-orchestrator']);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_SKILLS_DIR = path.resolve(__dirname, '../skills');

export const DOMAINS = {
  frontend: /frontend|front.end|react|vue|svelte|next.?js|css|html|component|layout|\bui\b|interface|website|tailwind|swiss|bento|navbar/i,
  design: /design|\bux\b|figma|typograph|animat|gsap|motion|visual|accessibil|a11y|impeccable/i,
  backend: /backend|back.end|server|\bapi\b|graphql|auth|database|postgres|supabase|\bsql\b|\brls\b|endpoint|stripe|webhook/i,
  security: /security|vulnerab|audit|permission|privacy|threat|secret|owasp|gitleaks|guard/i,
  testing: /\btest\b|testing|\bqa\b|verif|playwright|vitest|jest|bug|debug|regression|pytest/i,
  performance: /performance|optimi|speed|latency|profil|bundle|memory|web.vitals|rtk|token/i,
  research: /research|investigat|compare|explore|analys|document|codebase/i,
  infrastructure: /deploy|devops|docker|kubernetes|infrastructure|ci\/cd|cloud|hosting|cloudflare|worker|edge|r2/i,
  architecture: /architect|refactor|system.design|migration|scalab|structure|prompt/i,
  documentation: /documentation|readme|technical.writ|guide|explain/i
};

export function parseFrontmatter(src) {
  const m = String(src).match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|\s*$)/);
  if (!m) return {};
  const out = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    let v = match[2];
    if (/^[>|][+-]?$/.test(v)) {
      const parts = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || lines[i + 1] === '')) {
        const p = lines[++i].trim();
        if (p) parts.push(p);
      }
      v = parts.join(' ');
    }
    if (v.startsWith('[') && v.endsWith(']')) {
      out[match[1]] = v.slice(1, -1).split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else if (v === 'true' || v === 'false') {
      out[match[1]] = v === 'true';
    } else {
      out[match[1]] = v.replace(/^(['"])([\s\S]*)\1$/, '$2');
    }
  }
  return out;
}

function safeStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function addFolder(base, kind, host, scope, out, { suffix = '.md' } = {}) {
  if (!base || out.length >= MAX_ITEMS) return;
  const baseStat = safeStat(base);
  if (!baseStat || !baseStat.isDirectory()) return;
  try {
    for (const e of fs.readdirSync(base, { withFileTypes: true })) {
      if (out.length >= MAX_ITEMS) break;
      if (e.name.startsWith('.')) continue;
      const p = path.join(base, e.name);
      const st = safeStat(p);
      if (!st) continue;
      if (kind === 'skill' && st.isDirectory()) {
        const skillFile = path.join(p, 'SKILL.md');
        const skillStat = safeStat(skillFile);
        if (skillStat && skillStat.isFile()) {
          out.push({ path: skillFile, host, scope });
        }
      }
      if (kind === 'agent' && st.isFile() && e.name.endsWith(suffix)) {
        out.push({ path: p, host, scope });
      }
      if (kind === 'agent' && st.isDirectory()) {
        const agentFile = path.join(p, 'agent.md');
        const agentStat = safeStat(agentFile);
        if (agentStat && agentStat.isFile()) {
          out.push({ path: agentFile, host, scope });
        }
      }
    }
  } catch {
    // Absent or inaccessible
  }
}

function pluginFolders(root, kind, host, scope, out, depth = 0, visited = new Set()) {
  if (!root || depth > 5 || out.length >= MAX_ITEMS) return;
  const st = safeStat(root);
  if (!st || !st.isDirectory()) return;
  let real;
  try {
    real = fs.realpathSync(root);
  } catch {
    return;
  }
  if (visited.has(real)) return;
  visited.add(real);

  try {
    for (const e of fs.readdirSync(root, { withFileTypes: true })) {
      if (out.length >= MAX_ITEMS) break;
      if (e.name.startsWith('.') || e.name === 'agent-fusion' || e.name === 'node_modules') continue;
      const full = path.join(root, e.name);
      const est = safeStat(full);
      if (!est || !est.isDirectory()) continue;
      const targetSub = kind === 'agent' ? 'agents' : 'skills';
      if (e.name === targetSub) {
        addFolder(full, kind, host, `${scope}-plugin`, out);
      } else {
        pluginFolders(full, kind, host, scope, out, depth + 1, visited);
      }
    }
  } catch {
    // Ignore inaccessible plugin directory
  }
}

function roots(workspacePath, kind, homeDir = os.homedir()) {
  const ws = typeof workspacePath === 'string' && path.isAbsolute(workspacePath) ? path.resolve(workspacePath) : null;
  const out = [];
  const put = (host, scope, root, { suffix } = {}) => {
    if (root) addFolder(root, kind, host, scope, out, { suffix });
  };
  const add = (host, globalRel, projectRel) => {
    put(host, 'workspace', ws && path.join(ws, projectRel));
    put(host, 'global', path.join(homeDir, globalRel));
  };

  if (kind === 'skill') {
    put('velomesh-bundled', 'builtin', REPO_SKILLS_DIR);
    put('velomesh-hub', 'global', path.join(homeDir, '.agent-fusion', 'skill-hub-v4', 'skills'));
    put('codex', 'global', path.join(homeDir, '.codex', 'skills'));
    pluginFolders(path.join(homeDir, '.codex', 'plugins'), 'skill', 'codex', 'global', out);
    put('copilot', 'global', path.join(homeDir, '.copilot', 'skills'));
    put('copilot', 'workspace', ws && path.join(ws, '.github', 'skills'));
    put('antigravity', 'builtin', path.join(homeDir, '.gemini', 'antigravity', 'builtin', 'skills'));
    put('portable', 'global', path.join(homeDir, '.agents', 'skills'));
    put('portable', 'workspace', ws && path.join(ws, '.agents', 'skills'));
  }

  add('antigravity', `.gemini/config/${kind === 'agent' ? 'agents' : 'skills'}`, `.agents/${kind === 'agent' ? 'agents' : 'skills'}`);
  if (ws) pluginFolders(path.join(ws, '.agents', 'plugins'), kind, 'antigravity', 'workspace', out);
  pluginFolders(path.join(homeDir, '.gemini', 'config', 'plugins'), kind, 'antigravity', 'global', out);

  add('claude', `.claude/${kind === 'agent' ? 'agents' : 'skills'}`, `.claude/${kind === 'agent' ? 'agents' : 'skills'}`);
  pluginFolders(path.join(homeDir, '.claude', 'plugins'), kind, 'claude', 'global', out);

  add('gemini', `.gemini/${kind === 'agent' ? 'agents' : 'skills'}`, `.gemini/${kind === 'agent' ? 'agents' : 'skills'}`);
  add('opencode', `.config/opencode/${kind === 'agent' ? 'agents' : 'skills'}`, `.opencode/${kind === 'agent' ? 'agents' : 'skills'}`);
  add('cursor', `.cursor/${kind === 'agent' ? 'agents' : 'skills'}`, `.cursor/${kind === 'agent' ? 'agents' : 'skills'}`);

  if (kind === 'agent') {
    put('copilot', 'workspace', ws && path.join(ws, '.github', 'agents'), { suffix: '.agent.md' });
  }
  return out;
}

function meta(file) {
  try {
    const s = fs.statSync(file);
    if (!s.isFile() || s.size > 131072) return {};
    return parseFrontmatter(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

const ident = (s) => /^[a-z0-9][a-z0-9._-]{0,63}$/.test(s);

export function discover(workspacePath, { homeDir = os.homedir() } = {}) {
  const agents = [];
  const skills = [];
  const seenA = new Set();
  const seenS = new Set();

  for (const f of roots(workspacePath, 'agent', homeDir)) {
    const m = meta(f.path);
    const fallback = path.basename(f.path) === 'agent.md'
      ? path.basename(path.dirname(f.path))
      : path.basename(f.path).replace(/\.agent\.md$|\.md$/, '');
    const name = String(m.name || fallback).trim().toLowerCase();
    const key = `${f.host}:${name}`;
    if (!ident(name) || EXCLUDE.has(name) || seenA.has(key)) continue;
    seenA.add(key);
    agents.push({
      id: key,
      host: f.host,
      name,
      description: String(m.description || '').replace(/[\r\n\t\x00-\x1f]/g, ' ').slice(0, 700),
      eligible: m.subagent !== false && m.mode !== 'primary',
      model: String(m.model || 'inherit').slice(0, 80),
      scope: f.scope,
      execution: f.host === 'antigravity' ? 'native-only' : 'requires-host-or-worker-adapter',
      source: f.path
    });
  }

  for (const f of roots(workspacePath, 'skill', homeDir)) {
    const m = meta(f.path);
    const name = String(m.name || path.basename(path.dirname(f.path))).trim().toLowerCase();
    const key = `${f.host}:${name}`;
    if (!ident(name) || seenS.has(key)) continue;
    seenS.add(key);
    let canonicalPath = f.path;
    try {
      canonicalPath = fs.realpathSync(f.path);
    } catch {
      canonicalPath = f.path;
    }
    skills.push({
      id: key,
      name,
      host: f.host,
      scope: f.scope,
      description: String(m.description || '').replace(/[\r\n\t\x00-\x1f]/g, ' ').slice(0, 400),
      path: f.path,
      canonicalPath
    });
  }

  const uniqueSkills = new Set(skills.map((s) => s.name)).size;
  return {
    agents,
    skills,
    uniqueSkillCount: uniqueSkills,
    hosts: [...new Set([...agents.map((a) => a.host), ...skills.map((s) => s.host)])].sort()
  };
}

export function rankSkills(prompt, skills = [], { currentHost = 'antigravity', limit = 8 } = {}) {
  const clean = String(prompt || '').trim();
  if (!clean || !Array.isArray(skills) || !skills.length) return [];

  const qTokens = new Set(
    clean.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  );
  const promptDomains = Object.entries(DOMAINS)
    .filter(([, re]) => re.test(clean))
    .map(([k]) => k);

  const byName = new Map();
  for (const s of skills) {
    if (!s || !s.name || s.name === 'velomesh') continue;
    let bucket = byName.get(s.name);
    if (!bucket) {
      bucket = {
        name: s.name,
        description: s.description || '',
        hosts: new Set(),
        scopes: new Set(),
        path: s.path || s.canonicalPath || ''
      };
      byName.set(s.name, bucket);
    }
    if (s.host) bucket.hosts.add(s.host);
    if (s.scope) bucket.scopes.add(s.scope);
    if (!bucket.description && s.description) bucket.description = s.description;
  }

  const ranked = [];
  for (const item of byName.values()) {
    const titleTokens = new Set(item.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
    const descTokens = new Set(item.description.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
    let score = 0;
    let lexicalHits = 0;
    for (const t of qTokens) {
      if (titleTokens.has(t)) {
        score += 7;
        lexicalHits += 1;
      } else if (descTokens.has(t)) {
        score += 3;
        lexicalHits += 1;
      }
    }
    const matchedDomains = [];
    const hay = `${item.name} ${item.description}`;
    for (const d of promptDomains) {
      if (DOMAINS[d].test(hay)) {
        matchedDomains.push(d);
        if (lexicalHits > 0) score += 2.5;
      }
    }
    if (score <= 0) continue;
    const hostList = [...item.hosts].sort();
    if (currentHost && item.hosts.has(currentHost)) score += 1.5;
    ranked.push({
      name: item.name,
      description: item.description.slice(0, 200),
      hosts: hostList,
      scopes: [...item.scopes].sort(),
      path: item.path,
      matchedDomains,
      score: Number(score.toFixed(2))
    });
  }

  return ranked
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}
