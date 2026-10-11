import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
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

test("skips a catalog slot that is not a file, as Codex does", async (t) => {
  const root = await tempRoot(t);
  await mkdir(path.join(root, ".agents", "plugins", "marketplace.json"), { recursive: true });
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["unknown-target"]));
  assert.deepEqual(warningCodes(result), new Set(["skipped-marketplace-catalog"]));
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

// --- Manifest layouts and precedence ----------------------------------------

const AGENT_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";

function agentManifest(overrides = {}) {
  return {
    $schema: AGENT_SCHEMA,
    name: "sample-plugin",
    version: "0.1.0",
    description: "Sample plugin",
    author: { name: "Sample Author" },
    ...overrides,
  };
}

/** A plugin root holding the given manifests ({ relativePath: json }) and one skill. */
async function layoutPlugin(t, manifests) {
  const pluginRoot = path.join(await tempRoot(t), "sample-plugin");
  for (const [relativePath, json] of Object.entries(manifests)) {
    await writeJson(path.join(pluginRoot, relativePath), json);
  }
  await writeSkill(pluginRoot);
  return pluginRoot;
}

const claudeManifest = { name: "sample-plugin", version: "0.1.0", description: "Sample plugin", author: { name: "Sample Author" }, skills: "./skills/" };

test("accepts a root Agent Plugins manifest and reports its layout", async (t) => {
  const pluginRoot = await layoutPlugin(t, { "plugin.json": agentManifest() });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.kind, "plugin");
  assert.deepEqual(result.manifests, [{ plugin: pluginRoot, manifest: path.join(pluginRoot, "plugin.json"), format: "agent-plugin" }]);
});

test("validates skills under a root manifest's fixed skills directory", async (t) => {
  const pluginRoot = await layoutPlugin(t, { "plugin.json": agentManifest() });
  await writeSkill(pluginRoot, { directory: "broken-skill", name: "other-name" });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(errorCodes(result), new Set(["skill-name-mismatch"]));
});

test("accepts a dotted Agent Plugins name", async (t) => {
  const pluginRoot = path.join(await tempRoot(t), "sample.plugin");
  await writeJson(path.join(pluginRoot, "plugin.json"), agentManifest({ name: "sample.plugin" }));
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
});

test("rejects an unsupported Agent Plugins schema version", async (t) => {
  const pluginRoot = await layoutPlugin(t, {
    "plugin.json": agentManifest({ $schema: "https://agent-plugins.org/schemas/9.0.0/plugin.schema.json" }),
  });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(errorCodes(result), new Set(["unsupported-agent-plugin-schema"]));
});

for (const version of ["01.2.3", "1.02.3", "1.0.0-01", "1.0"]) {
  test(`rejects the non-SemVer root manifest version ${version}`, async (t) => {
    const pluginRoot = await layoutPlugin(t, { "plugin.json": agentManifest({ version }) });
    assert.deepEqual(errorCodes(await validateTarget(pluginRoot)), new Set(["invalid-plugin-version"]));
  });
}

test("accepts a SemVer root manifest version with prerelease and build parts", async (t) => {
  const pluginRoot = await layoutPlugin(t, { "plugin.json": agentManifest({ version: "1.0.0-0.alpha.10+build.007" }) });
  assert.deepEqual((await validateTarget(pluginRoot)).errors, []);
});

test("warns about root manifest fields Codex ignores", async (t) => {
  const pluginRoot = await layoutPlugin(t, { "plugin.json": agentManifest({ interface: { displayName: "Sample" } }) });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(warningCodes(result), new Set(["ignored-agent-plugin-field"]));
});

test("warns when a root manifest plugin ships .mcp.json instead of mcp.json", async (t) => {
  const pluginRoot = await layoutPlugin(t, { "plugin.json": agentManifest(), ".mcp.json": { mcpServers: {} } });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(warningCodes(result), new Set(["agent-plugin-mcp-file"]));
});

