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
 * Reads a skill body plus its Codex metadata and asserts the two facts every
 * skill test repeated: SKILL.md frontmatter opens with this skill's name, and
 * openai.yaml aims its default prompt at the same name. Returns the raw body,
 * the raw metadata, and the whitespace-collapsed body for further assertions.
 */
export const readSkillContract = async (paths, name) => {
  const [skill, metadata] = await Promise.all([
    read(paths.md(name)),
    read(paths.yaml(name)),
  ]);

  assert.match(skill, new RegExp(`^---\\s+name: ${name}\\s+description:`, "u"));
  assert.match(metadata, new RegExp(`default_prompt: "Use \\$${name}`, "u"));

  return { skill, metadata, compactSkill: compact(skill) };
};
