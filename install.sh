#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/RitvikChunamari/velomesh.git"
INSTALL_DIR="${VELOMESH_HOME:-$HOME/.velomesh}"

echo "⚡ Installing VeloMesh — Autonomous Universal AI Agent Orchestrator..."

if ! command -v git >/dev/null 2>&1; then
  echo "❌ Error: git is required. Please install git and re-run." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Error: python3 is required. Please install Python 3.9+ and re-run." >&2
  exit 1
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "🔄 Updating existing VeloMesh installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" fetch --depth 1 origin main >/dev/null 2>&1 || true
  git -C "$INSTALL_DIR" reset --hard origin/main >/dev/null 2>&1 || true
else
  echo "📥 Cloning VeloMesh into $INSTALL_DIR..."
  rm -rf "$INSTALL_DIR"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

chmod +x "$INSTALL_DIR/scripts/velomesh.py" "$INSTALL_DIR/scripts/install.mjs" 2>/dev/null || true

if command -v node >/dev/null 2>&1; then
  echo "🔌 Wiring MCP server & always-on hooks across AI coding harnesses..."
  node "$INSTALL_DIR/scripts/install.mjs" --all || true
fi

echo "🧠 Provisioning 398+ skills & auto-configuring harnesses (Smart Dynamic Linking)..."
python3 "$INSTALL_DIR/scripts/velomesh.py" setup --profile recommended --yes

# Create global CLI convenience command (optional, since VeloMesh runs automatically)
mkdir -p "$HOME/.local/bin"
ln -sf "$INSTALL_DIR/scripts/velomesh.py" "$HOME/.local/bin/velomesh"
if [ -d "/opt/homebrew/bin" ] && [ -w "/opt/homebrew/bin" ]; then
  ln -sf "$INSTALL_DIR/scripts/velomesh.py" "/opt/homebrew/bin/velomesh"
elif [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
  ln -sf "$INSTALL_DIR/scripts/velomesh.py" "/usr/local/bin/velomesh"
fi

echo ""
echo "========================================================================"
echo "✅ VeloMesh is installed and active globally across all your AI agents!"
echo "✨ HOW TO USE: Do nothing! Just open Claude Code, Cursor, Codex,"
echo "   GitHub Copilot, Antigravity, or OpenCode and prompt normally."
echo "   VeloMesh runs 100% automatically in the background on every prompt."
echo "========================================================================"
