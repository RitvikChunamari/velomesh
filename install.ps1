$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/RitvikChunamari/velomesh.git"
$InstallDir = if ($env:VELOMESH_HOME) { $env:VELOMESH_HOME } else { Join-Path $HOME ".velomesh" }

Write-Host "⚡ Installing VeloMesh — Autonomous Universal AI Agent Orchestrator..." -ForegroundColor Cyan

if (Test-Path (Join-Path $InstallDir ".git")) {
    Write-Host "🔄 Updating existing VeloMesh installation at $InstallDir..."
    git -C $InstallDir pull --ff-only
} else {
    Write-Host "📥 Cloning VeloMesh into $InstallDir..."
    if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
    git clone --depth 1 $RepoUrl $InstallDir
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "🔌 Wiring MCP server & always-on hooks across AI coding harnesses..."
    node (Join-Path $InstallDir "scripts\install.mjs") --all
}

Write-Host "🧠 Provisioning 398+ skills & auto-configuring harnesses..."
python (Join-Path $InstallDir "scripts\velomesh.py") setup --profile recommended --yes

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "✅ VeloMesh is installed and active globally across all your AI agents!" -ForegroundColor Green
Write-Host "✨ HOW TO USE: Do nothing! Open Claude Code, Cursor, Codex, Copilot,"
Write-Host "   Antigravity, or OpenCode and prompt normally."
Write-Host "========================================================================" -ForegroundColor Green
