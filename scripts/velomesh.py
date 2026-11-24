#!/usr/bin/env python3
"""VeloMesh: Universal Zero-Latency Capability Mesh & Autonomous Skill Router for AI Coding Agents.

Seamlessly provisions, routes, and hot-links skills, tools, and MCP servers across
Claude Code, Codex, GitHub Copilot, Cursor, Antigravity, and OpenCode.
"""
from __future__ import annotations
import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent.parent
CATALOG_PATH = BUNDLE / "references" / "catalog.json"
HOME = Path.home()
ROOT = Path(os.environ.get("VELOMESH_HUB", os.environ.get("AGENT_FUSION_HUB", str(HOME / ".agent-fusion" / "skill-hub-v4")))).expanduser()
LIB = ROOT / "skills"
REPOS = ROOT / "repos"
MANIFEST = ROOT / "manifest.json"
LEVELS = {"core": 0, "recommended": 1, "everything": 2}
TARGETS = {
    "codex": HOME / ".codex" / "skills",
    "codex-agents": HOME / ".agents" / "skills",
    "claude-code": HOME / ".claude" / "skills",
    "github-copilot": HOME / ".copilot" / "skills",
    "antigravity-app": HOME / ".gemini" / "config" / "skills",
    "opencode": HOME / ".config" / "opencode" / "skills",
    "cursor": HOME / ".cursor" / "skills",
}

CORE_SKILLS = {
    # Superpowers workflows
    "using-superpowers",
    "test-driven-development",
    "executing-plans",
    "writing-plans",
    "brainstorming",
    "dispatching-parallel-agents",
    "finishing-a-development-branch",
    "requesting-code-review",
    "subagent-driven-development",
    "systematic-debugging",
    "using-git-worktrees",
    "verification-before-completion",
    # ECC core engineering & review
    "security-review",
    "frontend-design",
    "backend-patterns",
    "codebase-onboarding",
    "agentic-engineering",
    "conventional-commit-review",
    "root-cause-debugger",
    "performance-lab",
    "api-connector-builder",
    "context-engineering",
    "web-design-guidelines",
    "design-system-forge",
    "diagnosing-bugs",
    # High-impact design, UI and motion
    "impeccable",
    "hallmark",
    "ui-ux-pro-max",
    "taste-skill",
    "emil-design-eng",
    "gsap-core",
    "gsap-scrolltrigger",
    "gsap-react",
    "design-system-references",
    "agent-fusion-orchestrator",
}


def is_core_skill(name: str) -> bool:
    clean = name.strip().lower()
    if clean in CORE_SKILLS:
        return True
    if any(k in clean for k in ("superpowers", "tdd", "test-driven", "executing-plans", "writing-plans", "brainstorming", "security-review")):
        return True
    return False

VALID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SKIP_PARTS = {".git", "node_modules", "vendor", ".venv", "site-packages", "tests", "test", "fixtures", "examples", "docs"}
SAFE_COPY_SKIP = {".git", "node_modules", ".venv", "__pycache__"}
MATCH = ("frontend", "design", "animation", "debug", "test", "security", "architecture", "review", "performance", "research", "planning", "context", "memory", "mcp", "typescript", "react", "python", "verification", "documentation", "workflow", "accessibility", "skill")
MANAGED_MARKER = ".agent-fusion-managed-v4"


def say(msg):
    print(msg, flush=True)


def catalog():
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def load_state():
    if not MANIFEST.is_file():
        return {"schema": 1, "skills": {}, "links": {}, "sources": {}}
    try:
        state = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeError, OSError):
        say("  Warning: Corrupted manifest.json encountered; recovering safely.")
        return {"schema": 1, "skills": {}, "links": {}, "sources": {}}
    for field in ("skills", "links", "sources"):
        state.setdefault(field, {})
    return state


