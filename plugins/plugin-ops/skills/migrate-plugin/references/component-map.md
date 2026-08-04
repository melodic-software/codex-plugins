# Host component map

Use this as a migration checklist after fetching current documentation for both
hosts. It records the initial Codex mapping, not an immutable compatibility
promise.

| Source component | Codex disposition |
| --- | --- |
| Claude `.claude-plugin/plugin.json` | Reshape as `.codex-plugin/plugin.json`; do not dual-load. |
| Cursor `.cursor-plugin/plugin.json` | Reshape as `.codex-plugin/plugin.json`; do not dual-load. |
| Skill folder with `SKILL.md` | Review and usually reshape; preserve domain logic, update triggers, tools, paths, and UI metadata. |
| Claude/Cursor marketplace catalog | Rebuild as `.agents/plugins/marketplace.json` with Codex policy fields and plugin-relative sources. |
| Hook configuration | Rewrite from current Codex hook events, trust, inputs, and outputs. Never assume another host's hook runs unchanged. |
| MCP server configuration | Map to plugin-root `.mcp.json` only after verifying current Codex transport and auth requirements. |
| Registered server/integration mapping | Use `.app.json` only for the current registered MCP mapping contract. |
| Commands or slash-command files | Prefer a skill. Keep no compatibility stub unless current Codex docs establish a separate need. |
| Rules or persistent host instructions | Move consumer policy to `AGENTS.md` or native project/user config; keep reusable workflow instructions in a skill. |
| Custom agent definitions | Map only when current Codex plugin docs define a native equivalent; otherwise express the workflow as a skill or drop it. |
| Host-specific user configuration | Replace with explicit invocation input or native Codex configuration. Do not invent a plugin-local config system. |
| Assets, templates, and references | Keep when portable and referenced through plugin-relative paths. |
| Scripts | Keep only after testing on supported platforms and removing absolute paths, hidden dependencies, and source-host assumptions. |

For every **drop**, record why the capability is unavailable or unnecessary.
For every **replace**, record the Codex-native surface and behavioral difference.
