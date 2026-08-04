---
name: update-plugins
description: Refresh configured Codex marketplace snapshots and reinstall plugins after upstream or local changes. Use when a user asks to update, upgrade, refresh, reload, or pick up a new version of a Codex plugin or marketplace.
---

# Update Plugins

Refresh the configured source first, then reinstall only the plugins whose
installed copies must change.

## Workflow

1. Fetch current plugin packaging documentation and inspect the installed
   `codex plugin marketplace upgrade --help` and `codex plugin add --help`.
2. Run `codex plugin marketplace list` and `codex plugin list`. Identify the
   marketplace name, source type, installed plugins, and whether the user is
   editing a local source or consuming a Git snapshot.
3. Refresh one Git marketplace with:

   ```text
   codex plugin marketplace upgrade <marketplace>
   ```

   Omit the marketplace name only when the user explicitly wants every Git
   source refreshed.
4. Reinstall each requested plugin from its actual marketplace:

   ```text
   codex plugin add <plugin>@<marketplace>
   ```

5. For a local plugin under active development, use the built-in
   `$plugin-creator` cachebuster/reinstall workflow. Do not increment release
   versions or hand-edit marketplace configuration merely to invalidate cache.
6. Verify the resulting plugin listing and installation result. Start a new task
   before testing changed skills, hooks, or MCP tools.

## Guardrails

- Do not assume a marketplace is Git-backed; local sources are not upgraded by
  fetching a remote.
- Do not replace a pinned ref with `main` without explicit approval.
- Preserve unrelated enabled/disabled plugin state.
- If a source path no longer matches the plugin being edited, resolve that
  mismatch before reinstalling.
