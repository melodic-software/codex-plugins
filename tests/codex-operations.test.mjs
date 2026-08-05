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

async function writeSkill(root, name, description) {
  const skillRoot = path.join(root, name);
  await mkdir(skillRoot, { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n`,
    "utf8",
  );
}

test("collector reads explicit skill roots and redacts bounded evidence", async (t) => {
  const python = findPython();
  if (!python) {
    t.skip("Python 3 is not available");
    return;
  }

  const temp = await mkdtemp(path.join(os.tmpdir(), "codex-operations-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const sessions = path.join(temp, "sessions");
  const firstSkills = path.join(temp, "first-skills");
  const secondSkills = path.join(temp, "second-skills");
  await mkdir(sessions, { recursive: true });
  await writeSkill(firstSkills, "coordinate-codex-work", "Coordinate work.");
  await writeSkill(secondSkills, "find-skill-candidates", "Find skill candidates.");

  const rawOpenAiKey = "sk-abcdefghijklmnopqrstuvwx";
  const rawNamedSecret = "api_key=do-not-print-this-value";
  const record = {
    timestamp: new Date().toISOString(),
    payload: {
      message:
        `We repeated this workflow and used $coordinate-codex-work. ${rawOpenAiKey} ${rawNamedSecret}`,
    },
  };
  const sessionFile = path.join(sessions, "session.jsonl");
  await writeFile(sessionFile, `${JSON.stringify(record)}\n`, "utf8");
  const now = new Date();
  await utimes(sessionFile, now, now);

  const result = spawnSync(
    python.command,
    [
      ...python.prefix,
      collector,
      "--hours",
      "1",
      "--sessions-dir",
      sessions,
      "--skills-dir",
      firstSkills,
      "--skills-dir",
      secondSkills,
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Candidate files scanned: 1/);
  assert.match(result.stdout, /`coordinate-codex-work` - Coordinate work\./);
  assert.match(result.stdout, /`find-skill-candidates` - Find skill candidates\./);
  assert.match(result.stdout, /<redacted>/);
  assert.doesNotMatch(result.stdout, new RegExp(rawOpenAiKey));
  assert.doesNotMatch(result.stdout, new RegExp(rawNamedSecret));
});

test("collector rejects an invalid lookback", (t) => {
  const python = findPython();
  if (!python) {
    t.skip("Python 3 is not available");
    return;
  }
  const result = spawnSync(
    python.command,
    [...python.prefix, collector, "--hours", "0"],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--hours must be greater than zero/);
});