test("checks the com.openai extension's interface and apps", async (t) => {
  const pluginRoot = await layoutPlugin(t, {
    "plugin.json": agentManifest({ extensions: { "com.openai": { apps: "./.app.json", interface: { displayName: "Sample" } } } }),
  });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(
    errorCodes(result),
    new Set(["missing-app-manifest", "missing-interface-shortDescription", "missing-interface-longDescription", "missing-interface-developerName", "missing-interface-category"]),
  );
});

test("ignores a root plugin.json without an Agent Plugins schema and falls back to .codex-plugin", async (t) => {
  const pluginRoot = await layoutPlugin(t, {
    "plugin.json": { name: "npm-package" },
    ".codex-plugin/plugin.json": pluginManifest(),
  });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.manifests[0].format, "codex");
});

test("warns that .codex-plugin is shadowed when the root manifest has a com.openai extension", async (t) => {
  const pluginRoot = await layoutPlugin(t, {
    "plugin.json": agentManifest({ extensions: { "com.openai": {} } }),
    ".codex-plugin/plugin.json": pluginManifest(),
  });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(warningCodes(result), new Set(["shadowed-plugin-manifest"]));
  assert.equal(result.warnings[0].file, path.join(pluginRoot, ".codex-plugin", "plugin.json"));
});

test("reads .codex-plugin as the overlay when the root manifest has no com.openai extension", async (t) => {
  const pluginRoot = await layoutPlugin(t, {
    "plugin.json": agentManifest(),
    ".codex-plugin/plugin.json": pluginManifest({ interface: { category: "" } }),
  });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(errorCodes(result), new Set(["missing-interface-category"]));
  assert.deepEqual(result.warnings, []);
  assert.equal(result.manifests[0].overlay, path.join(pluginRoot, ".codex-plugin", "plugin.json"));
});

test("warns that a Claude manifest is shadowed by .codex-plugin", async (t) => {
  const pluginRoot = await layoutPlugin(t, {
    ".codex-plugin/plugin.json": pluginManifest(),
    ".claude-plugin/plugin.json": claudeManifest,
  });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(warningCodes(result), new Set(["shadowed-plugin-manifest"]));
});

test("accepts a Claude manifest as a fallback with warnings, not errors", async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".claude-plugin/plugin.json": claudeManifest });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.ok(warningCodes(result).has("legacy-host-manifest"));
  assert.ok(warningCodes(result).has("missing-interface-displayName"));
  assert.equal(result.manifests[0].format, "claude");
});

test("prefers a Claude manifest over a Cursor manifest", async (t) => {
  const pluginRoot = await layoutPlugin(t, {
    ".claude-plugin/plugin.json": claudeManifest,
    ".cursor-plugin/plugin.json": claudeManifest,
  });
  const result = await validateTarget(pluginRoot);
  assert.equal(result.manifests[0].format, "claude");
  assert.ok(result.warnings.some((warning) => warning.code === "shadowed-plugin-manifest" && warning.file.includes(".cursor-plugin")));
});

test("accepts a Cursor manifest as a fallback", async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".cursor-plugin/plugin.json": claudeManifest });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.equal(result.manifests[0].format, "cursor");
});

test("a non-regular root plugin.json hides every lower manifest, as in Codex", async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".codex-plugin/plugin.json": pluginManifest() });
  await mkdir(path.join(pluginRoot, "plugin.json"));
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-manifest"]));
  assert.equal(result.errors[0].file, path.join(pluginRoot, "plugin.json"));
});

const symlinkSupported = process.platform !== "win32";

test("a symlinked root plugin.json hides every lower manifest", { skip: !symlinkSupported }, async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".codex-plugin/plugin.json": pluginManifest() });
  await writeJson(path.join(pluginRoot, "..", "target.json"), agentManifest());
  await symlink(path.join(pluginRoot, "..", "target.json"), path.join(pluginRoot, "plugin.json"));
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-manifest"]));
  assert.equal(result.errors[0].file, path.join(pluginRoot, "plugin.json"));
});