def save_state(state):
    ROOT.mkdir(parents=True, exist_ok=True)
    state["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    temp = MANIFEST.with_suffix(".tmp")
    temp.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")
    temp.replace(MANIFEST)


def repo_path(repo):
    return REPOS / repo.replace("/", "__").lower()


def git(*args, timeout=180):
    return subprocess.run(["git", *map(str, args)], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)


def fetch_repo(repo, allow_network=True):
    dest = repo_path(repo)
    if dest.exists() and not (dest / ".git").is_dir():
        raise RuntimeError(f"Source cache is not a Git checkout: {dest}")
    if dest.exists():
        if allow_network:
            res = git("-C", dest, "pull", "--ff-only", "--quiet")
            if res.returncode:
                say(f"  Update warning ({repo}): {res.stderr.strip()[:200]}; using cached revision")
    else:
        if not allow_network:
            raise RuntimeError(f"Offline: {repo} is not cached")
        REPOS.mkdir(parents=True, exist_ok=True)
        url = "https://github.com/" + repo + ".git"
        res = git("clone", "--depth", "1", "--quiet", url, dest, timeout=240)
        if res.returncode:
            raise RuntimeError(res.stderr.strip()[:400])
    result = git("-C", dest, "rev-parse", "HEAD")
    return dest, (result.stdout.strip() if result.returncode == 0 else "unknown")


def discover_skills(checkout):
    found = []
    for file in checkout.rglob("SKILL.md"):
        parts = file.relative_to(checkout).parts
        if any(p in SKIP_PARTS for p in parts) or len(parts) > 10 or not file.is_file() or file.is_symlink():
            continue
        try:
            data = file.read_text(encoding="utf-8-sig")
        except (UnicodeError, OSError):
            continue
        if len(data) > 150_000 or not data.startswith("---"):
            continue
        end = data.find("\n---", 3)
        if end == -1:
            continue
        front = data[:end]
        matches = re.search(r"(?m)^name:\s*['\"]?([^\n'\"]+)['\"]?\s*$", front)
        desc = re.search(r"(?m)^description:\s*(.*)$", front)
        if not matches or not desc:
            continue
        name = matches.group(1).strip().lower()
        if not VALID.fullmatch(name) or len(name) > 64:
            continue
        if file.parent != checkout and file.parent.name.lower() != name:
            continue
        found.append((name, file.parent, desc.group(1).strip(" ' \"")))
    found.sort(key=lambda x: (len(x[1].relative_to(checkout).parts), str(x[1])))
    unique = {}
    for entry in found:
        unique.setdefault(entry[0], entry)
    return list(unique.values())[:300]


def selected(name, source, profile):
    if source.get("selection") == "all" or profile == "everything":
        return True
    if name in {"frontend-design", "using-superpowers", "brainstorming"}:
        return True
    return any(term in name for term in MATCH)


def safe_copy(src, dst):
    """Do not dereference symlinks from downloaded Git repositories."""
    try:
        if src.resolve() == dst.resolve():
            return
    except OSError:
        pass
    if dst.exists() or dst.is_symlink():
        if dst.is_symlink() or dst.is_file():
            dst.unlink()
        else:
            shutil.rmtree(dst)
    dst.mkdir(parents=True)
    nfiles, nbytes = 0, 0
    for base, dirs, files in os.walk(src, followlinks=False):
        basepath = Path(base)
        dirs[:] = [d for d in dirs if not (basepath / d).is_symlink() and d not in SAFE_COPY_SKIP]
        relative = basepath.relative_to(src)
        target = dst / relative
        target.mkdir(parents=True, exist_ok=True)
        for filename in files:
            item = basepath / filename
            if item.is_symlink() or not item.is_file():
                continue
            size = item.stat().st_size
            nfiles += 1
            nbytes += size
            if nfiles > 250 or nbytes > 12 * 1024 * 1024:
                shutil.rmtree(dst)
                raise RuntimeError(f"Skill exceeds resource limits: {src}")
            shutil.copy2(item, target / filename)


def rule_body():
    script = BUNDLE / "scripts" / "velomesh.py"
    if not script.is_file():
        script = HOME / ".velomesh" / "scripts" / "velomesh.py"
    return ("# VeloMesh skill routing & multi-model orchestration (managed block)\n"
            "## Automatic skill selection & Autonomous One-Prompt Full-Stack Orchestration\n"
            "- Before starting any substantive engineering, design, debugging, testing, or research task, "
            "inspect available installed skills and MCP tools automatically—never require slash commands or manual skill flags.\n"
            "- **Multi-Model Switching (`velomesh/auto`):** Route complex architecture to frontier reasoning models, UI craft to design-strong models, fast lookups to low-latency tiers, and code reviews to an independent cross-family verifier via `select_model_route`.\n"
            "- **One Prompt Builds Everything (Full-Stack Execution):** Always prioritize `using-superpowers` workflows and when asked to build a website, product, app, software, backend, frontend, or database, "
            "autonomously compose the complete capability stack across all layers: Awwwards-level Frontend UI (`frontend-design`, `impeccable`, `ui-ux-pro-max`), "
            "Interactive Motion (`gsap-core`, `gsap-scrolltrigger`, `emil-design-eng`, interactive Canvas/WebGL), Backend APIs (`backend-patterns`, `api-connector-builder`, `security-review`), "
            "Database & Schemas (`postgres-patterns`, `prisma-patterns`, `database-migrations`), and Verification (`test-driven-development`, `browser-qa`).\n"
            "- **Vision Elaboration Rule (VeloMesh Cannot Get Inside Your Brain):** VeloMesh automates 100% of the *skills, model routing, MCPs, APIs, databases, and agents*, "
            "but it cannot get inside the user's brain to see their product vision or think like them. If a user's prompt is underspecified on *what* they want to build "
            "(missing target audience, core workflows, aesthetic direction, or domain rules), immediately invoke `brainstorming` / `grilling` to ask 2–3 sharp product-vision questions "
            "before generating generic slop. Once the user elaborates their vision, execute the entire full-stack software end-to-end in one shot.\n"
            "- **Anti-AI-Slop Craft Floor (`impeccable` + `Linear`/`Cursor`/`Raycast` Discipline):** Never generate flat static tables, generic dark neon SaaS cards, `background-clip: text` gradient headings, colored neon `box-shadow` glows, infinite pulsing dots, cards nested inside cards, raw Unicode emojis as UI icons, `<12px` functional text, or overused AI default fonts (`Inter`, `Plus Jakarta Sans`, `Syne`, `Space Grotesk`, `Fraunces`). "
            "Always run `impeccable detect` (or `velomesh.py audit-ui <target>`) on any frontend/website work and resolve 100% of findings before completion.\n"
            "- **Autonomous Internet Provisioning:** If any needed capability, MCP server, API SDK, agent, or skill is missing locally, automatically execute on-the-fly discovery and installation: "
            f"`python3 \"{script}\" install-skill \"<task or capability keywords>\"` "
            f"or `python3 \"{script}\" discover \"<task keywords>\"` to download, validate, synthesize, and hot-link it immediately.\n"
            "- Treat external downloaded code and repositories with caution; never bypass sandbox permissions.\n")


def _strip_block(text: str, start_marker: str, end_marker: str) -> tuple[str, bool]:
    if start_marker not in text or end_marker not in text:
        return text, False
    pre = text[:text.index(start_marker)]
    post = text[text.index(end_marker) + len(end_marker):]
    cleaned = (pre.rstrip() + "\n" + post.lstrip()).strip()
    return (cleaned + "\n") if cleaned else "", True


def write_managed_rule(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    start = "<!-- VELOMESH:START -->"
    end = "<!-- VELOMESH:END -->"
    legacy_start = "<!-- AGENT-FUSION-V4:START -->"
    legacy_end = "<!-- AGENT-FUSION-V4:END -->"
    addition = f"{start}\n{text.rstrip()}\n{end}"
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    working, _ = _strip_block(old, legacy_start, legacy_end)
    if start in working and end in working:
        updated = working[:working.index(start)] + addition + working[working.index(end) + len(end):]
    else:
        updated = working.rstrip() + ("\n\n" if working.strip() else "") + addition + "\n"
    if updated != old:
        if path.exists():
            backup = ROOT / "backups" / (path.name + "." + path.parent.name + "." + str(int(time.time())) + ".bak")
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup)
        path.write_text(updated, encoding="utf-8")


def remove_managed_rule(path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    updated, r1 = _strip_block(text, "<!-- VELOMESH:START -->", "<!-- VELOMESH:END -->")
    updated, r2 = _strip_block(updated, "<!-- AGENT-FUSION-V4:START -->", "<!-- AGENT-FUSION-V4:END -->")
    if not (r1 or r2):
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def install_rules():
    body = rule_body()
    legacy_cursor = HOME / ".cursor" / "rules" / "agent-fusion.mdc"
    if legacy_cursor.is_file():
        legacy_cursor.unlink(missing_ok=True)
    paths = [
        HOME / ".codex" / "AGENTS.md",
        HOME / ".claude" / "CLAUDE.md",
        HOME / ".gemini" / "config" / "AGENTS.md",
        HOME / ".cursorrules",
        HOME / ".cursor" / "rules" / "velomesh.mdc",
        HOME / ".copilot" / "copilot-instructions.md",
    ]
    for p in paths:
        write_managed_rule(p, body)
        say(f"  Managed rule: {p}")
    instructions = ROOT / "copilot-app-instructions.txt"
    instructions.parent.mkdir(parents=True, exist_ok=True)
    instructions.write_text(body, encoding="utf-8")


VELOMESH_MCP_TOOLS = [
    "catalog",
    "route_task",
    "memory_read",
    "recent_plans",
    "plan_status",
    "passport_list",
    "passport_get",
    "doctor",
    "create_plan",
    "stage_update",
    "fusion_start",
    "synthesize_fullstack_architecture",
    "discover_and_install_capability",
    "search_online_capabilities",
    "select_model_route",
    "optimize_prompt",
    "gateway_status",
]

VELOMESH_ONLY_TOOLS = {
    "fusion_start",
    "discover_and_install_capability",
    "search_online_capabilities",
    "select_model_route",
    "optimize_prompt",
    "gateway_status",
    "synthesize_fullstack_architecture",
}


def sync_velomesh_core_skill(targets=None) -> int:
    """Install the native `/velomesh` skill (with branded icon thumbnails & openai.yaml)
    across harness skill directories and retire `/agent-fusion-orchestrator` links.
    """
    src_skill = BUNDLE / "SKILL.md"
    if not src_skill.is_file():
        return 0
    if targets is None:
        targets = {
            "codex": HOME / ".codex" / "skills",
            "codex-agents": HOME / ".agents" / "skills",
            "claude-code": HOME / ".claude" / "skills",
            "github-copilot": HOME / ".copilot" / "skills",
            "antigravity-app": HOME / ".gemini" / "config" / "skills",
            "opencode": HOME / ".config" / "opencode" / "skills",
            "cursor": HOME / ".cursor" / "skills",
        }
    skill_text = src_skill.read_text(encoding="utf-8")
    src_assets = BUNDLE / "assets"
    src_openai_yaml = BUNDLE / "agents" / "openai.yaml"
    count = 0
    for dest in targets.values():
        try:
            dest.mkdir(parents=True, exist_ok=True)
            vdir = dest / "velomesh"
            vdir.mkdir(parents=True, exist_ok=True)
            (vdir / "SKILL.md").write_text(skill_text, encoding="utf-8")
            if src_assets.is_dir():
                vassets = vdir / "assets"
                vassets.mkdir(parents=True, exist_ok=True)
                for asset_file in src_assets.iterdir():
                    if asset_file.is_file():
                        shutil.copy2(asset_file, vassets / asset_file.name)
            if src_openai_yaml.is_file():
                vagents = vdir / "agents"
                vagents.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_openai_yaml, vagents / "openai.yaml")
            legacy = dest / "agent-fusion-orchestrator"
            if legacy.is_symlink():
                legacy.unlink(missing_ok=True)
            count += 1
        except OSError:
            pass
    return count


def configure_codex_toml(toml_text: str, node_bin: str, mcp_script_path: str, catalog_path: str) -> tuple[str, str | None]:
    """Safely update Codex config.toml per section: sets top-level model_catalog_json,
    cleans polluted VeloMesh tools from unrelated MCP servers, migrates agent-fusion -> velomesh,
    and registers [model_providers.velomesh] + [profiles.velomesh].
    """
    lines = toml_text.splitlines()
    root_lines = []
    sections: list[tuple[str, list[str]]] = []
    current_header = None
    current_body: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("[") and stripped.endswith("]") and not stripped.startswith("[["):
            if current_header is not None:
                sections.append((current_header, current_body))
            current_header = stripped
            current_body = []
        else:
            if current_header is None:
                root_lines.append(line)
            else:
                current_body.append(line)
    if current_header is not None:
        sections.append((current_header, current_body))

    detected_top_model = None
    raw_top_model = None
    cleaned_root = []
    has_root_provider = False
    for line in root_lines:
        if re.match(r"^\s*model_catalog_json\s*=", line):
            continue
        if re.match(r"^\s*model_provider\s*=", line):
            has_root_provider = True
        m_model = re.match(r'^\s*model\s*=\s*"([^"]+)"', line)
        if m_model:
            raw_top_model = m_model.group(1)
            if not raw_top_model.startswith("velomesh/"):
                detected_top_model = raw_top_model
        cleaned_root.append(line)

    new_root = [f'model_catalog_json = "{catalog_path}"']
    if raw_top_model and raw_top_model.startswith("velomesh/") and not has_root_provider:
        new_root.append('model_provider = "velomesh"')
    if any(l.strip() for l in cleaned_root):
        new_root.extend(cleaned_root)

    def _strip_velomesh_tools_from_body(body_lines: list[str]) -> list[str]:
        joined = "\n".join(body_lines)
        def _clean(m):
            items = re.findall(r'"([^"]+)"', m.group(1))
            kept = [x for x in items if x not in VELOMESH_ONLY_TOOLS]
            return "enabled_tools = [" + ", ".join(f'"{x}"' for x in kept) + "]"
        updated = re.sub(r"enabled_tools\s*=\s*\[(.*?)\]", _clean, joined, flags=re.DOTALL)
        return updated.splitlines()

    rewritten_sections: list[tuple[str, list[str]]] = []
    saw_velomesh_mcp = False
    has_direct_velomesh = any(h == "[mcp_servers.velomesh]" for h, _ in sections)

    for header, body_lines in sections:
        if header in ("[model_providers.velomesh]", "[profiles.velomesh]"):
            continue
        if header == "[mcp_servers.agent-fusion]" and has_direct_velomesh:
            continue
        if header.startswith("[mcp_servers.agent-fusion") and not header == "[mcp_servers.agent-fusion]":
            header = header.replace("[mcp_servers.agent-fusion", "[mcp_servers.velomesh", 1)

        if header in ("[mcp_servers.agent-fusion]", "[mcp_servers.velomesh]"):
            header = "[mcp_servers.velomesh]"
            saw_velomesh_mcp = True
            preserved = [
                l for l in body_lines
                if not re.match(r"^\s*(command|args|enabled_tools)\s*=", l)
            ]
            tools_str = ", ".join(f'"{t}"' for t in VELOMESH_MCP_TOOLS)
            velomesh_body = [
                f'command = "{node_bin}"',
                f'args = ["{mcp_script_path}"]',
                f"enabled_tools = [{tools_str}]",
            ] + preserved
            rewritten_sections.append((header, velomesh_body))
            continue

        if header.startswith("[mcp_servers."):
            body_lines = _strip_velomesh_tools_from_body(body_lines)

        rewritten_sections.append((header, body_lines))

    if not saw_velomesh_mcp:
        tools_str = ", ".join(f'"{t}"' for t in VELOMESH_MCP_TOOLS)
        rewritten_sections.append((
            "[mcp_servers.velomesh]",
            [
                f'command = "{node_bin}"',
                f'args = ["{mcp_script_path}"]',
                f"enabled_tools = [{tools_str}]",
            ],
        ))
        rewritten_sections.append((
            "[mcp_servers.velomesh.env]",
            [
                'AGENT_FUSION_ENABLE_EXEC = "0"',
                'AGENT_FUSION_ENABLE_CHECKS = "0"',
                'AGENT_FUSION_ALLOW_WRITES = "0"',
            ],
        ))

    rewritten_sections.append((
        "[model_providers.velomesh]",
        [
            'name = "VeloMesh Multi-Model Orchestrator"',
            'base_url = "http://127.0.0.1:4190/v1"',
            'wire_api = "responses"',
            'experimental_bearer_token = "velomesh-local"',
        ],
    ))
    rewritten_sections.append((
        "[profiles.velomesh]",
        [
            'model_provider = "velomesh"',
            'model = "velomesh/auto"',
        ],
    ))

    out_chunks = ["\n".join(new_root).rstrip()]
    for header, body_lines in rewritten_sections:
        body_text = "\n".join(body_lines).strip("\n")
        out_chunks.append(f"{header}\n{body_text}" if body_text else header)

    return "\n\n".join(c for c in out_chunks if c) + "\n", detected_top_model


def write_codex_model_catalog(catalog_path: Path, top_model: str | None = None):
    import copy

    reasoning_levels = [
        {"effort": "low", "description": "Fast responses with lighter reasoning"},
        {"effort": "medium", "description": "Balances speed and reasoning depth for everyday tasks"},
        {"effort": "high", "description": "Greater reasoning depth for complex problems"},
    ]

    fallback_template = {
        "slug": "velomesh/auto",
        "display_name": "VeloMesh Auto (Multi-Model Switcher)",
        "description": "Dynamically switches between Claude, Codex, Gemini & Grok per task phase mid-execution.",
        "default_reasoning_level": "medium",
        "supported_reasoning_levels": copy.deepcopy(reasoning_levels),
        "shell_type": "unified_exec",
        "visibility": "list",
        "supported_in_api": True,
        "priority": 0,
        "default_reasoning_summary": "none",
        "support_verbosity": True,
        "default_verbosity": "low",
        "apply_patch_tool_type": "freeform",
        "web_search_tool_type": "text_and_image",
        "truncation_policy": {"mode": "tokens", "limit": 10000},
        "context_window": 200000,
        "effective_context_window_percent": 95,
        "input_modalities": ["text", "image"],
        "supports_search_tool": True,
        "supports_reasoning_effort_updates": True,
    }

    native_models = []
    cache_file = catalog_path.parent / "models_cache.json"
    if cache_file.is_file():
        try:
            cache_data = json.loads(cache_file.read_text(encoding="utf-8"))
            cached = cache_data.get("models") if isinstance(cache_data, dict) else None
            if isinstance(cached, list):
                native_models = [
                    copy.deepcopy(m) for m in cached
                    if isinstance(m, dict) and m.get("slug") and not str(m.get("slug")).startswith("velomesh/")
                ]
        except Exception:
            native_models = []

    base_template = copy.deepcopy(native_models[0]) if native_models else fallback_template

    velomesh_specs = [
        ("velomesh/auto", "VeloMesh Auto (Multi-Model Switcher)", "Dynamically switches between Claude, Codex, Gemini & Grok per task phase mid-execution."),
        ("velomesh/architect", "VeloMesh Architect (Frontier Reasoning & RLS)", "Frontier architecture, system design, distributed consensus & PostgreSQL RLS tier."),
        ("velomesh/frontend", "VeloMesh Frontend (Swiss UI & Motion Craft)", "Awwwards Swiss typography UI, responsive layout & compositor motion engineering."),
        ("velomesh/fast", "VeloMesh Fast (Low-Latency Search & Tooling)", "High-speed repo navigation, linting, quick checks & formatting tier."),
        ("velomesh/review", "VeloMesh Review (Cross-Family Verifier)", "Independent cross-family security auditor & diff verification tier."),
    ]

    models = []
    for idx, (slug, display_name, description) in enumerate(velomesh_specs):
        entry = copy.deepcopy(base_template)
        entry["slug"] = slug
        entry["display_name"] = display_name
        entry["description"] = description
        entry["visibility"] = "list"
        entry["supported_in_api"] = True
        entry["priority"] = idx
        entry["default_reasoning_level"] = "medium"
        entry["supported_reasoning_levels"] = copy.deepcopy(reasoning_levels)
        if "availability_nux" in entry:
            entry["availability_nux"] = None
        if "upgrade" in entry:
            entry["upgrade"] = None
        models.append(entry)

    if native_models:
        models.extend(native_models)
    else:
        seen = set()
        for idx, mid in enumerate([top_model, "gpt-5.4", "gpt-5.3-codex", "gpt-5-mini"]):
            if not mid or mid in seen or mid.startswith("velomesh/"):
                continue
            seen.add(mid)
            entry = copy.deepcopy(base_template)
            entry["slug"] = mid
            entry["display_name"] = mid
            entry["description"] = f"OpenAI model {mid}"
            entry["visibility"] = "list"
            entry["supported_in_api"] = True
            entry["priority"] = len(velomesh_specs) + idx
            models.append(entry)

    catalog_path.write_text(json.dumps({"models": models}, indent=2) + "\n", encoding="utf-8")


def _merge_hook_entry(hook_list: list, matcher: str | None, command: str, timeout: int = 5) -> list:
    """Append a command hook group if no existing hook references the same hooks.mjs mode."""
    mode_tag = command.split()[-1] if command.split() else command
    for item in hook_list:
        if not isinstance(item, dict):
            continue
        for sub in item.get("hooks", []):
            cmd_str = str(sub.get("command", ""))
            if "hooks.mjs" in cmd_str and mode_tag in cmd_str:
                return hook_list
    entry: dict = {"hooks": [{"type": "command", "command": command, "timeout": timeout}]}
    if matcher is not None:
        entry["matcher"] = matcher
    hook_list.append(entry)
    return hook_list


def configure_harness_hooks(node_bin: str, hooks_script_path: str) -> list[str]:
    """Additively register VeloMesh prompt-optimizer, RTK/security pre-tool, and UI post-tool hooks
    across Claude Code, Codex, and Antigravity without altering existing user hooks.
    """
    updated = []
    cmd_prompt = f'"{node_bin}" "{hooks_script_path}" prompt-submit'
    cmd_pre = f'"{node_bin}" "{hooks_script_path}" pre-tool'
    cmd_post = f'"{node_bin}" "{hooks_script_path}" post-tool'

    # 1. Claude Code (~/.claude/settings.json)
    claude_settings_file = HOME / ".claude" / "settings.json"
    if (HOME / ".claude").is_dir():
        try:
            cs_data = json.loads(claude_settings_file.read_text(encoding="utf-8")) if claude_settings_file.is_file() else {}
            if not isinstance(cs_data, dict):
                cs_data = {}
        except Exception:
            cs_data = {}
        hooks_obj = cs_data.setdefault("hooks", {})
        if isinstance(hooks_obj, dict):
            hooks_obj["UserPromptSubmit"] = _merge_hook_entry(list(hooks_obj.get("UserPromptSubmit") or []), None, cmd_prompt)
            hooks_obj["PreToolUse"] = _merge_hook_entry(list(hooks_obj.get("PreToolUse") or []), "*", cmd_pre)
            hooks_obj["PostToolUse"] = _merge_hook_entry(list(hooks_obj.get("PostToolUse") or []), "Edit|Write", cmd_post)
        claude_settings_file.write_text(json.dumps(cs_data, indent=2) + "\n", encoding="utf-8")
        updated.append("claude-hooks")

    # 2. Codex (~/.codex/hooks.json) — preserves existing rtk / impeccable hooks intact
    codex_hooks_file = HOME / ".codex" / "hooks.json"
    if (HOME / ".codex").is_dir():
        try:
            cx_data = json.loads(codex_hooks_file.read_text(encoding="utf-8")) if codex_hooks_file.is_file() else {}
            if not isinstance(cx_data, dict):
                cx_data = {}
        except Exception:
            cx_data = {}
        cx_hooks = cx_data.setdefault("hooks", {})
        if isinstance(cx_hooks, dict):
            cx_hooks["UserPromptSubmit"] = _merge_hook_entry(list(cx_hooks.get("UserPromptSubmit") or []), None, cmd_prompt)
            cx_hooks["PreToolUse"] = _merge_hook_entry(list(cx_hooks.get("PreToolUse") or []), "Bash", cmd_pre)
            cx_hooks["PostToolUse"] = _merge_hook_entry(list(cx_hooks.get("PostToolUse") or []), "Edit|Write|apply_patch", cmd_post)
        codex_hooks_file.write_text(json.dumps(cx_data, indent=2) + "\n", encoding="utf-8")
        updated.append("codex-hooks")

    # 3. Antigravity plugin hooks.json (~/.gemini/config/plugins/velomesh/hooks.json)
    agy_plugin_dir = HOME / ".gemini" / "config" / "plugins" / "velomesh"
    if agy_plugin_dir.is_dir():
        agy_hooks_script = str(agy_plugin_dir / "scripts" / "hooks.mjs") if (agy_plugin_dir / "scripts" / "hooks.mjs").is_file() else hooks_script_path
        agy_hooks_file = agy_plugin_dir / "hooks.json"
        agy_payload = {
            "velomesh-session-discovery": {
                "SessionStart": [{"command": f"'{node_bin}' '{agy_hooks_script}' session"}]
            },
            "velomesh-preinvoke": {
                "PreInvocation": [{"command": f"'{node_bin}' '{agy_hooks_script}' invocation"}]
            },
            "velomesh-pretool": {
                "PreToolUse": [{"command": f"'{node_bin}' '{agy_hooks_script}' pre-tool"}]
            },
            "velomesh-posttool": {
                "PostToolUse": [{"command": f"'{node_bin}' '{agy_hooks_script}' post-tool"}]
            },
        }
        agy_hooks_file.write_text(json.dumps(agy_payload, indent=2) + "\n", encoding="utf-8")
        updated.append("antigravity-hooks")

    return updated


def auto_configure_harnesses(mcp_script_path: str | None = None, node_bin: str | None = None) -> list[str]:
    configured = []
    if not node_bin:
        node_bin = shutil.which("node") or ("/opt/homebrew/bin/node" if Path("/opt/homebrew/bin/node").exists() else "node")
    if not mcp_script_path:
        candidates = [
            BUNDLE / "scripts" / "mcp-server.mjs",
            HOME / ".gemini" / "config" / "plugins" / "velomesh" / "scripts" / "mcp-server.mjs",
            HOME / ".velomesh" / "scripts" / "mcp-server.mjs",
            HOME / ".local" / "share" / "velomesh" / "scripts" / "mcp-server.mjs",
            HOME / ".local" / "share" / "agent-fusion" / "scripts" / "mcp-server.mjs",
        ]
        found = next((c for c in candidates if c.is_file()), candidates[0])
        mcp_script_path = str(found)

    # Sync latest MCP & hook scripts to active plugin locations if present
    src_scripts = BUNDLE / "scripts"
    if src_scripts.is_dir():
        for mirror in [
            HOME / ".gemini" / "config" / "plugins" / "velomesh" / "scripts",
            HOME / ".local" / "share" / "velomesh" / "scripts",
        ]:
            if mirror.is_dir() and mirror.resolve() != src_scripts.resolve():
                for sfile in src_scripts.iterdir():
                    if sfile.is_file() and sfile.suffix in (".mjs", ".py"):
                        try:
                            shutil.copy2(sfile, mirror / sfile.name)
                        except OSError:
                            pass

    # Install native /velomesh skill across harness skill folders
    sync_velomesh_core_skill()

    # 1. Cursor (~/.cursor/mcp.json)
    cursor_dir = HOME / ".cursor"
    cursor_dir.mkdir(parents=True, exist_ok=True)
    cursor_mcp_file = cursor_dir / "mcp.json"
    try:
        cursor_data = json.loads(cursor_mcp_file.read_text(encoding="utf-8")) if cursor_mcp_file.is_file() else {}
        if not isinstance(cursor_data, dict):
            cursor_data = {}
    except Exception:
        cursor_data = {}
    cursor_servers = cursor_data.setdefault("mcpServers", {})
    server_entry = {"command": node_bin, "args": [mcp_script_path], "env": {}}
    cursor_servers.pop("agent-fusion", None)
    cursor_servers["velomesh"] = server_entry
    cursor_mcp_file.write_text(json.dumps(cursor_data, indent=2) + "\n", encoding="utf-8")
    configured.append("cursor")

    # 2. GitHub Copilot (~/.copilot/mcp-config.json)
    copilot_dir = HOME / ".copilot"
    copilot_dir.mkdir(parents=True, exist_ok=True)
    copilot_mcp_file = copilot_dir / "mcp-config.json"
    try:
        copilot_data = json.loads(copilot_mcp_file.read_text(encoding="utf-8")) if copilot_mcp_file.is_file() else {}
        if not isinstance(copilot_data, dict):
            copilot_data = {}
    except Exception:
        copilot_data = {}
    copilot_servers = copilot_data.setdefault("mcpServers", {})
    copilot_servers.pop("agent-fusion", None)
    copilot_servers["velomesh"] = {
        "type": "local",
        "command": node_bin,
        "args": [mcp_script_path],
        "tools": ["*"],
        "env": {},
    }
    copilot_mcp_file.write_text(json.dumps(copilot_data, indent=2) + "\n", encoding="utf-8")
    configured.append("github-copilot")

    # 3. Codex (~/.codex/config.toml + ~/.codex/velomesh-models.json)
    codex_dir = HOME / ".codex"
    codex_dir.mkdir(parents=True, exist_ok=True)
    codex_toml_file = codex_dir / "config.toml"
    codex_catalog_file = codex_dir / "velomesh-models.json"
    toml_text = codex_toml_file.read_text(encoding="utf-8") if codex_toml_file.is_file() else ""
    updated_toml, detected_top_model = configure_codex_toml(toml_text, node_bin, mcp_script_path, str(codex_catalog_file))
    codex_toml_file.write_text(updated_toml, encoding="utf-8")
    write_codex_model_catalog(codex_catalog_file, top_model=detected_top_model)
    configured.append("codex")

    # 4. Claude Code (~/.claude/mcp.json + ~/.claude/settings.json model picker options)
    claude_dir = HOME / ".claude"
    claude_dir.mkdir(parents=True, exist_ok=True)
    claude_mcp_file = claude_dir / "mcp.json"
    try:
        claude_data = json.loads(claude_mcp_file.read_text(encoding="utf-8")) if claude_mcp_file.is_file() else {}
        if not isinstance(claude_data, dict):
            claude_data = {}
    except Exception:
        claude_data = {}
    claude_servers = claude_data.setdefault("mcpServers", {})
    claude_servers.pop("agent-fusion", None)
    claude_servers["velomesh"] = {"command": node_bin, "args": [mcp_script_path]}
    claude_mcp_file.write_text(json.dumps(claude_data, indent=2) + "\n", encoding="utf-8")

    claude_settings_file = claude_dir / "settings.json"
    try:
        cs_data = json.loads(claude_settings_file.read_text(encoding="utf-8")) if claude_settings_file.is_file() else {}
        if not isinstance(cs_data, dict):
            cs_data = {}
    except Exception:
        cs_data = {}
    cs_env = cs_data.setdefault("env", {})
    if isinstance(cs_env, dict):
        cs_env["ANTHROPIC_CUSTOM_MODEL_OPTION"] = "velomesh/auto"
        cs_env["ANTHROPIC_CUSTOM_MODEL_OPTION_NAME"] = "VeloMesh Auto (Multi-Model Switcher)"
        cs_env["ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION"] = "Routes across Claude, Codex, Gemini & Grok per task phase"
    cs_data["modelPicker"] = {
        "replaceBuiltInOptions": False,
        "options": [
            {"model": "velomesh/auto", "label": "VeloMesh Auto", "description": "Dynamic multi-model switcher across Claude, Codex, Gemini & Grok"},
            {"model": "velomesh/architect", "label": "VeloMesh Architect", "description": "Frontier architecture, system design & PostgreSQL RLS"},
            {"model": "velomesh/frontend", "label": "VeloMesh Frontend", "description": "Swiss UI craft, motion choreography & responsiveness"},
            {"model": "velomesh/fast", "label": "VeloMesh Fast", "description": "Low-latency search, formatting & quick turnaround"},
            {"model": "velomesh/review", "label": "VeloMesh Review", "description": "Cross-family independent verifier & security auditor"},
        ],
    }
    claude_settings_file.write_text(json.dumps(cs_data, indent=2) + "\n", encoding="utf-8")
    configured.append("claude-code")

    # 5. OpenCode (~/.config/opencode/opencode.json) — additive v2.1.4 provider + MCP registration
    opencode_dir = HOME / ".config" / "opencode"
    opencode_jsonc = opencode_dir / "opencode.jsonc"
    if not opencode_jsonc.is_file():
        opencode_dir.mkdir(parents=True, exist_ok=True)
        opencode_file = opencode_dir / "opencode.json"
        try:
            oc_data = json.loads(opencode_file.read_text(encoding="utf-8")) if opencode_file.is_file() else {}
            if not isinstance(oc_data, dict):
                oc_data = {}
        except Exception:
            oc_data = {}
        oc_providers = oc_data.setdefault("providers", {})
        if not isinstance(oc_providers, dict):
            oc_providers = {}
            oc_data["providers"] = oc_providers
        oc_providers["velomesh"] = {
            "name": "VeloMesh Orchestrator",
            "package": "@opencode/ai/providers/openai-compatible",
            "settings": {"baseURL": "http://127.0.0.1:4190/v1", "apiKey": "velomesh-local"},
            "models": {
                "auto": {"modelID": "velomesh/auto", "name": "VeloMesh Auto (Dynamic Multi-Model Switcher)"},
                "architect": {"modelID": "velomesh/architect", "name": "VeloMesh Architect (Frontier Reasoning & RLS)"},
                "frontend": {"modelID": "velomesh/frontend", "name": "VeloMesh Frontend (Swiss UI & Motion Craft)"},
                "fast": {"modelID": "velomesh/fast", "name": "VeloMesh Fast (Low-Latency Search & Tooling)"},
                "review": {"modelID": "velomesh/review", "name": "VeloMesh Review (Cross-Family Verifier)"},
            },
        }
        oc_mcp = oc_data.setdefault("mcp", {})
        if isinstance(oc_mcp, dict):
            mcp_entry = {"type": "local", "command": [node_bin, mcp_script_path]}
            if isinstance(oc_mcp.get("servers"), dict):
                oc_mcp["servers"].pop("agent-fusion", None)
                oc_mcp["servers"]["velomesh"] = mcp_entry
            else:
                oc_mcp.pop("agent-fusion", None)
                oc_mcp["velomesh"] = mcp_entry
        opencode_file.write_text(json.dumps(oc_data, indent=2) + "\n", encoding="utf-8")
        configured.append("opencode")

    # 6. Super-Hooks Suite (RTK + Prompt Optimizer + Security Guard + UI Gate)
    hooks_script = str(Path(mcp_script_path).parent / "hooks.mjs")
    configured.extend(configure_harness_hooks(node_bin, hooks_script))

    return configured


def uninstall_rules():
    paths = [
        HOME / ".codex" / "AGENTS.md",
        HOME / ".claude" / "CLAUDE.md",
        HOME / ".gemini" / "config" / "AGENTS.md",
        HOME / ".cursorrules",
        HOME / ".cursor" / "rules" / "velomesh.mdc",
        HOME / ".cursor" / "rules" / "agent-fusion.mdc",
        HOME / ".copilot" / "copilot-instructions.md",
    ]
    for p in paths:
        if remove_managed_rule(p):
            say(f"  Removed managed rule: {p}")


def sync(state, targets=None, core_only=False):
    targets = targets or TARGETS
    copied = 0
    skipped = 0
    for agent, dest in targets.items():
        dest.mkdir(parents=True, exist_ok=True)
        for name in sorted(state["skills"]):
            if core_only and not is_core_skill(name):
                continue
            src = LIB / name
            if not src.is_dir():
                continue
            link = dest / name
            managed = False
            if link.is_symlink():
                try:
                    managed = link.resolve(strict=False) == src.resolve(strict=False)
                except OSError:
                    managed = False
                if managed:
                    copied += 1
                    continue
            elif link.is_dir() and (link / MANAGED_MARKER).is_file():
                try:
                    managed = (link / MANAGED_MARKER).read_text(encoding="utf-8").strip() == str(src)
                except OSError:
                    pass
            if (link.exists() or link.is_symlink()) and not managed:
                skipped += 1
                continue
            if managed:
                shutil.rmtree(link)
            try:
                link.symlink_to(src, target_is_directory=True)
            except (OSError, NotImplementedError):
                safe_copy(src, link)
                (link / MANAGED_MARKER).write_text(str(src), encoding="utf-8")
            state["links"][str(link)] = str(src)
            copied += 1
        say(f"  {agent}: {dest}")
    return copied, skipped


def setup(args):
    if not shutil.which("git") and not args.offline:
        raise RuntimeError("Git is required for fetching sources. Install Git first, or rerun --offline after caching.")
    say("VeloMesh — Autonomous Internet Capability Mesh (Skills · MCP Servers · APIs · Agents)")
    say(f"Install root: {ROOT}")
    if not args.yes and not args.offline:
        answer = input("Fetch the curated public GitHub repos and link skills globally? [y/N] ").strip().lower()
        if answer not in ("y", "yes"):
            say("Cancelled without changes.")
            return
    state = load_state()
    LIB.mkdir(parents=True, exist_ok=True)
    source_skills = [("local/agent-fusion", "agent-fusion-orchestrator", BUNDLE, "bundled")]
    for spec in catalog()["sources"]:
        if LEVELS[spec["level"]] > LEVELS[args.profile]:
            continue
        repo = spec["repo"]
        say(f"Fetching {repo} ...")
        try:
            checkout, revision = fetch_repo(repo, allow_network=not args.offline)
            found = discover_skills(checkout)
            included = [(repo, name, folder, revision) for name, folder, desc in found if selected(name, spec, args.profile)]
            source_skills.extend(included)
            state["sources"][repo] = {"commit": revision, "discovered": len(found), "selected": len(included)}
            say(f"  {len(included)} portable skill packages found/selected ({len(found)} discovered)")
        except (RuntimeError, subprocess.TimeoutExpired, OSError) as e:
            say(f"  Skipped {repo}: {e}")
    installed = 0
    collisions = 0
    seen = set()
    for repo, name, folder, revision in source_skills:
        if name in seen:
            collisions += 1
            continue
        seen.add(name)
        dst = LIB / name
        prior = state["skills"].get(name)
        if dst.exists() and not prior and repo != "local/agent-fusion":
            say(f"  Preserving unexpected local directory: {dst}")
            continue
        try:
            safe_copy(folder, dst)
            state["skills"][name] = {"repo": repo, "commit": revision, "path": str(dst)}
            installed += 1
        except (OSError, RuntimeError) as e:
            say(f"  Could not add {name}: {e}")
    linked, skipped = sync(state, core_only=True)
    bundled_added = install_bundled_skills()
    install_rules()
    configured = auto_configure_harnesses()
    save_state(state)
    say(f"Done. {installed + len(bundled_added)} library skills; {linked} links/copies across targets; {collisions} duplicate names avoided; {skipped} existing custom skills preserved.")
    say(f"Auto-configured MCP & hooks for: {', '.join(configured)}")
    say("Zero-config setup complete! VeloMesh is now active automatically in all your AI coding agents.")


def discover_platform_skills(workspace: Path | None = None) -> dict[str, dict]:
    """Scan all installed agentic AI platform and harness skill folders alongside VeloMesh's hub."""
    discovered: dict[str, dict] = {}
    scan_roots: list[tuple[str, Path]] = []

    for host, dest in TARGETS.items():
        scan_roots.append((f"platform:{host}", dest))

    scan_roots.append(("platform:antigravity-builtin", HOME / ".gemini" / "antigravity" / "builtin" / "skills"))

    for host_label, plugin_root in (
        ("antigravity-plugin", HOME / ".gemini" / "config" / "plugins"),
        ("codex-plugin", HOME / ".codex" / "plugins"),
        ("claude-plugin", HOME / ".claude" / "plugins"),
    ):
        if plugin_root.is_dir():
            for root, dirs, _ in os.walk(plugin_root, followlinks=False):
                rel_depth = len(Path(root).relative_to(plugin_root).parts)
                if rel_depth > 5:
                    dirs[:] = []
                    continue
                dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "agent-fusion")]
                if Path(root).name == "skills":
                    scan_roots.append((f"platform:{host_label}", Path(root)))
                    dirs[:] = []

    if workspace and Path(workspace).is_dir():
        ws = Path(workspace)
        for ws_rel in (".agents/skills", ".claude/skills", ".cursor/skills", ".opencode/skills", ".github/skills", ".gemini/skills"):
            scan_roots.append(("platform:workspace", ws / ws_rel))

    scan_roots.append(("velomesh-hub", LIB))
    scan_roots.append(("velomesh-bundled", BUNDLE / "skills"))

    state = load_state()
    hub_skills = state.get("skills", {}) if isinstance(state, dict) else {}

    for source_label, root_dir in scan_roots:
        if not root_dir.is_dir():
            continue
        try:
            entries = sorted(root_dir.iterdir(), key=lambda p: p.name)
        except OSError:
            continue
        for entry in entries:
            if entry.name.startswith("."):
                continue
            skill_md = entry / "SKILL.md"
            try:
                if not entry.is_dir() or not skill_md.is_file():
                    continue
            except OSError:
                continue
            name = entry.name.strip().lower()
            if not name or len(name) > 64:
                continue
            host_tag = source_label.replace("platform:", "")
            bucket = discovered.get(name)
            if bucket is None:
                repo_source = hub_skills.get(name, {}).get("repo") or source_label
                discovered[name] = {
                    "name": name,
                    "source": repo_source,
                    "path": str(skill_md),
                    "hosts": [host_tag],
                }
            elif host_tag not in bucket["hosts"]:
                bucket["hosts"].append(host_tag)
    return discovered


