# codex-plugins

Melodic Software's public **Codex-only** plugin marketplace. Plugins are
reusable, repo-agnostic capabilities built with Codex-native manifests, skills,
hooks, and MCP configuration.

## Install

Add the marketplace and install the initial `plugin-ops` plugin:

```powershell
codex plugin marketplace add melodic-software/codex-plugins --ref main
codex plugin add plugin-ops@melodic-software-codex
```

Start a new Codex task after installation so the new skills are discovered.

## Initial plugin

`plugin-ops` dogfoods the marketplace by providing skills to:

- add and install marketplace sources with the native Codex CLI;
- refresh marketplaces and reinstall changed plugins;
- validate catalogs, manifests, skills, and portable path contracts; and
- translate Claude Code or Cursor plugins into Codex-native packages.

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

Read [the plugin philosophy](docs/PLUGIN-PHILOSOPHY.md) before adding or
migrating a capability. Fetch the current official documentation from the URLs
in [OFFICIAL-DOCS.md](docs/OFFICIAL-DOCS.md); do not treat a copied host
manifest or an old documentation snapshot as authoritative.

Use Codex's built-in `$plugin-creator` and `$skill-creator` workflows to scaffold
new packages, then run:

```powershell
npm test
npm run validate
```

Repository creation and GitHub settings are governed by
[`melodic-software/github-iac`](https://github.com/melodic-software/github-iac).
