import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const HOOKS_SCRIPT = '/Users/ritvik/.gemini/config/plugins/agent-fusion/scripts/hooks.mjs';

test('hooks.mjs outputs active instructions on PreInvocation even without workspace', async () => {
  const child = spawn('node', [HOOKS_SCRIPT, 'invocation']);

  const payload = JSON.stringify({
    invocationNum: 3,
    workspacePaths: [],
    prompt: 'Build a secure authentication API and frontend UI'
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
  assert.ok(msg.includes('Agent Fusion Universal v4'), 'Must identify as Agent Fusion Universal v4');
  assert.ok(msg.includes('fusion_start') || msg.includes('discover_and_install_capability'), 'Must contain routing guidance');
});
