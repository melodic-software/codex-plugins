import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  assertExists,
  assertMarketplacePlugin,
  compact,
  escapeRegExp,
  once,
  read,
  readJson,
  readSkillContract,
  skillPaths,
} from "./helpers.mjs";

const paths = skillPaths("humanize");
// These two strings are also the keys of `implementationDigest` in the recorded
// results fixture, so they must stay byte-for-byte what that file records.
const skillPath = paths.md("humanize");
const rubricPath = paths.file("humanize", "references/revision-rubric.md");
const casesPath = "tests/fixtures/humanize-evaluation-cases.json";
const resultsPath = "tests/fixtures/humanize-evaluation-results.json";

// Several tests read each of these; load and parse each one once. Nothing below
// mutates the loaded values.
const skillText = once(() => read(skillPath));
const compactSkill = once(async () => compact(await skillText()));
const rubricText = once(() => read(rubricPath));
const evaluationCases = once(() => readJson(casesPath));
const execution = once(() => readJson(resultsPath));

test("the marketplace exposes the Humanize plugin", async () => {
  await assertMarketplacePlugin({
    name: "humanize",
    version: "0.1.0",
    category: "Productivity",
  });
});

test("skill metadata and references are complete", async () => {
  const { skill, metadata } = await readSkillContract(paths, "humanize");

  assert.match(skill, /text-bearing files/u);
  assert.match(skill, /Do not use for a pure authorship-classification request/u);
  assert.match(skill, /references\/revision-rubric\.md/u);
  assert.match(metadata, /display_name: "Humanize"/u);
  await assertExists(rubricPath);
});

test("context precedence and file modes are explicit", async () => {
  const skill = await compactSkill();

  for (const phrase of [
    "explicit request",
    "active `AGENTS.md` chain",
    "repository-owned style guides",
    "user-, team-, or company-supplied exemplars",
    "generic rubric",
    "review-only",
    "return-text",
    "copy",
    "in-place",
    "<stem>.humanized<ext>",
    ".humanized-2",
    "format-aware capability",
  ]) {
    assert.match(skill, new RegExp(escapeRegExp(phrase), "u"));
  }
});

test("the workflow protects content and legitimate voice", async () => {
  const skill = await compactSkill();

  for (const phrase of [
    "factual claims, the writer's intended position",
    "quotations, citations, links, terminology",
    "do not invent anecdotes",
    "Preserve clearly framed personal or organizational opinion",
    "Do not infer that a claim is unsupported merely because no source was supplied",
    "Preserve substantive fact-like, causal, quantitative, and significance claims",
    "Preserve heading levels, list and table semantics",
    "When concrete information is followed by generic benefits or a formulaic significance tail",
    "legitimate dialect",
    "second-language traits",
    "neurodivergent style",
    "technical vocabulary",
    "semantic drift",
    "citation damage",
    "Do not add typos",
    "report an AI probability",
  ]) {
    assert.match(skill, new RegExp(phrase, "iu"));
  }
});

test("the rubric has stable classes, full domains, and source traceability", async () => {
  const rubric = compact(await rubricText());

  for (const className of [
    "Provenance artifact",
    "Objective defect",
    "Contextual tendency",
    "Weak indicator",
    "Historical pattern",
  ]) {
    assert.match(rubric, new RegExp(className, "u"));
  }

  for (const prefix of [
    "SUB-",
    "LEX-",
    "STR-",
    "FMT-",
    "LEAK-",
    "MARK-",
    "CITE-",
    "META-",
    "HUM-",
    "WEAK-",
    "HIST-",
    "NUM-",
  ]) {
    assert.match(rubric, new RegExp(prefix, "u"));
  }

  assert.match(rubric, /oldid=1367680556/u);
  assert.match(rubric, /Accessed 2026-08-05/u);
  assert.match(rubric, /NIST\.AI\.100-4/u);
  assert.match(rubric, /10\.1073\/pnas\.2422455122/u);
  assert.match(rubric, /10\.1126\/sciadv\.adt3813/u);
});

