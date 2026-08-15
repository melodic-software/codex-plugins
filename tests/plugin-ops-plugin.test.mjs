import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await read(path));
const compact = (text) => text.replace(/\s+/gu, " ");

const skillRoot = (name) => `plugins/plugin-ops/skills/${name}`;
const skillMd = (name) => `${skillRoot(name)}/SKILL.md`;
const skillYaml = (name) => `${skillRoot(name)}/agents/openai.yaml`;

test("the marketplace exposes the Plugin Ops plugin", async () => {
  const [marketplace, manifest] = await Promise.all([
    readJson(".agents/plugins/marketplace.json"),
    readJson("plugins/plugin-ops/.codex-plugin/plugin.json"),
  ]);

  const entry = marketplace.plugins.find(({ name }) => name === "plugin-ops");
  assert.deepEqual(entry, {
    name: "plugin-ops",
    source: { source: "local", path: "./plugins/plugin-ops" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Developer Tools",
  });
  assert.equal(manifest.name, "plugin-ops");
  assert.equal(manifest.version, "0.2.0");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.category, "Developer Tools");
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
  for (const field of ["mcpServers", "apps", "hooks"]) {
    assert.equal(field in manifest, false);
  }
});

test("install-marketplace uses native CLI and the narrowest commands", async () => {
  const [skill, metadata] = await Promise.all([
    read(skillMd("install-marketplace")),
    read(skillYaml("install-marketplace")),
  ]);
  const compactSkill = compact(skill);

  assert.match(skill, /^---\s+name: install-marketplace\s+description:/u);
  assert.match(compactSkill, /Use the native Codex CLI/u);
  assert.match(compactSkill, /codex plugin marketplace add/u);
  assert.match(compactSkill, /codex plugin add <plugin>@<marketplace>/u);
  assert.match(compactSkill, /narrowest native command/u);
  assert.match(metadata, /default_prompt: "Use \$install-marketplace/u);
});

test("update-plugins refreshes sources then reinstalls changed plugins", async () => {
  const [skill, metadata] = await Promise.all([
    read(skillMd("update-plugins")),
    read(skillYaml("update-plugins")),
  ]);
  const compactSkill = compact(skill);

  assert.match(skill, /^---\s+name: update-plugins\s+description:/u);
  assert.match(compactSkill, /Refresh the configured source first/u);
  assert.match(compactSkill, /codex plugin marketplace upgrade/u);
  assert.match(compactSkill, /Do not assume a marketplace is Git-backed/u);
  assert.match(compactSkill, /\$plugin-creator/u);
  assert.match(metadata, /default_prompt: "Use \$update-plugins/u);
});

test("verify-plugin requires preflight, validator, and behavioral review", async () => {
  const [skill, metadata] = await Promise.all([
    read(skillMd("verify-plugin")),
    read(skillYaml("verify-plugin")),
  ]);
  const compactSkill = compact(skill);

  assert.match(skill, /^---\s+name: verify-plugin\s+description:/u);
  assert.match(compactSkill, /official-documentation preflight/u);
  assert.match(compactSkill, /validate-marketplace\.mjs/u);
  assert.match(compactSkill, /active `AGENTS\.md` context precede plugin defaults/u);
  assert.match(compactSkill, /independently useful, cohesive vertical slice/u);
  assert.match(metadata, /default_prompt: "Use \$verify-plugin/u);
  await assert.doesNotReject(
    access(
      new URL(
        "../plugins/plugin-ops/skills/verify-plugin/scripts/validate-marketplace.mjs",
        import.meta.url,
      ),
    ),
  );
});

test("migrate-plugin follows the playbook ledger and isolation testing", async () => {
  const [skill, metadata] = await Promise.all([
    read(skillMd("migrate-plugin")),
    read(skillYaml("migrate-plugin")),
  ]);
  const compactSkill = compact(skill);

  assert.match(skill, /^---\s+name: migrate-plugin\s+description:/u);
  assert.match(compactSkill, /docs\/PLUGIN-PHILOSOPHY\.md/u);
  assert.match(compactSkill, /docs\/MIGRATION-PLAYBOOK\.md/u);
  assert.match(compactSkill, /references\/component-map\.md/u);
  assert.match(compactSkill, /\*\*keep\*\*.*\*\*reshape\*\*.*\*\*replace\*\*.*\*\*drop\*\*/u);
  assert.match(compactSkill, /source marketplace and sibling plugins disabled/u);
  assert.match(metadata, /default_prompt: "Use \$migrate-plugin/u);
  await assert.doesNotReject(
    access(
      new URL(
        "../plugins/plugin-ops/skills/migrate-plugin/references/component-map.md",
        import.meta.url,
      ),
    ),
  );
});
