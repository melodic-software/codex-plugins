import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await read(path));
const compact = (text) => text.replace(/\s+/gu, " ");
const skillPath = "plugins/humanize/skills/humanize/SKILL.md";
const rubricPath =
  "plugins/humanize/skills/humanize/references/revision-rubric.md";

test("the marketplace exposes the Humanize plugin", async () => {
  const [marketplace, manifest] = await Promise.all([
    readJson(".agents/plugins/marketplace.json"),
    readJson("plugins/humanize/.codex-plugin/plugin.json"),
  ]);

  const entry = marketplace.plugins.find(({ name }) => name === "humanize");
  assert.deepEqual(entry, {
    name: "humanize",
    source: { source: "local", path: "./plugins/humanize" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  });
  assert.equal(manifest.name, "humanize");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.category, "Productivity");
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
  for (const field of ["mcpServers", "apps", "hooks"]) {
    assert.equal(field in manifest, false);
  }
});

test("skill metadata and references are complete", async () => {
  const [skill, metadata] = await Promise.all([
    read(skillPath),
    read("plugins/humanize/skills/humanize/agents/openai.yaml"),
  ]);

  assert.match(skill, /^---\s+name: humanize\s+description:/u);
  assert.match(skill, /text-bearing files/u);
  assert.match(skill, /Do not use for a pure authorship-classification request/u);
  assert.match(skill, /references\/revision-rubric\.md/u);
  assert.match(metadata, /display_name: "Humanize"/u);
  assert.match(metadata, /default_prompt: "Use \$humanize/u);
  await assert.doesNotReject(access(new URL(`../${rubricPath}`, import.meta.url)));
});

test("context precedence and file modes are explicit", async () => {
  const skill = compact(await read(skillPath));

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
    assert.match(skill, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
});

test("the workflow protects content and legitimate voice", async () => {
  const skill = compact(await read(skillPath));

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
  const rubric = compact(await read(rubricPath));

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
  const cases = await readJson("tests/fixtures/humanize-evaluation-cases.json");
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
  const [cases, execution] = await Promise.all([
    readJson("tests/fixtures/humanize-evaluation-cases.json"),
    readJson("tests/fixtures/humanize-evaluation-results.json"),
  ]);
  assert.equal(execution.executedAt, "2026-08-05");

  const casesById = new Map(cases.map((evaluation) => [evaluation.id, evaluation]));
  const resultsById = new Map();
  for (const result of execution.results) {
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
        assert.match(result.output, new RegExp(invariant.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "iu"));
      }
      for (const forbidden of [
        ...(evaluation.mustNotAdd ?? []),
        ...(evaluation.mustRemove ?? []),
      ]) {
        assert.doesNotMatch(result.output, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "iu"));
      }
    } else if (result.resultType === "clarification") {
      assert.match(result.output, /\?\s*$/u);
    } else {
      for (const required of evaluation.mustMention ?? []) {
        assert.match(result.output, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "iu"));
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

  const evidence = execution.operationalEvidence;
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
