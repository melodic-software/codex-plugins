import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const collector = path.join(
  repoRoot,
  "plugins",
  "codex-operations",
  "skills",
  "find-skill-candidates",
  "scripts",
  "collect_recent_sessions.py",
);

function findPython() {
  const candidates = [
    { command: "python", prefix: [] },
    { command: "python3", prefix: [] },
    { command: "py", prefix: ["-3"] },
  ];
  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.prefix, "--version"], {
      encoding: "utf8",
    });
    if (result.status === 0) {
      return candidate;
    }
  }
  return null;
}

const python = findPython();
const skip = python ? false : "Python 3 is not available";

function runCollector(args, env) {
  if (!python) {
    throw new Error("runCollector needs Python; give this test the shared { skip } guard");
  }
  return spawnSync(python.command, [...python.prefix, collector, ...args], {
    encoding: "utf8",
    env,
  });
}

async function makeTempDir(t, prefix) {
  const temp = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(temp, { recursive: true, force: true }));
  return temp;
}

async function writeSkill(root, name, description) {
  const skillRoot = path.join(root, name);
  await mkdir(skillRoot, { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n`,
    "utf8",
  );
}

function sessionRecord(message, timestamp = new Date()) {
  return JSON.stringify({ timestamp: timestamp.toISOString(), payload: { message } });
}

async function writeSessionLines(sessionsDir, lines) {
  const sessionFile = path.join(sessionsDir, "session.jsonl");
  await writeFile(sessionFile, lines.map((line) => `${line}\n`).join(""), "utf8");
  const now = new Date();
  await utimes(sessionFile, now, now);
}

async function writeSession(sessionsDir, message) {
  await writeSessionLines(sessionsDir, [sessionRecord(message)]);
}

async function makeCollectorFixture(t, lines) {
  const temp = await makeTempDir(t, "codex-operations-case-");
  const sessions = path.join(temp, "sessions");
  const skills = path.join(temp, "skills");
  await mkdir(sessions, { recursive: true });
  await mkdir(skills, { recursive: true });
  await writeSessionLines(sessions, lines);
  return { sessions, skills };
}

test("collector reads explicit skill roots and redacts bounded evidence", { skip }, async (t) => {
  const temp = await makeTempDir(t, "codex-operations-");
  const sessions = path.join(temp, "sessions");
  const firstSkills = path.join(temp, "first-skills");
  const secondSkills = path.join(temp, "second-skills");
  await mkdir(sessions, { recursive: true });
  await writeSkill(firstSkills, "coordinate-codex-work", "Coordinate work.");
  await writeSkill(secondSkills, "find-skill-candidates", "Find skill candidates.");

  const rawOpenAiKey = "sk-abcdefghijklmnopqrstuvwx";
  const rawNamedSecret = "api_key=do-not-print-this-value";
  await writeSession(
    sessions,
    `We repeated this workflow and used $coordinate-codex-work. ${rawOpenAiKey} ${rawNamedSecret}`,
  );

  const result = runCollector([
    "--hours",
    "1",
    "--sessions-dir",
    sessions,
    "--skills-dir",
    firstSkills,
    "--skills-dir",
    secondSkills,
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Candidate files scanned: 1/u);
  assert.match(result.stdout, /`coordinate-codex-work` - Coordinate work\./u);
  assert.match(result.stdout, /`find-skill-candidates` - Find skill candidates\./u);
  assert.match(result.stdout, /<redacted>/u);
  assert.ok(!result.stdout.includes(rawOpenAiKey), "raw api key reached stdout");
  assert.ok(!result.stdout.includes(rawNamedSecret), "raw named secret reached stdout");
});

test("collector rejects an invalid lookback", { skip }, () => {
  const result = runCollector(["--hours", "0"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--hours must be greater than zero/u);
});

test("collector defaults sessions to CODEX_HOME", { skip }, async (t) => {
  const temp = await makeTempDir(t, "codex-operations-home-");
  const codexHome = path.join(temp, "custom-codex-home");
  const sessions = path.join(codexHome, "sessions");
  const skills = path.join(temp, "skills");
  await mkdir(sessions, { recursive: true });
  await writeSkill(skills, "example-skill", "Example skill.");

  await writeSession(sessions, "We repeat this workflow with $example-skill.");

  const result = runCollector(["--hours", "1", "--skills-dir", skills], {
    ...process.env,
    CODEX_HOME: codexHome,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Candidate files scanned: 1/u);
  assert.match(result.stdout, /`example-skill` - Example skill\./u);
});

const argumentValidationCases = [
  {
    name: "a NaN lookback",
    args: ["--hours", "nan"],
    stderr: /--hours must be a finite number/u,
  },
  {
    name: "an infinite lookback",
    args: ["--hours", "inf"],
    stderr: /--hours must be a finite number/u,
  },
  {
    name: "a lookback that overflows to infinity",
    args: ["--hours", "1e400"],
    stderr: /--hours must be a finite number/u,
  },
  {
    name: "a lookback no calendar can represent",
    args: ["--hours", "1e300"],
    stderr: /--hours is too large to form a lookback window/u,
  },
  {
    name: "a negative excerpt budget",
    args: ["--max-excerpts", "-1"],
    stderr: /--max-excerpts must be zero or greater/u,
  },
];

for (const testCase of argumentValidationCases) {
  test(`collector rejects ${testCase.name} without a traceback`, { skip }, () => {
    const result = runCollector(testCase.args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, testCase.stderr);
    assert.ok(!result.stderr.includes("Traceback"), result.stderr);
  });
}

function excerptLines(stdout) {
  const heading = "## Bounded Redacted Excerpts";
  const index = stdout.indexOf(heading);
  assert.ok(index >= 0, "excerpt section is missing");
  return stdout
    .slice(index + heading.length)
    .split("\n")
    .filter((line) => line.startsWith("- `"));
}

// Both fixtures are synthetic and are assembled at run time rather than written
// out as literals: a token-shaped string in source trips repository secret
// scanners, and a scanner finding on a fake credential costs a review cycle and
// trains readers to wave the alerts through. Assembling them keeps the repository
// free of credential-shaped literals while the collector still sees exactly the
// bytes it must redact. The JWT's signature segment decodes to
// "not-a-real-signature".
const base64Url = (value) => Buffer.from(value).toString("base64url");
const rawJwtToken = [
  base64Url('{"alg":"HS256"}'),
  base64Url('{"sub":"codex-plugins"}'),
  base64Url("not-a-real-signature"),
].join(".");
const rawGithubToken = "ghp_0123456789abcdefghijABCDEFGHIJ";

const collectorCases = [
  {
    name: "counts malformed JSONL lines as parse errors",
    lines: [sessionRecord("A workflow we repeat."), "{not json", "[1, 2"],
    check(stdout) {
      assert.match(stdout, /Records scanned: 1/u);
      assert.match(stdout, /Parse\/read errors: 2/u);
    },
  },
  {
    name: "counts records older than the window as skipped",
    lines: [
      sessionRecord("A workflow we repeat."),
      sessionRecord("An older workflow we repeat.", new Date(Date.now() - 10 * 86400000)),
    ],
    check(stdout) {
      assert.match(stdout, /Records scanned: 2/u);
      assert.match(stdout, /Old records skipped: 1/u);
      assert.match(stdout, /Relevant records included: 1/u);
    },
  },
  {
    name: "caps excerpts at --max-excerpts without dropping records",
    lines: [
      sessionRecord("First workflow we repeat."),
      sessionRecord("Second workflow we repeat."),
      sessionRecord("Third workflow we repeat."),
    ],
    args: ["--max-excerpts", "1"],
    check(stdout) {
      assert.match(stdout, /Relevant records included: 3/u);
      assert.equal(excerptLines(stdout).length, 1);
    },
  },
  {
    name: "emits no excerpts for --max-excerpts 0",
    lines: [
      sessionRecord("First workflow we repeat."),
      sessionRecord("Second workflow we repeat."),
    ],
    args: ["--max-excerpts", "0"],
    check(stdout) {
      assert.match(stdout, /Relevant records included: 2/u);
      assert.match(stdout, /- No relevant excerpts found\./u);
      assert.equal(excerptLines(stdout).length, 0);
    },
  },
  {
    name: "truncates an excerpt at the 500-character cap",
    lines: [sessionRecord(`workflow ${"b".repeat(520)} TAILMARKER`)],
    check(stdout) {
      assert.match(stdout, /Relevant records included: 1/u);
      assert.ok(!stdout.includes("TAILMARKER"), "excerpt was not truncated");
      assert.ok(stdout.includes(`${"b".repeat(400)}...`), "excerpt lost its truncation marker");
    },
  },
  {
    name: "keeps a signal that sits inside the 2000-character record cap",
    lines: [sessionRecord(`${"a".repeat(1900)} workflow`)],
    check(stdout) {
      assert.match(stdout, /Records scanned: 1/u);
      assert.match(stdout, /Relevant records included: 1/u);
    },
  },
  {
    name: "drops a signal that sits past the 2000-character record cap",
    lines: [sessionRecord(`${"a".repeat(2100)} workflow`)],
    check(stdout) {
      assert.match(stdout, /Records scanned: 1/u);
      assert.match(stdout, /Relevant records included: 0/u);
    },
  },
  {
    name: "redacts a JWT before it reaches stdout",
    lines: [sessionRecord(`Our workflow logged ${rawJwtToken} again.`)],
    check(stdout) {
      assert.match(stdout, /Relevant records included: 1/u);
      assert.match(stdout, /<redacted>/u);
      assert.ok(!stdout.includes(rawJwtToken), "raw JWT reached stdout");
    },
  },
  {
    name: "redacts a GitHub token before it reaches stdout",
    lines: [sessionRecord(`Our workflow logged ${rawGithubToken} again.`)],
    check(stdout) {
      assert.match(stdout, /Relevant records included: 1/u);
      assert.match(stdout, /<redacted>/u);
      assert.ok(!stdout.includes(rawGithubToken), "raw GitHub token reached stdout");
    },
  },
  {
    name: "prints excerpt pipes verbatim instead of escaping them",
    lines: [sessionRecord("The workflow printed a | b | c.")],
    check(stdout) {
      assert.ok(stdout.includes("a | b | c"), "excerpt pipes were rewritten");
      assert.ok(!stdout.includes("\\|"), "excerpt leaked a backslash escape");
    },
  },
  {
    name: "counts a bare frequency word as a workflow signal only",
    lines: [sessionRecord("We often do this.")],
    check(stdout) {
      assert.match(stdout, /Friction-related records: 0/u);
      assert.match(stdout, /Reusable-workflow records: 1/u);
      assert.match(stdout, /\[workflow\] We often do this\./u);
    },
  },
  {
    name: "counts a repeated-work record as a workflow signal only",
    lines: [sessionRecord("This repeated itself.")],
    check(stdout) {
      assert.match(stdout, /Friction-related records: 0/u);
      assert.match(stdout, /Reusable-workflow records: 1/u);
      assert.match(stdout, /\[workflow\] This repeated itself\./u);
    },
  },
  {
    name: "still counts a difficulty word as a friction signal only",
    lines: [sessionRecord("The build failed again.")],
    check(stdout) {
      assert.match(stdout, /Friction-related records: 1/u);
      assert.match(stdout, /Reusable-workflow records: 0/u);
      assert.match(stdout, /\[friction\] The build failed again\./u);
    },
  },
];

for (const testCase of collectorCases) {
  test(`collector ${testCase.name}`, { skip }, async (t) => {
    const { sessions, skills } = await makeCollectorFixture(t, testCase.lines);
    const result = runCollector([
      "--hours",
      "1",
      "--sessions-dir",
      sessions,
      "--skills-dir",
      skills,
      ...(testCase.args ?? []),
    ]);
    assert.equal(result.status, 0, result.stderr);
    testCase.check(result.stdout);
  });
}

test("collector orders tied skill mentions deterministically", { skip }, async (t) => {
  const { sessions, skills } = await makeCollectorFixture(t, [
    sessionRecord("We use $zeta-skill $alpha-skill $mid-skill and $beta-skill here."),
  ]);
  const args = ["--hours", "1", "--sessions-dir", sessions, "--skills-dir", skills];

  const mentionLine = (seed) => {
    const result = runCollector(args, { ...process.env, PYTHONHASHSEED: seed });
    assert.equal(result.status, 0, result.stderr);
    const line = result.stdout
      .split("\n")
      .find((entry) => entry.startsWith("- Skill mentions:"));
    assert.ok(line, "skill mention line is missing");
    return line;
  };

  const expected =
    "- Skill mentions: `$alpha-skill` (1), `$beta-skill` (1), `$mid-skill` (1), `$zeta-skill` (1)";
  for (const seed of ["0", "1", "2", "3"]) {
    assert.equal(mentionLine(seed), expected);
  }
});
