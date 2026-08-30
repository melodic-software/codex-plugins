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

async function writeSession(sessionsDir, message) {
  const sessionFile = path.join(sessionsDir, "session.jsonl");
  const record = { timestamp: new Date().toISOString(), payload: { message } };
  await writeFile(sessionFile, `${JSON.stringify(record)}\n`, "utf8");
  const now = new Date();
  await utimes(sessionFile, now, now);
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
