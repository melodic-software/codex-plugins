---
name: verify-plugin
description: Validate a Codex plugin package or repo marketplace for manifest, catalog, skill, context-discovery, architecture, path, and portability defects. Use when reviewing, testing, publishing, migrating, or troubleshooting a plugin manifest (root `plugin.json`, `.codex-plugin/plugin.json`, or a Claude or Cursor fallback) or a marketplace catalog.
---

# Verify Plugin

Combine deterministic structural checks with live documentation and behavioral
review. A passing script is a baseline, not proof that a changing product
contract or repository-adaptation design is correct.

## Workflow

1. Locate either a marketplace root or a plugin root. The validator finds the
   catalog and each manifest in Codex's own lookup order, validates the one
   Codex loads, prints it as `CATALOG` and `MANIFEST` lines (`catalog` and
   `manifests` with `--json`), and warns about any it would ignore:
   - manifests: root `plugin.json` when its `$schema` is an Agent Plugins URI,
     then `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and
     `.cursor-plugin/plugin.json`. A root manifest without an
     `extensions.com.openai` object reads `.codex-plugin/plugin.json` as its
     overlay rather than ignoring it;
   - catalogs: `.agents/plugins/marketplace.json`,
     `.agents/plugins/api_marketplace.json`, `.claude-plugin/marketplace.json`,
     and `.cursor-plugin/marketplace.json`; and
   - a Claude or Cursor manifest or catalog passes with warnings, because Codex
     loads it only as a fallback.

   Order as of Codex `rust-v0.162.0` (checked 2026-10-10):
   `find_plugin_manifest_path` in `codex-rs/utils/plugins/src/plugin_namespace.rs`,
   the overlay in `codex-rs/core-plugins/src/manifest/manifest_cache.rs`, and
   `MARKETPLACE_MANIFEST_RELATIVE_PATHS` in
   `codex-rs/core-plugins/src/marketplace.rs`. Recheck them, and the
   [packaging guide](https://developers.openai.com/plugins/build/plugins), on
   each Codex minor release.
2. Complete the repository's official-documentation preflight. Fetch current
   official architecture, packaging, skills, hooks, MCP/app, `AGENTS.md`, and
   security documentation relevant to the package. Record URLs and date; copy
   no upstream prose.
3. Run the bundled validator with Node.js 20 or newer:

   ```text
   node <skill-directory>/scripts/validate-marketplace.mjs <target-root>
   ```

   Add `--json` when machine-readable output is useful; its shape is the
   contract in [JSON output](#json-output).
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
8. Run the `$skill-creator` quick validator for every changed skill. Codex CLI
   0.159.0 removed the `$plugin-creator` validator, so the package and catalog
   check is `validate-marketplace.mjs` from step 3.
9. Exercise direct, indirect, negative, incomplete, root/nested context,
   missing-dependency, platform, existing-change, partial-failure, and isolated-
   install cases. For migrations, disable source and sibling marketplaces.

## Report

Report errors first, then warnings and untested behavior. Include exact file
paths, commands, live upstream URLs and date checked, context cases, adapter and
fallback decisions, and behavioral evidence.

## JSON output

`--json` prints one object with these keys, in this order. Paths are absolute.

| Key | Type | Meaning |
| --- | --- | --- |
| `target` | string | Validated root. |
| `kind` | `"marketplace"`, `"plugin"`, or `null` | What the target was; `null` when the target is neither or could not be inspected. |
| `catalog` | string or `null` | Catalog Codex loads; `null` for a plugin target. |
| `manifests` | array | One `{plugin, manifest, format}` per resolved plugin: its root, the manifest Codex loads, and `format` (`agent-plugin`, `codex`, `claude`, or `cursor`). An entry may add `overlay`, the `.codex-plugin` file read as the Codex overlay. |
| `errors` | array | `{code, file, message}` entries that fail validation. |
| `warnings` | array | `{code, file, message}` entries that do not. |

Adding a key is compatible. Renaming or removing one, or changing its type, is
breaking. The exit code is 0 only when `errors` is empty.
