---
name: install-marketplace
description: Add a local or Git-backed Codex plugin marketplace and install plugins from it. Use when a user asks to add, connect, configure, or install a Codex marketplace or a plugin from a marketplace source.
---

# Install Marketplace

Use the native Codex CLI and preserve the distinction between adding a
marketplace source and installing a plugin from that source.

## Workflow

1. Fetch the current OpenAI plugin packaging documentation before changing
   installation advice. Inspect `codex plugin ... --help` for the installed CLI.
2. Identify the source as one of:
   - GitHub shorthand such as `owner/repo`;
   - an HTTPS or SSH Git URL; or
   - a local marketplace root containing `.agents/plugins/marketplace.json`.
3. Inspect the marketplace file before installation. Confirm its name, plugin
   entries, source paths, and requested ref or sparse paths.
4. Explain the state changes: adding a source creates a managed marketplace
   snapshot; installing a plugin updates Codex configuration and cache.
5. Add the marketplace with the narrowest native command:

   ```text
   codex plugin marketplace add <source> [--ref <ref>] [--sparse <path>]
   ```

   Use `--ref` only when the user wants a pinned branch, tag, or commit. Use
   `--sparse` only for Git sources; it may be repeated to select more than one
   path.
6. Verify discovery with `codex plugin marketplace list` and `codex plugin list`.
7. Install only the requested plugin:

   ```text
   codex plugin add <plugin>@<marketplace>
   ```

   `codex plugin add <plugin> --marketplace <marketplace>` selects the same
   plugin. Prefer the `@` form so the source is visible in the command itself.

8. Ask the user to start a new task so newly installed skills and tools are
   loaded. A plugin's skills are then invoked as `$<plugin>:<skill>`, because
   Codex qualifies a skill name with the name of the plugin that owns it.

## Guardrails

- Do not hand-edit `~/.codex/config.toml` when the CLI supports the operation.
- Do not install every plugin merely because the catalog contains several.
- Do not expose credentials embedded in Git remotes or registry configuration.
- Stop if the resolved marketplace root or plugin path escapes its source root.
- Treat private source access as an authentication prerequisite, not as a reason
  to copy the plugin into a public location.
