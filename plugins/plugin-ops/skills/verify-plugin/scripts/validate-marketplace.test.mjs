import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { validateTarget } from "./validate-marketplace.mjs";

const run = promisify(execFile);
const VALIDATOR = fileURLToPath(new URL("./validate-marketplace.mjs", import.meta.url));
const NUL = String.fromCharCode(0);
// Composed instead of written out so this fixture string does not itself look
// like a machine-specific path to repository hooks that scan source files.
const USER_HOME_PATH = ["", "Users", "example", ".codex", "config.toml"].join("/");

const codesOf = (entries) => new Set(entries.map((entry) => entry.code));
const errorCodes = (result) => codesOf(result.errors);
const warningCodes = (result) => codesOf(result.warnings);

async function tempRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "codex-marketplace-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

// --- Fixture primitives -----------------------------------------------------
// Each helper owns exactly one layer of the package (catalog entry, plugin
// manifest, skill folder) and every helper starts from a valid default, so a
// test mutates one field and can attribute every emitted code to that mutation.

function marketplaceEntry(overrides = {}) {
  return {
    name: "sample-plugin",
    source: { source: "local", path: "./plugins/sample-plugin" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Developer Tools",
    ...overrides,
  };
}

function pluginManifest(overrides = {}) {
  return {
    name: "sample-plugin",
    version: "0.1.0",
    description: "Sample plugin",
    author: { name: "Sample Author" },
    skills: "./skills/",
    ...overrides,
    interface: {
      displayName: "Sample Plugin",
      shortDescription: "Validate a sample plugin package",
      longDescription: "A complete sample plugin used by validator tests.",
      developerName: "Sample Author",
      category: "Developer Tools",
      ...overrides.interface,
    },
  };
}

async function writeMarketplace(root, overrides = {}) {
  const file = path.join(root, ".agents", "plugins", "marketplace.json");
  await writeJson(file, { name: "sample", interface: { displayName: "Sample" }, plugins: [marketplaceEntry()], ...overrides });
  return file;
}

async function writePlugin(root, { directory = "plugins/sample-plugin", manifest = {} } = {}) {
  const pluginRoot = path.join(root, directory);
  await writeJson(path.join(pluginRoot, ".codex-plugin", "plugin.json"), pluginManifest(manifest));
  return pluginRoot;
}

async function writeSkill(pluginRoot, options = {}) {
  const {
    directory = "sample-skill",
    name = directory,
    description = "Validate sample fixtures during tests.",
    frontmatter = true,
    body = "# Sample Skill\n",
    uiMetadata = true,
    skillsDirectory = "skills",
  } = options;
  const skillRoot = path.join(pluginRoot, skillsDirectory, directory);
  await mkdir(skillRoot, { recursive: true });
  const header = frontmatter
    ? ["---", `name: ${name}`, ...(description ? [`description: ${description}`] : []), "---", ""].join("\n")
    : "";
  await writeFile(path.join(skillRoot, "SKILL.md"), `${header}\n${body}`);
  if (uiMetadata) {
    await mkdir(path.join(skillRoot, "agents"), { recursive: true });
    await writeFile(
      path.join(skillRoot, "agents", "openai.yaml"),
      "interface:\n  display_name: \"Sample Skill\"\n  short_description: \"Validate sample plugin fixtures\"\n",
    );
  }
  return skillRoot;
}

/**
 * A complete, valid marketplace containing one local plugin with one skill.
 * `entry`, `manifest`, and `skill` each mutate a single layer; `marketplace`
 * replaces top-level catalog fields.
 */
async function completeMarketplace(t, { entry, manifest, skill, marketplace } = {}) {
  const root = await tempRoot(t);
  await writeMarketplace(root, { plugins: [marketplaceEntry(entry)], ...marketplace });
  const pluginRoot = await writePlugin(root, { manifest });
  await writeSkill(pluginRoot, skill);
  return root;
}

/** A complete, valid plugin root (the `kind: "plugin"` target mode). */
async function completePlugin(t, { directory = "sample-plugin", manifest, skill } = {}) {
  const root = await tempRoot(t);
  const pluginRoot = await writePlugin(root, { directory, manifest });
  await writeSkill(pluginRoot, skill);
  return pluginRoot;
}

// --- Happy paths ------------------------------------------------------------

test("accepts a complete local marketplace", async (t) => {
  const result = await validateTarget(await completeMarketplace(t));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.kind, "marketplace");
});

test("accepts a local source given as a bare path string", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { source: "./plugins/sample-plugin" } }));
  assert.deepEqual(result.errors, []);
});