def install_bundled_skills(targets=None) -> list[str]:
    """Copy bundled portable skills in BUNDLE/skills into LIB and link them across harnesses."""
    bundled_dir = BUNDLE / "skills"
    if not bundled_dir.is_dir():
        return []
    LIB.mkdir(parents=True, exist_ok=True)
    state = load_state()
    added = []
    for entry in sorted(bundled_dir.iterdir(), key=lambda p: p.name):
        if not entry.is_dir() or not (entry / "SKILL.md").is_file():
            continue
        clean = sanitize_skill_name(entry.name)
        if not clean:
            continue
        dst = LIB / clean
        prior = state["skills"].get(clean)
        if dst.exists() and not prior:
            continue
        try:
            safe_copy(entry, dst)
            state["skills"][clean] = {"repo": "local/velomesh-bundled", "commit": "bundled", "path": str(dst)}
            hot_link_skill(clean, targets=targets)
            added.append(clean)
        except (OSError, RuntimeError):
            pass
    save_state(state)
    return added


def tokenize(words):
    return {w for w in re.findall(r"[a-z0-9]+", words.lower()) if len(w) > 2}


def local_recommend(query, limit=8, workspace: Path | None = None):
    q = tokenize(query)
    if not q:
        return []
    platform_skills = discover_platform_skills(workspace=workspace)
    scored = []
    for name, meta in platform_skills.items():
        if name in ("velomesh", "agent-fusion-orchestrator"):
            continue
        file = Path(meta["path"])
        if not file.is_file():
            continue
        try:
            md = file.read_text(encoding="utf-8", errors="ignore")[:3000]
        except OSError:
            continue
        namewords = tokenize(name.replace("-", " "))
        descmatch = re.search(r"(?m)^description:\s*(.*)$", md)
        desc = descmatch.group(1) if descmatch else ""
        score = 5 * len(q & namewords) + 2 * len(q & tokenize(desc)) + len(q & tokenize(md[:1600]))
        if score > 0:
            scored.append((score, name, meta["source"], meta["hosts"], str(file)))
    return [
        {"skill": name, "source": repo, "hosts": hosts, "path": path_str, "score": score}
        for score, name, repo, hosts, path_str in sorted(scored, reverse=True)[:limit]
    ]


