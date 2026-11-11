import test from 'node:test';
import assert from 'node:assert/strict';
import { call } from '../scripts/mcp-server.mjs';

test('MCP server handles empty query safely without crashing', async () => {
  const result = await call('discover_and_install_capability', { query: '' });
  assert.ok(result);
  // Should handle gracefully without throwing unhandled exceptions
  assert.ok(result.status !== undefined || result.error !== undefined || result.output !== undefined);
});

test('MCP server handles nonexistent tool call with clear error', async () => {
  await assert.rejects(
    async () => {
      await call('nonexistent_tool_12345', {});
    },
    /Unknown tool: nonexistent_tool_12345/
  );
});

test('MCP server handles search_online_capabilities with invalid kind gracefully', async () => {
  const result = await call('search_online_capabilities', { query: 'react', kind: 'invalid-kind' });
  assert.ok(result);
});
