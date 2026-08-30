import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertExists,
  assertMarketplacePlugin,
  readSkillContract,
  skillPaths,
} from "./helpers.mjs";

const paths = skillPaths("codex-operations");

test("the marketplace exposes the Codex Operations plugin", async () => {
  await assertMarketplacePlugin({
    name: "codex-operations",
    version: "0.1.0",
    category: "Developer Tools",
  });
});

test("coordinate-codex-work enforces authority, context, and smallest units", async () => {
  const { skill, compactSkill } = await readSkillContract(
    paths,
    "coordinate-codex-work",
  );

  assert.match(compactSkill, /active `AGENTS\.md` hierarchy/u);
  assert.match(compactSkill, /Identify what the user authorized/u);
  assert.match(compactSkill, /Keep irreversible actions/u);
  assert.match(compactSkill, /Choose the smallest execution unit/u);
  assert.match(compactSkill, /Require objective evidence/u);
  assert.match(skill, /references\/operating-model\.md/u);
  assert.match(skill, /references\/evidence\.md/u);
  await assertExists(
    paths.file("coordinate-codex-work", "references/operating-model.md"),
  );
  await assertExists(
    paths.file("coordinate-codex-work", "references/evidence.md"),
  );
});

test("find-skill-candidates stays recommendation-only with bounded collection", async () => {
  const { compactSkill } = await readSkillContract(
    paths,
    "find-skill-candidates",
  );

  assert.match(compactSkill, /recommendation-only/u);
  assert.match(compactSkill, /do not create, edit, delete, disable, or move skills/u);
  assert.match(compactSkill, /scripts\/collect_recent_sessions\.py/u);
  assert.match(compactSkill, /Do not assume a user name, home path/u);
  assert.match(compactSkill, /Prefer no recommendation over weak evidence/u);
  assert.match(compactSkill, /Reason not applied/u);
  await assertExists(
    paths.file("find-skill-candidates", "scripts/collect_recent_sessions.py"),
  );
});