def github_search(query, kind="skill", limit=6):
    modifiers = {
        "skill": "agent skills",
        "mcp": "mcp server modelcontextprotocol",
        "api": "api sdk openapi client",
        "agent": "coding agent autonomous agent",
    }
    q = f"{query} {modifiers.get(kind, 'agent skills')} in:name,description,readme archived:false"
    url = "https://api.github.com/search/repositories?" + urllib.parse.urlencode({"q": q, "sort": "stars", "order": "desc", "per_page": min(limit, 10)})
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "velomesh-autonomous-capability-engine"}
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = json.loads(response.read(2_000_000).decode("utf-8"))
        return [{"repo": item.get("full_name"), "url": item.get("html_url"), "stars": item.get("stargazers_count"), "updated": item.get("updated_at"), "description": (item.get("description") or "")[:150], "kind": kind} for item in raw.get("items", [])[:limit]]
    except Exception as e:
        say(f"  GitHub search rate limit or network error ({e}); using local candidates")
        return []


def sanitize_skill_name(name: str) -> str | None:
    if not isinstance(name, str):
        return None
    clean = name.strip().lower()
    if len(clean) > 64 or not VALID.fullmatch(clean):
        return None
    if ".." in clean or "/" in clean or "\\" in clean:
        return None
    return clean


