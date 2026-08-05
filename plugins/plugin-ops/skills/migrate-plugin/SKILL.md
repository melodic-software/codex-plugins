---
name: migrate-plugin
description: Translate a Claude Code, Cursor, or older Codex plugin into an independent Codex-native package. Use when porting skills, agents, hooks, MCP configuration, manifests, marketplace entries, scripts, or plugin behavior between agent hosts.
---

# Migrate Plugin

Port the user capability and its evidence, not the source host's packaging
assumptions.

## Workflow

1. Record the source repository, exact commit, version, and target base commit.
   Read every source component and its tests before editing.
2. Fetch current official documentation for both the source host and Codex. In
   this marketplace, complete the root `AGENTS.md` preflight and read
   `docs/PLUGIN-PHILOSOPHY.md` plus `docs/MIGRATION-PLAYBOOK.md`. Record live
   URLs and the date checked; copy no upstream prose.
3. Define the user-goal vertical slice: inputs, repository context, output,
   side effects, boundaries, platform variants, and acceptance evidence.
4. Read [references/component-map.md](references/component-map.md), then create
   a complete **keep**, **reshape**, **replace**, or **drop** ledger. Override
   the map when current official docs differ. Record every replacement and drop.
5. Identify the cohesive core, inbound ports for intent and repository context,
   outbound ports for files, shell, MCP, connectors, network, UI, and writes,
   and the smallest Codex-native adapter for each port.
6. Scaffold the Codex package with `$plugin-creator` and each skill with
   `$skill-creator`. Never add a second host manifest to the source plugin.
7. Rewrite host-specific hooks, MCP wiring, agents, settings, paths, tools, and
   lifecycle behavior using current Codex contracts. Preserve domain logic only
   after removing user, company, machine, source-install, and sibling-plugin
   assumptions.
8. Discover behavior from the current request, active `AGENTS.md` hierarchy,
   native project evidence, and available capabilities before applying plugin
   defaults. Keep consumer-specific policy outside the plugin.
9. Prefer explicit input and native Codex configuration. Put optional tools
   behind narrow adapters with a useful fallback or clear unsupported result.
10. Run `$verify-plugin`, the built-in creation validators, and behavioral tests
    in a new Codex task with the source marketplace and sibling plugins disabled.

Test direct, indirect, negative, incomplete, nested-repository-context, missing-
dependency, platform, existing-change, partial-failure, and isolated-install
cases. Compare outcomes and side effects, not copied wording.

## Return contract

The pull request must record source and target commits, live upstream pointers,
the use-case inventory, the component ledger, native surfaces, ports and
adapters, context precedence, defaults and fallbacks, intentional differences,
and validation evidence.

## Boundary

Do not create automatic cross-repository synchronization. Claude Code, Cursor,
and Codex packages remain independent sources of truth. Port improvements
deliberately in either direction.
