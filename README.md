# codex-plugins

Melodic Software's public **Codex-only** plugin marketplace. Plugins are
reusable, repo-agnostic capabilities built with Codex-native manifests, skills,
hooks, and MCP configuration.

## Install

Add the marketplace and install its plugins:

```powershell
codex plugin marketplace add melodic-software/codex-plugins --ref main
codex plugin add plugin-ops@melodic-software-codex
codex plugin add codex-operations@melodic-software-codex
codex plugin add scheduled-tasks@melodic-software-codex
```

Start a new Codex task after installation so the new skills are discovered.

## Quick reference

Use the [Codex capability cheat sheet](docs/CODEX-CAPABILITY-CHEAT-SHEET.md)
to distinguish built-in system skills, official bundled plugins, curated
plugins, and this personal marketplace. It includes natural-language and
explicit `$skill` or `$plugin:skill` prompt examples.

## Plugins

### `plugin-ops`

Dogfoods the marketplace by providing skills to:

- add and install marketplace sources with the native Codex CLI;
- refresh marketplaces and reinstall changed plugins;
- validate catalogs, manifests, skills, and portable path contracts; and
- translate Claude Code or Cursor plugins into Codex-native packages.

`codex-operations` provides portable skills to:

- coordinate multi-task, multi-agent, and long-running Codex work; and
- find evidence-backed opportunities for reusable skills from bounded local
  session data without modifying skills automatically.

### `scheduled-tasks`

Provides `manage-scheduled-tasks`, a focused skill that:

- refreshes the official Scheduled documentation and inspects the active native
  tools on every invocation;
- explains and recommends scheduled tasks inside a chat or standalone scheduled
  tasks;
- lists, inspects, creates, updates, pauses, resumes, and deletes tasks when the
  active native capability supports those operations; and
- never introduces its own scheduler or edits native task state directly.

## Layout

```text
.agents/plugins/marketplace.json
plugins/<name>/
  .codex-plugin/plugin.json
  skills/<skill-name>/SKILL.md
docs/PLUGIN-PHILOSOPHY.md
docs/MIGRATION-PLAYBOOK.md
docs/OFFICIAL-DOCS.md
```

## Contributing

Complete the mandatory live-documentation preflight in [AGENTS.md](AGENTS.md)
before any plugin action. The [plugin philosophy](docs/PLUGIN-PHILOSOPHY.md)
defines repository-context discovery, native-extension, portability, and
architecture gates. The [migration playbook](docs/MIGRATION-PLAYBOOK.md) turns
those gates into a component ledger and isolation test matrix.

[OFFICIAL-DOCS.md](docs/OFFICIAL-DOCS.md) is a maintained pointer index. Open
the relevant live pages and record their URLs and verification date; do not
copy upstream documentation or treat an old host manifest as authoritative.

Use Codex's built-in `$plugin-creator` and `$skill-creator` workflows to scaffold
new packages, then run:

```powershell
npm test
npm run validate
```

The test suite also enforces the documentation contract and required upstream
pointers so policy surfaces do not drift apart silently.

Repository creation and GitHub settings are governed by
[`melodic-software/github-iac`](https://github.com/melodic-software/github-iac).
