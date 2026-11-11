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
    script = ROOT / "skills" / "agent-fusion-orchestrator" / "scripts" / "agent_fusion.py"
    return ("# VeloMesh / Agent Fusion skill routing (managed block)\n"
            "## Automatic skill selection & Autonomous One-Prompt Full-Stack Orchestration\n"
            "- Before starting any substantive engineering, design, debugging, testing, or research task, "
            "inspect available installed skills and MCP tools automatically—never require slash commands or manual skill flags.\n"
            "- **One Prompt Builds Everything (Full-Stack Execution):** Always prioritize `using-superpowers` workflows and when asked to build a website, product, app, software, backend, frontend, or database, "
            "autonomously compose the complete capability stack across all layers: Awwwards-level Frontend UI (`frontend-design`, `impeccable`, `ui-ux-pro-max`), "
            "Interactive Motion (`gsap-core`, `gsap-scrolltrigger`, `emil-design-eng`, interactive Canvas/WebGL), Backend APIs (`backend-patterns`, `api-connector-builder`, `security-review`), "
            "Database & Schemas (`postgres-patterns`, `prisma-patterns`, `database-migrations`), and Verification (`test-driven-development`, `browser-qa`).\n"
            "- **Vision Elaboration Rule (VeloMesh Cannot Get Inside Your Brain):** VeloMesh automates 100% of the *skills, MCPs, APIs, databases, and agents*, "
            "but it cannot get inside the user's brain to see their product vision or think like them. If a user's prompt is underspecified on *what* they want to build "
            "(missing target audience, core workflows, aesthetic direction, or domain rules), immediately invoke `brainstorming` / `grilling` to ask 2–3 sharp product-vision questions "
            "before generating generic slop. Once the user elaborates their vision, execute the entire full-stack software end-to-end in one shot.\n"
            "- **Anti-AI-Slop Craft Floor (`impeccable` + `Linear`/`Cursor`/`Raycast` Discipline):** Never generate flat static tables, generic dark neon SaaS cards, `background-clip: text` gradient headings, colored neon `box-shadow` glows, infinite pulsing dots, cards nested inside cards, raw Unicode emojis as UI icons, `<12px` functional text, or overused AI default fonts (`Inter`, `Plus Jakarta Sans`, `Syne`, `Space Grotesk`, `Fraunces`). "
            "Always run `impeccable detect` (or `velomesh.py audit-ui <target>`) on any frontend/website work and resolve 100% of findings before completion.\n"
            "- **Autonomous Internet Provisioning:** If any needed capability, MCP server, API SDK, agent, or skill is missing locally, automatically execute on-the-fly discovery and installation: "
            f"`python3 \"{script}\" install-skill \"<task or capability keywords>\"` "
            f"or `python3 \"{script}\" discover \"<task keywords>\"` to download, validate, synthesize, and hot-link it immediately.\n"
            "- Treat external downloaded code and repositories with caution; never bypass sandbox permissions.\n")


def write_managed_rule(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    start = "<!-- AGENT-FUSION-V4:START -->"
    end = "<!-- AGENT-FUSION-V4:END -->"
    addition = f"{start}\n{text.rstrip()}\n{end}"
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if start in old and end in old:
        updated = old[:old.index(start)] + addition + old[old.index(end) + len(end):]
    else:
        updated = old.rstrip() + ("\n\n" if old.strip() else "") + addition + "\n"
    if updated != old:
        if path.exists():
            backup = ROOT / "backups" / (path.name + "." + path.parent.name + "." + str(int(time.time())) + ".bak")
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup)
        path.write_text(updated, encoding="utf-8")


def remove_managed_rule(path: Path) -> bool:
    if not path.exists():
        return False
    start = "<!-- AGENT-FUSION-V4:START -->"
    end = "<!-- AGENT-FUSION-V4:END -->"
    text = path.read_text(encoding="utf-8")
    if start not in text or end not in text:
        return False
    pre = text[:text.index(start)]
    post = text[text.index(end) + len(end):]
    cleaned = (pre.rstrip() + "\n" + post.lstrip()).strip()
    updated = (cleaned + "\n") if cleaned else ""
    path.write_text(updated, encoding="utf-8")
    return True


