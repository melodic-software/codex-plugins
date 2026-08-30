# Working in this repository

This repository is the Codex-only source of truth for its marketplace and
plugins. These requirements apply to authors, reviewers, migration work, and
release work.

## Mandatory documentation preflight

Before taking any action that creates, changes, migrates, reviews, validates,
installs, or publishes a plugin component:

1. Read `README.md`, `docs/OFFICIAL-DOCS.md`, and all of
   `docs/PLUGIN-PHILOSOPHY.md`.
2. For a migration, also read all of `docs/MIGRATION-PLAYBOOK.md`, the source
   component, its tests, and the source-host documentation relevant to it.
3. Open the live official pages identified for the affected surface in
   `docs/OFFICIAL-DOCS.md`. Do not rely on remembered behavior or a copied
   documentation snapshot.
4. Inspect the installed `codex ... --help` output when CLI behavior is part of
   the change.
5. Record the consulted URLs and verification date in the pull request. Link to
   upstream material; do not copy its prose or examples into this repository.

Read only the sections relevant to the action, but do not skip the preflight.
When live official documentation and verified product behavior disagree, stop
contract-changing work, record the discrepancy, and prefer the narrower
behavior until it is resolved. Update `docs/OFFICIAL-DOCS.md` when a pointer
moves or a new native surface becomes relevant.

## Source precedence

Apply sources in this order:

1. The user's current intent and authorized scope.
2. The active consumer repository's `AGENTS.md` hierarchy and native project
   configuration.
3. Current official OpenAI documentation for the target Codex contract.
4. Verified behavior of the installed Codex release.
5. Current official source-host documentation during a migration.
6. This repository's philosophy, playbooks, tests, and examples.
7. General engineering references as design guidance, never as a substitute
   for the current Codex contract.

Source-host manifests and sibling marketplaces are evidence about the source
capability, not authority for the Codex target.

## Required design behavior

- Start with a user goal and ship one cohesive vertical slice.
- Keep domain decisions independent from Codex, filesystem, shell, network,
  connector, and source-host details. Put those details behind small adapters.
- Prefer native Codex skills, `AGENTS.md`, project or user configuration, hooks,
  MCP/app connections, approvals, and marketplace fields before inventing a
  plugin-local mechanism.
- Discover behavior from the active repository context before applying plugin
  defaults. The user request and repository policy override a generic default.
- Keep plugins, skills, hooks, scripts, and agents user-agnostic,
  organization-agnostic, repository-agnostic, and machine-agnostic.
- Make optional integrations replaceable and preserve a useful fallback.
- Favor high cohesion, low coupling, interface segregation, encapsulation, and
  explicit ports over shared mutable state or sibling-plugin discovery.
- Use quiet, reversible defaults. Ask only when a material choice cannot be
  inferred safely from the authorized request and repository context.
- Do not create automatic cross-repository synchronization. Port ideas and
  behavior deliberately, with independent releases for each host.

## Repository-context discovery

Before a plugin changes repository content, it must inspect, in order:

1. the current request and explicit invocation inputs;
2. the active `AGENTS.md` chain from repository root to working directory;
3. native repository configuration, manifests, CI, documentation, and existing
   conventions relevant to the task;
4. available Codex tools, connectors, hooks, and platform capabilities; and
5. the plugin's documented fallback defaults.

Never treat a publisher's personal conventions, employer policy, absolute
paths, tool installation, subscription, or credentials as a consumer default.

## Authoring and packaging

- Scaffold or update plugins with `$plugin-creator` and skills with
  `$skill-creator` when those workflows are available.
- Keep every skill focused on one recognizable goal. Put essential procedure in
  `SKILL.md` and detailed variants in directly linked `references/` files.
- Keep `agents/openai.yaml` aligned with its skill. It is the harness-facing
  sidecar covering `interface` presentation, `dependencies.tools` MCP
  declarations, and `policy` (`allow_implicit_invocation`, product
  restrictions); do not treat that file as a custom execution agent definition.
  A declared MCP dependency is metadata only — it neither installs nor
  authenticates a server, so the capability check, fallback, and credential
  handling stay in the skill.
- Package a custom agent only when current official Codex documentation defines
  the target discovery and packaging contract. Otherwise use a focused skill or
  normal Codex task coordination.
- Keep paths plugin-relative, marketplace-relative, or repository-relative.
- Keep secrets outside the package and use native authentication boundaries.
- Treat hooks and external writes as trust and approval boundaries.
- Preserve unrelated files and existing working-tree changes.
- Do not add a custom configuration layer unless current native Codex surfaces
  cannot express the requirement. Document the gap and keep any adapter narrow.

## Validation and publishing

Run all of the following for affected work:

```powershell
npm test
npm run validate
```

Also run the built-in plugin validator, the skill quick validator for every
changed skill, and behavioral tests for direct, indirect, negative, missing
dependency, and repository-context cases. Migration validation must use a new
Codex task with the source marketplace and sibling plugins disabled.

The pull request must state:

- the user goal and vertical slice;
- live upstream URLs consulted and the date checked;
- context inputs and precedence;
- native surfaces selected;
- ports and adapters introduced;
- defaults, configuration, and fallbacks;
- migration dispositions and intentional differences, when applicable; and
- commands and behavioral evidence used to validate the result.

Stage explicit paths only. Use Conventional Commit pull-request titles, resolve
every review thread, and do not merge while required checks are failing or
pending.

## Cursor Cloud specific instructions

This repository is pure Node.js validation tooling for the Codex plugin
marketplace. There are no runtime services, servers, or UIs to start, and it has
no third-party dependencies (no lockfile, no `node_modules`). The "application"
is the marketplace/plugin validator CLI.

- Toolchain: `.node-version` pins Node 24 (CI honors it); `package.json`
  `engines` require Node `>=20`. The Cloud VM's default `node` is v22.x, which
  satisfies `engines` and runs everything correctly since the code uses only the
  built-in `node --test` runner with zero dependencies. `nvm install 24` is
  available if exact CI parity is needed, but the default node is fine.
- Lint/test/validate/run are the standard scripts in `package.json`:
  - Tests: `npm test` (Node's built-in test runner over `tests/*.mjs` and the
    validator's own test).
  - Marketplace validation (the primary run target): `npm run validate`, which
    executes `plugins/plugin-ops/skills/verify-plugin/scripts/validate-marketplace.mjs .`.
  - There is no separate lint step; `npm test` + `npm run validate` are the full
    gate (mirrors `.github/workflows/ci.yml`).
- Run the validator directly on any plugin or marketplace root, with optional
  `--json`:
  `node plugins/plugin-ops/skills/verify-plugin/scripts/validate-marketplace.mjs ./plugins/humanize --json`.
  It exits non-zero and prints `ERROR ...` lines when a target is invalid.
- Note: bare `npm install` writes an untracked `package-lock.json` (the repo
  intentionally has none). The startup update script uses
  `npm install --no-package-lock --no-audit --no-fund` to keep the tree clean.
