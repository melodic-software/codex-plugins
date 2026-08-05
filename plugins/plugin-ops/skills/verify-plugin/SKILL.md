---
name: verify-plugin
description: Validate a Codex plugin package or repo marketplace for manifest, catalog, skill, context-discovery, architecture, path, and portability defects. Use when reviewing, testing, publishing, migrating, or troubleshooting `.codex-plugin/plugin.json` or `.agents/plugins/marketplace.json` content.
---

# Verify Plugin

Combine deterministic structural checks with live documentation and behavioral
review. A passing script is a baseline, not proof that a changing product
contract or repository-adaptation design is correct.

## Workflow

1. Locate either a marketplace root containing
   `.agents/plugins/marketplace.json` or a plugin root containing
   `.codex-plugin/plugin.json`.
2. Complete the repository's official-documentation preflight. Fetch current
   official architecture, packaging, skills, hooks, MCP/app, `AGENTS.md`, and
   security documentation relevant to the package. Record URLs and date; copy
   no upstream prose.
3. Run the bundled validator with Node.js 20 or newer:

   ```text
   node <skill-directory>/scripts/validate-marketplace.mjs <target-root>
   ```

   Add `--json` when machine-readable output is useful.
4. Fix structural errors before judgment-based review. Do not weaken the
   validator to accept a malformed package.
5. Review the user-goal and architecture contract:
   - each plugin is an independently useful, cohesive vertical slice;
   - each skill has one recognizable trigger and outcome;
   - domain decisions are separated from host and environment adapters where
     variation is material;
   - ports expose the smallest required capability and keep reads distinct from
     writes where possible;
   - optional adapters are replaceable and have useful fallbacks; and
   - no speculative framework or sibling-plugin coupling was introduced.
6. Review context and configuration behavior:
   - current request and active `AGENTS.md` context precede plugin defaults;
   - native project evidence is inspected proportionally;
   - native Codex configuration is preferred over custom config;
   - defaults are quiet, safe, reversible, and non-blocking; and
   - no user, employer, machine, subscription, credential, or source-install
     assumption leaked into runtime behavior.
7. Review safety and operations:
   - writes preserve unrelated changes and follow approval boundaries;
   - hooks expose trust requirements;
   - secrets remain outside the package;
   - unsupported platforms and missing tools fail safely; and
   - non-retryable or partial-failure behavior is explicit.
8. Run the built-in `$plugin-creator` validator and `$skill-creator` quick
   validator for every changed skill when those workflows are available.
9. Exercise direct, indirect, negative, incomplete, root/nested context,
   missing-dependency, platform, existing-change, partial-failure, and isolated-
   install cases. For migrations, disable source and sibling marketplaces.

## Report

Report errors first, then warnings and untested behavior. Include exact file
paths, commands, live upstream URLs and date checked, context cases, adapter and
fallback decisions, and behavioral evidence.