def hot_link_skill(skill_name: str, targets=None) -> int:
    clean = sanitize_skill_name(skill_name)
    if not clean:
        return 0
    src = LIB / clean
    if not src.is_dir() or not (src / "SKILL.md").is_file():
        return 0
    targets = targets or TARGETS
    linked = 0
    for agent, dest in targets.items():
        try:
            dest.mkdir(parents=True, exist_ok=True)
            link = dest / clean
            if link.is_symlink():
                try:
                    if link.resolve(strict=False) == src.resolve(strict=False):
                        linked += 1
                        continue
                    link.unlink()
                except OSError:
                    link.unlink(missing_ok=True)
            elif link.is_dir() and (link / MANAGED_MARKER).is_file():
                shutil.rmtree(link)
            elif link.exists():
                # Preserve unmanaged existing directory
                continue
            try:
                link.symlink_to(src, target_is_directory=True)
            except (OSError, NotImplementedError):
                safe_copy(src, link)
                (link / MANAGED_MARKER).write_text(str(src), encoding="utf-8")
            linked += 1
        except Exception as e:
            say(f"  Warning linking {clean} to {agent}: {e}")
    return linked


def create_mcp_skill_wrapper(name: str, repo_or_url: str, purpose: str, tools_spec: str = "", targets=None) -> Path:
    clean = sanitize_skill_name(name) or "unnamed-mcp"
    wrapper_name = clean if clean.startswith(("mcp-", "api-", "agent-")) else f"mcp-{clean}"
    dest = LIB / wrapper_name
    dest.mkdir(parents=True, exist_ok=True)
    skill_file = dest / "SKILL.md"
    body = (
        f"---\n"
        f"name: {wrapper_name}\n"
        f"description: \"Autonomous capability wrapper for '{name}': {purpose}\"\n"
        f"---\n\n"
        f"# Live Internet Capability: {name}\n\n"
        f"- **Source/Repository:** {repo_or_url}\n"
        f"- **Purpose:** {purpose}\n\n"
        f"## Autonomous Execution Guidelines\n"
        f"1. Check if this MCP server, API, or agent tool is active in the current harness.\n"
        f"2. Follow the repository's official contracts, endpoints, and authentication patterns.\n"
        f"3. Never expose raw secrets or environment tokens.\n"
    )
    if tools_spec:
        body += f"\n## Specifications & Documentation\n{tools_spec}\n"
    skill_file.write_text(body, encoding="utf-8")
    hot_link_skill(wrapper_name, targets=targets)
    return dest