test("accepts a plugin root target", async (t) => {
  const target = await completePlugin(t);
  const result = await validateTarget(target);
  assert.deepEqual(result.errors, []);
  assert.equal(result.kind, "plugin");
  assert.equal(result.target, target);
});

test("plugin root target checks the manifest name against the folder name", async (t) => {
  const result = await validateTarget(await completePlugin(t, { directory: "renamed-plugin" }));
  assert.deepEqual(errorCodes(result), new Set(["plugin-name-mismatch"]));
});

// --- Target detection -------------------------------------------------------

test("rejects a directory that is neither a marketplace nor a plugin", async (t) => {
  const result = await validateTarget(await tempRoot(t));
  assert.deepEqual(errorCodes(result), new Set(["unknown-target"]));
  assert.equal(result.kind, null);
});

test("treats a non-directory path component as an absent entry point", async (t) => {
  const root = await tempRoot(t);
  await writeFile(path.join(root, ".agents"), "not a directory\n");
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["unknown-target"]));
});

// --- Catalog-level checks ---------------------------------------------------

test("rejects an unparsable marketplace file", async (t) => {
  const root = await tempRoot(t);
  await mkdir(path.join(root, ".agents", "plugins"), { recursive: true });
  await writeFile(path.join(root, ".agents", "plugins", "marketplace.json"), "{ not json\n");
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["invalid-json"]));
});

test("reports an unreadable marketplace file separately from invalid JSON", async (t) => {
  const root = await tempRoot(t);
  await mkdir(path.join(root, ".agents", "plugins", "marketplace.json"), { recursive: true });
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["unreadable-file"]));
});

test("requires a marketplace name", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { marketplace: { name: "" } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-marketplace-name"]));
});

test("requires the marketplace plugin list to be an array", async (t) => {
  const root = await tempRoot(t);
  await writeMarketplace(root, { plugins: { "sample-plugin": {} } });
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["missing-marketplace-plugins"]));
});

test("rejects duplicate marketplace entries", async (t) => {
  const root = await tempRoot(t);
  await writeMarketplace(root, { plugins: [marketplaceEntry(), marketplaceEntry()] });
  const pluginRoot = await writePlugin(root);
  await writeSkill(pluginRoot);
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["duplicate-marketplace-plugin"]));
});

test("requires an entry name", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { name: undefined } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-marketplace-plugin-name"]));
});

test("requires an entry category", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { category: undefined } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-marketplace-category"]));
});

test("rejects an unknown installation policy", async (t) => {
  const result = await validateTarget(
    await completeMarketplace(t, { entry: { policy: { installation: "SOMETIMES", authentication: "ON_USE" } } }),
  );
  assert.deepEqual(errorCodes(result), new Set(["invalid-installation-policy"]));
});

test("rejects an unknown authentication policy", async (t) => {
  const result = await validateTarget(
    await completeMarketplace(t, { entry: { policy: { installation: "NOT_AVAILABLE", authentication: "ON_DEMAND" } } }),
  );
  assert.deepEqual(errorCodes(result), new Set(["invalid-authentication-policy"]));
});

test("rejects a local source that escapes the marketplace root", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { source: { source: "local", path: "../elsewhere" } } }));
  assert.deepEqual(errorCodes(result), new Set(["invalid-marketplace-source"]));
});

test("reports a local source with no plugin manifest", async (t) => {
  const root = await tempRoot(t);
  await writeMarketplace(root, { plugins: [marketplaceEntry({ name: "ghost", source: { source: "local", path: "./plugins/ghost" } })] });
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-manifest"]));
});

test("reports a local source whose manifest directory is a file", async (t) => {
  const root = await tempRoot(t);
  await writeMarketplace(root);
  await mkdir(path.join(root, "plugins", "sample-plugin"), { recursive: true });
  await writeFile(path.join(root, "plugins", "sample-plugin", ".codex-plugin"), "not a directory\n");
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-manifest"]));
});

// --- Remote sources ---------------------------------------------------------

test("accepts complete remote sources but warns that they are not expanded", async (t) => {
  const root = await tempRoot(t);
  await writeMarketplace(root, {
    plugins: [
      marketplaceEntry({ name: "url-plugin", source: { source: "url", url: "https://example.com/plugin.zip" } }),
      marketplaceEntry({ name: "git-plugin", source: { source: "git-subdir", url: "https://example.com/repo.git", path: "packages/plugin" } }),
      marketplaceEntry({ name: "npm-plugin", source: { source: "npm", package: "@example/plugin" } }),
    ],
  });
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(warningCodes(result), new Set(["remote-source-not-expanded"]));
  assert.equal(result.warnings.length, 3);
});

