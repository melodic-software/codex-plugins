---
name: verify-plugin
description: Validate a Codex plugin package or repo marketplace for manifest, catalog, skill, path, and portability defects. Use when reviewing, testing, publishing, migrating, or troubleshooting `.codex-plugin/plugin.json` or `.agents/plugins/marketplace.json` content.
---

# Verify Plugin

Combine deterministic structural checks with a live documentation review. A
passing script is a baseline, not proof that a changing product contract is
still current.

## Workflow

1. Locate either a marketplace root containing
   `.agents/plugins/marketplace.json` or a plugin root containing
   `.codex-plugin/plugin.json`.
2. Run the bundled validator with Node.js 20 or newer:

   ```text
   node <skill-directory>/scripts/validate-marketplace.mjs <target-root>
   ```

   Add `--json` when machine-readable output is useful.
3. Fix structural errors before judgment-based review. Do not weaken the
   validator to accept a malformed local package.
4. Fetch the current official plugin architecture, packaging, skill, hook, and
   MCP documentation relevant to the package.
5. Review what static validation cannot establish:
   - skill triggers match intended requests without over-activating;
   - defaults are quiet, safe, and reversible;
   - repository policy is discovered from active `AGENTS.md` context;
   - writes preserve unrelated changes and require appropriate confirmation;
   - optional tools and integrations have useful fallbacks; and
   - no user, employer, machine, or sibling-plugin dependency leaked into
     runtime behavior.
6. Run the built-in `$plugin-creator` validator and `$skill-creator` quick
   validator when those workflows are available.
7. Report errors first, then warnings and untested behavior. Include exact file
   paths and the command used.
