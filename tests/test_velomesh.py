import json
import sys
import tempfile
import unittest
from unittest.mock import patch, MagicMock
import urllib.error
from pathlib import Path

# Add scripts directory to path
SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from velomesh import (
    TARGETS,
    CORE_SKILLS,
    is_core_skill,
    sanitize_skill_name,
    hot_link_skill,
    install_skill,
    create_mcp_skill_wrapper,
    discover_skills,
    safe_copy,
    load_state,
    save_state,
    github_search,
    write_managed_rule,
    remove_managed_rule,
    rule_body,
    catalog,
    MANAGED_MARKER,
)

class TestAgentFusionUniversalV4(unittest.TestCase):
    def test_catalog_sources_include_ecc_and_top_repos(self):
        cat = catalog()
        repos = {s["repo"]: s for s in cat["sources"]}
        
        self.assertIn("affaan-m/ECC", repos)
        self.assertEqual(repos["affaan-m/ECC"]["selection"], "all")
        self.assertIn("obra/superpowers", repos)
        self.assertEqual(repos["obra/superpowers"]["selection"], "all")
        self.assertIn("VoltAgent/awesome-agent-skills", repos)
        self.assertIn("VoltAgent/awesome-design-md", repos)
        
        mcp_names = {m["name"] for m in cat.get("mcp_recommendations", [])}
        self.assertTrue(any("mcp" in m.lower() for m in mcp_names))

    def test_targets_cover_all_six_harnesses(self):
        self.assertIn("cursor", TARGETS)
        self.assertIn("codex", TARGETS)
        self.assertIn("claude-code", TARGETS)
        self.assertIn("antigravity-app", TARGETS)
        self.assertIn("github-copilot", TARGETS)
        self.assertIn("opencode", TARGETS)
        self.assertTrue(str(TARGETS["cursor"]).endswith(".cursor/skills"))

    def test_core_skill_detection(self):
        self.assertTrue(is_core_skill("using-superpowers"))
        self.assertTrue(is_core_skill("test-driven-development"))
        self.assertTrue(is_core_skill("executing-plans"))
        self.assertTrue(is_core_skill("security-review"))
        self.assertTrue(is_core_skill("frontend-design"))
        self.assertFalse(is_core_skill("non-existent-random-skill-987"))

    def test_sanitize_skill_name_security(self):
        self.assertIsNone(sanitize_skill_name("../../etc/passwd"))
        self.assertIsNone(sanitize_skill_name("../skill"))
        self.assertIsNone(sanitize_skill_name("bad/name"))
        self.assertIsNone(sanitize_skill_name("name with spaces"))
        self.assertIsNone(sanitize_skill_name("a" * 65))
        self.assertEqual(sanitize_skill_name("valid-skill-123"), "valid-skill-123")
        self.assertEqual(sanitize_skill_name("Superpowers-Tdd"), "superpowers-tdd")

    def test_hot_link_skill(self):
        with tempfile.TemporaryDirectory() as tmp_lib, tempfile.TemporaryDirectory() as tmp_dest:
            lib_path = Path(tmp_lib)
            dest_path = Path(tmp_dest)
            
            mock_skill = lib_path / "test-hot-skill"
            mock_skill.mkdir()
            (mock_skill / "SKILL.md").write_text("---\nname: test-hot-skill\ndescription: Test\n---\nBody")
            
            with patch("velomesh.LIB", lib_path):
                targets = {"test-agent": dest_path}
                linked = hot_link_skill("test-hot-skill", targets=targets)
                self.assertEqual(linked, 1)
                
                target_link = dest_path / "test-hot-skill"
                self.assertTrue(target_link.exists() or target_link.is_symlink())
                self.assertTrue((target_link / "SKILL.md").exists())

    def test_create_mcp_skill_wrapper(self):
        with tempfile.TemporaryDirectory() as tmp_lib:
            lib_path = Path(tmp_lib)
            with patch("velomesh.LIB", lib_path):
                wrapper = create_mcp_skill_wrapper(
                    "context7-docs",
                    "upstash/context7",
                    "current framework and library docs"
                )
                self.assertTrue(wrapper.exists())
                content = (wrapper / "SKILL.md").read_text(encoding="utf-8")
                self.assertIn("name: mcp-context7-docs", content)
                self.assertIn("upstash/context7", content)

    def test_rules_injection_and_removal(self):
        body = rule_body()
        self.assertIn("Automatic skill selection", body)
        self.assertIn("using-superpowers", body)
        self.assertIn("discover", body)
        self.assertIn("install-skill", body)
        
        with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".md") as f:
            f.write("# User Custom Instructions\n\nPreserve this note at all costs.\n")
            f_path = Path(f.name)
        
        try:
            write_managed_rule(f_path, "# Managed Block Content\nAuto-route skills.")
            content = f_path.read_text(encoding="utf-8")
            self.assertIn("<!-- AGENT-FUSION-V4:START -->", content)
            self.assertIn("Preserve this note at all costs.", content)
            
            removed = remove_managed_rule(f_path)
            self.assertTrue(removed)
            restored = f_path.read_text(encoding="utf-8")
            self.assertNotIn("<!-- AGENT-FUSION-V4:START -->", restored)
            self.assertIn("Preserve this note at all costs.", restored)
        finally:
            f_path.unlink(missing_ok=True)

    def test_oversized_and_corrupted_skill_skipped(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            checkout = Path(tmp_dir)
            
            oversized_dir = checkout / "oversized-skill"
            oversized_dir.mkdir()
            (oversized_dir / "SKILL.md").write_text("---\nname: oversized-skill\ndescription: huge\n---\n" + ("x" * 160000))
            
            corrupt_dir = checkout / "corrupt-skill"
            corrupt_dir.mkdir()
            (corrupt_dir / "SKILL.md").write_bytes(b"\xff\xfe\x00\x00invalid-utf8\x80\x81")
            
            valid_dir = checkout / "valid-skill"
            valid_dir.mkdir()
            (valid_dir / "SKILL.md").write_text("---\nname: valid-skill\ndescription: valid\n---\nValid body")
            
            found = discover_skills(checkout)
            names = [item[0] for item in found]
            
            self.assertIn("valid-skill", names)
            self.assertNotIn("oversized-skill", names)
            self.assertNotIn("corrupt-skill", names)

    def test_unmanaged_custom_skills_never_overwritten(self):
        with tempfile.TemporaryDirectory() as lib_dir, tempfile.TemporaryDirectory() as target_dir:
            lib = Path(lib_dir)
            target = Path(target_dir)
            
            custom_dir = target / "my-custom-skill"
            custom_dir.mkdir()
            (custom_dir / "SKILL.md").write_text("User proprietary skill - DO NOT OVERWRITE")
            
            hub_skill = lib / "my-custom-skill"
            hub_skill.mkdir()
            (hub_skill / "SKILL.md").write_text("---\nname: my-custom-skill\ndescription: Hub version\n---\nHub body")
            
            with patch("velomesh.LIB", lib):
                linked = hot_link_skill("my-custom-skill", targets={"custom-harness": target})
                self.assertEqual(linked, 0)
                content = (custom_dir / "SKILL.md").read_text()
                self.assertIn("User proprietary skill - DO NOT OVERWRITE", content)

    @patch("urllib.request.urlopen")
    def test_github_search_handles_429_rate_limit(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.github.com/search/repositories",
            code=429,
            msg="Too Many Requests",
            hdrs={},
            fp=None,
        )
        results = github_search("react", "skill")
        self.assertEqual(results, [])

    def test_corrupted_manifest_recovery(self):
        with tempfile.TemporaryDirectory() as tmp_root:
            root_path = Path(tmp_root)
            manifest = root_path / "manifest.json"
            manifest.write_text("{ this is corrupted invalid json }}}")
            
            with patch("velomesh.ROOT", root_path), patch("velomesh.MANIFEST", manifest):
                state = load_state()
                self.assertEqual(state.get("schema"), 1)
                self.assertIn("skills", state)

    def test_auto_configure_harnesses_zero_config(self):
        from velomesh import auto_configure_harnesses
        with tempfile.TemporaryDirectory() as tmp_home:
            home_dir = Path(tmp_home)
            (home_dir / ".cursor").mkdir()
            (home_dir / ".copilot").mkdir()
            (home_dir / ".claude").mkdir()
            (home_dir / ".codex").mkdir()
            (home_dir / ".codex" / "config.toml").write_text('[mcp_servers.agent-fusion]\nenabled_tools = ["catalog"]\n')
            
            with patch("velomesh.HOME", home_dir):
                configured = auto_configure_harnesses()
                self.assertTrue(len(configured) >= 3)
                
                # Verify Cursor MCP auto-configured
                cursor_mcp = json.loads((home_dir / ".cursor" / "mcp.json").read_text())
                self.assertIn("velomesh", cursor_mcp["mcpServers"])
                
                # Verify Copilot MCP auto-configured
                copilot_mcp = json.loads((home_dir / ".copilot" / "mcp-config.json").read_text())
                self.assertIn("velomesh", copilot_mcp["mcpServers"])
                
                # Verify Codex config.toml updated with new tools
                codex_toml = (home_dir / ".codex" / "config.toml").read_text()
                self.assertIn("discover_and_install_capability", codex_toml)
                self.assertIn("fusion_start", codex_toml)

    def test_one_command_installers_exist_and_valid(self):
        repo_root = Path(__file__).resolve().parent.parent
        install_sh = repo_root / "install.sh"
        install_ps1 = repo_root / "install.ps1"
        self.assertTrue(install_sh.is_file(), "install.sh must exist")
        self.assertTrue(install_ps1.is_file(), "install.ps1 must exist")
        import subprocess
        res = subprocess.run(["bash", "-n", str(install_sh)], capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, f"install.sh syntax error: {res.stderr}")

    def test_internet_multi_capability_provisioning_mcp_api_agent_skill(self):
        from velomesh import provision_capability
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            lib_dir = tmp_path / "lib"
            lib_dir.mkdir()
            target_dir = tmp_path / "target"
            target_dir.mkdir()
            manifest_file = tmp_path / "manifest.json"
            
            fake_candidates = [
                {"repo": "acme/stripe-mcp-server", "url": "https://github.com/acme/stripe-mcp-server", "stars": 420, "description": "Official Stripe MCP Server and REST API toolkit"}
            ]
            with patch("velomesh.LIB", lib_dir), \
                 patch("velomesh.TARGETS", {"cursor": target_dir}), \
                 patch("velomesh.MANIFEST", manifest_file), \
                 patch("velomesh.github_search", return_value=fake_candidates), \
                 patch("velomesh.fetch_repo", side_effect=RuntimeError("repo has no SKILL.md, synthesize MCP/API wrapper")):
                res = provision_capability("stripe billing api mcp", kind="auto")
                self.assertIn(res["status"], ("synthesized_capability", "installed", "linked_existing"))
                self.assertTrue((target_dir / res["skill"] / "SKILL.md").exists())

    def test_fullstack_bundle_and_vision_elaboration_check(self):
        from velomesh import recommend_fullstack_bundle, rule_body
        # 1. Vague prompt -> needs_elaboration (VeloMesh cannot read your mind)
        vague = recommend_fullstack_bundle("build a website")
        self.assertEqual(vague["vision_check"]["status"], "needs_elaboration")
        self.assertIn("brain", vague["vision_check"]["guidance"].lower())
        self.assertTrue(len(vague["vision_check"]["missing_dimensions"]) >= 2)

        # 2. Elaborated vision prompt -> ready_for_autonomous_build across full-stack layers
        elaborated = recommend_fullstack_bundle(
            "Build a multi-tenant AI treasury dashboard for CFOs with dark Linear-inspired typography, "
            "interactive WebGL cashflow forecasting graph, FastAPI + PostgreSQL ledger database with row-level security, "
            "Stripe webhook ingestion API, and Playwright end-to-end verification."
        )
        self.assertEqual(elaborated["vision_check"]["status"], "ready_for_autonomous_build")
        self.assertIn("frontend_ui", elaborated["layers"])
        self.assertIn("motion_interactive", elaborated["layers"])
        self.assertIn("backend_api", elaborated["layers"])
        self.assertIn("database_state", elaborated["layers"])
        self.assertIn("testing_qa", elaborated["layers"])
        self.assertIn("gsap-scrolltrigger", elaborated["layers"]["motion_interactive"])
        self.assertIn("postgres-patterns", elaborated["layers"]["database_state"])

        # 3. Rule body must enforce both One-Prompt Full-Stack execution and Vision Elaboration
        rules = rule_body()
        self.assertIn("cannot get inside", rules.lower())
        self.assertIn("awwwards", rules.lower())
        self.assertIn("database", rules.lower())

if __name__ == "__main__":
    unittest.main()