test("rejects a URL source with no URL", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { source: { source: "url" } } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-source-url"]));
  assert.deepEqual(result.warnings, []);
});

test("rejects a git-subdir source with no URL", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { source: { source: "git-subdir", path: "packages/plugin" } } }));
  assert.deepEqual(errorCodes(result), new Set(["invalid-git-subdir-source"]));
});

test("rejects a git-subdir source with no subdirectory", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { source: { source: "git-subdir", url: "https://example.com/repo.git" } } }));
  assert.deepEqual(errorCodes(result), new Set(["invalid-git-subdir-source"]));
});

test("rejects an npm source with no package", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { source: { source: "npm" } } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-npm-package"]));
});

test("rejects an unknown source kind", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { source: { source: "ftp", url: "ftp://example.com/plugin" } } }));
  assert.deepEqual(errorCodes(result), new Set(["unsupported-marketplace-source"]));
});

test("rejects an entry with no source at all", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { entry: { source: undefined } }));
  assert.deepEqual(errorCodes(result), new Set(["unsupported-marketplace-source"]));
});

// --- Plugin manifest checks -------------------------------------------------

test("requires a plugin name", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { name: "" } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-name", "plugin-name-mismatch"]));
});

test("requires a plugin version", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { version: "" } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-version"]));
});

test("requires a plugin description", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { description: "   " } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-description"]));
});

test("requires a plugin author name", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { author: {} } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-author"]));
});

test("requires a kebab-case plugin name", async (t) => {
  const result = await validateTarget(
    await completeMarketplace(t, { entry: { name: "Sample_Plugin" }, manifest: { name: "Sample_Plugin" } }),
  );
  assert.deepEqual(errorCodes(result), new Set(["invalid-plugin-name"]));
});

test("requires a strict semantic version", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { version: "0.1" } }));
  assert.deepEqual(errorCodes(result), new Set(["invalid-plugin-version"]));
});

test("rejects manifest name drift from the catalog entry", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { name: "wrong-name" } }));
  assert.deepEqual(errorCodes(result), new Set(["plugin-name-mismatch"]));
});

for (const field of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
  test(`requires interface.${field}`, async (t) => {
    const result = await validateTarget(await completeMarketplace(t, { manifest: { interface: { [field]: "" } } }));
    assert.deepEqual(errorCodes(result), new Set([`missing-interface-${field}`]));
  });
}

// --- Declared component paths (apps, mcpServers, skills) --------------------

test("accepts a declared apps file that exists", async (t) => {
  const root = await completeMarketplace(t, { manifest: { apps: "./.app.json" } });
  await writeJson(path.join(root, "plugins", "sample-plugin", ".app.json"), { servers: {} });
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
});

test("reports an escaping apps path once, without a phantom missing file", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { apps: "../../../etc/passwd" } }));
  assert.deepEqual(errorCodes(result), new Set(["invalid-app-path"]));
});

test("reports a contained apps path whose file is absent", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { apps: "./.app.json" } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-app-manifest"]));
});

test("reports a non-relative apps path once", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { apps: "/etc/passwd" } }));
  assert.deepEqual(errorCodes(result), new Set(["invalid-app-path"]));
});

test("accepts a declared mcpServers file that exists", async (t) => {
  const root = await completeMarketplace(t, { manifest: { mcpServers: "./.mcp.json" } });
  await writeJson(path.join(root, "plugins", "sample-plugin", ".mcp.json"), { docs: { command: "docs-mcp" } });
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
});

test("reports a contained mcpServers path whose file is absent", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { mcpServers: "./.mcp.json" } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-mcp-manifest"]));
});

test("reports an escaping mcpServers path once", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { mcpServers: "../../shared/.mcp.json" } }));
  assert.deepEqual(errorCodes(result), new Set(["invalid-mcp-path"]));
});

test("rejects an inline mcpServers object instead of skipping it", async (t) => {
  const result = await validateTarget(
    await completeMarketplace(t, { manifest: { mcpServers: { docs: { command: "docs-mcp", args: ["--stdio"] } } } }),
  );
  assert.deepEqual(errorCodes(result), new Set(["invalid-mcp-path"]));
});

