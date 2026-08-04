---
name: migrate-plugin
description: Translate a Claude Code, Cursor, or older Codex plugin into an independent Codex-native package. Use when porting skills, hooks, MCP configuration, manifests, marketplace entries, or plugin behavior between agent hosts.
---

# Migrate Plugin

Port the capability, not the source host's packaging assumptions.

## Workflow

1. Record the source repository and exact commit. Read every source component
   and its tests before editing.
2. Fetch current documentation for both the source host and Codex. Read
   [references/component-map.md](references/component-map.md) for the baseline
   component mapping, then override it when current official docs differ.
3. Classify every component as **keep**, **reshape**, **replace**, or **drop**.
   Record drops and replacements explicitly.
4. Scaffold the Codex package with `$plugin-creator` and each skill with
   `$skill-creator`. Never add a second host manifest to the source plugin.
5. Rewrite host-specific hooks, MCP wiring, configuration, paths, and tool names
   using current Codex contracts. Preserve domain logic only after removing
   user, company, machine, and sibling-install assumptions.
6. Make repository behavior adapt to the active `AGENTS.md` hierarchy and
   project context. Keep consumer-specific policy outside the plugin.
7. Run `$verify-plugin`, the built-in creation validators, and behavioral tests
   in a new Codex task with the source marketplace disabled.
8. Summarize preserved behavior, intentional differences, unsupported source
   components, and validation evidence in the pull request.

## Boundary

Do not create automatic cross-repository synchronization. The Claude Code,
Cursor, and Codex repositories remain independent sources of truth whose useful
ideas can be ported deliberately in either direction.