test("a symlinked .codex-plugin manifest hides the Claude manifest below it", { skip: !symlinkSupported }, async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".claude-plugin/plugin.json": claudeManifest, "benign.json": pluginManifest() });
  await mkdir(path.join(pluginRoot, ".codex-plugin"));
  await symlink("../benign.json", path.join(pluginRoot, ".codex-plugin", "plugin.json"));
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-manifest"]));
});

test("a symlinked .codex-plugin directory hides the Claude manifest below it", { skip: !symlinkSupported }, async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".claude-plugin/plugin.json": claudeManifest });
  await writeJson(path.join(pluginRoot, "..", "elsewhere", "plugin.json"), pluginManifest());
  await symlink(path.join(pluginRoot, "..", "elsewhere"), path.join(pluginRoot, ".codex-plugin"));
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-manifest"]));
});

test("an unparsable root plugin.json falls through to the legacy manifests", async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".codex-plugin/plugin.json": pluginManifest() });
  await writeFile(path.join(pluginRoot, "plugin.json"), "{ not json\n");
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.equal(result.manifests[0].format, "codex");
});

test("skips an overlay slot that is not a file", async (t) => {
  const pluginRoot = await layoutPlugin(t, { "plugin.json": agentManifest() });
  await mkdir(path.join(pluginRoot, ".codex-plugin", "plugin.json"), { recursive: true });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
  assert.equal(result.manifests[0].overlay, undefined);
});

test("accepts an inline mcpServers map and a skills list in a Claude manifest", async (t) => {
  const pluginRoot = await layoutPlugin(t, {
    ".claude-plugin/plugin.json": { ...claudeManifest, mcpServers: { docs: { command: "docs-mcp" } }, skills: ["./skills/"] },
  });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(result.errors, []);
});

// --- Catalog layouts --------------------------------------------------------

test("prefers api_marketplace.json over a Claude catalog", async (t) => {
  const root = await tempRoot(t);
  await writeJson(path.join(root, ".agents", "plugins", "api_marketplace.json"), { name: "sample", plugins: [marketplaceEntry()] });
  await writeJson(path.join(root, ".claude-plugin", "marketplace.json"), { name: "sample", plugins: [] });
  await writeSkill(await writePlugin(root));
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.catalog, path.join(root, ".agents", "plugins", "api_marketplace.json"));
  assert.deepEqual(warningCodes(result), new Set(["shadowed-marketplace-catalog"]));
});

test("warns that a Cursor catalog is shadowed by a Claude catalog", async (t) => {
  const root = await tempRoot(t);
  await writeJson(path.join(root, ".claude-plugin", "marketplace.json"), { name: "sample", plugins: [marketplaceEntry()] });
  await writeJson(path.join(root, ".cursor-plugin", "marketplace.json"), { name: "sample", plugins: [] });
  await writeSkill(await writePlugin(root));
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(warningCodes(result), new Set(["legacy-host-catalog", "shadowed-marketplace-catalog"]));
  assert.ok(result.warnings.some((warning) => warning.code === "shadowed-marketplace-catalog" && warning.file.includes(".cursor-plugin")));
});

test("accepts a Claude catalog as a fallback and reports its missing policy as warnings", async (t) => {
  const root = await tempRoot(t);
  await writeJson(path.join(root, ".claude-plugin", "marketplace.json"), {
    name: "sample",
    plugins: [{ name: "sample-plugin", source: "./plugins/sample-plugin" }],
  });
  await writeSkill(await writePlugin(root));
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.kind, "marketplace");
  assert.equal(result.catalog, path.join(root, ".claude-plugin", "marketplace.json"));
  assert.deepEqual(
    warningCodes(result),
    new Set(["legacy-host-catalog", "invalid-installation-policy", "invalid-authentication-policy", "missing-marketplace-category"]),
  );
});

