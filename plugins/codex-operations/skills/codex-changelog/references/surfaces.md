# Surface classes and search patterns

`scripts/discover_surfaces.py` is the source of the surface list. It prints
`repo-shape` and one line per class present. The tables below are examples of
what a release item typically changes in each class, not a checklist: a class
the script does not print does not exist in the repository.

Paths and discovery rules for these surfaces are owned by the live Codex docs
(as of 2026-10-10: [Build skills for Codex](https://learn.chatgpt.com/docs/build-skills),
[Hooks](https://learn.chatgpt.com/docs/hooks),
[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), and
the [packaging guide](https://developers.openai.com/plugins/build/plugins)).
Recheck the script's globs when one of those pages moves a location.

## Every repository

| Class | What an item typically changes |
| --- | --- |
| `README.md`, `docs/**/*.md` | A command, flag, skill, or workflow the prose names |
| `AGENTS.md`, `AGENTS.override.md` | CLI references, prerequisites, discovery and size rules |
| `.codex/config.toml` | Keys that were added, renamed, or removed |
| `.codex/hooks*` | Event names, configuration keys, payload shape, trust |
| `.agents/skills/*/SKILL.md` | Frontmatter, discovery, or invocation behavior |
| `.github/workflows/*` | A `codex` command or flag that CI runs |
| `scripts/**`, `bin/**`, build and task files | A `codex` command, flag, or output a script depends on |
| `tests/**`, `test/**` | Assertions that pin a behavior the release changed |

## Plugins and marketplaces

Printed when `repo-shape` is `plugin` or `marketplace`.

| Class | What an item typically changes |
| --- | --- |
| marketplace catalog | Catalog locations Codex reads, source forms, policy fields |
| plugin manifests | Manifest location (root `plugin.json` or `.codex-plugin/`), fields, fallbacks |
| plugin skills, skill references | A behavior, command, or built-in skill the body restates |
| skill sidecars | `agents/openai.yaml` keys for interface, policy, or dependencies |
| skill scripts | A CLI flag or output a script parses |
| plugin hooks, mcp config, app mapping | Event, transport, auth, or substitution behavior |
| plugin agent dirs | Whether Codex loads a plugin's `agents/` at all |
| plugin tests | Assertions that pin a behavior the release changed |

## Search patterns

Search only the globs the script printed, never the whole tree unbounded. The
globs are relative to the repository root; pass each with `-g` so `rg` expands
it, not the shell:

```text
rg -n "<command or flag>" -g '<printed glob>' -g '<printed glob>'
rg -n "<skill, plugin, config key, or hook event>" -g '<printed glob>'
```

A hit makes the surface a candidate. The lens still comes from what the item
changes about that hit, per [classification-rubric.md](classification-rubric.md).