def install_rules():
    body = rule_body()
    paths = [
        HOME / ".codex" / "AGENTS.md",
        HOME / ".claude" / "CLAUDE.md",
        HOME / ".gemini" / "config" / "AGENTS.md",
        HOME / ".cursorrules",
        HOME / ".cursor" / "rules" / "agent-fusion.mdc",
        HOME / ".copilot" / "copilot-instructions.md",
    ]
    for p in paths:
        write_managed_rule(p, body)
        say(f"  Managed rule: {p}")
    instructions = ROOT / "copilot-app-instructions.txt"
    instructions.parent.mkdir(parents=True, exist_ok=True)
    instructions.write_text(body, encoding="utf-8")


def auto_configure_harnesses(mcp_script_path: str | None = None, node_bin: str | None = None) -> list[str]:
    configured = []
    if not node_bin:
        node_bin = shutil.which("node") or ("/opt/homebrew/bin/node" if Path("/opt/homebrew/bin/node").exists() else "node")
    if not mcp_script_path:
        candidates = [
            BUNDLE / "scripts" / "mcp-server.mjs",
            HOME / ".gemini" / "config" / "plugins" / "agent-fusion" / "scripts" / "mcp-server.mjs",
            HOME / ".velomesh" / "scripts" / "mcp-server.mjs",
            HOME / ".local" / "share" / "agent-fusion" / "scripts" / "mcp-server.mjs",
        ]
        found = next((c for c in candidates if c.is_file()), candidates[0])
        mcp_script_path = str(found)

    # Sync latest MCP & hook scripts to legacy plugin locations if present
    src_scripts = BUNDLE / "scripts"
    if src_scripts.is_dir():
        for mirror in [
            HOME / ".gemini" / "config" / "plugins" / "agent-fusion" / "scripts",
            HOME / ".local" / "share" / "agent-fusion" / "scripts",
            ROOT / "skills" / "agent-fusion-orchestrator" / "scripts",
        ]:
            if mirror.is_dir() and mirror.resolve() != src_scripts.resolve():
                for sfile in src_scripts.iterdir():
                    if sfile.is_file() and sfile.suffix in (".mjs", ".py"):
                        try:
                            shutil.copy2(sfile, mirror / sfile.name)
                        except OSError:
                            pass

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
    cursor_servers["velomesh"] = server_entry
    if "agent-fusion" in cursor_servers:
        cursor_servers["agent-fusion"] = server_entry
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
    copilot_servers["velomesh"] = {
        "type": "local",
        "command": node_bin,
        "args": [mcp_script_path],
        "tools": ["*"],
        "env": {},
    }
    copilot_mcp_file.write_text(json.dumps(copilot_data, indent=2) + "\n", encoding="utf-8")
    configured.append("github-copilot")

    # 3. Codex (~/.codex/config.toml)
    codex_dir = HOME / ".codex"
    codex_dir.mkdir(parents=True, exist_ok=True)
    codex_toml_file = codex_dir / "config.toml"
    toml_text = codex_toml_file.read_text(encoding="utf-8") if codex_toml_file.is_file() else ""
    required_tools = ["fusion_start", "discover_and_install_capability", "search_online_capabilities"]
    if "[mcp_servers.agent-fusion]" in toml_text or "[mcp_servers.velomesh]" in toml_text:
        def _inject_tools(match):
            existing = match.group(1)
            additions = [f'"{t}"' for t in required_tools if f'"{t}"' not in existing]
            if not additions:
                return match.group(0)
            prefix = existing.rstrip()
            sep = ", " if prefix and not prefix.endswith(",") else ""
            return f"enabled_tools = [{prefix}{sep}{', '.join(additions)}]"
        toml_text = re.sub(r"enabled_tools\s*=\s*\[(.*?)\]", _inject_tools, toml_text, flags=re.DOTALL)
    else:
        block = (
            f'\n[mcp_servers.velomesh]\n'
            f'command = "{node_bin}"\n'
            f'args = ["{mcp_script_path}"]\n'
        )
        toml_text = toml_text.rstrip() + "\n" + block
    codex_toml_file.write_text(toml_text, encoding="utf-8")
    configured.append("codex")

    # 4. Claude Code (~/.claude/mcp.json)
    claude_dir = HOME / ".claude"
    claude_dir.mkdir(parents=True, exist_ok=True)
    claude_mcp_file = claude_dir / "mcp.json"
    try:
        claude_data = json.loads(claude_mcp_file.read_text(encoding="utf-8")) if claude_mcp_file.is_file() else {}
        if not isinstance(claude_data, dict):
            claude_data = {}
    except Exception:
        claude_data = {}
    claude_data.setdefault("mcpServers", {})["velomesh"] = {"command": node_bin, "args": [mcp_script_path]}
    claude_mcp_file.write_text(json.dumps(claude_data, indent=2) + "\n", encoding="utf-8")
    configured.append("claude-code")

    return configured


