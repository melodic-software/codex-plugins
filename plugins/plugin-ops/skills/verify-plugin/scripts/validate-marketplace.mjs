#!/usr/bin/env node

import { lstat, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const INSTALLATION_POLICIES = new Set(["NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"]);
const AUTH_POLICIES = new Set(["ON_INSTALL", "ON_USE"]);
// Agent Plugins names may also contain dots (`is_valid_agent_plugin_name` in
// codex-rs/core-plugins/src/agent_plugin_manifest.rs at rust-v0.162.0).
const AGENT_NAME_PATTERN = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?$/;
const MACHINE_PATH_PATTERN = /(?:[A-Za-z]:[\\/]Users[\\/][^\\/\s]+|\/Users\/[^/\s]+|\/home\/[^/\s]+)/;

// Every one of these means "nothing can live at that path", so they are absence
// rather than failure: ENOTDIR and ELOOP mean a path component is not a usable
// directory, ENAMETOOLONG means the path cannot name a file at all.
const ABSENT_ERROR_CODES = new Set(["ENOENT", "ENOTDIR", "ELOOP", "ENAMETOOLONG"]);

// Lookup order follows Codex at rust-v0.162.0. A root `plugin.json` wins only
// when its `$schema` is an Agent Plugins URI; then the legacy manifests in order
// (`find_plugin_manifest_path` in codex-rs/utils/plugins/src/plugin_namespace.rs,
// `DISCOVERABLE_PLUGIN_MANIFEST_PATHS` in codex-rs/exec-server-protocol/src/protocol.rs).
// Catalogs follow `MARKETPLACE_MANIFEST_RELATIVE_PATHS` in
// codex-rs/core-plugins/src/marketplace.rs.
const AGENT_MANIFEST = "plugin.json";
const AGENT_PLUGIN_SCHEMA_URI = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const AGENT_PLUGIN_SCHEMA_PREFIX = "https://agent-plugins.org/schemas/";
const AGENT_PLUGIN_FIELDS = new Set(["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"]);
const CODEX_EXTENSION = "com.openai";
const LEGACY_MANIFESTS = [
  { path: ".codex-plugin/plugin.json", format: "codex" },
  { path: ".claude-plugin/plugin.json", format: "claude" },
  { path: ".cursor-plugin/plugin.json", format: "cursor" },
];
const CATALOGS = [
  { path: ".agents/plugins/marketplace.json", format: "codex" },
  { path: ".agents/plugins/api_marketplace.json", format: "codex" },
  { path: ".claude-plugin/marketplace.json", format: "claude" },
  { path: ".cursor-plugin/marketplace.json", format: "cursor" },
];
const HOST_NAMES = { claude: "Claude", cursor: "Cursor" };

const PRESENT = "present";
const FILE = "file";
const DIRECTORY = "directory";
const OTHER = "other";
const ABSENT = "absent";
const UNREADABLE = "unreadable";

function describeError(error) {
  return `${error?.code ?? "unknown error"}: ${error?.message ?? String(error)}`;
}

/**
 * Classify a path as present, absent, or unreadable. Unreadable paths (EACCES
 * and friends) are reported once, here, so the caller never adds a second
 * "missing X" error for the same defect and the CLI never crashes on them.
 */
async function pathState(candidate, result) {
  try {
    await stat(candidate);
    return PRESENT;
  } catch (error) {
    if (ABSENT_ERROR_CODES.has(error?.code)) return ABSENT;
    result.errors.push({ code: "unreadable-path", file: candidate, message: `Cannot inspect path (${describeError(error)}).` });
    return UNREADABLE;
  }
}

/**
 * Like pathState, but without following symlinks, because Codex refuses a
 * symlinked or non-regular manifest instead of reading through it.
 */
async function entryState(candidate, result) {
  try {
    const stats = await lstat(candidate);
    if (stats.isFile()) return FILE;
    return stats.isDirectory() ? DIRECTORY : OTHER;
  } catch (error) {
    if (ABSENT_ERROR_CODES.has(error?.code)) return ABSENT;
    result.errors.push({ code: "unreadable-path", file: candidate, message: `Cannot inspect path (${describeError(error)}).` });
    return UNREADABLE;
  }
}

function parseJsonQuietly(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function isPresent(candidate, result) {
  return (await pathState(candidate, result)) === PRESENT;
}

async function readDirectory(directory, result) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    result.errors.push({ code: "unreadable-path", file: directory, message: `Cannot list directory (${describeError(error)}).` });
    return null;
  }
}

