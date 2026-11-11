import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOKS_SCRIPT = path.resolve(__dirname, '../scripts/hooks.mjs');

test('hooks.mjs outputs active instructions on PreInvocation even without workspace', async () => {
  const child = spawn('node', [HOOKS_SCRIPT, 'invocation']);

  const payload = JSON.stringify({
    invocationNum: 3,
    workspacePaths: [],
    prompt: 'Build a secure authentication API, PostgreSQL database schema, and Awwwards-grade frontend UI for a multi-tenant developer billing platform'
  });

  child.stdin.write(payload);
  child.stdin.end();

  let out = '';
  for await (const chunk of child.stdout) {
    out += chunk;
  }

  const res = JSON.parse(out.trim());
  assert.ok(res.injectSteps && res.injectSteps.length > 0, 'Must inject steps on invocation > 0');
  const msg = res.injectSteps[0].ephemeralMessage;
  assert.ok(msg.includes('Agent Fusion Universal v4') || msg.includes('VeloMesh'), 'Must identify as VeloMesh / Agent Fusion Universal v4');
  assert.ok(msg.includes('fusion_start') || msg.includes('discover_and_install_capability'), 'Must contain routing guidance');
  assert.ok(msg.toLowerCase().includes('vision') || msg.toLowerCase().includes('brain'), 'Must include vision elaboration guidance');
});

test('hooks.mjs flags underspecified vague prompts for vision elaboration', async () => {
  const child = spawn('node', [HOOKS_SCRIPT, 'invocation']);

  const payload = JSON.stringify({
    invocationNum: 1,
    workspacePaths: [],
    prompt: 'make an app'
  });

  child.stdin.write(payload);
  child.stdin.end();

  let out = '';
  for await (const chunk of child.stdout) {
    out += chunk;
  }

  const res = JSON.parse(out.trim());
  const msg = res.injectSteps[0].ephemeralMessage;
  assert.ok(msg.includes('NEEDS_ELABORATION') || msg.includes('cannot read the user'), 'Must flag vague prompt for vision elaboration');
});