def provision_capability(query_or_repo: str, kind: str = "auto", force: bool = False, targets=None) -> dict:
    return install_skill(query_or_repo, force=force, targets=targets, kind=kind)


def install_skill(query_or_repo: str, force: bool = False, targets=None, kind: str = "auto") -> dict:
    state = load_state()
    targets = targets or TARGETS

    repo_target = None
    candidate_meta = {}
    if "/" in query_or_repo and not query_or_repo.startswith("http"):
        parts = query_or_repo.strip().split("/")
        if len(parts) == 2 and all(p.replace("-", "").replace("_", "").replace(".", "").isalnum() for p in parts):
            repo_target = query_or_repo.strip()

    if not repo_target:
        clean = sanitize_skill_name(query_or_repo)
        if clean and (LIB / clean).is_dir():
            links = hot_link_skill(clean, targets=targets)
            state["skills"].setdefault(clean, {"repo": "local/installed", "path": str(LIB / clean)})
            save_state(state)
            return {"status": "linked_existing", "skill": clean, "links": links}

        matches = local_recommend(query_or_repo, limit=1)
        if matches and matches[0]["score"] >= 10 and (LIB / matches[0]["skill"]).is_dir():
            matched_name = matches[0]["skill"]
            links = hot_link_skill(matched_name, targets=targets)
            return {"status": "linked_existing", "skill": matched_name, "score": matches[0]["score"], "links": links}

    if not repo_target:
        q_lower = query_or_repo.lower()
        if kind == "auto":
            if "mcp" in q_lower:
                search_order = ["mcp", "skill", "api", "agent"]
            elif "api" in q_lower or "sdk" in q_lower or "webhook" in q_lower:
                search_order = ["api", "mcp", "skill", "agent"]
            elif "agent" in q_lower:
                search_order = ["agent", "skill", "mcp", "api"]
            else:
                search_order = ["skill", "mcp", "api", "agent"]
        else:
            search_order = [kind]

        for k in search_order:
            try:
                candidates = github_search(query_or_repo, k, limit=3)
                if candidates and isinstance(candidates, list) and "repo" in candidates[0]:
                    candidate_meta = candidates[0]
                    repo_target = candidate_meta["repo"]
                    break
            except Exception as e:
                say(f"GitHub search notice: {e}")

    if not repo_target:
        return {"status": "not_found", "query": query_or_repo, "message": "No matching skill, MCP, API, or agent found"}

    say(f"Fetching candidate capability from internet: {repo_target} ...")
    try:
        checkout, revision = fetch_repo(repo_target, allow_network=True)
        found = discover_skills(checkout)
        if found:
            added = []
            for name, folder, desc in found:
                clean_name = sanitize_skill_name(name)
                if not clean_name:
                    continue
                dst = LIB / clean_name
                if dst.exists() and not force:
                    continue
                safe_copy(folder, dst)
                state["skills"][clean_name] = {"repo": repo_target, "commit": revision, "path": str(dst)}
                hot_link_skill(clean_name, targets=targets)
                added.append(clean_name)

            state["sources"][repo_target] = {"commit": revision, "discovered": len(found), "selected": len(added)}
            save_state(state)
            return {"status": "installed", "repo": repo_target, "skills_added": added, "skill": added[0] if added else None}

        # Repo is an MCP Server, API SDK, or Agent without literal SKILL.md — synthesize wrapper from README
        readme_excerpt = ""
        for rname in ("README.md", "readme.md", "package.json"):
            rfile = checkout / rname
            if rfile.is_file():
                try:
                    readme_excerpt = rfile.read_text(encoding="utf-8", errors="ignore")[:2000]
                    break
                except OSError:
                    pass
        slug = sanitize_skill_name(repo_target.split("/")[-1]) or "capability"
        purpose = candidate_meta.get("description") or f"Internet-provisioned capability from {repo_target}"
        dest = create_mcp_skill_wrapper(slug, f"https://github.com/{repo_target}", purpose, tools_spec=readme_excerpt, targets=targets)
        state["skills"][dest.name] = {"repo": repo_target, "commit": revision, "path": str(dest)}
        save_state(state)
        return {"status": "synthesized_capability", "repo": repo_target, "skill": dest.name}
    except Exception as exc:
        # Fallback: synthesize capability wrapper from GitHub search metadata so the agent can still use it
        if repo_target:
            slug = sanitize_skill_name(repo_target.split("/")[-1]) or "capability"
            purpose = candidate_meta.get("description") or f"Internet capability {repo_target}"
            dest = create_mcp_skill_wrapper(slug, candidate_meta.get("url") or f"https://github.com/{repo_target}", purpose, targets=targets)
            state["skills"][dest.name] = {"repo": repo_target, "commit": "metadata", "path": str(dest)}
            save_state(state)
            return {"status": "synthesized_capability", "repo": repo_target, "skill": dest.name, "note": str(exc)}
        return {"status": "error", "repo": repo_target, "error": str(exc)}


def recommend_fullstack_bundle(prompt: str) -> dict:
    """Synthesize a complete full-stack capability stack across Frontend, Motion, Backend, Database, QA, and Internet MCPs,
    while checking whether the user elaborated their product vision (since VeloMesh cannot read the user's mind).
    """
    text = (prompt or "").strip()
    words = re.findall(r"[a-zA-Z0-9_-]+", text.lower())
    word_set = set(words)

    # Check product-vision dimensions
    has_domain_or_audience = any(w in word_set for w in (
        "saas", "dashboard", "fintech", "cfo", "healthcare", "ecommerce", "marketplace", "crm", "developer",
        "cli", "studio", "platform", "analytics", "workflow", "treasury", "billing", "portfolio", "fitness",
        "booking", "editor", "collab", "multi-tenant", "multitenant", "b2b", "consumer", "portal", "product"
    )) and len(words) >= 8
    has_features_or_flow = any(w in word_set for w in (
        "auth", "login", "webhook", "stripe", "chart", "graph", "forecast", "table", "search", "upload",
        "realtime", "websocket", "notification", "export", "crud", "ledger", "payment", "pipeline",
        "subscription", "onboarding", "interactive", "canvas", "webgl", "api", "schema", "rls"
    ))
    has_aesthetic_or_stack = any(w in word_set for w in (
        "linear", "vercel", "stripe", "raycast", "framer", "awwwards", "dark", "minimal", "editorial",
        "glass", "brutalist", "cinematic", "react", "nextjs", "fastapi", "postgres", "postgresql", "supabase",
        "tailwind", "gsap", "webgl", "three", "typescript", "node", "python"
    ))

    missing = []
    if not has_domain_or_audience:
        missing.append("target_audience_and_product_domain (who is it for & what core problem does it solve?)")
    if not has_features_or_flow:
        missing.append("core_user_workflows_and_features (what are the key actions, data flows, or integrations?)")
    if not has_aesthetic_or_stack:
        missing.append("aesthetic_direction_or_stack_preferences (what visual mood, reference brand, or stack constraints?)")

    needs_elaboration = len(words) < 10 or len(missing) >= 2
    vision_check = {
        "status": "needs_elaboration" if needs_elaboration else "ready_for_autonomous_build",
        "word_count": len(words),
        "missing_dimensions": missing,
        "recommended_clarifier_skills": ["brainstorming", "grilling"] if needs_elaboration else [],
        "guidance": (
            "VeloMesh automates 100% of skills, MCP servers, APIs, databases, and subagents—but it cannot get inside your brain "
            "or think like you. Because this prompt is underspecified, ask 2–3 sharp clarifying questions (via brainstorming/grilling) "
            "about product vision, user workflows, and aesthetic vibe before writing generic code."
            if needs_elaboration else
            "Vision is richly elaborated. Execute the complete full-stack build autonomously in one shot across Frontend, Motion, "
            "Backend, Database, and Browser QA without asking for manual skill or MCP configuration."
        ),
    }

    layers = {
        "frontend_ui": [
            "frontend-design",
            "impeccable",
            "ui-ux-pro-max",
            "web-design-guidelines",
            "design-system-references",
        ],
        "motion_interactive": [
            "gsap-core",
            "gsap-scrolltrigger",
            "emil-design-eng",
        ],
        "backend_api": [
            "backend-patterns",
            "api-connector-builder",
            "security-review",
        ],
        "database_state": [
            "postgres-patterns",
            "prisma-patterns",
            "database-migrations",
        ],
        "testing_qa": [
            "test-driven-development",
            "browser-qa",
            "systematic-debugging",
            "verification-before-completion",
        ],
        "platform_native_skills": local_recommend(text, limit=8),
        "internet_provisioning": {
            "tool": "discover_and_install_capability",
            "local_matches": local_recommend(text, limit=6),
            "curated_mcp": [
                v for v in catalog()["mcp_recommendations"]
                if any(t in tokenize(v["name"] + " " + v["purpose"]) for t in tokenize(text))
            ][:4],
        },
    }

    return {
        "prompt": text,
        "vision_check": vision_check,
        "layers": layers,
        "anti_slop_mandate": (
            "Never generate flat static HTML tables or generic AI dark cards. Enforce interactive Canvas/WebGL visuals, "
            "GSAP ScrollTrigger choreography, custom cubic-bezier physics (emil-design-eng), and reference design tokens "
            "(Linear, Raycast, Stripe, Vercel, Framer)."
        ),
    }