async function readText(file, result) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    result.errors.push({ code: "unreadable-file", file, message: `Cannot read file (${describeError(error)}).` });
    return null;
  }
}

async function readJson(file, result) {
  const text = await readText(file, result);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    result.errors.push({ code: "invalid-json", file, message: error.message });
    return null;
  }
}

function isDeclared(value) {
  return value !== undefined && value !== null;
}

function requireString(value, code, file, result) {
  if (typeof value !== "string" || value.trim() === "") {
    result.errors.push({ code, file, message: "Expected a non-empty string." });
    return false;
  }
  return true;
}

function resolveContained(root, relativePath, code, file, result, allowBare = false) {
  if (typeof relativePath !== "string") {
    result.errors.push({ code, file, message: `Path must be a string relative to the package root, got ${relativePath === null ? "null" : typeof relativePath}.` });
    return null;
  }
  if (allowBare && !relativePath.startsWith("./")) relativePath = `./${relativePath}`;
  if (!relativePath.startsWith("./")) {
    result.errors.push({ code, file, message: "Path must be relative to the package root and start with './'." });
    return null;
  }
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    result.errors.push({ code, file, message: `Path escapes its root: ${relativePath}` });
    return null;
  }
  return resolved;
}

/**
 * Report a declared path that resolves inside the package but has nothing on
 * disk. An invalid path was already reported by resolveContained, and an
 * unreadable one by pathState, so each defect yields exactly one error.
 */
