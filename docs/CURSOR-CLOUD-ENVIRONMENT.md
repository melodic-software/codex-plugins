# Cursor Cloud environment

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
