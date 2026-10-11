#!/usr/bin/env python3
"""List the Codex surfaces in a repository that a release-note item can touch.

Usage: discover_surfaces.py [ROOT]

Prints `repo-shape: marketplace|plugin|consumer`, then one line per surface
class present: label, file count, and glob. Only classes with at least one file
are printed, so a class absent from the output does not exist in ROOT.

Shape: a marketplace has a Codex or legacy-compatible marketplace catalog
(.agents/plugins/marketplace.json, .claude-plugin/marketplace.json or
.cursor-plugin/marketplace.json); a plugin has a manifest at its root
(plugin.json, .codex-plugin/plugin.json, or a Claude or Cursor manifest that
Codex reads as a fallback); anything else is a consumer. The walk skips
.git and node_modules directories. Printed globs are relative to ROOT.

Exit 0 when ROOT exists; 2 for a missing ROOT or an unknown argument.
Python 3.9 or newer; standard library only.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Callable

SKIP_DIRS = {".git", "node_modules"}
MARKETPLACES = (
    ".agents/plugins/marketplace.json",
    ".claude-plugin/marketplace.json",
    ".cursor-plugin/marketplace.json",
)
BUILD_FILES = ("package.json", "Makefile", "justfile", "Taskfile.yml")
PLUGIN_MANIFESTS = (
    "plugin.json",
    ".codex-plugin/plugin.json",
    ".claude-plugin/plugin.json",
    ".cursor-plugin/plugin.json",
)


def walk(root: Path) -> list[Path]:
    """Every file under root, relative, skipping VCS metadata and dependencies."""
    found: list[Path] = []
    stack = [root]
    while stack:
        current = stack.pop()
        try:
            entries = list(current.iterdir())
        except OSError:
            continue
        for entry in entries:
            if entry.is_dir() and not entry.is_symlink():
                if entry.name not in SKIP_DIRS:
                    stack.append(entry)
            elif entry.is_file():
                found.append(entry.relative_to(root))
    return found


def shape_of(root: Path) -> str:
    if any((root / path).is_file() for path in MARKETPLACES):
        return "marketplace"
    if any((root / path).is_file() for path in PLUGIN_MANIFESTS):
        return "plugin"
    return "consumer"


Rule = Callable[[Path], bool]


def classes(shape: str) -> list[tuple]:
    def parts(path: Path) -> tuple:
        return path.parts

    def under(prefix: str) -> Rule:
        return lambda path: path.as_posix().startswith(prefix)

    def plugin_scoped(rule: Callable[[tuple], bool]) -> Rule:
        # In a marketplace, plugin content sits under plugins/<name>/; in a
        # standalone plugin, at the root.
        if shape == "marketplace":
            return lambda path: len(parts(path)) > 2 and parts(path)[0] == "plugins" and rule(parts(path)[2:])
        return lambda path: rule(parts(path))

    def in_skills(rest: tuple) -> bool:
        return len(rest) > 1 and rest[0] == "skills"

    consumer = [
        ("readme (README.md)", "README.md", lambda p: p.as_posix() == "README.md"),
        ("documentation", "docs/**/*.md", lambda p: under("docs/")(p) and p.suffix == ".md"),
        ("instructions (AGENTS.md, AGENTS.override.md)", "**/AGENTS.md, **/AGENTS.override.md",
         lambda p: p.name in ("AGENTS.md", "AGENTS.override.md")),
        ("project config", ".codex/config.toml", lambda p: p.as_posix() == ".codex/config.toml"),
        ("project hooks", ".codex/hooks.json, .codex/hooks/**", under(".codex/hooks")),
        ("repository skills", "**/.agents/skills/*/SKILL.md",
         lambda p: p.name == "SKILL.md" and len(p.parts) >= 4 and p.parts[-4:-2] == (".agents", "skills")),
        ("ci workflows", ".github/workflows/*", under(".github/workflows/")),
        ("repository scripts", "scripts/**, bin/**", lambda p: len(p.parts) > 1 and p.parts[0] in ("scripts", "bin")),
        ("tests", "tests/**, test/**", lambda p: len(p.parts) > 1 and p.parts[0] in ("tests", "test")),
        ("build and task files", ", ".join(BUILD_FILES), lambda p: p.as_posix() in BUILD_FILES),
    ]
    if shape == "consumer":
        return consumer
    plugin = [
        ("plugin manifests", ", ".join(PLUGIN_MANIFESTS),
         plugin_scoped(lambda r: "/".join(r) in PLUGIN_MANIFESTS)),
        ("plugin skills", "skills/**/SKILL.md", plugin_scoped(lambda r: in_skills(r) and r[-1] == "SKILL.md")),
        ("skill references (excl. SKILL.md)", "skills/**/*.md",
         plugin_scoped(lambda r: in_skills(r) and r[-1].endswith(".md") and r[-1] != "SKILL.md")),
        ("skill sidecars", "skills/**/agents/openai.yaml",
         plugin_scoped(lambda r: in_skills(r) and r[-2:] == ("agents", "openai.yaml"))),
        ("skill scripts", "skills/**/scripts/**", plugin_scoped(lambda r: in_skills(r) and "scripts" in r[2:-1])),
        ("plugin hooks", "hooks/**", plugin_scoped(lambda r: len(r) > 1 and r[0] == "hooks")),
        ("plugin mcp config", ".mcp.json, mcp.json", plugin_scoped(lambda r: r in ((".mcp.json",), ("mcp.json",)))),
        ("plugin app mapping", ".app.json", plugin_scoped(lambda r: r == (".app.json",))),
        ("plugin agent dirs (ignored by Codex)", "agents/*", plugin_scoped(lambda r: len(r) == 2 and r[0] == "agents")),
    ]
    if shape == "marketplace":
        # Printed globs are root-relative, so each can be passed to `rg -g`.
        plugin.append(("plugin tests", "tests/**", plugin_scoped(lambda r: len(r) > 1 and r[0] == "tests")))
        plugin = [(label, ", ".join(f"plugins/*/{g}" for g in glob.split(", ")), rule)
                  for label, glob, rule in plugin]
        plugin.insert(0, ("marketplace catalog", ", ".join(MARKETPLACES), lambda p: p.as_posix() in MARKETPLACES))
    return consumer + plugin


def main(argv: list[str]) -> int:
    if len(argv) > 1 or (argv and argv[0].startswith("-")):
        print(f"discover_surfaces: unknown argument: {' '.join(argv)}", file=sys.stderr)
        return 2
    root = Path(argv[0] if argv else ".")
    if not root.is_dir():
        print(f"discover_surfaces: no such directory: {root}", file=sys.stderr)
        return 2
    shape = shape_of(root)
    files = walk(root)
    print(f"repo-shape: {shape}")
    if shape == "marketplace":
        plugins = root / "plugins"
        count = sum(1 for p in plugins.iterdir() if p.is_dir()) if plugins.is_dir() else 0
        if count:
            print(f"{'plugins':<46} {count:>5}  plugins/*/")
    for label, glob, rule in classes(shape):
        count = sum(1 for path in files if rule(path))
        if count:
            print(f"{label:<46} {count:>5}  {glob}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
