import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { test } from "node:test";
import { assertExists, escapeRegExp, once, readJson } from "./helpers.mjs";

// `node --test <path>` exits 0 when <path> does not exist, so the hand-written
// file list in `scripts.test` cannot fail closed on its own. Delete or rename a
// listed test and CI stays green while running fewer tests; add a new test file
// and it is silently never run. These tests close both directions, so this file
// must itself stay listed in `scripts.test`.
//
// The list stays hand-written on purpose. `node --test` glob positionals are
// Node 21+ while `engines.node` is ">=20", and bare `node --test` discovery is
// unstable across that range and changes what `npm test -- <arg>` means.

const repositoryRoot = new URL("../", import.meta.url);

// The one test file that does not live in `tests/`. Named here so a walk that
// silently stops finding files cannot make the "registered" direction vacuous.
const outOfTreeTest =
  "plugins/plugin-ops/skills/verify-plugin/scripts/validate-marketplace.test.mjs";

/** The `*.test.mjs` paths `npm test` actually hands to `node --test`. */
const gateFiles = once(async () => {
  const { scripts } = await readJson("package.json");
  const match = /^node --test (?<paths>\S.*)$/u.exec(scripts.test);
  assert.ok(
    match,
    `scripts.test must stay "node --test <paths…>" so this guard can read it, got: ${scripts.test}`,
  );

  const files = match.groups.paths.split(/\s+/u);
  for (const file of files) {
    assert.ok(
      file.endsWith(".test.mjs"),
      `scripts.test lists a non-test argument, which this guard cannot check: ${file}`,
    );
  }
  assert.equal(new Set(files).size, files.length, "scripts.test lists a file twice");
  return files;
});

/** Every `*.test.mjs` committed to the repository, as a root-relative path. */
const diskFiles = once(async () => {
  const found = [];
  const walk = async (prefix) => {
    const entries = await readdir(new URL(prefix, repositoryRoot), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      if (entry.isDirectory()) await walk(`${prefix}${entry.name}/`);
      else if (entry.name.endsWith(".test.mjs")) found.push(`${prefix}${entry.name}`);
    }
  };
  await walk("");
  return found;
});

test("every test file on disk is registered in the npm test gate", async () => {
  const [gate, disk] = await Promise.all([gateFiles(), diskFiles()]);

  // Anchors: an empty or truncated walk would otherwise pass this vacuously.
  assert.ok(disk.includes(outOfTreeTest), `test-file walk missed ${outOfTreeTest}`);
  assert.ok(
    disk.includes("tests/test-harness.test.mjs"),
    "test-file walk missed this guard itself",
  );

  const listed = new Set(gate);
  for (const file of disk) {
    assert.ok(
      listed.has(file),
      `${file} exists but is not listed in package.json scripts.test, so npm test never runs it`,
    );
  }
});

test("every test file the npm test gate lists exists on disk", async () => {
  // Checked with a direct existence probe rather than against the walk, so a
  // broken walk cannot mask a missing file. `node --test` would exit 0 here.
  for (const file of await gateFiles()) {
    await assertExists(file);
  }
});

// `tests/helpers.mjs` is exercised transitively by every plugin test, but two of
// its exports fail silently rather than loudly when broken, so they are pinned
// here directly. The rest (`read`, `readJson`, `assertExists`, `skillPaths`,
// `compact`, `assertMarketplacePlugin`, `readSkillContract`) break loudly the
// moment any suite runs, and need no separate coverage.

test("escapeRegExp keeps every RegExp metacharacter literal", () => {
  // Silent failure mode: an unescaped metacharacter still matches, so every
  // assertion built on it — the 15 documentation URLs, every humanize
  // invariant — quietly turns into a looser check that keeps passing.
  for (const metacharacter of [".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]) {
    const literal = `a${metacharacter}b`;
    const pattern = new RegExp(escapeRegExp(literal), "u");
    assert.match(literal, pattern, `escapeRegExp lost ${metacharacter}`);
    assert.doesNotMatch("aXb", pattern, `escapeRegExp left ${metacharacter} active`);
  }
});

test("once loads a value one time and shares it", async () => {
  // Silent failure mode: a non-memoizing `once` still returns correct values,
  // so nothing fails — it just re-reads and re-parses behind every caller.
  let loads = 0;
  const load = once(async () => {
    loads += 1;
    return { loads };
  });

  const [first, second] = await Promise.all([load(), load()]);
  assert.equal(loads, 1);
  assert.equal(first, second);
  assert.equal(await load(), first);
});