def audit_ui(target: str) -> dict:
    """Audit a file, directory, or URL for AI-slop UI anti-patterns using both built-in craft-floor rules
    and the impeccable detector binary when available.
    """
    violations = []
    p = Path(target)
    files_to_scan = []
    if p.is_file():
        files_to_scan.append(p)
    elif p.is_dir():
        for ext in ("*.html", "*.css", "*.jsx", "*.tsx", "*.vue", "*.svelte"):
            files_to_scan.extend(p.rglob(ext))

    emoji_re = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]")
    for f in files_to_scan[:50]:
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if "background-clip: text" in text or "-webkit-background-clip: text" in text:
            violations.append({"file": str(f), "rule": "gradient-text", "message": "Avoid background-clip: text gradient headings (AI slop tell). Use solid typography weight and scale."})
        if re.search(r"box-shadow:\s*0(?:px)?\s+0(?:px)?\s+\d+px\s+(?:#|rgba?\()", text):
            violations.append({"file": str(f), "rule": "dark-glow", "message": "Avoid zero-offset colored neon box-shadow glows. Use neutral elevation or 1px structural hairlines."})
        if re.search(r"font-size:\s*(?:0\.[0-6]\d*rem|[0-9]px|10px|11px)", text):
            violations.append({"file": str(f), "rule": "undersized-ui-text", "message": "Functional UI text below 12px (0.75rem) fails the legibility floor."})
        if re.search(r"Plus Jakarta Sans|Syne|Fraunces|Space Grotesk", text, re.IGNORECASE):
            violations.append({"file": str(f), "rule": "overused-font", "message": "Avoid overused AI default display fonts (Plus Jakarta Sans, Syne, Fraunces, Space Grotesk)."})
        if f.suffix in (".html", ".jsx", ".tsx") and emoji_re.search(text):
            violations.append({"file": str(f), "rule": "emoji-in-ui", "message": "Do not use raw Unicode emojis as UI icons; use crisp monochrome SVG icons."})

    # Also invoke impeccable detect if installed on machine
    imp_candidates = [
        HOME / ".gemini" / "config" / "skills" / "impeccable" / "scripts" / "impeccable",
        ROOT / "skills" / "impeccable" / "scripts" / "impeccable",
    ]
    imp_bin = next((c for c in imp_candidates if c.is_file()), None)
    imp_output = ""
    if imp_bin:
        try:
            res = subprocess.run([str(imp_bin), "detect", target], capture_output=True, text=True, timeout=15)
            imp_output = (res.stdout or "") + (res.stderr or "")
            for line in imp_output.splitlines():
                m = re.match(r"^\s+\[([a-z0-9-]+)\]\s+(.*)$", line)
                if m:
                    violations.append({"file": target, "rule": m.group(1), "message": m.group(2).strip()})
        except Exception:
            pass

    return {
        "target": target,
        "status": "clean" if not violations else "slop_detected",
        "violation_count": len(violations),
        "violations": violations[:40],
    }


def discover(args):
    result = {"query": args.query, "installed_matches": local_recommend(args.query)}
    result["curated_mcp"] = [v for v in catalog()["mcp_recommendations"] if any(t in tokenize(v["name"] + " " + v["purpose"]) for t in tokenize(args.query))]
    if not args.local_only:
        kinds = ["skill", "mcp", "agent"] if args.kind == "all" else [args.kind]
        result["github_candidates"] = {}
        for kind in kinds:
            try:
                result["github_candidates"][kind] = github_search(args.query, kind, limit=5)
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as e:
                result["github_candidates"][kind] = {"error": str(e)}
    result["caution"] = "Discovery is advisory; candidates are not verified or installed. Inspect source, license, maintenance and permissions before adding."
    print(json.dumps(result, indent=2))


def status(args):
    state = load_state()
    platform = discover_platform_skills()
    print(json.dumps({"hub": str(ROOT), "skills": len(state["skills"]), "platform_skills": len(platform), "by_source": state["sources"], "targets": {key: {"path": str(path), "exists": path.is_dir()} for key, path in TARGETS.items()}, "copilot_app_rule": str(ROOT / "copilot-app-instructions.txt")}, indent=2))


def print_catalog(args):
    for s in catalog()["sources"]:
        say(f"{s['level']:<12} {s['repo']:<43} {s['category']}")
    say("\nMCP suggestions (not automatically enabled):")
    for entry in catalog()["mcp_recommendations"]:
        say(f"  {entry['name']}: {entry.get('repo', entry.get('url'))}")


def _node_binary() -> str:
    return shutil.which("node") or ("/opt/homebrew/bin/node" if Path("/opt/homebrew/bin/node").exists() else "node")


def _gateway_script() -> Path:
    candidates = [
        BUNDLE / "scripts" / "gateway.mjs",
        HOME / ".velomesh" / "scripts" / "gateway.mjs",
        HOME / ".local" / "share" / "agent-fusion" / "scripts" / "gateway.mjs",
    ]
    return next((c for c in candidates if c.is_file()), candidates[0])


def _gateway_pid_file() -> Path:
    data_dir = Path(os.environ.get("AGENT_FUSION_DATA_DIR", str(HOME / ".agent-fusion" / "data"))).expanduser()
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "gateway.pid"


