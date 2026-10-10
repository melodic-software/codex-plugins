# Host component map

Use this as a migration checklist after fetching current documentation for both
hosts. It records the initial Codex mapping, not an immutable compatibility
promise.

Load notes below are as of Codex CLI 0.162.0 (checked 2026-10-10). Recheck them
on each Codex minor release, or when the
[packaging guide](https://developers.openai.com/plugins/build/plugins) or
[hooks page](https://learn.chatgpt.com/docs/hooks) changes.

## Native-load fast path

Codex loads a Claude or Cursor plugin without changes when the plugin is a
skill-only plugin, uses no host variables (`CLAUDE_PLUGIN_ROOT`,
`CLAUDE_SKILL_DIR`, `${user_config.*}`) and no `!` dynamic context injection,
and keeps no eval-fixture `SKILL.md` under `skills/`.
Codex reads a `.claude-plugin` or `.cursor-plugin` manifest when no
`.codex-plugin` manifest is present. It also accepts
`$REPO_ROOT/.claude-plugin/marketplace.json` or
`$REPO_ROOT/.cursor-plugin/marketplace.json` as a legacy-compatible marketplace,
which you add with `codex plugin marketplace add`
(`MARKETPLACE_MANIFEST_RELATIVE_PATHS` in
`codex-rs/core-plugins/src/marketplace.rs`). Local sources resolve against the
marketplace root either way: a Cursor catalog's source may omit the `./`
prefix, while any other catalog fails to load a source without it
(`resolve_local_plugin_source_path`, same file). Skills then load as
`plugin:skill`. Sources: the packaging guide and `preserves_codex_claude_cursor_legacy_precedence` in
`codex-rs/utils/plugins/src/plugin_namespace.rs` at `rust-v0.162.0`. For such a
plugin, reshaping the manifest and marketplace rows below is optional. Run the
isolation tests either way. Codex scans `skills/` recursively, so an
eval-fixture `SKILL.md` there loads as a skill; move fixtures out of `skills/`
first.

| Source component | Codex disposition |
| --- | --- |
| Claude `.claude-plugin/plugin.json` | Reshape as `.codex-plugin/plugin.json`; do not dual-load. Optional on the fast path. |
| Cursor `.cursor-plugin/plugin.json` | Reshape as `.codex-plugin/plugin.json`; do not dual-load. Optional on the fast path. |
| Skill folder with `SKILL.md` | Review and usually reshape; preserve domain logic, update triggers, tools, paths, and UI metadata. A skill that uses `CLAUDE_PLUGIN_ROOT`, `CLAUDE_SKILL_DIR`, or `!` dynamic context injection loses that behavior in Codex. |
| Claude/Cursor marketplace catalog | Rebuild as `.agents/plugins/marketplace.json` with Codex policy fields and plugin-relative sources. Optional on the fast path. In 0.162.0, `defaultEnabled: false` was ignored on install: a marketplace entry's policy reads only `installation`, `authentication`, and `products` (`RawMarketplaceManifestPluginPolicy` in `codex-rs/core-plugins/src/marketplace.rs`). |
| Hook configuration | Rewrite from current Codex hook events, trust, inputs, and outputs. Never assume another host's hook runs unchanged. In 0.162.0, Codex silently drops command-hook keys missing from `codex-rs/config/src/hook_config.rs`, including `args`, which leaves a bare interpreter command. It also drops events Codex lacks, such as `PostToolUseFailure`. Plugin hooks do not run until the user trusts them. Edit and Write map to `apply_patch`, whose payload has a different shape (inferred, not tested). |
| MCP server configuration | Map to plugin-root `.mcp.json` only after verifying current Codex transport and auth requirements. In 0.162.0, plugin MCP config gets no `${CLAUDE_PLUGIN_ROOT}` or `${user_config.*}` substitution (`codex-rs/codex-mcp/src/plugin_config.rs`), so stdio and HTTP servers that use those variables fail. |
| Registered server/integration mapping | Use `.app.json` only for the current registered MCP mapping contract. |
| Commands or slash-command files | Prefer a skill. Keep no compatibility stub unless current Codex docs establish a separate need. |
| Rules or persistent host instructions | Move consumer policy to `AGENTS.md` or native project/user config; keep reusable workflow instructions in a skill. |
| Custom agent definitions | Use the current native Codex agent surface only when the goal needs an independently delegated role; otherwise express the cohesive workflow as a skill or drop it. In 0.162.0, Codex ignores a plugin's `agents/` directory, and `plugin/read` returns no agents field; `PluginManifestPaths` in `codex-rs/plugin/src/manifest.rs` declares no agents. |
| Host-specific user configuration | Replace with explicit invocation input or native Codex configuration. Do not invent a plugin-local config system. In 0.162.0, Codex does not support `userConfig`; `PluginManifest` in `codex-rs/plugin/src/manifest.rs` has no user-configuration field. |
| Repository-specific defaults | Replace with discovery from the active `AGENTS.md` hierarchy and native project evidence; keep only safe generic fallbacks in the plugin. |
| Scheduled jobs or follow-up templates | Map only to the current native automation surface and keep cadence outside the plugin package unless current packaging docs explicitly support a reusable template. |
| Assets, templates, and references | Keep when portable and referenced through plugin-relative paths. |
| Scripts | Keep only after testing on supported platforms and removing absolute paths, hidden dependencies, and source-host assumptions. |

For every **drop**, record why the capability is unavailable or unnecessary.
For every **replace**, record the Codex-native surface and behavioral difference.
For every host or environment integration, name the narrow port it implements,
its trust and side-effect boundary, and its missing-capability fallback.
