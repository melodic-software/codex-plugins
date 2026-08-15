import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await read(path));
const compact = (text) => text.replace(/\s+/gu, " ");
const coordinatePath =
  "plugins/codex-operations/skills/coordinate-codex-work/SKILL.md";
const findCandidatesPath =
  "plugins/codex-operations/skills/find-skill-candidates/SKILL.md";
const collectorPath =
  "plugins/codex-operations/skills/find-skill-candidates/scripts/collect_recent_sessions.py";

test("the marketplace exposes the Codex Operations plugin", async () => {
  const [marketplace, manifest] = await Promise.all([
    readJson(".agents/plugins/marketplace.json"),
    readJson("plugins/codex-operations/.codex-plugin/plugin.json"),
  ]);

  const entry = marketplace.plugins.find(({ name }) => name === "codex-operations");
  assert.deepEqual(entry, {
    name: "codex-operations",
    source: { source: "local", path: "./plugins/codex-operations" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Developer Tools",
  });
  assert.equal(manifest.name, "codex-operations");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.category, "Developer Tools");
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
  for (const field of ["mcpServers", "apps", "hooks"]) {
    assert.equal(field in manifest, false);
  }
});

test("coordinate-codex-work enforces authority, context, and smallest units", async () => {
  const [skill, metadata] = await Promise.all([
    read(coordinatePath),
    read("plugins/codex-operations/skills/coordinate-codex-work/agents/openai.yaml"),
  ]);
  const compactSkill = compact(skill);

  assert.match(skill, /^---\s+name: coordinate-codex-work\s+description:/u);
  assert.match(compactSkill, /active `AGENTS\.md` hierarchy/u);
  assert.match(compactSkill, /Identify what the user authorized/u);
  assert.match(compactSkill, /Keep irreversible actions/u);
  assert.match(compactSkill, /Choose the smallest execution unit/u);
  assert.match(compactSkill, /Require objective evidence/u);
  assert.match(skill, /references\/operating-model\.md/u);
  assert.match(skill, /references\/evidence\.md/u);
  assert.match(metadata, /default_prompt: "Use \$coordinate-codex-work/u);
  await assert.doesNotReject(
    access(
      new URL(
        "../plugins/codex-operations/skills/coordinate-codex-work/references/operating-model.md",
        import.meta.url,
      ),
    ),
  );
  await assert.doesNotReject(
    access(
      new URL(
        "../plugins/codex-operations/skills/coordinate-codex-work/references/evidence.md",
        import.meta.url,
      ),
    ),
  );
});

test("find-skill-candidates stays recommendation-only with bounded collection", async () => {
  const [skill, metadata] = await Promise.all([
    read(findCandidatesPath),
    read(
      "plugins/codex-operations/skills/find-skill-candidates/agents/openai.yaml",
    ),
  ]);
  const compactSkill = compact(skill);

  assert.match(skill, /^---\s+name: find-skill-candidates\s+description:/u);
  assert.match(compactSkill, /recommendation-only/u);
  assert.match(compactSkill, /do not create, edit, delete, disable, or move skills/u);
  assert.match(compactSkill, /scripts\/collect_recent_sessions\.py/u);
  assert.match(compactSkill, /Do not assume a user name, home path/u);
  assert.match(compactSkill, /Prefer no recommendation over weak evidence/u);
  assert.match(compactSkill, /Reason not applied/u);
  assert.match(metadata, /default_prompt: "Use \$find-skill-candidates/u);
  await assert.doesNotReject(access(new URL(`../${collectorPath}`, import.meta.url)));
});
