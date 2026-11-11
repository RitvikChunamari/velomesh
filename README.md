<div align="center">

# ⚡ VeloMesh

**Universal Zero-Latency Capability Mesh & Autonomous Skill Router for AI Coding Agents**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)
[![Tests Passing](https://img.shields.io/badge/tests-100%25%20passing-brightgreen.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-orange.svg)](CONTRIBUTING.md)

*Connects Claude Code, Codex, Cursor, GitHub Copilot, Antigravity, and OpenCode into one cohesive, self-routing agent mesh.*

[Features](#-key-features) • [Architecture](#-architecture) • [Quickstart](#-quickstart) • [Harness Support](#-multi-harness-support) • [Comparison](#-comparison) • [Security](#-security--sandboxing)

---

</div>

## 🚀 What is VeloMesh?

**VeloMesh** is an open-source, zero-dependency capability router and on-the-fly provisioning mesh for AI coding agents. 

Developers using modern coding assistants (like Claude Code, Codex, Cursor, and Copilot) face a constant struggle with **context bloat**, **manual skill invocation**, and **fragmented tools**. You shouldn't have to manually prompt `/using-superpowers` or copy rules between different editors.

**VeloMesh solves this permanently:**
1. **Always-On Autonomous Orchestration:** Evaluates your natural language prompt on every turn and automatically invokes the exact right skills—without manual slash commands.
2. **Smart Dynamic Linking:** Pre-links high-priority core skills while maintaining an extensive local library (ECC, Superpowers, Design Systems, MCPs) that hot-links on demand to prevent system prompt context budget exhaustion.
3. **On-the-Fly Internet Provisioning:** When a task demands an uninstalled library, API, or MCP server, VeloMesh queries the ecosystem, verifies the source, safely clones it, and hot-links it across all your active editor harnesses in seconds.

---

## 🏛 Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      User Natural Language Prompt                      │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        VeloMesh Always-On Hook                         │
 │           PreInvocation Router & Dynamic Specialist Matcher             │
 └───────┬───────────────────────────┬────────────────────────────┬───────┘
         │                           │                            │
         ▼                           ▼                            ▼
 ┌─────────────────┐       ┌─────────────────┐       ┌────────────────────┐
 │  Local Library  │       │ Dynamic Linking │       │ On-the-Fly Web/MCP │
 │ 398+ Validated  │◄─────►│ Core Pre-links  │◄─────►│ GitHub & Registry  │
 │ Portable Skills │       │ Anti-Saturation │       │ Auto-Provisioning  │
 └─────────────────┘       └─────────────────┘       └────────────────────┘
         │                           │                            │
         └───────────────────────────┼────────────────────────────┘
                                     │ (Hot-linked symlinks & rules)
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                       Unified Multi-Harness Mesh                       │
 │  Claude Code  │   Codex   │  Cursor (.mdc)  │  Copilot  │  Antigravity │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **🌐 Global Multi-Harness Sync:** Simultaneously synchronizes declarative skills across:
  - **Claude Code** (`~/.claude/skills`)
  - **Codex CLI** (`~/.codex/skills` & `~/.agents/skills`)
  - **Cursor IDE** (`~/.cursor/skills`, `~/.cursorrules`, and `.cursor/rules/*.mdc`)
  - **GitHub Copilot** (`~/.copilot/skills` & workspace agent rules)
  - **Antigravity App** (`~/.gemini/config/skills`)
  - **OpenCode** (`~/.config/opencode/skills`)
- **📦 Pre-Integrated Top Ecosystem Repositories:**
  - Full **Everything Claude Code (`affaan-m/ECC`)** — 300+ battle-tested engineering playbooks.
  - Full **Superpowers (`obra/superpowers`)** — TDD, plan execution, brainstorming, and systematic debugging.
  - **Awesome DESIGN.md (`VoltAgent/awesome-design-md`)** — 86+ brand design guidelines (Apple, Linear, Stripe, Vercel).
  - Official & Community MCP Server Catalogs (`modelcontextprotocol/servers`, `punkpeye/awesome-mcp-servers`).
- **🛡 Zero Unsafe Execution:** No arbitrary shell scripts or binaries executed during discovery. Strictly copies declarative `SKILL.md` bundles, reference documentation, and tool contracts.
- **⚡ Zero External Dependencies:** Core runs on standard Python 3.9+ and Node.js 18+ (ES modules) with zero pip or npm installs required.

---

## 📊 Comparison

| Feature | Standard Coding Assistant | Raw Skill Plugins | **VeloMesh** |
| :--- | :---: | :---: | :---: |
| **Skill Selection** | Manual prompts only | Manual slash commands | **Autonomous on every prompt** |
| **Cross-Harness Sync** | ❌ Walled garden | ❌ Single tool only | **6 Harnesses simultaneously** |
| **Context Window Protection** | ❌ Drops/truncates skills | ❌ Prompts overflow | **Smart Dynamic Hot-Linking** |
| **On-the-Fly Web Discovery** | ❌ Fails on missing tools | ❌ Manual setup | **Auto-downloads & hot-links** |
| **MCP Schema Generation** | ❌ Manual config | ❌ Manual JSON edits | **Automatic declarative wrappers** |
| **Path Traversal Protection** | ⚠️ Varies | ⚠️ Unsanitized | **Strict regex & sandboxed copy** |

---

## ⚡ Quickstart

### 1. Installation

Clone and initialize VeloMesh in seconds:

```bash
git clone https://github.com/RitvikChunamari/velomesh.git ~/.velomesh
cd ~/.velomesh

# Run initial setup and link core skills globally
python3 scripts/velomesh.py setup --profile recommended --yes
```

### 2. Verify Your Harnesses

Check your active multi-harness links:

```bash
python3 scripts/velomesh.py status
```

### 3. CLI Commands

```bash
# Sync installed skills across all 6 harnesses
python3 scripts/velomesh.py sync

# Hot-link a specific skill or fetch from GitHub on the fly
python3 scripts/velomesh.py install-skill "react-testing"
python3 scripts/velomesh.py install-skill "owner/repo"

# Search GitHub and MCP catalogs for capabilities
python3 scripts/velomesh.py discover "postgres optimization"

# Cleanly remove managed rules (rollback anytime)
python3 scripts/velomesh.py uninstall-rules
```

---

## 🔌 Model Context Protocol (MCP) Integration

VeloMesh exposes an official MCP server for dynamic session capability resolution:

```json
{
  "mcpServers": {
    "velomesh": {
      "command": "node",
      "args": ["~/.velomesh/scripts/mcp-server.mjs"]
    }
  }
}
```

### MCP Tools:
- `discover_and_install_capability`: Autonomously searches online, validates security, and hot-links candidate skills/MCPs during a live conversation.
- `search_online_capabilities`: Searches GitHub and curated catalogs without installing.
- `fusion_start`: One-call orchestration bootstrap providing dependency-aware task routing and persistent project memory.

---

## 🔒 Security & Sandboxing

VeloMesh adheres to strict supply-chain and execution security standards:
- **No Remote Code Execution:** Downloaded repositories are never executed (`postinstall`, make, or setup scripts are ignored). Only declarative Markdown bundles (`SKILL.md`) are extracted.
- **Path Traversal Sanitization:** All skill identifiers are validated against `^[a-z0-9]+(?:-[a-z0-9]+)*$` with strict checks blocking `..`, slashes, and control characters.
- **Symlink Defense:** Safe-copy never follows external symlinks from downloaded checkouts (`followlinks=False`), preventing directory escape attacks.
- **Resource Constraints:** Caps files at 150KB per `SKILL.md` and 12MB / 250 files per skill directory.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and check out our [SECURITY.md](SECURITY.md) guidelines.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
