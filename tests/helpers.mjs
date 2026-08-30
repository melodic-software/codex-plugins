import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

// This module lives in `tests/`, the same directory as every test file that
// imports it, so `../` resolves to the repository root exactly as the inlined
// copies of `read` did before extraction.

export const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

export const readJson = async (path) => JSON.parse(await read(path));

/** Collapses every whitespace run to one space so assertions survive wrapping. */
export const compact = (text) => text.replace(/\s+/gu, " ");

/** Escapes every RegExp metacharacter so `text` is matched literally. */
export const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/**
 * Memoizes an async load so several tests in one file share a single read and
 * parse. Callers only ever read the resolved value; nothing mutates it.
 */
export const once = (load) => {
  let pending;
  return () => (pending ??= load());
};

export const assertExists = (path) =>
  assert.doesNotReject(access(new URL(`../${path}`, import.meta.url)));

/** Path builders for one plugin's skill tree. */
export const skillPaths = (plugin) => {
  const root = (skill) => `plugins/${plugin}/skills/${skill}`;
  return {
    plugin,
    root,
    md: (skill) => `${root(skill)}/SKILL.md`,
    yaml: (skill) => `${root(skill)}/agents/openai.yaml`,
    file: (skill, relativePath) => `${root(skill)}/${relativePath}`,
  };
};

/**
 * Pins the marketplace entry and plugin manifest for one plugin. The exact
 * `deepEqual` on the entry and the absence check for `mcpServers`/`apps`/`hooks`
 * are the only things pinning manifest shape, so both stay exact here.
 */
export const assertMarketplacePlugin = async ({ name, version, category }) => {
  const [marketplace, manifest] = await Promise.all([
    readJson(".agents/plugins/marketplace.json"),
    readJson(`plugins/${name}/.codex-plugin/plugin.json`),
  ]);

  const entry = marketplace.plugins.find((plugin) => plugin.name === name);
  assert.deepEqual(entry, {
    name,
    source: { source: "local", path: `./plugins/${name}` },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category,
  });
  assert.equal(manifest.name, name);
  assert.equal(manifest.version, version);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.category, category);
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
  for (const field of ["mcpServers", "apps", "hooks"]) {
    assert.equal(field in manifest, false);
  }
};

/**
 * Reads a skill body plus its Codex metadata and asserts the three facts every
 * skill test should repeat: SKILL.md frontmatter opens with this skill's name,
 * openai.yaml aims its default prompt at the same name, and openai.yaml
 * publishes the expected `display_name`. Returns the raw body, the raw
 * metadata, and the whitespace-collapsed body for further assertions.
 *
 * `displayName` is required rather than optional so a new skill test cannot
 * quietly reintroduce the asymmetry this closed, where only one of the eight
 * skills pinned the name Codex actually shows users.
 */
export const readSkillContract = async (paths, name, displayName) => {
  const [skill, metadata] = await Promise.all([
    read(paths.md(name)),
    read(paths.yaml(name)),
  ]);

  assert.match(skill, new RegExp(`^---\\s+name: ${name}\\s+description:`, "u"));
  // Codex qualifies a plugin-provided skill's name with its plugin namespace
  // (`plugin:skill`) and resolves an explicit mention against that qualified
  // name only, with no base-name alias. `default_prompt` is stored verbatim and
  // never rewritten, so a bare `$skill` in it names a mention that cannot
  // resolve. Pinning the qualified form here keeps that drift from returning.
  assert.match(
    metadata,
    new RegExp(`default_prompt: "Use \\$${paths.plugin}:${name}`, "u"),
    `${name} must seed the qualified mention $${paths.plugin}:${name}`,
  );
  assert.match(
    metadata,
    new RegExp(`display_name: "${escapeRegExp(displayName)}"`, "u"),
    `${name} must publish display_name "${displayName}"`,
  );

  return { skill, metadata, compactSkill: compact(skill) };
};
