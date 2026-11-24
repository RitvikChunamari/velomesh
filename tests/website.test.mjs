import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_DIR = path.resolve(__dirname, '../web');

function readWeb(name) {
  return fs.readFileSync(path.join(WEB_DIR, name), 'utf8');
}

test('website removes all Berger Fohr navbar primitives, floating dock, and geometric symbol grid', () => {
  const html = readWeb('index.html');
  const css = readWeb('styles.css');
  const js = readWeb('app.js');

  for (const forbidden of [
    'bf-floating-dock',
    'primitive-circle',
    'primitive-square',
    'works-index',
    'work-mark-svg',
    'bf-menu-drawer',
    'Open construction grid'
  ]) {
    assert.ok(!html.includes(forbidden), `index.html must not contain ${forbidden}`);
    assert.ok(!css.includes(forbidden), `styles.css must not contain ${forbidden}`);
    assert.ok(!js.includes(forbidden), `app.js must not contain ${forbidden}`);
  }
});

test('website uses curated Cobalt-Iris and semantic phase palette with zero AI-slop tokens', () => {
  const html = readWeb('index.html');
  const css = readWeb('styles.css');
  const js = readWeb('app.js');
  const plCss = readWeb('demos/pulseledger/styles.css');
  const kxCss = readWeb('demos/kinetix/styles.css');

  for (const requiredToken of [
    '--brand: #5b67f1',
    '--brand-solid: #4a55d6',
    '--phase-arch: #9aa5ff',
    '--phase-ui: #5cc8f8',
    '--phase-fast: #eab364',
    '--phase-ok: #4cc38a',
    '--phase-warn: #f07575',
    ".orch-emblem-frame[data-phase='architecture']"
  ]) {
    assert.ok(css.includes(requiredToken), `styles.css must define ${requiredToken}`);
  }

  for (const bannedPattern of [
    '#b8180d',
    '#9e1309',
    '#d97757',
    '#00ff00',
    'background-clip: text',
    'Plus Jakarta Sans',
    'Space Grotesk'
  ]) {
    assert.ok(!css.toLowerCase().includes(bannedPattern.toLowerCase()), `styles.css must not include AI-slop ${bannedPattern}`);
    assert.ok(!plCss.toLowerCase().includes(bannedPattern.toLowerCase()), `pulseledger/styles.css must not include AI-slop ${bannedPattern}`);
    assert.ok(!kxCss.toLowerCase().includes(bannedPattern.toLowerCase()), `kinetix/styles.css must not include AI-slop ${bannedPattern}`);
  }

  assert.ok(html.includes('velomesh-icon-tile.svg'), 'index.html must reference velomesh-icon-tile.svg brand mark');
  assert.ok(js.includes('[115, 126, 248]') && js.toLowerCase().includes('#5b67f1'), 'app.js hero/bento canvas must use curated Cobalt-Iris chroma');
});

test('website renders full 21st.dev Swiss visual sections and preserves workbench and vision clarity gate', () => {
  const html = readWeb('index.html');

  for (const sectionId of [
    'site-navbar',
    'nav-panel-capabilities',
    'nav-panel-harnesses',
    'lattice-mesh-canvas',
    'architecture-bento',
    'model-orchestrator',
    'orch-action-logo',
    'super-tool-lab',
    'prompt-optimizer-console',
    'optimizer-raw-input',
    'optimizer-output-view',
    'hooks-pack-matrix',
    'hook-trace-output',
    'execution-flow',
    'workbench',
    'workbench-live-demo',
    'workbench-demo-frame',
    'vision-spec',
    'closing-cta',
    'site-footer'
  ]) {
    assert.ok(html.includes(`id="${sectionId}"`), `index.html must include section #${sectionId}`);
  }

  assert.ok(html.includes('velomesh/auto'), 'index.html must showcase velomesh/auto virtual model selector');

  // Verify brand assets, favicons, OG image, and all skill thumbnail manifests exist
  for (const brandFile of [
    'velomesh-mark.svg',
    'velomesh-icon-tile.svg',
    'velomesh-wordmark.svg',
    'velomesh-action-badge.svg',
    'favicon-64.png',
    'apple-touch-icon.png',
    'og-card.png'
  ]) {
    assert.ok(fs.existsSync(path.join(WEB_DIR, 'brand', brandFile)), `brand asset ${brandFile} must exist`);
  }

  for (const rootAsset of [
    'assets/logo.svg',
    'assets/velomesh-icon-64.png',
    'assets/velomesh-icon-256.png',
    'assets/velomesh-icon-512.png',
    'agents/openai.yaml',
    'plugin.json',
    '.codex-plugin/plugin.json',
    '.claude-plugin/plugin.json'
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT_DIR, rootAsset)), `root branding file ${rootAsset} must exist`);
  }

  for (const skillName of [
    'prompt-architect',
    'rtk-token-diet',
    'supabase-rls-architect',
    'cloudflare-edge-workers',
    'stripe-webhooks-billing',
    'agent-hook-engineering'
  ]) {
    const skillDir = path.join(ROOT_DIR, 'skills', skillName);
    for (const rel of ['assets/logo.svg', 'assets/velomesh-icon-64.png', 'assets/velomesh-icon-256.png', 'agents/openai.yaml']) {
      assert.ok(fs.existsSync(path.join(skillDir, rel)), `skill ${skillName} must contain ${rel}`);
    }
  }

  // Verify embedded PulseLedger live demo assets exist and use Mercury Indigo + Emerald tokens
  const demoHtml = readWeb('demos/pulseledger/index.html');
  const demoCss = readWeb('demos/pulseledger/styles.css');
  const demoJs = readWeb('demos/pulseledger/app.js');
  for (const demoId of ['pl-navbar', 'pl-kpi-strip', 'pl-runway-canvas', 'pl-ledger-table', 'pl-btn-rls-attack']) {
    assert.ok(demoHtml.includes(`id="${demoId}"`), `PulseLedger demo must include #${demoId}`);
  }
  assert.ok(demoHtml.includes('velomesh-icon-tile.svg'), 'PulseLedger must include VeloMesh brand icon');
  assert.ok(demoCss.includes('--bg: #070a0f') && demoCss.includes('--pl-accent:') && demoCss.includes('--pl-pos:'), 'PulseLedger styles must use Navy-Slate + Mercury Indigo + Emerald palette');
  assert.ok(demoJs.includes('stepSpring') || demoJs.includes('tickSpring'), 'PulseLedger must implement damped spring cashflow physics');

  // Verify embedded Kinetix live demo assets exist and use Darkmatter Copper-Amber + Spectral Cyan tokens
  const kxHtml = readWeb('demos/kinetix/index.html');
  const kxCss = readWeb('demos/kinetix/styles.css');
  const kxJs = readWeb('demos/kinetix/app.js');
  for (const kxId of ['kx-navbar', 'kx-shader-canvas', 'kx-revision-table', 'kx-btn-r2-upload', 'kx-btn-crdt-conflict']) {
    assert.ok(kxHtml.includes(`id="${kxId}"`), `Kinetix demo must include #${kxId}`);
  }
  assert.ok(kxHtml.includes('velomesh-icon-tile.svg'), 'Kinetix must include VeloMesh brand icon');
  assert.ok(kxCss.includes('--bg: #09090c') && kxCss.includes('--kx-accent-solid:') && kxCss.includes('--kx-cyan:'), 'Kinetix styles must use Precision Carbon + Copper-Amber + Spectral Cyan palette');
  assert.ok(kxJs.includes('projectMomentum') && kxJs.includes('commitPostgresRevision'), 'Kinetix must implement momentum projection and revision commits');
});
