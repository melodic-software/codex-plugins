# Plugin migration playbook

Use this playbook to translate a capability from Claude Code, Cursor, or another
Codex package. Copy the capability's intent and evidence, not its host contract.

## 1. Establish sources

Record the source repository and exact commit. Fetch the current source-host
documentation and the current OpenAI plugin documentation listed in
[OFFICIAL-DOCS.md](OFFICIAL-DOCS.md).

Read the source plugin completely: manifest, marketplace entry, skills, hooks,
scripts, MCP configuration, tests, and user documentation. Identify external
dependencies and any assumptions about user, machine, company, or install path.

## 2. Classify every component

Assign each source component one disposition:

- **Keep:** portable content already matches the current Codex contract.
- **Reshape:** the capability is useful but its manifest, hook, configuration,
  or tool contract is host-specific.
- **Replace:** Codex has a native surface that serves the same need better.
- **Drop:** no current Codex equivalent exists, or the component is unnecessary.

Do not silently omit a source component. Record drops and replacements in the
pull request.

## 3. Rebuild the package natively

Create a `.codex-plugin/plugin.json` manifest and a repo marketplace entry with
the built-in `$plugin-creator` workflow. Initialize each skill with
`$skill-creator`.

Preserve domain logic only after removing host-specific paths, tool names,
prompts, configuration keys, and lifecycle assumptions. Rewrite hooks and MCP
configuration from the current Codex documentation instead of transliterating
another host's JSON.

For component-by-component guidance, use the installed `plugin-ops` skill
`$migrate-plugin` and its `references/component-map.md`.

## 4. Prove independence

Validate that the migrated plugin:

- works without the source marketplace installed;
- uses no sibling install paths or organization-specific environment variables;
- adapts to the active repository's `AGENTS.md` hierarchy;
- preserves unrelated working-tree changes;
- fails safely when an optional CLI, connector, or platform is unavailable; and
- contains no copied secrets, private URLs, or employer-specific policy.

## 5. Validate behavior

Run the repository validator and the built-in plugin and skill validators. Test
direct, indirect, follow-up, unsupported, and boundary requests in a new Codex
task after installation.

Migration is complete only when the Codex package is independently useful. Do
not add automatic cross-repository synchronization; future improvements may be
ported deliberately in either direction.
