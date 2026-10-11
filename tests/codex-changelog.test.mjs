import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findPython } from "./helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scripts = path.join(
  repoRoot,
  "plugins",
  "codex-operations",
  "skills",
  "codex-changelog",
  "scripts",
);
const releasesScript = path.join(scripts, "codex_releases.py");
const surfacesScript = path.join(scripts, "discover_surfaces.py");

const python = findPython();
const skip = python ? false : "Python 3 is not available";

function run(script, args, { cwd, env } = {}) {
  const result = spawnSync(python.command, [...python.prefix, script, ...args], {
    encoding: "utf8",
    cwd,
    env: env ?? process.env,
  });
  const lf = (text) => text.replaceAll("\r\n", "\n");
  return { ...result, stdout: lf(result.stdout), stderr: lf(result.stderr) };
}

/** Parses `key: value` status lines up to the first blank line. */
function statusLines(stdout) {
  const lines = {};
  for (const line of stdout.split("\n")) {
    const match = /^([a-z-]+): (.*)$/u.exec(line);
    if (match) lines[match[1]] ??= match[2];
  }
  return lines;
}

async function tempDir(t, prefix) {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

const notes = (sections) =>
  `${sections}\n## Changelog\n\nFull Changelog: https://example.invalid/compare\n\n- #1 raw pull request line @someone\n- #2 another raw line @someone\n`;

// Synthetic releases in the shape `gh release list --json tagName,publishedAt`
// returns, plus a prerelease and a non-CLI tag that must both be ignored.
const fixtureReleases = {
  "0.1.0": notes("## New Features\n\n- First feature.\n"),
  "0.2.0": notes("## New Features\n\n- Added `codex thing`.\n\n## Chores\n\n- Removed the bundled `old-skill` skill.\n"),
  "0.2.1": "## Bug Fixes\n\n- Fixed one crash.\n\nFull Changelog: https://example.invalid/compare\n",
  "0.3.0": notes("## Bug Fixes\n\n* Fixed a hook payload.\n- Fixed MCP startup.\n- Fixed AGENTS.md loading.\n"),
};

async function writeSource(t) {
  const dir = await tempDir(t, "codex-changelog-src-");
  await mkdir(path.join(dir, "notes"));
  const rows = Object.keys(fixtureReleases).map((version) => ({
    tagName: `rust-v${version}`,
    publishedAt: "2026-10-01T00:00:00Z",
  }));
  rows.push({ tagName: "rust-v0.4.0-alpha.1", publishedAt: "2026-10-02T00:00:00Z" });
  rows.push({ tagName: "python-v0.9.0", publishedAt: "2026-10-02T00:00:00Z" });
  await writeFile(path.join(dir, "releases.json"), JSON.stringify(rows), "utf8");
  for (const [version, body] of Object.entries(fixtureReleases)) {
    await writeFile(path.join(dir, "notes", `${version}.md`), body, "utf8");
  }
  return dir;
}

async function writeLedger(t, version) {
  const dir = await tempDir(t, "codex-changelog-ledger-");
  const ledger = path.join(dir, "codex-cli.md");
  await writeFile(
    ledger,
    `# Codex CLI\n\n**Last read Codex release:** \`${version}\` (published 2026-10-01), read on 2026-10-02.\n`,
    "utf8",
  );
  return ledger;
}

test("status takes the default range from the ledger marker", { skip }, async (t) => {
  const source = await writeSource(t);
  const ledger = await writeLedger(t, "0.1.0");
  const result = run(releasesScript, ["status", "--from", source, "--ledger", ledger]);
  assert.equal(result.status, 0, result.stderr);
  const lines = statusLines(result.stdout);
  assert.equal(lines["last-read"], "0.1.0");
  assert.match(lines.ledger, /\(present\)$/u);
  assert.equal(lines.latest, "0.3.0 (published 2026-10-01)");
  // Items stop at the `## Changelog` heading or the `Full Changelog:` line, so
  // the raw pull-request list is never counted.
  assert.equal(lines.range, "0.2.0..0.3.0 (3 releases, 6 items)");
  assert.equal(lines.releases, "0.2.0 0.2.1 0.3.0");
  assert.match(lines.cap, /^within budget/u);
});

test("an explicit range ignores the marker and includes both ends", { skip }, async (t) => {
  const source = await writeSource(t);
  const ledger = await writeLedger(t, "0.3.0");
  const result = run(releasesScript, ["status", "--from", source, "--ledger", ledger, "--range", "v0.1.0..0.2.1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(statusLines(result.stdout).range, "0.1.0..0.2.1 (3 releases, 4 items)");
});

test("a marker at the newest release is up to date", { skip }, async (t) => {
  const source = await writeSource(t);
  const ledger = await writeLedger(t, "0.3.0");
  const result = run(releasesScript, ["status", "--from", source, "--ledger", ledger]);
  assert.equal(statusLines(result.stdout).range, "up to date");
});

test("with no ledger, status defaults to the repository path and recommends a marker", { skip }, async (t) => {
  const source = await writeSource(t);
  const cwd = await tempDir(t, "codex-changelog-cwd-");
  const result = run(releasesScript, ["status", "--from", source], { cwd });
  assert.equal(result.status, 0, result.stderr);
  const lines = statusLines(result.stdout);
  assert.equal(lines["last-read"], "none");
  assert.ok(
    lines.ledger.endsWith(`${path.join("docs", "upstream", "codex-cli.md")} (absent)`),
    lines.ledger,
  );
  assert.match(lines.recommend, /no read marker.*at 0\.3\.0/u);
  assert.equal(lines.range, undefined);
});

test("the replay cap stops on items and on releases", { skip }, async (t) => {
  const source = await writeSource(t);
  const ledger = await writeLedger(t, "0.1.0");
  const byItems = statusLines(
    run(releasesScript, ["status", "--from", source, "--ledger", ledger, "--cap-items", "5"]).stdout,
  );
  assert.match(byItems.cap, /^exceeded \(50 releases \/ 5 items\)/u);
  assert.match(byItems.recommend, /set the marker in .* to 0\.3\.0/u);

  const byReleases = statusLines(
    run(releasesScript, ["status", "--from", source, "--ledger", ledger, "--cap-releases", "2"]).stdout,
  );
  assert.equal(byReleases.range, "0.2.0..0.3.0 (3 releases, items not counted)");
  assert.match(byReleases.cap, /^exceeded/u);
});

test("a range with no stable release is reported, not treated as up to date", { skip }, async (t) => {
  const source = await writeSource(t);
  const result = run(releasesScript, ["status", "--from", source, "--range", "0.4.0"]);
  assert.equal(statusLines(result.stdout).range, "not computed (no stable release between 0.4.0 and 0.4.0)");
});

test("fetch prints stable item ids and round-trips through --out and --from", { skip }, async (t) => {
  const source = await writeSource(t);
  const printed = run(releasesScript, ["fetch", "--from", source, "--range", "0.2.0"]);
  assert.equal(printed.status, 0, printed.stderr);
  assert.match(printed.stdout, /^0\.2\.0-001 \[New Features\] Added `codex thing`\.$/mu);
  assert.match(printed.stdout, /^0\.2\.0-002 \[Chores\] Removed the bundled `old-skill` skill\.$/mu);
  assert.ok(!printed.stdout.includes("raw pull request line"));

  const out = await tempDir(t, "codex-changelog-out-");
  const written = run(releasesScript, ["fetch", "--from", source, "--range", "0.2.0..0.3.0", "--out", out]);
  assert.equal(written.status, 0, written.stderr);
  const items = await readFile(path.join(out, "items", "0.3.0.md"), "utf8");
  assert.equal(items.split("\n")[0], "0.3.0-001 [Bug Fixes] Fixed a hook payload.");

  const replay = run(releasesScript, ["status", "--from", out, "--range", "0.2.0..0.3.0"]);
  assert.equal(statusLines(replay.stdout).range, "0.2.0..0.3.0 (3 releases, 6 items)");
});

test("fetch prints no items once the item cap is exceeded", { skip }, async (t) => {
  const source = await writeSource(t);
  const result = run(releasesScript, ["fetch", "--from", source, "--range", "0.2.0..0.3.0", "--cap-items", "2"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(statusLines(result.stdout).cap, /^exceeded/u);
  assert.doesNotMatch(result.stdout, /^0\.\d\.\d-\d{3} /mu);
});

test("fetch refuses an --out directory that already holds files", { skip }, async (t) => {
  const source = await writeSource(t);
  const out = await tempDir(t, "codex-changelog-used-");
  await writeFile(path.join(out, "planted.md"), "x\n", "utf8");
  const result = run(releasesScript, ["fetch", "--from", source, "--range", "0.2.0", "--out", out]);
  assert.equal(result.status, 3, result.stdout);
  assert.match(result.stderr, /new or empty directory/u);
});

test("pre-0.77 release layouts stop at the merged-PR list and keep breaking-change headings", { skip }, async (t) => {
  // Shape of the openai/codex 0.24.0 and 0.36.0 bodies: no `## Changelog`
  // marker, a breaking change stated as a heading, and the PR list under a
  // "merged PRs" heading.
  const source = await tempDir(t, "codex-changelog-old-");
  await mkdir(path.join(source, "notes"));
  await writeFile(
    path.join(source, "releases.json"),
    JSON.stringify([{ tagName: "rust-v0.36.0", publishedAt: "2025-09-15T00:00:00Z" }]),
    "utf8",
  );
  await writeFile(
    path.join(source, "notes", "0.36.0.md"),
    "### **Breaking change:** `OPENAI_API_KEY` is no longer read from the environment\n\nProse.\n\n" +
      "### Highlights\n\n- Resume old sessions.\n\n### Full list of merged PRs:\n\n- #3537 resume @someone\n- #3625 more @someone\n",
    "utf8",
  );
  const result = run(releasesScript, ["fetch", "--from", source, "--range", "0.36.0"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(statusLines(result.stdout).range, "0.36.0..0.36.0 (1 releases, 2 items)");
  assert.match(result.stdout, /^0\.36\.0-001 \[Breaking\] Breaking change: `OPENAI_API_KEY` is no longer read/mu);
  assert.match(result.stdout, /^0\.36\.0-002 \[Highlights\] Resume old sessions\.$/mu);
});

test("a range older than a full release list is not computed", { skip }, async (t) => {
  const source = await tempDir(t, "codex-changelog-full-");
  const rows = Array.from({ length: 200 }, (_, index) => ({
    tagName: `rust-v1.${index}.0`,
    publishedAt: "2026-10-01T00:00:00Z",
  }));
  await writeFile(path.join(source, "releases.json"), JSON.stringify(rows), "utf8");
  const ledger = await writeLedger(t, "0.9.0");
  const result = run(releasesScript, ["status", "--from", source, "--ledger", ledger]);
  assert.match(statusLines(result.stdout).range, /^not computed \(the range starts before 1\.0\.0/u);
});

const posixOnly = skip || (process.platform === "win32" && "POSIX shim only");

test("the gh adapter lists stable releases and reads bodies", { skip: posixOnly }, async (t) => {
  const bin = await tempDir(t, "codex-changelog-gh-");
  const shim = path.join(bin, "gh");
  const list = JSON.stringify([{ tagName: "rust-v0.5.0", publishedAt: "2026-10-01T00:00:00Z" }]);
  const body = JSON.stringify({ body: "## Bug Fixes\n\n- Fixed it.\n\n## Changelog\n\n- #9 raw @x\n" });
  await writeFile(
    shim,
    `#!/bin/sh\ncase "$2" in\n  list) printf '%s\\n' '${list}' ;;\n  view) [ "$3" = rust-v0.5.0 ] && printf '%s\\n' '${body}' || exit 1 ;;\nesac\n`,
    "utf8",
  );
  await chmod(shim, 0o755);
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const ok = run(releasesScript, ["fetch", "--range", "0.5.0"], { env });
  assert.equal(statusLines(ok.stdout).range, "0.5.0..0.5.0 (1 releases, 1 items)");
  assert.match(ok.stdout, /^0\.5\.0-001 \[Bug Fixes\] Fixed it\.$/mu);

  await writeFile(shim, "#!/bin/sh\nexit 1\n", "utf8");
  const failed = run(releasesScript, ["status", "--range", "0.5.0"], { env });
  assert.equal(failed.status, 0);
  assert.match(statusLines(failed.stdout).range, /^not computed \(`gh release list -R openai\/codex` failed/u);
});

test("an installed Codex older than the range warns", { skip: skip || (process.platform === "win32" && "POSIX shim only") }, async (t) => {
  const source = await writeSource(t);
  const bin = await tempDir(t, "codex-changelog-bin-");
  const shim = path.join(bin, "codex");
  await writeFile(shim, "#!/bin/sh\necho 'codex-cli 0.2.1'\n", "utf8");
  await chmod(shim, 0o755);
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const lines = statusLines(run(releasesScript, ["status", "--from", source, "--range", "0.2.0..0.3.0"], { env }).stdout);
  assert.equal(lines.installed, "0.2.1");
  assert.match(lines.warn, /installed 0\.2\.1 is older than 0\.3\.0/u);
});

const invalidCases = [
  { name: "a malformed range", args: ["status", "--range", "latest"], stderr: /not a version/u },
  { name: "a reversed range", args: ["status", "--range", "0.3.0..0.1.0"], stderr: /runs low to high/u },
  { name: "a negative cap", args: ["status", "--cap-items", "-1"], stderr: /zero or greater/u },
  { name: "--out on status", args: ["status", "--out", "x"], stderr: /fetch only/u },
  { name: "a --from without releases.json", args: ["status", "--from", "."], stderr: /no releases\.json/u },
];

for (const testCase of invalidCases) {
  test(`codex_releases rejects ${testCase.name} with exit 3`, { skip }, async (t) => {
    const cwd = await tempDir(t, "codex-changelog-bad-");
    const result = run(releasesScript, testCase.args, { cwd });
    assert.equal(result.status, 3, result.stdout);
    assert.match(result.stderr, testCase.stderr);
    assert.ok(!result.stderr.includes("Traceback"), result.stderr);
  });
}

async function writeTree(root, files) {
  for (const file of files) {
    const full = path.join(root, ...file.split("/"));
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, "x\n", "utf8");
  }
}

function surfaceCounts(stdout) {
  const counts = {};
  for (const line of stdout.split("\n").slice(1)) {
    const match = /^(.*?)\s{2,}(\d+)\s{2}/u.exec(line);
    if (match) counts[match[1].trim()] = Number(match[2]);
  }
  return counts;
}

test("discover_surfaces reads a Codex marketplace and skips node_modules", { skip }, async (t) => {
  const root = await tempDir(t, "codex-surfaces-market-");
  await writeTree(root, [
    ".agents/plugins/marketplace.json",
    "AGENTS.md",
    "docs/guide.md",
    "plugins/one/.codex-plugin/plugin.json",
    "plugins/two/plugin.json",
    "plugins/one/skills/a/SKILL.md",
    "plugins/one/skills/a/agents/openai.yaml",
    "plugins/one/skills/a/references/more.md",
    "plugins/one/skills/a/scripts/run.py",
    "plugins/two/skills/group/b/SKILL.md",
    "plugins/two/skills/group/b/agents/openai.yaml",
    "plugins/two/skills/group/b/scripts/run.sh",
    "plugins/two/hooks/hooks.json",
    "plugins/two/.mcp.json",
    "plugins/two/node_modules/dep/SKILL.md",
    "plugins/two/skills/vendor/c/SKILL.md",
    "tests/one.test.mjs",
  ]);
  const result = run(surfacesScript, [root]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.split("\n")[0], "repo-shape: marketplace");
  const counts = surfaceCounts(result.stdout);
  assert.equal(counts.plugins, 2);
  assert.equal(counts["plugin manifests"], 2);
  assert.equal(counts["plugin skills"], 3, "nested skills count, a skill dir named vendor included; node_modules does not");
  assert.match(result.stdout, /plugins\/\*\/skills\/\*\*\/SKILL\.md/u, "marketplace globs are root-relative");
  assert.equal(counts["skill sidecars"], 2, "a nested skill sidecar counts");
  assert.equal(counts["skill references (excl. SKILL.md)"], 1);
  assert.equal(counts["skill scripts"], 2);
  assert.match(result.stdout, /plugins\/\*\/skills\/\*\*\/agents\/openai\.yaml/u, "sidecar glob reaches nested skills");
  assert.equal(counts["plugin hooks"], 1);
  assert.equal(counts["plugin mcp config"], 1);
  assert.equal(counts.tests, 1);
  assert.equal(counts["project config"], undefined, "absent classes are not printed");
});

test("discover_surfaces reads a root plugin.json plugin and a consumer repository", { skip }, async (t) => {
  const plugin = await tempDir(t, "codex-surfaces-plugin-");
  await writeTree(plugin, ["plugin.json", "skills/x/SKILL.md", ".app.json"]);
  const pluginRun = run(surfacesScript, [plugin]);
  assert.equal(pluginRun.stdout.split("\n")[0], "repo-shape: plugin");
  assert.equal(surfaceCounts(pluginRun.stdout)["plugin app mapping"], 1);

  const consumer = await tempDir(t, "codex-surfaces-consumer-");
  await writeTree(consumer, [
    "AGENTS.md",
    "services/api/AGENTS.override.md",
    ".codex/config.toml",
    ".codex/hooks.json",
    ".agents/skills/local/SKILL.md",
    "services/api/.agents/skills/svc/SKILL.md",
    ".github/workflows/ci.yml",
    "scripts/release-check.sh",
    "package.json",
  ]);
  const consumerRun = run(surfacesScript, [consumer]);
  assert.equal(consumerRun.stdout.split("\n")[0], "repo-shape: consumer");
  const counts = surfaceCounts(consumerRun.stdout);
  assert.equal(counts["instructions (AGENTS.md, AGENTS.override.md)"], 2);
  assert.equal(counts["project config"], 1);
  assert.equal(counts["project hooks"], 1);
  assert.equal(counts["repository skills"], 2);
  assert.equal(counts["ci workflows"], 1);
  assert.equal(counts["repository scripts"], 1, "a consumer script that calls codex is searchable");
  assert.equal(counts["build and task files"], 1);
  assert.equal(counts["plugin skills"], undefined);
});

test("discover_surfaces rejects a missing root and unknown arguments", { skip }, () => {
  const missing = run(surfacesScript, [path.join(os.tmpdir(), "codex-surfaces-does-not-exist")]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /no such directory/u);
  const flag = run(surfacesScript, ["--all"]);
  assert.equal(flag.status, 2);
  assert.match(flag.stderr, /unknown argument/u);
});

const applyScript = path.join(scripts, "apply_plan.py");

/** A `fetch --out` style directory with three releases and the given rows. */
async function writeApplyInput(t, rows, after) {
  const dir = await tempDir(t, "codex-changelog-apply-");
  const releases = [
    { tagName: "rust-v0.2.0", publishedAt: "2026-10-01T00:00:00Z" },
    { tagName: "rust-v0.2.1", publishedAt: "2026-10-02T00:00:00Z" },
    { tagName: "rust-v0.3.0", publishedAt: "2026-10-03T00:00:00Z" },
  ];
  await writeFile(path.join(dir, "releases.json"), JSON.stringify(releases), "utf8");
  await writeFile(path.join(dir, "rows.json"), JSON.stringify(rows), "utf8");
  if (after) await writeFile(path.join(dir, "after.txt"), `${after}\n`, "utf8");
  return dir;
}

const row = (surface, lens, items, extra = {}) => ({ surface, lens, items, sentence: "claim vs release", ...extra });

/** Collects every `key: value` line, keeping repeated keys in order. */
function allLines(stdout) {
  const lines = {};
  for (const line of stdout.split("\n")) {
    const match = /^([a-z-]+(?: \d+)?): (.*)$/u.exec(line);
    if (match) (lines[match[1]] ??= []).push(match[2]);
  }
  return lines;
}

/** Runs apply_plan; a marker run with no --root takes the ledger's directory as the root. */
const apply = (args) => {
  const ledger = args[args.indexOf("--ledger") + 1];
  const root = args[0] === "marker" && !args.includes("--root") ? ["--root", path.dirname(ledger)] : [];
  return run(applyScript, [...args, ...root]);
};

test("apply plan groups open in-scope rows by owner plugin and files the rest", { skip }, async (t) => {
  const root = await tempDir(t, "codex-changelog-owners-");
  await writeTree(root, ["plugins/one/.codex-plugin/plugin.json", "plugins/two/plugin.json"]);
  const input = await writeApplyInput(t, [
    row("plugins/one/skills/a/SKILL.md", "correct", ["0.2.0-001"]),
    row("plugins/two/hooks/hooks.json", "adopt", ["0.3.0-002"]),
    row("plugins/one/skills/b/scripts/new.py", "correct", ["0.3.0-001"]),
    row("docs/guide.md", "correct", ["0.2.1-001"]),
    row("plugins/one/skills/a/SKILL.md", "replace", ["0.3.0-003"]),
    row("plugins/two/skills/c/SKILL.md", "adopt", ["0.2.0-002"], { size: "large" }),
    row("README.md", "correct", ["0.2.0-003"], { state: "declined", record: "reopen on rename" }),
    row("AGENTS.md", "adopt", ["0.3.0-004"]),
  ]);
  const result = apply(["plan", "--from", input, "--root", root, "--select", "correct,replace,6"]);
  assert.equal(result.status, 0, result.stderr);
  const lines = allLines(result.stdout);
  assert.deepEqual(lines.range, ["0.2.0..0.3.0"]);
  assert.match(lines["row 3"][0], /^in correct fits pending owner=plugins\/one /u, "a path that does not exist yet still finds its plugin");
  assert.deepEqual(lines.group, [". rows 4", "plugins/one rows 1,3"]);
  assert.deepEqual(lines.file, ["rows 5,6"], "replace rows and large rows are filed, never edited");
  assert.deepEqual(lines.done, ["rows 7"]);
  assert.deepEqual(lines["out-of-scope"], ["rows 2,8"]);
});

test("apply plan reads row numbers and ranges and rejects a bad selection", { skip }, async (t) => {
  const input = await writeApplyInput(t, [
    row("a.md", "correct", ["0.2.0-001"]),
    row("b.md", "adopt", ["0.2.0-002"]),
    row("c.md", "adopt", ["0.2.0-003"]),
  ]);
  const root = await tempDir(t, "codex-changelog-root-");
  const ranged = allLines(apply(["plan", "--from", input, "--root", root, "--select", "2-3"]).stdout);
  assert.deepEqual(ranged.group, [". rows 2,3"]);
  assert.deepEqual(ranged["out-of-scope"], ["rows 1"]);
  const all = allLines(apply(["plan", "--from", input, "--root", root, "--select", "all"]).stdout);
  assert.deepEqual(all.group, [". rows 1,2,3"]);
  for (const spec of ["4", "0", "3-1", "fix", ""]) {
    const bad = apply(["plan", "--from", input, "--root", root, "--select", spec]);
    assert.equal(bad.status, 3, `--select ${JSON.stringify(spec)}: ${bad.stdout}`);
  }
});

test("the marker moves to the newest release once every row is final", { skip }, async (t) => {
  const ledger = await writeLedger(t, "0.1.0");
  await writeFile(ledger, `${await readFile(ledger, "utf8")}\n## Decisions\n\nKept.\n`, "utf8");
  const input = await writeApplyInput(t, [
    row("a.md", "correct", ["0.2.0-001"], { state: "applied", record: "https://example.invalid/pull/1" }),
    row("b.md", "replace", ["0.3.0-001"], { state: "filed", record: "issue 9" }),
    row("c.md", "adopt", ["0.2.1-001"], { state: "deferred", record: "reopen when the docs state it" }),
  ], "0.1.0");
  const dry = allLines(apply(["marker", "--from", input, "--ledger", ledger]).stdout);
  assert.deepEqual(dry.marker, ["0.3.0"]);
  assert.equal(dry["ledger-row"].length, 3);
  assert.match(await readFile(ledger, "utf8"), /`0\.1\.0`/u, "no write without --write");

  const written = apply(["marker", "--from", input, "--ledger", ledger, "--write"]);
  assert.equal(written.status, 0, written.stderr);
  const text = await readFile(ledger, "utf8");
  assert.match(text, /^\*\*Last read Codex release:\*\* `0\.3\.0` \(published 2026-10-03\), read on \d{4}-\d{2}-\d{2}\.$/mu);
  assert.doesNotMatch(text, /`0\.1\.0`/u);
  assert.match(text, /## Decisions\n\nKept\./u, "the rest of the ledger is preserved");
  assert.equal(statusLines(run(releasesScript, ["status", "--from", input, "--ledger", ledger]).stdout).range, "up to date");
});

test("an open row holds the marker below its earliest release", { skip }, async (t) => {
  const ledger = await writeLedger(t, "0.1.0");
  const held = await writeApplyInput(t, [
    row("a.md", "correct", ["0.2.0-001"], { state: "applied", record: "pull 1" }),
    row("b.md", "adopt", ["0.3.0-001", "0.2.1-002"], { state: "pending" }),
  ], "0.1.0");
  const lines = allLines(apply(["marker", "--from", held, "--ledger", ledger, "--write"]).stdout);
  assert.deepEqual(lines["held-by"], ["row 2 (pending) at 0.2.1"]);
  assert.deepEqual(lines.marker, ["0.2.0"]);
  assert.match(await readFile(ledger, "utf8"), /`0\.2\.0`/u);

  const atStart = await writeApplyInput(t, [row("a.md", "correct", ["0.2.0-001"])]);
  assert.deepEqual(allLines(apply(["marker", "--from", atStart, "--ledger", ledger, "--write"]).stdout).marker, ["unchanged"]);
  assert.match(await readFile(ledger, "utf8"), /`0\.2\.0`/u);
});

test("the marker never moves backward and is created when the ledger has none", { skip }, async (t) => {
  const input = await writeApplyInput(t, [row("a.md", "correct", ["0.2.1-001"], { state: "declined", record: "reopen later" })]);
  const ahead = await writeLedger(t, "0.9.0");
  assert.deepEqual(allLines(apply(["marker", "--from", input, "--ledger", ahead, "--write"]).stdout).marker, ["unchanged"]);
  assert.match(await readFile(ahead, "utf8"), /`0\.9\.0`/u);

  const dir = await tempDir(t, "codex-changelog-newledger-");
  const fresh = path.join(dir, "docs", "upstream", "codex-cli.md");
  const result = apply(["marker", "--from", input, "--ledger", fresh, "--write"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(statusLines(run(releasesScript, ["status", "--from", input, "--ledger", fresh]).stdout)["last-read"], "0.3.0");
});

const invalidRows = [
  { name: "a final state without a record", rows: [row("a.md", "correct", ["0.2.0-001"], { state: "declined" })], stderr: /needs a record/u },
  { name: "an item outside the range", rows: [row("a.md", "correct", ["0.9.0-001"])], stderr: /outside the releases in range/u },
  { name: "a row without its sentence", rows: [{ surface: "a.md", lens: "adopt", items: ["0.2.0-001"] }], stderr: /required sentence/u },
  { name: "an absolute surface", rows: [row("/etc/passwd", "correct", ["0.2.0-001"])], stderr: /repository-relative/u },
  { name: "a surface outside the repository", rows: [row("../x.md", "correct", ["0.2.0-001"])], stderr: /repository-relative/u },
  { name: "the note lens", rows: [row("a.md", "note", ["0.2.0-001"])], stderr: /lens must be/u },
  { name: "a malformed item id", rows: [row("a.md", "adopt", ["0.2.0-1"])], stderr: /not an item id/u },
  { name: "an empty row list", rows: [], stderr: /non-empty list/u },
  { name: "a null sentence", rows: [row("a.md", "adopt", ["0.2.0-001"], { sentence: null })], stderr: /sentence must be a string/u },
  {
    name: "a null record on a final row",
    rows: [row("a.md", "adopt", ["0.2.0-001"], { state: "filed", record: null })],
    stderr: /record must be a string/u,
  },
  { name: "a bidi override in a record", rows: [row("a.md", "adopt", ["0.2.0-001"], { state: "filed", record: "issue ‮1" })], stderr: /control character/u },
  { name: "a zero-width space in a sentence", rows: [row("a.md", "adopt", ["0.2.0-001"], { sentence: "claim​" })], stderr: /control character/u },
  { name: "a newline in a surface", rows: [row("a.md\ngroup: evil rows 1", "correct", ["0.2.0-001"])], stderr: /control character/u },
  {
    name: "a table cell break in a record",
    rows: [row("a.md", "correct", ["0.2.0-001"], { state: "declined", record: "x | y" })],
    stderr: /control character, an invisible format character, `\|`, or a backtick/u,
  },
];

test("the marker does not move past releases a later range skipped", { skip }, async (t) => {
  const ledger = await writeLedger(t, "0.1.0");
  const final = [row("a.md", "correct", ["0.2.1-001"], { state: "declined", record: "reopen later" })];
  const explicit = await writeApplyInput(t, final);
  const lines = allLines(apply(["marker", "--from", explicit, "--ledger", ledger, "--write"]).stdout);
  assert.match(lines.gap[0], /^the range starts at 0\.2\.0, and releases after 0\.1\.0 may be unread/u);
  assert.deepEqual(lines.marker, ["unchanged"]);
  assert.equal(lines["ledger-row"].length, 1, "final rows are still recorded when the marker cannot move");
  assert.match(await readFile(ledger, "utf8"), /`0\.1\.0`/u);

  const staleDefault = await writeApplyInput(t, final, "0.0.9");
  assert.deepEqual(allLines(apply(["marker", "--from", staleDefault, "--ledger", ledger]).stdout).marker, ["unchanged"]);
});

test("fetch records the marker a default range started after, and only then", { skip }, async (t) => {
  const source = await writeSource(t);
  const ledger = await writeLedger(t, "0.1.0");
  // A replay of a directory that recorded no start cannot vouch for one.
  const unvouched = await tempDir(t, "codex-changelog-after-replay-");
  assert.equal(run(releasesScript, ["fetch", "--from", source, "--ledger", ledger, "--out", unvouched]).status, 0);
  await assert.rejects(readFile(path.join(unvouched, "after.txt"), "utf8"));

  // A directory a default-range fetch wrote carries its start into a replay.
  await writeFile(path.join(source, "after.txt"), "0.1.0\n", "utf8");
  const byDefault = await tempDir(t, "codex-changelog-after-");
  run(releasesScript, ["fetch", "--from", source, "--ledger", ledger, "--out", byDefault]);
  assert.equal(await readFile(path.join(byDefault, "after.txt"), "utf8"), "0.1.0\n");

  const explicit = await tempDir(t, "codex-changelog-after-range-");
  run(releasesScript, ["fetch", "--from", source, "--ledger", ledger, "--range", "0.2.0..0.3.0", "--out", explicit]);
  await assert.rejects(readFile(path.join(explicit, "after.txt"), "utf8"));
});

test("a plugin manifest surface belongs to its plugin, and plan prints each sentence", { skip }, async (t) => {
  const root = await tempDir(t, "codex-changelog-manifest-");
  await writeTree(root, ["plugins/one/.codex-plugin/plugin.json"]);
  const input = await writeApplyInput(t, [
    row("plugins/one/.codex-plugin/plugin.json", "correct", ["0.2.0-001"]),
    row("plugins/one/skills/a/SKILL.md", "correct", ["0.2.0-002"], { sentence: "states X | release says Y" }),
  ]);
  const lines = allLines(apply(["plan", "--from", input, "--root", root, "--select", "all"]).stdout);
  assert.deepEqual(lines.group, ["plugins/one rows 1,2"]);
  assert.match(lines["row 2"][0], / sentence=states X \| release says Y$/u);
});

test("the marker write keeps CRLF line endings", { skip }, async (t) => {
  const dir = await tempDir(t, "codex-changelog-crlf-");
  const ledger = path.join(dir, "codex-cli.md");
  await writeFile(ledger, "# Ledger\r\n\r\n**Last read Codex release:** `0.1.0` (published x), read on y.\r\n\r\nTail.\r\n", "utf8");
  const input = await writeApplyInput(t, [row("a.md", "correct", ["0.2.0-001"], { state: "filed", record: "issue 1" })], "0.1.0");
  assert.equal(apply(["marker", "--from", input, "--ledger", ledger, "--write"]).status, 0);
  const text = await readFile(ledger, "utf8");
  assert.match(text, /^# Ledger\r\n\r\n\*\*Last read Codex release:\*\* `0\.3\.0` .*\r\n\r\nTail\.\r\n$/u);
});

test("apply_plan rejects a malformed releases.json with exit 3", { skip }, async (t) => {
  const input = await writeApplyInput(t, [row("a.md", "correct", ["0.2.0-001"])]);
  for (const body of ['{"tagName": "rust-v0.2.0"}', '["rust-v0.2.0"]']) {
    await writeFile(path.join(input, "releases.json"), body, "utf8");
    const result = apply(["marker", "--from", input, "--ledger", path.join(input, "ledger.md")]);
    assert.equal(result.status, 3, result.stdout);
    assert.match(result.stderr, /list of objects/u);
  }
});

test("apply_plan refuses a symlinked ledger or one under a symlinked directory", { skip: posixOnly }, async (t) => {
  const input = await writeApplyInput(t, [row("a.md", "correct", ["0.2.0-001"], { state: "declined", record: "later" })]);
  const target = await writeLedger(t, "0.1.0");
  const link = path.join(input, "ledger.md");
  await symlink(target, link);
  const viaFile = apply(["marker", "--from", input, "--ledger", link, "--write"]);
  assert.equal(viaFile.status, 3, viaFile.stdout);
  assert.match(viaFile.stderr, /passes through a symlink/u);

  await symlink(path.dirname(target), path.join(input, "docs"));
  const viaDir = apply(["marker", "--from", input, "--root", input, "--ledger", path.join(input, "docs", "codex-cli.md"), "--write"]);
  assert.equal(viaDir.status, 3, viaDir.stdout);
  assert.match(viaDir.stderr, /passes through a symlink/u);
  assert.match(await readFile(target, "utf8"), /`0\.1\.0`/u);
});

test("apply_plan refuses a ledger outside the repository root", { skip }, async (t) => {
  const input = await writeApplyInput(t, [row("a.md", "correct", ["0.2.0-001"], { state: "declined", record: "later" })]);
  const outside = await writeLedger(t, "0.1.0");
  const result = apply(["marker", "--from", input, "--root", input, "--ledger", outside, "--write"]);
  assert.equal(result.status, 3, result.stdout);
  assert.match(result.stderr, /outside the repository root/u);
  assert.match(await readFile(outside, "utf8"), /`0\.1\.0`/u);
});

for (const testCase of invalidRows) {
  test(`apply_plan rejects ${testCase.name} with exit 3`, { skip }, async (t) => {
    const input = await writeApplyInput(t, testCase.rows);
    const result = apply(["marker", "--from", input, "--ledger", path.join(input, "ledger.md")]);
    assert.equal(result.status, 3, result.stdout);
    assert.match(result.stderr, testCase.stderr);
    assert.ok(!result.stderr.includes("Traceback"), result.stderr);
  });
}
