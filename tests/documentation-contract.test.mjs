import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { escapeRegExp, read } from "./helpers.mjs";

// These assertions deliberately run against the raw file, never `compact`:
// they must break on a line wrap, unlike the plugin-skill assertions.
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

const requiredOfficialPointers = [
  "https://learn.chatgpt.com/docs/build-plugins",
  "https://developers.openai.com/plugins/concepts/plugins",
  "https://developers.openai.com/plugins/build/skills",
  "https://developers.openai.com/plugins/build/mcp-server",
  "https://developers.openai.com/plugins/build/chatgpt-ui",
  "https://developers.openai.com/plugins/build/plugins",
  "https://developers.openai.com/plugins/deploy/connect-chatgpt",
  "https://developers.openai.com/plugins/deploy/submission",
  "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
  "https://learn.chatgpt.com/docs/hooks",
  "https://learn.chatgpt.com/docs/plugins",
  "https://learn.chatgpt.com/docs/automations",
  "https://learn.chatgpt.com/docs/import",
  "https://learn.chatgpt.com/docs/agent-approvals-security",
  "https://learn.chatgpt.com/docs/config-file/config-advanced",
];

test("the upstream index retains every required live OpenAI pointer", async () => {
  const sourceMap = await read("docs/OFFICIAL-DOCS.md");
  for (const pointer of requiredOfficialPointers) {
    assert.match(sourceMap, new RegExp(escapeRegExp(pointer)));
  }
  assert.match(sourceMap, /not a cached specification/u);
  assert.match(sourceMap, /record the URLs and verification date/u);
});

test("AGENTS enforces the documentation, context, architecture, and validation gates", async () => {
  const agents = await read("AGENTS.md");
  for (const path of [
    "docs/OFFICIAL-DOCS.md",
    "docs/PLUGIN-PHILOSOPHY.md",
    "docs/MIGRATION-PLAYBOOK.md",
  ]) {
    assert.match(agents, new RegExp(escapeRegExp(path)));
  }
  for (const requirement of [
    /Mandatory documentation preflight/u,
    /active consumer repository's `AGENTS\.md` hierarchy/u,
    /ports and adapters/u,
    /user-agnostic/u,
    /organization-agnostic/u,
    /repository-agnostic/u,
    /machine-agnostic/u,
    /`agents\/openai\.yaml`/u,
    /npm run validate/u,
  ]) {
    assert.match(agents, requirement);
  }
});

test("philosophy and migration remain one consistent design contract", async () => {
  const [philosophy, migration] = await Promise.all([
    read("docs/PLUGIN-PHILOSOPHY.md"),
    read("docs/MIGRATION-PLAYBOOK.md"),
  ]);

  for (const heading of [
    "## Context before defaults",
    "## Ports and adapters",
    "## Coupling, cohesion, and encapsulation",
    "## Release gates",
  ]) {
    assert.match(philosophy, new RegExp(escapeRegExp(heading)));
  }

  for (const requirement of [
    /keep.*reshape.*replace.*drop/isu,
    /active `AGENTS\.md`/u,
    /cohesive (?:domain )?core/u,
    /inbound ports/u,
    /outbound ports/u,
    /source marketplace and sibling plugins disabled/u,
    /automatic synchronization/u,
  ]) {
    assert.match(migration, requirement);
  }
});

test("repository-owned Markdown pointers resolve", async () => {
  const files = [
    "AGENTS.md",
    "README.md",
    "docs/OFFICIAL-DOCS.md",
    "docs/PLUGIN-PHILOSOPHY.md",
    "docs/MIGRATION-PLAYBOOK.md",
  ];

  for (const file of files) {
    const contents = await read(file);
    const links = contents.matchAll(/\]\((?!https?:|#)([^)#]+\.md)(?:#[^)]+)?\)/gu);
    for (const [, target] of links) {
      await assert.doesNotReject(
        access(resolve(dirname(resolve(repositoryRoot, file)), target)),
        `${file} points at missing Markdown file ${target}`,
      );
    }
  }
});

test("the capability cheat sheet lists every marketplace plugin", async () => {
  const [cheatSheet, marketplaceRaw] = await Promise.all([
    read("docs/CODEX-CAPABILITY-CHEAT-SHEET.md"),
    read(".agents/plugins/marketplace.json"),
  ]);
  const marketplace = JSON.parse(marketplaceRaw);

  const marketplaceSection = cheatSheet.split("## This marketplace")[1] ?? "";
  assert.ok(marketplaceSection.length > 0, "cheat sheet must include This marketplace");
  for (const { name } of marketplace.plugins) {
    assert.ok(
      marketplaceSection.includes(`\`${name}\``),
      `cheat sheet marketplace table missing plugin ${name}`,
    );
  }
});
