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
    'execution-flow',
    'workbench',
    'vision-spec',
    'closing-cta',
    'site-footer'
  ]) {
    assert.ok(html.includes(`id="${sectionId}"`), `index.html must include section #${sectionId}`);
  }
});