test("accepts a Cursor catalog source without the ./ prefix", async (t) => {
  const root = await tempRoot(t);
  await writeJson(path.join(root, ".cursor-plugin", "marketplace.json"), {
    name: "sample",
    plugins: [marketplaceEntry({ source: "plugins/sample-plugin" })],
  });
  await writeSkill(await writePlugin(root));
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(warningCodes(result), new Set(["legacy-host-catalog"]));
});

test("rejects an absolute source in a Cursor catalog instead of re-rooting it", async (t) => {
  const root = await tempRoot(t);
  await writeJson(path.join(root, ".cursor-plugin", "marketplace.json"), {
    name: "sample",
    plugins: [marketplaceEntry({ source: "/etc" })],
  });
  const result = await validateTarget(root);
  assert.deepEqual(errorCodes(result), new Set(["invalid-marketplace-source"]));
});

for (const source of ["C:\\Users\\alice\\plugin", "C:/Users/alice/plugin", "C:plugin", "\\\\server\\share\\plugin", "\\plugin"]) {
  test(`rejects the Windows absolute Cursor source ${JSON.stringify(source)} on every host`, async (t) => {
    const root = await tempRoot(t);
    await writeJson(path.join(root, ".cursor-plugin", "marketplace.json"), {
      name: "sample",
      plugins: [marketplaceEntry({ source })],
    });
    const result = await validateTarget(root);
    assert.deepEqual(errorCodes(result), new Set(["invalid-marketplace-source"]));
  });
}

test("rejects a manifest or catalog that is valid JSON but not an object", async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".codex-plugin/plugin.json": null });
  assert.deepEqual(errorCodes(await validateTarget(pluginRoot)), new Set(["invalid-json"]));
  const root = await tempRoot(t);
  await writeJson(path.join(root, ".agents", "plugins", "marketplace.json"), null);
  assert.deepEqual(errorCodes(await validateTarget(root)), new Set(["invalid-json"]));
});

test("reports non-string names without crashing", async (t) => {
  const pluginRoot = await layoutPlugin(t, { ".codex-plugin/plugin.json": pluginManifest({ name: { toString: 1 }, version: 1 }) });
  const result = await validateTarget(pluginRoot);
  assert.deepEqual(errorCodes(result), new Set(["missing-plugin-name", "missing-plugin-version", "plugin-name-mismatch"]));
  const marketplace = await completeMarketplace(t, { entry: { name: { toString: 1 } } });
  assert.ok(errorCodes(await validateTarget(marketplace)).has("missing-marketplace-plugin-name"));
});

test("warns that a Claude catalog is shadowed by .agents/plugins/marketplace.json", async (t) => {
  const root = await completeMarketplace(t);
  await writeJson(path.join(root, ".claude-plugin", "marketplace.json"), { name: "sample", plugins: [] });
  const result = await validateTarget(root);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(warningCodes(result), new Set(["shadowed-marketplace-catalog"]));
  assert.equal(result.catalog, path.join(root, ".agents", "plugins", "marketplace.json"));
});

// --- Command-line behavior --------------------------------------------------

test("command line reports PASS and exits zero for a valid target", async (t) => {
  const root = await completeMarketplace(t);
  const { stdout } = await run(process.execPath, [VALIDATOR, root]);
  assert.match(stdout, /^PASS: marketplace /u);
  assert.match(stdout, /^CATALOG \.agents\/plugins\/marketplace\.json$/mu);
  assert.match(stdout, /^MANIFEST codex: plugins\/sample-plugin\/\.codex-plugin\/plugin\.json$/mu);
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
  assert.deepEqual(Object.keys(parsed), ["target", "kind", "catalog", "manifests", "errors", "warnings"]);
  assert.equal(parsed.target, root);
  assert.equal(parsed.kind, "marketplace");
});
