import assert from "node:assert/strict";
import { test } from "node:test";
import { assertMarketplacePlugin, compact, once, read, skillPaths } from "./helpers.mjs";

const paths = skillPaths("scheduled-tasks");
const skillPath = paths.md("manage-scheduled-tasks");

// All four body tests assert against the same whitespace-collapsed skill, so
// read and collapse it once.
const manageSkill = once(async () => compact(await read(skillPath)));

test("the marketplace exposes the Scheduled tasks plugin", async () => {
  await assertMarketplacePlugin({
    name: "scheduled-tasks",
    version: "0.1.0",
    category: "Productivity",
  });
});

test("the skill refreshes current docs and discovers native tools", async () => {
  const skill = await manageSkill();

  assert.match(skill, /Complete this preflight on every invocation/u);
  assert.match(skill, /https:\/\/learn\.chatgpt\.com\/docs\/automations/u);
  assert.match(skill, /Search the active tool catalog/u);
  assert.match(skill, /Read its full description and input schema/u);
  assert.match(skill, /Do not depend on a remembered tool name or argument shape/u);
  assert.match(skill, /stop before changing Scheduled state/u);
});

test("direct and indirect requests share one focused management workflow", async () => {
  const skill = await manageSkill();

  for (const operation of [
    "Explain or recommend",
    "List",
    "Inspect",
    "Create",
    "Update",
    "Pause or resume",
    "Delete",
  ]) {
    assert.match(skill, new RegExp(`\\*\\*${operation}:\\*\\*`));
  }
  assert.match(skill, /scheduled task inside the current chat/u);
  assert.match(skill, /standalone scheduled task/u);
  assert.match(skill, /follow-ups, polling, reminders, and continuation loops/u);
});

test("missing capabilities fail safely without a second scheduler", async () => {
  const skill = await manageSkill();

  assert.match(skill, /If no native Scheduled management capability is available/u);
  assert.match(skill, /provide read-only guidance/u);
  assert.match(skill, /Do not guess a personal directory layout/u);
  assert.match(skill, /Use the native Scheduled tool for all state changes/u);
  assert.match(skill, /Do not edit configuration or task files/u);
  assert.match(skill, /obtain confirmation immediately before deletion/u);
});

test("repository context and unattended permissions constrain execution", async () => {
  const skill = await manageSkill();

  assert.match(skill, /active `AGENTS\.md` chain/u);
  assert.match(skill, /only the relevant repository evidence/u);
  assert.match(skill, /Scheduled tasks run unattended/u);
  assert.match(skill, /prefer the narrowest supported access/u);
  assert.match(skill, /without overriding repository policy/u);
});
