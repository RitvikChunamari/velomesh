# Contributing to VeloMesh

Thank you for contributing to VeloMesh!

## Development Guidelines

1. **Zero External Dependencies:** Core code must run on standard Python 3.9+ and Node.js 18+ without requiring pip or npm packages.
2. **Test-Driven Development (TDD):** Every bugfix, feature, and security control must have a failing test written before implementation code.
3. **Multi-Harness Verification:** Verify that any changes preserve compatibility across all 6 supported harnesses: Claude Code, Codex, Cursor, GitHub Copilot, Antigravity, and OpenCode.
4. **Security First:** Never weaken path sanitization or symlink safety checks.

## Running Tests

```bash
# Python test suite
python3 tests/test_velomesh.py

# Node.js test suite
node --test tests/*.test.mjs
```
