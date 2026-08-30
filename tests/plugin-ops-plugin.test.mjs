import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertExists,
  assertMarketplacePlugin,
  readSkillContract,
  skillPaths,
} from "./helpers.mjs";

const paths = skillPaths("plugin-ops");

test("the marketplace exposes the Plugin Ops plugin", async () => {
  await assertMarketplacePlugin({
    name: "plugin-ops",
    version: "0.2.0",
    category: "Developer Tools",
  });
});

test("install-marketplace uses native CLI and the narrowest commands", async () => {
  const { compactSkill } = await readSkillContract(
    paths,
    "install-marketplace",
    "Install Marketplace",
  );

  assert.match(compactSkill, /Use the native Codex CLI/u);
  assert.match(compactSkill, /codex plugin marketplace add/u);
  assert.match(compactSkill, /codex plugin add <plugin>@<marketplace>/u);
  assert.match(compactSkill, /narrowest native command/u);
});

test("update-plugins refreshes sources then reinstalls changed plugins", async () => {
  const { compactSkill } = await readSkillContract(paths, "update-plugins", "Update Plugins");

  assert.match(compactSkill, /Refresh the configured source first/u);
  assert.match(compactSkill, /codex plugin marketplace upgrade/u);
  assert.match(compactSkill, /Do not assume a marketplace is Git-backed/u);
  assert.match(compactSkill, /\$plugin-creator/u);
});

test("verify-plugin requires preflight, validator, and behavioral review", async () => {
  const { compactSkill } = await readSkillContract(paths, "verify-plugin", "Verify Plugin");

  assert.match(compactSkill, /official-documentation preflight/u);
  assert.match(compactSkill, /validate-marketplace\.mjs/u);
  assert.match(compactSkill, /active `AGENTS\.md` context precede plugin defaults/u);
  assert.match(compactSkill, /independently useful, cohesive vertical slice/u);
  await assertExists(
    paths.file("verify-plugin", "scripts/validate-marketplace.mjs"),
  );
});

test("migrate-plugin follows the playbook ledger and isolation testing", async () => {
  const { compactSkill } = await readSkillContract(paths, "migrate-plugin", "Migrate Plugin");

  assert.match(compactSkill, /docs\/PLUGIN-PHILOSOPHY\.md/u);
  assert.match(compactSkill, /docs\/MIGRATION-PLAYBOOK\.md/u);
  assert.match(compactSkill, /references\/component-map\.md/u);
  assert.match(compactSkill, /\*\*keep\*\*.*\*\*reshape\*\*.*\*\*replace\*\*.*\*\*drop\*\*/u);
  assert.match(compactSkill, /source marketplace and sibling plugins disabled/u);
  await assertExists(
    paths.file("migrate-plugin", "references/component-map.md"),
  );
});