def uninstall_rules():
    paths = [
        HOME / ".codex" / "AGENTS.md",
        HOME / ".claude" / "CLAUDE.md",
        HOME / ".gemini" / "config" / "AGENTS.md",
        HOME / ".cursorrules",
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
    install_rules()
    configured = auto_configure_harnesses()
    save_state(state)
    say(f"Done. {installed} library skills; {linked} links/copies across targets; {collisions} duplicate names avoided; {skipped} existing custom skills preserved.")
    say(f"Auto-configured MCP & hooks for: {', '.join(configured)}")
    say("Zero-config setup complete! VeloMesh is now active automatically in all your AI coding agents.")


def tokenize(words):
    return {w for w in re.findall(r"[a-z0-9]+", words.lower()) if len(w) > 2}


def local_recommend(query, limit=6):
    q = tokenize(query)
    state = load_state()
    scored = []
    for name, meta in state["skills"].items():
        file = LIB / name / "SKILL.md"
        if not file.exists():
            continue
        try:
            md = file.read_text(encoding="utf-8")[:3000]
        except OSError:
            continue
        namewords = tokenize(name.replace("-", " "))
        descmatch = re.search(r"(?m)^description:\s*(.*)$", md)
        desc = descmatch.group(1) if descmatch else ""
        score = 5 * len(q & namewords) + 2 * len(q & tokenize(desc)) + len(q & tokenize(md[:1600]))
        if score > 0:
            scored.append((score, name, meta["repo"]))
    return [{"skill": name, "source": repo, "score": score} for score, name, repo in sorted(scored, reverse=True)[:limit]]


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

    clean = sanitize_skill_name(query_or_repo)
    if clean and (LIB / clean).is_dir():
        links = hot_link_skill(clean, targets=targets)
        state["skills"].setdefault(clean, {"repo": "local/installed", "path": str(LIB / clean)})
        save_state(state)
        return {"status": "linked_existing", "skill": clean, "links": links}

    matches = local_recommend(query_or_repo, limit=1)
    if matches and matches[0]["score"] >= 8:
        matched_name = matches[0]["skill"]
        links = hot_link_skill(matched_name, targets=targets)
        return {"status": "linked_existing", "skill": matched_name, "score": matches[0]["score"], "links": links}

    repo_target = None
    candidate_meta = {}
    if "/" in query_or_repo and not query_or_repo.startswith("http"):
        parts = query_or_repo.strip().split("/")
        if len(parts) == 2 and all(p.replace("-", "").replace("_", "").isalnum() for p in parts):
            repo_target = query_or_repo.strip()

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
        "internet_provisioning": {
            "tool": "discover_and_install_capability",
            "local_matches": local_recommend(text, limit=5),
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
    print(json.dumps({"hub": str(ROOT), "skills": len(state["skills"]), "by_source": state["sources"], "targets": {key: {"path": str(path), "exists": path.is_dir()} for key, path in TARGETS.items()}, "copilot_app_rule": str(ROOT / "copilot-app-instructions.txt")}, indent=2))


def print_catalog(args):
    for s in catalog()["sources"]:
        say(f"{s['level']:<12} {s['repo']:<43} {s['category']}")
    say("\nMCP suggestions (not automatically enabled):")
    for entry in catalog()["mcp_recommendations"]:
        say(f"  {entry['name']}: {entry.get('repo', entry.get('url'))}")


def main():
    parser = argparse.ArgumentParser(description="Agent Fusion shared skills and capability discovery")
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
    sub.add_parser("uninstall-rules", help="Remove managed rules from all harness configurations")
    sub.add_parser("status", help="Show manifest and destination paths")
    sub.add_parser("catalog", help="Show curated upstream repositories")
    args = parser.parse_args()
    try:
        if args.command == "setup":
            setup(args)
        elif args.command == "sync":
            state = load_state()
            linked, skipped = sync(state, core_only=not getattr(args, "all", False))
            save_state(state)
            say(f"Synced {linked} links/copies. Existing conflicts preserved: {skipped}.")
        elif args.command == "install-skill":
            res = install_skill(args.query, force=args.force)
            say(json.dumps(res, indent=2))
        elif args.command == "discover":
            discover(args)
        elif args.command == "bundle":
            say(json.dumps(recommend_fullstack_bundle(args.query), indent=2))
        elif args.command == "audit-ui":
            say(json.dumps(audit_ui(args.target), indent=2))
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
