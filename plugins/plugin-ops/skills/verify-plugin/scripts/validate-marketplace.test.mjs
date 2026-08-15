import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateTarget } from "./validate-marketplace.mjs";

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function createFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "codex-marketplace-test-"));
  const pluginRoot = path.join(root, "plugins", "sample-plugin");
  await writeJson(path.join(root, ".agents", "plugins", "marketplace.json"), {
    name: "sample",
    interface: { displayName: "Sample" },
    plugins: [
      {
        name: "sample-plugin",
        source: { source: "local", path: "./plugins/sample-plugin" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Developer Tools",
      },
      ...(options.duplicate ? [{
        name: "sample-plugin",
        source: { source: "local", path: "./plugins/sample-plugin" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Developer Tools",
      }] : []),
    ],
  });
  await writeJson(path.join(pluginRoot, ".codex-plugin", "plugin.json"), {
    name: options.wrongName ? "wrong-name" : "sample-plugin",
    version: "0.1.0",
    description: "Sample plugin",
    author: { name: "Sample Author" },
    skills: "./skills/",
    interface: {
      displayName: "Sample Plugin",
      shortDescription: "Validate a sample plugin package",
      longDescription: "A complete sample plugin used by validator tests.",
      developerName: "Sample Author",
      category: "Developer Tools",
    },
  });
  const skillRoot = path.join(pluginRoot, "skills", "sample-skill");
  await mkdir(path.join(skillRoot, "agents"), { recursive: true });

  let skillBody;
  if (options.missingFrontmatter) {
    skillBody = "# Sample Skill\n\nNo frontmatter here.\n";
  } else {
    const skillName = options.skillNameMismatch ? "other-skill" : "sample-skill";
    const lines = [
      "---",
      `name: ${skillName}`,
      "description: Validate sample fixtures during tests.",
      "---",
      "",
      "# Sample Skill",
      "",
    ];
    if (options.todoPlaceholder) {
      lines.push("TODO: finish this skill before publishing.");
      lines.push("");
    }
    if (options.machinePath) {
      lines.push("Read `/Users/example/.codex/config.toml` for credentials.");
      lines.push("");
    }
    skillBody = `${lines.join("\n")}`;
  }

  await writeFile(path.join(skillRoot, "SKILL.md"), skillBody);
  if (!options.omitUiMetadata) {
    await writeFile(
      path.join(skillRoot, "agents", "openai.yaml"),
      "interface:\n  display_name: \"Sample Skill\"\n  short_description: \"Validate sample plugin fixtures\"\n  default_prompt: \"Use $sample-skill to validate this fixture.\"\n",
    );
  }
  return root;
}

test("accepts a complete local marketplace", async () => {
  const result = await validateTarget(await createFixture());
  assert.deepEqual(result.errors, []);
  assert.equal(result.kind, "marketplace");
});

test("rejects duplicate entries and manifest name drift", async () => {
  const result = await validateTarget(await createFixture({ duplicate: true, wrongName: true }));
  const codes = new Set(result.errors.map((error) => error.code));
  assert.ok(codes.has("duplicate-marketplace-plugin"));
  assert.ok(codes.has("plugin-name-mismatch"));
});

test("rejects missing skill frontmatter", async () => {
  const result = await validateTarget(await createFixture({ missingFrontmatter: true }));
  const codes = new Set(result.errors.map((error) => error.code));
  assert.ok(codes.has("missing-skill-frontmatter"));
});

test("rejects skill name mismatch, TODO placeholders, and machine paths", async () => {
  const result = await validateTarget(
    await createFixture({
      skillNameMismatch: true,
      todoPlaceholder: true,
      machinePath: true,
    }),
  );
  const codes = new Set(result.errors.map((error) => error.code));
  assert.ok(codes.has("skill-name-mismatch"));
  assert.ok(codes.has("skill-placeholder"));
  assert.ok(codes.has("machine-specific-path"));
});

test("warns when skill UI metadata is missing", async () => {
  const result = await validateTarget(await createFixture({ omitUiMetadata: true }));
  assert.deepEqual(result.errors, []);
  const codes = new Set(result.warnings.map((warning) => warning.code));
  assert.ok(codes.has("missing-skill-ui-metadata"));
});