test("the behavioral evaluation set covers activation and invariant cases", async () => {
  const cases = await evaluationCases();
  assert.ok(cases.length >= 9);

  const kinds = new Set(cases.map(({ kind }) => kind));
  assert.deepEqual(kinds, new Set(["direct", "indirect", "incomplete", "negative", "edge", "mode", "context"]));

  const ids = new Set();
  for (const evaluation of cases) {
    assert.equal(typeof evaluation.id, "string");
    assert.equal(typeof evaluation.request, "string");
    assert.equal(typeof evaluation.artifact, "string");
    assert.equal(typeof evaluation.expect, "string");
    assert.equal(ids.has(evaluation.id), false, `duplicate evaluation id ${evaluation.id}`);
    ids.add(evaluation.id);
  }

  for (const id of [
    "direct-technical-markdown",
    "mixed-code-and-frontmatter",
    "citation-number-quotation",
    "second-language-voice",
    "opinion-and-brand-voice",
    "structure-preservation",
  ]) {
    const evaluation = cases.find((candidate) => candidate.id === id);
    assert.ok(evaluation, `missing ${id}`);
    assert.ok(evaluation.mustPreserve.length > 0, `${id} needs invariants`);
  }
});

test("recorded fresh-agent and installed-plugin evaluations satisfy their contracts", async () => {
  const [cases, results] = await Promise.all([evaluationCases(), execution()]);
  assert.equal(results.executedAt, "2026-08-05");

  const casesById = new Map(cases.map((evaluation) => [evaluation.id, evaluation]));
  const resultsById = new Map();
  for (const result of results.results) {
    assert.equal(resultsById.has(result.id), false, `duplicate result ${result.id}`);
    assert.ok(casesById.has(result.id), `result without case ${result.id}`);
    assert.ok(["revision", "clarification", "classification-response", "decision", "operation"].includes(result.resultType));
    assert.equal(typeof result.taskRef, "string");
    assert.ok(result.taskRef.length > 0);
    assert.equal(typeof result.surface, "string");
    assert.equal(typeof result.output, "string");
    assert.ok(result.output.length > 0);
    resultsById.set(result.id, result);

    const evaluation = casesById.get(result.id);
    const input = [evaluation.request, evaluation.context ?? "", evaluation.artifact].join("\n");
    const digest = createHash("sha256").update(input).digest("hex");
    assert.equal(result.inputDigest, digest, `stale recorded input for ${result.id}`);
    if (result.resultType === "revision") {
      for (const invariant of evaluation.mustPreserve ?? []) {
        assert.match(result.output, new RegExp(escapeRegExp(invariant), "iu"));
      }
      for (const forbidden of [
        ...(evaluation.mustNotAdd ?? []),
        ...(evaluation.mustRemove ?? []),
      ]) {
        assert.doesNotMatch(result.output, new RegExp(escapeRegExp(forbidden), "iu"));
      }
    } else if (result.resultType === "clarification") {
      assert.match(result.output, /\?\s*$/u);
    } else {
      for (const required of evaluation.mustMention ?? []) {
        assert.match(result.output, new RegExp(escapeRegExp(required), "iu"));
      }
    }
  }

  assert.equal(resultsById.size, casesById.size);
  for (const id of casesById.keys()) {
    assert.ok(resultsById.has(id), `missing recorded result ${id}`);
  }

  assert.equal(resultsById.get("negative-authorship-only").resultType, "classification-response");
  assert.match(resultsById.get("negative-authorship-only").output, /can’t determine/iu);
  assert.match(resultsById.get("structure-preservation").output, /^## Before deploy[\s\S]+## After deploy/u);
  assert.match(resultsById.get("installed-plugin-smoke").surface, /^installed-plugin\//u);

  const evidence = results.operationalEvidence;
  assert.match(evidence.seedCommit, /^[0-9a-f]{40}$/u);
  assert.deepEqual(evidence.taskRefs, [
    "/root/forward_operational_files",
    "/root/forward_operational_context",
  ]);
  assert.deepEqual(evidence.postconditions.trackedModified, [
    "a.md",
    "docs/note.md",
    "docs/product/note.md",
  ]);
  assert.deepEqual(evidence.postconditions.untrackedCreated, [
    "b.humanized.md",
    "brief.humanized-2.md",
  ]);
  assert.equal(evidence.postconditions["missing.md"], "absent");
  for (const digest of Object.values(evidence.sha256)) {
    assert.match(digest, /^[0-9a-f]{64}$/u);
  }
  for (const id of [
    "tracked-in-place-default",
    "untracked-copy-collision",
    "multiple-file-defaults",
    "missing-file",
    "unavailable-format-adapter",
    "nested-context-precedence",
  ]) {
    assert.equal(resultsById.get(id).surface, "operational-temp-git-repository");
    assert.equal(resultsById.get(id).resultType, "operation");
  }
});

test("recorded evaluations are bound to the skill they were produced against", async () => {
  const digests = (await execution()).implementationDigest;

  // The per-case inputDigest covers request/context/artifact only, so editing
  // SKILL.md or the rubric leaves every recorded output passing against
  // behavior that no longer exists. These digests close that: change either
  // file and this fails until the evaluations are re-run and re-recorded.
  //
  // Normalized to LF before hashing — the repository checks out CRLF on
  // Windows, so raw bytes would differ per checkout and the digest would be
  // unpinnable rather than stale-detecting.
  for (const [path, load] of [
    [skillPath, skillText],
    [rubricPath, rubricText],
  ]) {
    const normalized = (await load()).replace(/\r\n/gu, "\n");
    const digest = createHash("sha256").update(normalized).digest("hex");
    assert.equal(
      digests[path],
      digest,
      `${path} changed since the evaluations were recorded — re-run them and update implementationDigest`,
    );
  }
});

test("each operational evaluation is scoped to the files its own request names", async () => {
  const results = await execution();
  const resultsById = new Map(results.results.map((result) => [result.id, result]));

  // The six operational scenarios were driven as two batched task runs, so
  // each recorded `output` is the whole batch's report. `mustMention` alone
  // therefore passes whenever the batch happens to name the file — it cannot
  // tell a scoped result from one that also wrote elsewhere. These assertions
  // pin the per-request postcondition instead: the outcome each request's own
  // target must show, and for `missing-file`, that nothing was written at all.
  const scopes = {
    "tracked-in-place-default": { target: "docs/note.md", outcome: /Edited in place: [^.]*`docs\/note\.md`/u },
    "untracked-copy-collision": { target: "brief.md", outcome: /Created: `brief\.humanized-2\.md` because `brief\.humanized\.md` already existed/u },
    "multiple-file-defaults": { target: "a.md", outcome: /`b\.humanized\.md`/u },
    "unavailable-format-adapter": { target: "report.indd", outcome: /`report\.indd` was unsupported/u },
    "nested-context-precedence": { target: "docs/product/note.md", outcome: /^Revised \[note\.md\]\(docs\/product\/note\.md\) in place\./u },
  };

  for (const [id, { target, outcome }] of Object.entries(scopes)) {
    const { output } = resultsById.get(id);
    assert.match(output, new RegExp(escapeRegExp(target), "u"), `${id} must name its target`);
    assert.match(output, outcome, `${id} must record its own request's outcome`);
  }

  // missing.md is the one case whose guarantee is a NON-write. The recorded
  // output must say it stopped, and the run's postconditions must show the
  // file absent and unlisted in every written-file set — the aggregate report
  // naming other files is what made this case unverifiable before.
  const missing = resultsById.get("missing-file").output;
  assert.match(missing, /Stopped: `missing\.md` was not found/u);

  const { postconditions } = results.operationalEvidence;
  assert.equal(postconditions["missing.md"], "absent");
  for (const written of [...postconditions.trackedModified, ...postconditions.untrackedCreated]) {
    assert.notEqual(written, "missing.md");
  }

  // Every file the run reports as written must be one a request actually
  // named, or produced by the skill's documented copy-mode naming. A write
  // outside that set is out-of-scope behavior the batched output would hide.
  const authorized = new Set([
    "docs/note.md",
    "a.md",
    "docs/product/note.md",
    "b.humanized.md",
    "brief.humanized-2.md",
  ]);
  for (const written of [...postconditions.trackedModified, ...postconditions.untrackedCreated]) {
    assert.ok(authorized.has(written), `unauthorized write outside any request's scope: ${written}`);
  }

  // The converse: files no request authorized changing must be reported
  // unchanged, which is what makes "scoped" mean something.
  for (const untouched of ["brief.md", "brief.humanized.md", "b.md", "report.indd"]) {
    assert.ok(postconditions.unchanged.includes(untouched), `${untouched} must be recorded unchanged`);
  }
});
