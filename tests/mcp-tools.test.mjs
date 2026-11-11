import test from 'node:test';
import assert from 'node:assert/strict';
import { tools } from '../scripts/mcp-server.mjs';

test('MCP server registers discover_and_install_capability tool', () => {
  const tool = tools.find(t => t.name === 'discover_and_install_capability');
  assert.ok(tool, 'discover_and_install_capability tool must be registered');
  assert.equal(tool.inputSchema.properties.query.type, 'string');
});

test('MCP server registers search_online_capabilities tool', () => {
  const tool = tools.find(t => t.name === 'search_online_capabilities');
  assert.ok(tool, 'search_online_capabilities tool must be registered');
  assert.equal(tool.inputSchema.properties.query.type, 'string');
});
