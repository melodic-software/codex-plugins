import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await read(path));
const compact = (text) => text.replace(/\s+/gu, " ");
const skillPath =
  "plugins/scheduled-tasks/skills/manage-scheduled-tasks/SKILL.md";

test("the marketplace exposes the Scheduled tasks plugin", async () => {
  const [marketplace, manifest] = await Promise.all([
    readJson(".agents/plugins/marketplace.json"),
    readJson("plugins/scheduled-tasks/.codex-plugin/plugin.json"),
  ]);

  const entry = marketplace.plugins.find(({ name }) => name === "scheduled-tasks");
  assert.deepEqual(entry, {
    name: "scheduled-tasks",
    source: { source: "local", path: "./plugins/scheduled-tasks" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  });
  assert.equal(manifest.name, "scheduled-tasks");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.category, "Productivity");
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
  for (const field of ["mcpServers", "apps", "hooks"]) {
    assert.equal(field in manifest, false);
  }
});

test("the skill refreshes current docs and discovers native tools", async () => {
  const skill = compact(await read(skillPath));

  assert.match(skill, /Complete this preflight on every invocation/u);
  assert.match(skill, /https:\/\/learn\.chatgpt\.com\/docs\/automations/u);
  assert.match(skill, /Search the active tool catalog/u);
  assert.match(skill, /Read its full description and input schema/u);
  assert.match(skill, /Do not depend on a remembered tool name or argument shape/u);
  assert.match(skill, /stop before changing Scheduled state/u);
});

test("direct and indirect requests share one focused management workflow", async () => {
  const skill = compact(await read(skillPath));

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
  const skill = compact(await read(skillPath));

  assert.match(skill, /If no native Scheduled management capability is available/u);
  assert.match(skill, /provide read-only guidance/u);
  assert.match(skill, /Do not guess a personal directory layout/u);
  assert.match(skill, /Use the native Scheduled tool for all state changes/u);
  assert.match(skill, /Do not edit configuration or task files/u);
  assert.match(skill, /obtain confirmation immediately before deletion/u);
});

test("repository context and unattended permissions constrain execution", async () => {
  const skill = compact(await read(skillPath));

  assert.match(skill, /active `AGENTS\.md` chain/u);
  assert.match(skill, /only the relevant repository evidence/u);
  assert.match(skill, /Scheduled tasks run unattended/u);
  assert.match(skill, /prefer the narrowest supported access/u);
  assert.match(skill, /without overriding repository policy/u);
});