def _gateway_health(port: int) -> dict | None:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=1.5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def _ensure_gateway_running(port: int = 4190) -> dict | None:
    health = _gateway_health(port)
    if health:
        return health
    gw = _gateway_script()
    if not gw.is_file():
        raise RuntimeError(f"gateway script not found: {gw}")
    node_bin = _node_binary()
    proc = subprocess.Popen(
        [node_bin, str(gw), "--port", str(port)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        start_new_session=True,
    )
    _gateway_pid_file().write_text(f"{proc.pid}\n", encoding="utf-8")
    for _ in range(20):
        time.sleep(0.15)
        health = _gateway_health(port)
        if health:
            return health
    return None


def cmd_gateway(args):
    action = args.action
    port = args.port
    gw = _gateway_script()
    node_bin = _node_binary()
    if action == "hud":
        res = subprocess.run([node_bin, str(gw), "--hud"], check=True)
        return res.returncode
    if action == "status":
        health = _gateway_health(port)
        if not health:
            say(json.dumps({"ok": False, "port": port, "status": "stopped"}, indent=2))
            return 1
        say(json.dumps(health, indent=2))
        return 0
    if action == "start":
        already = _gateway_health(port)
        if already:
            say(json.dumps({"status": "already_running", "port": port, "endpoint": f"http://127.0.0.1:{port}/v1"}, indent=2))
            return 0
        health = _ensure_gateway_running(port)
        if not health:
            raise RuntimeError(f"Timed out waiting for VeloMesh gateway on 127.0.0.1:{port}")
        say(json.dumps({"status": "started", "port": port, "endpoint": f"http://127.0.0.1:{port}/v1"}, indent=2))
        return 0
    if action == "stop":
        stopped = False
        for pf in (_gateway_pid_file(), HOME / ".agent-fusion" / "data" / "gateway.pid", HOME / ".velomesh" / "data" / "gateway.pid"):
            if pf.is_file():
                try:
                    pid = int(pf.read_text(encoding="utf-8").strip())
                    os.kill(pid, 15)
                    stopped = True
                except Exception:
                    pass
                pf.unlink(missing_ok=True)
        say(json.dumps({"status": "stopped" if stopped else "not_running", "port": port}, indent=2))
        return 0
    if action == "install-service":
        log_dir = HOME / ".velomesh" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        node_dir = str(Path(node_bin).parent)
        path_env = os.pathsep.join([node_dir, "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", str(HOME / ".local" / "bin")])
        if sys.platform == "darwin":
            plist_path = HOME / "Library" / "LaunchAgents" / "dev.velomesh.gateway.plist"
            plist_path.parent.mkdir(parents=True, exist_ok=True)
            import plistlib
            plist_obj = {
                "Label": "dev.velomesh.gateway",
                "ProgramArguments": [node_bin, str(gw), "--port", str(port)],
                "RunAtLoad": True,
                "KeepAlive": True,
                "EnvironmentVariables": {"PATH": path_env, "VELOMESH_PORT": str(port)},
                "StandardOutPath": str(log_dir / "gateway.out.log"),
                "StandardErrorPath": str(log_dir / "gateway.err.log"),
            }
            plist_path.write_bytes(plistlib.dumps(plist_obj))
            uid = os.getuid()
            # Stop any manual background PID (new or legacy pid file) before launchd takes over
            for pid_file in (_gateway_pid_file(), HOME / ".agent-fusion" / "data" / "gateway.pid", HOME / ".velomesh" / "data" / "gateway.pid"):
                if pid_file.is_file():
                    try:
                        os.kill(int(pid_file.read_text(encoding="utf-8").strip()), 15)
                        time.sleep(0.2)
                    except Exception:
                        pass
                    pid_file.unlink(missing_ok=True)
            subprocess.run(["launchctl", "bootout", f"gui/{uid}/dev.velomesh.gateway"], capture_output=True)
            r = subprocess.run(["launchctl", "bootstrap", f"gui/{uid}", str(plist_path)], capture_output=True, text=True)
            if r.returncode != 0:
                subprocess.run(["launchctl", "load", "-w", str(plist_path)], capture_output=True, text=True)
            say(json.dumps({"status": "service_installed", "platform": "darwin", "plist": str(plist_path), "endpoint": f"http://127.0.0.1:{port}/v1"}, indent=2))
            return 0
        if sys.platform.startswith("linux"):
            unit_path = HOME / ".config" / "systemd" / "user" / "velomesh-gateway.service"
            unit_path.parent.mkdir(parents=True, exist_ok=True)
            unit_path.write_text(
                "[Unit]\nDescription=VeloMesh Multi-Model Orchestrator Gateway\nAfter=network.target\n\n"
                "[Service]\nType=simple\n"
                f"Environment=\"PATH={path_env}\"\n"
                f"Environment=\"VELOMESH_PORT={port}\"\n"
                f"ExecStart={node_bin} {gw} --port {port}\n"
                "Restart=always\nRestartSec=2\n\n"
                "[Install]\nWantedBy=default.target\n",
                encoding="utf-8",
            )
            subprocess.run(["systemctl", "--user", "daemon-reload"], capture_output=True)
            subprocess.run(["systemctl", "--user", "enable", "--now", "velomesh-gateway.service"], capture_output=True)
            say(json.dumps({"status": "service_installed", "platform": "linux", "unit": str(unit_path), "endpoint": f"http://127.0.0.1:{port}/v1"}, indent=2))
            return 0
        health = _ensure_gateway_running(port)
        say(json.dumps({"status": "started" if health else "failed", "port": port}, indent=2))
        return 0 if health else 1
    if action == "uninstall-service":
        if sys.platform == "darwin":
            plist_path = HOME / "Library" / "LaunchAgents" / "dev.velomesh.gateway.plist"
            uid = os.getuid()
            subprocess.run(["launchctl", "bootout", f"gui/{uid}/dev.velomesh.gateway"], capture_output=True)
            subprocess.run(["launchctl", "unload", "-w", str(plist_path)], capture_output=True)
            plist_path.unlink(missing_ok=True)
        elif sys.platform.startswith("linux"):
            unit_path = HOME / ".config" / "systemd" / "user" / "velomesh-gateway.service"
            subprocess.run(["systemctl", "--user", "disable", "--now", "velomesh-gateway.service"], capture_output=True)
            unit_path.unlink(missing_ok=True)
        say(json.dumps({"status": "service_uninstalled"}, indent=2))
        return 0


def cmd_optimize_prompt(args):
    opt_path = _gateway_script().parent / "prompt-optimizer.mjs"
    cat_path = _gateway_script().parent / "catalog.mjs"
    if not opt_path.is_file():
        raise RuntimeError(f"prompt-optimizer.mjs not found at {opt_path}")
    payload = {
        "prompt": args.prompt,
        "requestedModel": args.model,
        "workspacePath": os.getcwd(),
    }
    env = os.environ.copy()
    env["VELOMESH_OPT_URL"] = opt_path.resolve().as_uri()
    env["VELOMESH_CAT_URL"] = cat_path.resolve().as_uri()
    env["VELOMESH_OPT_INPUT"] = json.dumps(payload)
    res = subprocess.run(
        [
            _node_binary(),
            "--input-type=module",
            "-e",
            (
                "const [{ optimizePrompt }, { discover }] = await Promise.all(["
                "import(process.env.VELOMESH_OPT_URL), import(process.env.VELOMESH_CAT_URL)]);"
                "const input = JSON.parse(process.env.VELOMESH_OPT_INPUT);"
                "const out = optimizePrompt(input.prompt, { catalog: discover(input.workspacePath), workspacePath: input.workspacePath, requestedModel: input.requestedModel, checkClis: true });"
                "process.stdout.write(JSON.stringify(out, null, 2) + '\\n');"
            ),
        ],
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    sys.stdout.write(res.stdout)


def cmd_hooks(args):
    hooks_script = _gateway_script().parent / "hooks.mjs"
    if not hooks_script.is_file():
        raise RuntimeError(f"hooks.mjs not found at {hooks_script}")
    if args.action == "install":
        configured = configure_harness_hooks(_node_binary(), str(hooks_script))
        say(json.dumps({"status": "hooks_configured", "targets": configured}, indent=2))
        return 0
    res = subprocess.run([_node_binary(), str(hooks_script), "status"], check=True)
    return res.returncode


def cmd_route_model(args):
    router_path = _gateway_script().parent / "model-router.mjs"
    if not router_path.is_file():
        raise RuntimeError(f"model-router.mjs not found at {router_path}")
    payload = {
        "prompt": args.prompt,
        "requestedModel": args.model,
        "previousModel": args.previous_model,
        "record": False,
    }
    env = os.environ.copy()
    env["VELOMESH_ROUTER_URL"] = router_path.resolve().as_uri()
    env["VELOMESH_ROUTE_INPUT"] = json.dumps(payload)
    res = subprocess.run(
        [
            _node_binary(),
            "--input-type=module",
            "-e",
            "const m=await import(process.env.VELOMESH_ROUTER_URL);const d=m.selectModelForTurn(JSON.parse(process.env.VELOMESH_ROUTE_INPUT));process.stdout.write(JSON.stringify(d,null,2)+'\\n');",
        ],
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    sys.stdout.write(res.stdout)


def _expanded_search_path() -> str:
    extras = ["/opt/homebrew/bin", "/usr/local/bin", str(HOME / ".local" / "bin"), str(HOME / ".npm-global" / "bin"), str(HOME / ".bun" / "bin")]
    existing = os.environ.get("PATH", "")
    return os.pathsep.join(extras + ([existing] if existing else []))


def cmd_claude(extra_args: list[str], port: int = 4190):
    claude_bin = shutil.which("claude", path=_expanded_search_path())
    if not claude_bin:
        raise RuntimeError("claude CLI not found on PATH. Install Claude Code CLI first.")
    _ensure_gateway_running(port)
    env = os.environ.copy()
    env["ANTHROPIC_BASE_URL"] = f"http://127.0.0.1:{port}"
    env["ANTHROPIC_AUTH_TOKEN"] = env.get("VELOMESH_API_KEY", "velomesh-local")
    has_model_flag = any(a == "--model" or a.startswith("--model=") for a in extra_args)
    launch_args = [claude_bin]
    if not has_model_flag:
        launch_args.extend(["--model", "velomesh/auto"])
    launch_args.extend(extra_args)
    os.execvpe(claude_bin, launch_args, env)


def main():
    parser = argparse.ArgumentParser(description="VeloMesh universal multi-model orchestrator and capability engine")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("setup", help="Add curated GitHub skills and sync to all supported harnesses")
    p.add_argument("--profile", choices=tuple(LEVELS), default="recommended")
    p.add_argument("--yes", action="store_true", help="Consent to fetching curated GitHub repositories")
    p.add_argument("--offline", action="store_true", help="Use only cached GitHub sources")
    p = sub.add_parser("sync", help="Synchronize installed local skills to harness locations")
    p.add_argument("--all", action="store_true", help="Sync all library skills, not only core")
    p = sub.add_parser("install-skill", help="Download or link a skill/repo on the fly")
    p.add_argument("query", help="Skill name, query, or owner/repo")
    p.add_argument("--force", action="store_true")
    p = sub.add_parser("discover", help="Suggest relevant installed skills and search GitHub for candidates")
    p.add_argument("query", help="Natural language task or keywords")
    p.add_argument("--kind", choices=("all", "skill", "mcp", "agent"), default="all")
    p.add_argument("--local-only", action="store_true")
    p = sub.add_parser("bundle", help="Synthesize a full-stack one-prompt capability bundle and check vision clarity")
    p.add_argument("query", help="User prompt to evaluate and route across full-stack layers")
    p = sub.add_parser("audit-ui", help="Audit a UI directory, file, or URL against the anti-AI-slop craft floor")
    p.add_argument("target", help="File path, directory, or URL to audit")
    p = sub.add_parser("route-model", help="Evaluate dynamic multi-model routing for a prompt")
    p.add_argument("prompt", help="Prompt text to route")
    p.add_argument("--model", default="velomesh/auto", help="Virtual model ID (default: velomesh/auto)")
    p.add_argument("--previous-model", default=None, help="Previous turn model to evaluate mid-execution switching")
    p = sub.add_parser("optimize", help="Optimize a raw user prompt with platform skills, constraints, and model routing")
    p.add_argument("prompt", help="Prompt text to optimize")
    p.add_argument("--model", default="velomesh/auto", help="Virtual model ID (default: velomesh/auto)")
    p = sub.add_parser("hooks", help="Inspect or install VeloMesh Super-Hooks suite (RTK, Security Guard, Prompt Optimizer, UI Gate)")
    p.add_argument("action", choices=("status", "install"), default="status", nargs="?")
    p = sub.add_parser("gateway", help="Manage the local VeloMesh multi-model gateway daemon")
    p.add_argument("action", choices=("start", "stop", "status", "hud", "install-service", "uninstall-service"))
    p.add_argument("--port", type=int, default=int(os.environ.get("VELOMESH_PORT", "4190")))
    p = sub.add_parser("claude", help="Launch Claude Code scoped cleanly to VeloMesh velomesh/auto without overwriting OAuth")
    p.add_argument("--port", type=int, default=int(os.environ.get("VELOMESH_PORT", "4190")))
    sub.add_parser("uninstall-rules", help="Remove managed rules from all harness configurations")
    sub.add_parser("status", help="Show manifest and destination paths")
    sub.add_parser("catalog", help="Show curated upstream repositories")
    args, unknown = parser.parse_known_args()
    if args.command != "claude" and unknown:
        parser.error(f"unrecognized arguments: {' '.join(unknown)}")
    try:
        if args.command == "setup":
            setup(args)
        elif args.command == "sync":
            bundled = install_bundled_skills()
            state = load_state()
            linked, skipped = sync(state, core_only=not getattr(args, "all", False))
            save_state(state)
            say(f"Synced {linked} links/copies (+{len(bundled)} bundled skills). Existing conflicts preserved: {skipped}.")
        elif args.command == "install-skill":
            res = install_skill(args.query, force=args.force)
            say(json.dumps(res, indent=2))
        elif args.command == "discover":
            discover(args)
        elif args.command == "bundle":
            say(json.dumps(recommend_fullstack_bundle(args.query), indent=2))
        elif args.command == "audit-ui":
            say(json.dumps(audit_ui(args.target), indent=2))
        elif args.command == "route-model":
            cmd_route_model(args)
        elif args.command == "optimize":
            cmd_optimize_prompt(args)
        elif args.command == "hooks":
            code = cmd_hooks(args)
            if code:
                sys.exit(code)
        elif args.command == "gateway":
            code = cmd_gateway(args)
            if code:
                sys.exit(code)
        elif args.command == "claude":
            cmd_claude(unknown, port=args.port)
        elif args.command == "status":
            status(args)
        elif args.command == "catalog":
            print_catalog(args)
        elif args.command == "uninstall-rules":
            uninstall_rules()
            say("Managed rules removed.")
    except (OSError, RuntimeError, KeyboardInterrupt) as exc:
        say(f"Error: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    main()