async function requireDeclaredFile(resolved, code, file, message, result) {
  if (!resolved) return;
  if ((await pathState(resolved, result)) === ABSENT) {
    result.errors.push({ code, file, message });
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const values = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
    if (field) values.set(field[1], field[2].trim().replace(/^['"]|['"]$/g, ""));
  }
  return values;
}

async function validateSkills(pluginRoot, skillsPath, manifestFile, result, skillNames) {
  const skillsRoot = resolveContained(pluginRoot, skillsPath, "invalid-skills-path", manifestFile, result);
  if (!skillsRoot) return;
  const skillsState = await pathState(skillsRoot, result);
  if (skillsState !== PRESENT) {
    if (skillsState === ABSENT) {
      result.errors.push({ code: "missing-skills-directory", file: skillsRoot, message: "Declared skills directory does not exist." });
    }
    return;
  }

  const entries = await readDirectory(skillsRoot, result);
  if (!entries) return;
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const skillRoot = path.join(skillsRoot, entry.name);
    const skillFile = path.join(skillRoot, "SKILL.md");
    if (!(await isPresent(skillFile, result))) continue;
    const text = await readText(skillFile, result);
    if (text === null) continue;
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter) {
      result.errors.push({ code: "missing-skill-frontmatter", file: skillFile, message: "SKILL.md must start with YAML frontmatter." });
      continue;
    }
    const name = frontmatter.get("name");
    const description = frontmatter.get("description");
    if (name !== entry.name) {
      result.errors.push({ code: "skill-name-mismatch", file: skillFile, message: `Expected skill name '${entry.name}', got '${name ?? "missing"}'.` });
    }
    if (!description) {
      result.errors.push({ code: "missing-skill-description", file: skillFile, message: "Skill description is required." });
    }
    // Skill names are invoked bare (`$name`), so they must be unique across the
    // whole validated target, not merely within one skills directory, where the
    // filesystem already guarantees distinct directory names.
    if (name && skillNames.has(name) && skillNames.get(name) !== skillFile) {
      result.errors.push({ code: "duplicate-skill-name", file: skillFile, message: `Duplicate skill name '${name}', already declared by ${skillNames.get(name)}.` });
    }
    if (name) skillNames.set(name, skillFile);
    if (text.includes("TODO:")) {
      result.errors.push({ code: "skill-placeholder", file: skillFile, message: "Remove TODO placeholders before publishing." });
    }
    if (MACHINE_PATH_PATTERN.test(text)) {
      result.errors.push({ code: "machine-specific-path", file: skillFile, message: "Skill instructions contain a user-home absolute path." });
    }
    const agentMetadata = path.join(skillRoot, "agents", "openai.yaml");
    if ((await pathState(agentMetadata, result)) === ABSENT) {
      result.warnings.push({ code: "missing-skill-ui-metadata", file: skillRoot, message: "Consider generating agents/openai.yaml with skill-creator." });
    }
  }
}

/**
 * Find the manifest Codex would load. A symlinked or non-regular entry at any
 * precedence slot stops the search with no plugin, exactly as Codex does, so it
 * is reported as a missing manifest naming the entry that hides the rest.
 */
async function resolveManifest(pluginRoot, result) {
  const hidden = (file) => {
    result.errors.push({ code: "missing-plugin-manifest", file, message: "Codex loads no plugin: this symlinked or non-regular entry hides every lower-precedence manifest." });
    return { stopped: true };
  };
  const rootFile = path.join(pluginRoot, AGENT_MANIFEST);
  const rootState = await entryState(rootFile, result);
  if (rootState === UNREADABLE) return { stopped: true };
  if (rootState === FILE) {
    const text = await readText(rootFile, result);
    if (text === null) return { stopped: true };
    const schema = parseJsonQuietly(text)?.$schema;
    // A root plugin.json without an Agent Plugins schema (an npm manifest, say)
    // is not a plugin manifest, and Codex moves on to the legacy layouts.
    if (typeof schema === "string" && schema.startsWith(AGENT_PLUGIN_SCHEMA_PREFIX)) {
      return { file: rootFile, format: "agent-plugin", rank: 0 };
    }
  } else if (rootState !== ABSENT) {
    return hidden(rootFile);
  }
  for (const [index, legacy] of LEGACY_MANIFESTS.entries()) {
    const file = path.join(pluginRoot, legacy.path);
    const directoryState = await entryState(path.dirname(file), result);
    if (directoryState === ABSENT) continue;
    if (directoryState === UNREADABLE) return { stopped: true };
    if (directoryState !== DIRECTORY) return hidden(path.dirname(file));
    const fileState = await entryState(file, result);
    if (fileState === FILE) return { file, format: legacy.format, rank: index + 1 };
    if (fileState === ABSENT) continue;
    if (fileState === UNREADABLE) return { stopped: true };
    return hidden(file);
  }
  return {};
}

function validateIdentity(manifest, manifestFile, expectedName, namePattern, report, result) {
  requireString(manifest.name, "missing-plugin-name", manifestFile, result);
  for (const [value, code] of [
    [manifest.version, "missing-plugin-version"],
    [manifest.description, "missing-plugin-description"],
    [manifest.author?.name, "missing-plugin-author"],
  ]) {
    if (typeof value !== "string" || value.trim() === "") report.push({ code, file: manifestFile, message: "Expected a non-empty string." });
  }
  if (manifest.name && !namePattern.test(manifest.name)) {
    result.errors.push({ code: "invalid-plugin-name", file: manifestFile, message: "Plugin name must be kebab-case (an Agent Plugins name may also contain dots)." });
  }
  if (manifest.version && !SEMVER_PATTERN.test(manifest.version)) {
    report.push({ code: "invalid-plugin-version", file: manifestFile, message: "Plugin version must use strict semantic versioning." });
  }
  if (expectedName && manifest.name !== expectedName) {
    result.errors.push({ code: "plugin-name-mismatch", file: manifestFile, message: `Marketplace and folder expect '${expectedName}', manifest declares '${manifest.name}'.` });
  }
}

/**
 * The Codex-specific fields, from a legacy manifest, a `com.openai` extension,
 * or the `.codex-plugin` overlay. `requireInterface` is false where Codex can
 * derive the interface instead.
 */
async function validateCodexFields(pluginRoot, fields, file, requireInterface, report, result) {
  if (requireInterface || isDeclared(fields.interface)) {
    for (const field of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
      const value = fields.interface?.[field];
      if (typeof value !== "string" || value.trim() === "") {
        report.push({ code: `missing-interface-${field}`, file, message: "Expected a non-empty string." });
      }
    }
  }
  if (isDeclared(fields.apps)) {
    const appsPath = resolveContained(pluginRoot, fields.apps, "invalid-app-path", file, result);
    await requireDeclaredFile(appsPath, "missing-app-manifest", file, "Declared apps file does not exist.", result);
  }
}

async function validateLegacyManifest(pluginRoot, manifest, manifestFile, format, expectedName, result, skillNames) {
  // Codex loads a Claude or Cursor manifest only as a fallback, so the Codex
  // publishing fields it lacks are warnings rather than errors.
  const report = format === "codex" ? result.errors : result.warnings;
  if (format !== "codex") {
    result.warnings.push({ code: "legacy-host-manifest", file: manifestFile, message: `Codex loads this ${HOST_NAMES[format]} manifest as a fallback; publish a root plugin.json or .codex-plugin/plugin.json for Codex.` });
  }
  validateIdentity(manifest, manifestFile, expectedName, NAME_PATTERN, report, result);
  await validateCodexFields(pluginRoot, manifest, manifestFile, true, report, result);
  // The published manifest contract declares `mcpServers` as a './'-relative
  // path to an .mcp.json file; the server map itself lives inside that file.
  // Anything else is reported as an invalid path rather than skipped silently.
  if (isDeclared(manifest.mcpServers)) {
    const mcpPath = resolveContained(pluginRoot, manifest.mcpServers, "invalid-mcp-path", manifestFile, result);
    await requireDeclaredFile(mcpPath, "missing-mcp-manifest", manifestFile, "Declared MCP file does not exist.", result);
  }
  if (isDeclared(manifest.skills)) await validateSkills(pluginRoot, manifest.skills, manifestFile, result, skillNames);
}

async function validateAgentManifest(pluginRoot, manifest, manifestFile, overlay, expectedName, result, skillNames) {
  if (manifest.$schema !== AGENT_PLUGIN_SCHEMA_URI) {
    result.errors.push({ code: "unsupported-agent-plugin-schema", file: manifestFile, message: `Codex supports only the Agent Plugins schema ${AGENT_PLUGIN_SCHEMA_URI}.` });
  }
  for (const field of Object.keys(manifest).filter((key) => !AGENT_PLUGIN_FIELDS.has(key))) {
    result.warnings.push({ code: "ignored-agent-plugin-field", file: manifestFile, message: `Codex ignores '${field}' in a root plugin.json; put Codex fields under extensions.${CODEX_EXTENSION}.` });
  }
  validateIdentity(manifest, manifestFile, expectedName, AGENT_NAME_PATTERN, result.errors, result);
  // An inline extension replaces the .codex-plugin overlay; without one, the
  // overlay supplies the Codex fields. With neither, Codex derives the
  // interface from name, description, and author.
  const extension = manifest.extensions?.[CODEX_EXTENSION];
  if (isObject(extension)) await validateCodexFields(pluginRoot, extension, manifestFile, false, result.errors, result);
  else if (overlay) await validateCodexFields(pluginRoot, overlay.manifest, overlay.file, false, result.errors, result);
  // Skills and MCP servers sit at fixed paths for an Agent Plugins manifest.
  if ((await pathState(path.join(pluginRoot, "skills"), result)) === PRESENT) {
    await validateSkills(pluginRoot, "./skills", manifestFile, result, skillNames);
  }
  if (
    (await pathState(path.join(pluginRoot, ".mcp.json"), result)) === PRESENT &&
    (await pathState(path.join(pluginRoot, "mcp.json"), result)) === ABSENT
  ) {
    result.warnings.push({ code: "agent-plugin-mcp-file", file: pluginRoot, message: "A root plugin.json reads MCP servers from mcp.json, so .mcp.json is not loaded." });
  }
}

async function validatePlugin(pluginRoot, expectedName, result, skillNames) {
  const resolved = await resolveManifest(pluginRoot, result);
  if (resolved.stopped) return;
  if (!resolved.file) {
    result.errors.push({ code: "missing-plugin-manifest", file: pluginRoot, message: `No plugin manifest: expected ${AGENT_MANIFEST} with an Agent Plugins $schema, or ${LEGACY_MANIFESTS.map((legacy) => legacy.path).join(", ")}.` });
    return;
  }
  const manifest = await readJson(resolved.file, result);
  if (!manifest) return;
  const layout = { plugin: pluginRoot, manifest: resolved.file, format: resolved.format };
  result.manifests.push(layout);

  // Every lower-precedence manifest is ignored, except that a root manifest
  // with no `com.openai` extension reads `.codex-plugin/plugin.json` as an overlay.
  let overlay = null;
  for (const legacy of LEGACY_MANIFESTS.slice(resolved.rank)) {
    const file = path.join(pluginRoot, legacy.path);
    if ((await entryState(file, result)) === ABSENT) continue;
    if (resolved.format === "agent-plugin" && legacy.format === "codex" && !isObject(manifest.extensions?.[CODEX_EXTENSION])) {
      const overlayManifest = await readJson(file, result);
      if (overlayManifest) {
        overlay = { file, manifest: overlayManifest };
        layout.overlay = file;
      }
      continue;
    }
    result.warnings.push({ code: "shadowed-plugin-manifest", file, message: `Codex ignores this manifest because ${path.relative(pluginRoot, resolved.file)} takes precedence.` });
  }

  if (resolved.format === "agent-plugin") {
    await validateAgentManifest(pluginRoot, manifest, resolved.file, overlay, expectedName, result, skillNames);
  } else {
    await validateLegacyManifest(pluginRoot, manifest, resolved.file, resolved.format, expectedName, result, skillNames);
  }
}

async function validateMarketplaceRoot(root, catalog, result, skillNames) {
  const marketplaceFile = catalog.file;
  const marketplace = await readJson(marketplaceFile, result);
  if (!marketplace) return;
  // Codex reads a Claude or Cursor catalog with the same parser and defaults
  // the policy fields, so their absence there is a warning.
  const report = catalog.format === "codex" ? result.errors : result.warnings;
  if (catalog.format !== "codex") {
    result.warnings.push({ code: "legacy-host-catalog", file: marketplaceFile, message: `Codex loads this ${HOST_NAMES[catalog.format]} catalog as a fallback; publish .agents/plugins/marketplace.json for Codex.` });
  }
  requireString(marketplace.name, "missing-marketplace-name", marketplaceFile, result);
  if (!Array.isArray(marketplace.plugins)) {
    result.errors.push({ code: "missing-marketplace-plugins", file: marketplaceFile, message: "Marketplace plugins must be an array." });
    return;
  }

  const names = new Set();
  for (const plugin of marketplace.plugins) {
    const name = plugin?.name;
    requireString(name, "missing-marketplace-plugin-name", marketplaceFile, result);
    if (name) {
      if (names.has(name)) {
        result.errors.push({ code: "duplicate-marketplace-plugin", file: marketplaceFile, message: `Duplicate plugin entry '${name}'.` });
      }
      names.add(name);
    }
    if (!INSTALLATION_POLICIES.has(plugin?.policy?.installation)) {
      report.push({ code: "invalid-installation-policy", file: marketplaceFile, message: `Invalid installation policy for '${name ?? "unknown"}'.` });
    }
    if (!AUTH_POLICIES.has(plugin?.policy?.authentication)) {
      report.push({ code: "invalid-authentication-policy", file: marketplaceFile, message: `Invalid authentication policy for '${name ?? "unknown"}'.` });
    }
    if (typeof plugin?.category !== "string" || plugin.category.trim() === "") {
      report.push({ code: "missing-marketplace-category", file: marketplaceFile, message: "Expected a non-empty string." });
    }

    const source = plugin?.source;
    const localPath = typeof source === "string" ? source : source?.source === "local" ? source.path : null;
    if (localPath) {
      // A Cursor catalog's local source may omit the './' prefix
      // (`resolve_local_plugin_source_path` in codex-rs/core-plugins/src/marketplace.rs).
      const pluginRoot = resolveContained(root, localPath, "invalid-marketplace-source", marketplaceFile, result, catalog.format === "cursor");
      if (pluginRoot) await validatePlugin(pluginRoot, name, result, skillNames);
      continue;
    }
    if (source?.source === "url" && !source.url) {
      result.errors.push({ code: "missing-source-url", file: marketplaceFile, message: `URL source '${name}' has no URL.` });
    } else if (source?.source === "git-subdir" && (!source.url || !source.path)) {
      result.errors.push({ code: "invalid-git-subdir-source", file: marketplaceFile, message: `Git subdirectory source '${name}' requires url and path.` });
    } else if (source?.source === "npm" && !source.package) {
      result.errors.push({ code: "missing-npm-package", file: marketplaceFile, message: `npm source '${name}' has no package.` });
    } else if (!source || !["url", "git-subdir", "npm"].includes(source.source)) {
      report.push({ code: "unsupported-marketplace-source", file: marketplaceFile, message: `Unsupported source for '${name ?? "unknown"}'.` });
    } else {
      result.warnings.push({ code: "remote-source-not-expanded", file: marketplaceFile, message: `Remote plugin '${name}' was not structurally expanded.` });
    }
  }
}

/** Find the catalog Codex would load and warn about any it would ignore. */
async function resolveCatalog(root, result) {
  let winner = null;
  for (const candidate of CATALOGS) {
    const file = path.join(root, candidate.path);
    const state = await pathState(file, result);
    if (state === UNREADABLE) return { stopped: true };
    if (state === ABSENT) continue;
    if (!winner) {
      winner = { file, format: candidate.format };
      continue;
    }
    result.warnings.push({ code: "shadowed-marketplace-catalog", file, message: `Codex ignores this catalog because ${path.relative(root, winner.file)} takes precedence.` });
  }
  return winner ?? {};
}

export async function validateTarget(target) {
  const root = path.resolve(target);
  const result = { target: root, kind: null, catalog: null, manifests: [], errors: [], warnings: [] };
  const skillNames = new Map();
  const catalog = await resolveCatalog(root, result);
  if (catalog.stopped) return result;
  if (catalog.file) {
    result.kind = "marketplace";
    result.catalog = catalog.file;
    await validateMarketplaceRoot(root, catalog, result, skillNames);
    return result;
  }
  const probe = { errors: [], warnings: [] };
  const manifest = await resolveManifest(root, probe);
  if (manifest.file || probe.errors.length > 0) {
    // validatePlugin repeats the probe and reports what it found.
    result.kind = "plugin";
    await validatePlugin(root, path.basename(root), result, skillNames);
    return result;
  }
  result.errors.push({ code: "unknown-target", file: root, message: "Expected a marketplace root or plugin root." });
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const target = args.find((arg) => arg !== "--json") ?? process.cwd();
  const result = await validateTarget(target);
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const error of result.errors) process.stderr.write(`ERROR ${error.code}: ${error.file}: ${error.message}\n`);
    for (const warning of result.warnings) process.stderr.write(`WARN ${warning.code}: ${warning.file}: ${warning.message}\n`);
    process.stdout.write(`${result.errors.length === 0 ? "PASS" : "FAIL"}: ${result.kind ?? "unknown"} ${result.target}; ${result.errors.length} error(s), ${result.warnings.length} warning(s).\n`);
    if (result.catalog) process.stdout.write(`CATALOG ${path.relative(result.target, result.catalog)}\n`);
    for (const layout of result.manifests) {
      const overlay = layout.overlay ? ` + overlay ${path.relative(result.target, layout.overlay)}` : "";
      process.stdout.write(`MANIFEST ${layout.format}: ${path.relative(result.target, layout.manifest)}${overlay}\n`);
    }
  }
  process.exitCode = result.errors.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