test("reports an invalid skills path against the plugin manifest, not the target root", async (t) => {
  const root = await completeMarketplace(t, { manifest: { skills: "../elsewhere" } });
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["invalid-skills-path"]));
  assert.equal(result.errors[0].file, path.join(root, "plugins", "sample-plugin", ".codex-plugin", "plugin.json"));
});

test("reports a declared skills directory that does not exist", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { skills: "./missing-skills/" } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-skills-directory"]));
});

test("reports a skills path that is a file rather than crashing", async (t) => {
  const root = await tempRoot(t);
  await writeMarketplace(root);
  const pluginRoot = await writePlugin(root, { manifest: { skills: "./skills" } });
  await writeFile(path.join(pluginRoot, "skills"), "not a directory\n");
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["unreadable-path"]));
});

test("reports an uninspectable skills path rather than crashing", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { manifest: { skills: `./skills${NUL}x` } }));
  assert.deepEqual(errorCodes(result), new Set(["unreadable-path"]));
});

// --- Skill checks -----------------------------------------------------------

test("rejects missing skill frontmatter", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { skill: { frontmatter: false } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-skill-frontmatter"]));
});

test("rejects a skill name that does not match its directory", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { skill: { name: "other-skill" } }));
  assert.deepEqual(errorCodes(result), new Set(["skill-name-mismatch"]));
});

test("rejects a skill with no description", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { skill: { description: "" } }));
  assert.deepEqual(errorCodes(result), new Set(["missing-skill-description"]));
});

test("rejects TODO placeholders in skill instructions", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { skill: { body: "TODO: finish this skill before publishing.\n" } }));
  assert.deepEqual(errorCodes(result), new Set(["skill-placeholder"]));
});

test("rejects machine-specific paths in skill instructions", async (t) => {
  const result = await validateTarget(
    await completeMarketplace(t, { skill: { body: `Read \`${USER_HOME_PATH}\` for credentials.\n` } }),
  );
  assert.deepEqual(errorCodes(result), new Set(["machine-specific-path"]));
});

test("warns when skill UI metadata is missing", async (t) => {
  const result = await validateTarget(await completeMarketplace(t, { skill: { uiMetadata: false } }));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(warningCodes(result), new Set(["missing-skill-ui-metadata"]));
});

test("ignores directories without a SKILL.md", async (t) => {
  const root = await completeMarketplace(t);
  await mkdir(path.join(root, "plugins", "sample-plugin", "skills", "not-a-skill"), { recursive: true });
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("rejects the same skill name declared by two plugins", async (t) => {
  const root = await tempRoot(t);
  await writeMarketplace(root, {
    plugins: [
      marketplaceEntry({ name: "plugin-one", source: { source: "local", path: "./plugins/plugin-one" } }),
      marketplaceEntry({ name: "plugin-two", source: { source: "local", path: "./plugins/plugin-two" } }),
    ],
  });
  for (const name of ["plugin-one", "plugin-two"]) {
    const pluginRoot = await writePlugin(root, { directory: `plugins/${name}`, manifest: { name } });
    await writeSkill(pluginRoot, { directory: "shared-skill" });
  }
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["duplicate-skill-name"]));
  assert.match(result.errors[0].file, /plugin-two/u);
});

test("rejects the same skill name declared twice inside one plugin", async (t) => {
  const root = await completeMarketplace(t, { skill: { directory: "alpha" } });
  await writeSkill(path.join(root, "plugins", "sample-plugin"), { directory: "beta", name: "alpha" });
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["duplicate-skill-name", "skill-name-mismatch"]));
});

// --- Command-line behavior --------------------------------------------------

test("command line reports PASS and exits zero for a valid target", async (t) => {
  const root = await completeMarketplace(t);
  const { stdout } = await run(process.execPath, [VALIDATOR, root]);
  assert.match(stdout, /^PASS: marketplace /u);
});

test("command line reports FAIL and exits non-zero for an invalid target", async (t) => {
  const root = await tempRoot(t);
  await assert.rejects(
    () => run(process.execPath, [VALIDATOR, root]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /ERROR unknown-target/u);
      assert.match(error.stdout, /^FAIL: unknown /u);
      return true;
    },
  );
});

test("command line emits the documented result shape with --json", async (t) => {
  const root = await completeMarketplace(t);
  const { stdout } = await run(process.execPath, [VALIDATOR, root, "--json"]);
  const parsed = JSON.parse(stdout);
  assert.deepEqual(Object.keys(parsed), ["target", "kind", "errors", "warnings"]);
  assert.equal(parsed.target, root);
  assert.equal(parsed.kind, "marketplace");
});
