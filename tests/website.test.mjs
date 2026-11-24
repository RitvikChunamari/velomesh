import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

test('website uses strict black and white monochrome palette with zero chromatic accents', () => {
  const css = readWeb('styles.css');
  const js = readWeb('app.js');

  for (const chromaticHex of [
    '#b8180d',
    '#9e1309',
    '#ff3b2f',
    '#eec768',
    '#3dd68c',
    '#ff6b61',
    '#092216',
    '#290c0c',
    '#125c3a',
    '#a61c2d'
  ]) {
    assert.ok(!css.toLowerCase().includes(chromaticHex), `styles.css must not use chromatic hex ${chromaticHex}`);
  }

  // Ensure canvas JS renderers only emit neutral grayscale RGB values
  assert.ok(!js.includes('[184, 24, 13]'), 'app.js halftone warm color must be pure monochrome');
  assert.ok(!js.includes('[255, 59, 47]'), 'app.js halftone/lattice pulse color must be pure monochrome');
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
  assert.ok(fs.existsSync(path.join(WEB_DIR, 'brand', 'velomesh-action-badge.svg')), 'monochrome action badge SVG must exist');

  // Verify embedded PulseLedger live demo assets exist and follow B&W Swiss standard
  const demoHtml = readWeb('demos/pulseledger/index.html');
  const demoCss = readWeb('demos/pulseledger/styles.css');
  const demoJs = readWeb('demos/pulseledger/app.js');
  for (const demoId of ['pl-navbar', 'pl-kpi-strip', 'pl-runway-canvas', 'pl-ledger-table', 'pl-btn-rls-attack']) {
    assert.ok(demoHtml.includes(`id="${demoId}"`), `PulseLedger demo must include #${demoId}`);
  }
  assert.ok(demoCss.includes('--bg: #070708'), 'PulseLedger styles must use monochrome Swiss palette');
  assert.ok(demoJs.includes('stepSpring') || demoJs.includes('tickSpring'), 'PulseLedger must implement damped spring cashflow physics');

  // Verify embedded Kinetix live demo assets exist and follow B&W Swiss standard
  const kxHtml = readWeb('demos/kinetix/index.html');
  const kxCss = readWeb('demos/kinetix/styles.css');
  const kxJs = readWeb('demos/kinetix/app.js');
  for (const kxId of ['kx-navbar', 'kx-shader-canvas', 'kx-revision-table', 'kx-btn-r2-upload', 'kx-btn-crdt-conflict']) {
    assert.ok(kxHtml.includes(`id="${kxId}"`), `Kinetix demo must include #${kxId}`);
  }
  assert.ok(kxCss.includes('--bg: #070708'), 'Kinetix styles must use monochrome Swiss palette');
  assert.ok(kxJs.includes('projectMomentum') && kxJs.includes('commitPostgresRevision'), 'Kinetix must implement momentum projection and revision commits');
});
