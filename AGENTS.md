# Working in this repository

Read `README.md`, `docs/PLUGIN-PHILOSOPHY.md`, and the relevant parts of
`docs/MIGRATION-PLAYBOOK.md` before changing a plugin.

## Source of truth

This repository owns Codex manifests and runtime behavior. Translate portable
ideas from sibling Claude Code or Cursor marketplaces, but do not import their
manifests, discover their install paths, or make them runtime dependencies.

Before changing plugin layout, installation advice, hooks, MCP wiring, or
marketplace metadata, fetch the current official OpenAI documentation listed in
`docs/OFFICIAL-DOCS.md`. Current documentation and the installed Codex CLI take
precedence over repository prose.

## Authoring

- Prefer Codex-native skills and configuration surfaces.
- Keep plugins useful outside Melodic Software and outside the machine that
  authored them.
- Discover repository policy from the active `AGENTS.md` hierarchy and project
  context. Do not bundle organization-specific policy as a universal default.
- Use sensible, quiet defaults. Ask only when a choice is material and cannot be
  inferred safely.
- Scaffold plugins and skills with the built-in `$plugin-creator` and
  `$skill-creator` workflows.
- Keep skill instructions concise; move detailed variants into one-level
  references.

## Validation and publishing

Run `npm test` and `npm run validate`. Also run the built-in plugin and skill
validators used by the creation workflows when they are available.

Stage explicit paths only. Use Conventional Commit titles for pull requests and
resolve every review thread before merging.
