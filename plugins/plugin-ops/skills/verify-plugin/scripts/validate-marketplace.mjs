#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const INSTALLATION_POLICIES = new Set(["NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"]);
const AUTH_POLICIES = new Set(["ON_INSTALL", "ON_USE"]);
const MACHINE_PATH_PATTERN = /(?:[A-Za-z]:[\\/]Users[\\/][^\\/\s]+|\/Users\/[^/\s]+|\/home\/[^/\s]+)/;

async function exists(candidate) {
  try {
    await stat(candidate);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function readJson(file, result) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    result.errors.push({ code: "invalid-json", file, message: error.message });
    return null;
  }
}

function requireString(value, code, file, result) {
  if (typeof value !== "string" || value.trim() === "") {
    result.errors.push({ code, file, message: "Expected a non-empty string." });
    return false;
  }
  return true;
}

function resolveContained(root, relativePath, code, file, result) {
  if (typeof relativePath !== "string" || !relativePath.startsWith("./")) {
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

async function validateSkills(pluginRoot, skillsPath, result) {
  const skillsRoot = resolveContained(pluginRoot, skillsPath, "invalid-skills-path", result.target, result);
  if (!skillsRoot) return;
  if (!(await exists(skillsRoot))) {
    result.errors.push({ code: "missing-skills-directory", file: skillsRoot, message: "Declared skills directory does not exist." });
    return;
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const skillNames = new Set();
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const skillRoot = path.join(skillsRoot, entry.name);
    const skillFile = path.join(skillRoot, "SKILL.md");
    if (!(await exists(skillFile))) continue;
    const text = await readFile(skillFile, "utf8");
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
    if (name && skillNames.has(name)) {
      result.errors.push({ code: "duplicate-skill-name", file: skillFile, message: `Duplicate skill name '${name}'.` });
    }
    if (name) skillNames.add(name);
    if (text.includes("TODO:")) {
      result.errors.push({ code: "skill-placeholder", file: skillFile, message: "Remove TODO placeholders before publishing." });
    }
    if (MACHINE_PATH_PATTERN.test(text)) {
      result.errors.push({ code: "machine-specific-path", file: skillFile, message: "Skill instructions contain a user-home absolute path." });
    }
    const agentMetadata = path.join(skillRoot, "agents", "openai.yaml");
    if (!(await exists(agentMetadata))) {
      result.warnings.push({ code: "missing-skill-ui-metadata", file: skillRoot, message: "Consider generating agents/openai.yaml with skill-creator." });
    }
  }
}

async function validatePlugin(pluginRoot, expectedName, result) {
  const manifestFile = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  if (!(await exists(manifestFile))) {
    result.errors.push({ code: "missing-plugin-manifest", file: manifestFile, message: "Plugin manifest does not exist." });
    return;
  }
  const manifest = await readJson(manifestFile, result);
  if (!manifest) return;

  requireString(manifest.name, "missing-plugin-name", manifestFile, result);
  requireString(manifest.version, "missing-plugin-version", manifestFile, result);
  requireString(manifest.description, "missing-plugin-description", manifestFile, result);
  requireString(manifest.author?.name, "missing-plugin-author", manifestFile, result);
  if (manifest.name && !NAME_PATTERN.test(manifest.name)) {
    result.errors.push({ code: "invalid-plugin-name", file: manifestFile, message: "Plugin name must be kebab-case." });
  }
  if (manifest.version && !SEMVER_PATTERN.test(manifest.version)) {
    result.errors.push({ code: "invalid-plugin-version", file: manifestFile, message: "Plugin version must use strict semantic versioning." });
  }
  if (expectedName && manifest.name !== expectedName) {
    result.errors.push({ code: "plugin-name-mismatch", file: manifestFile, message: `Marketplace and folder expect '${expectedName}', manifest declares '${manifest.name}'.` });
  }
  for (const field of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
    requireString(manifest.interface?.[field], `missing-interface-${field}`, manifestFile, result);
  }
  if (manifest.apps && !(await exists(resolveContained(pluginRoot, manifest.apps, "invalid-app-path", manifestFile, result) ?? ""))) {
    result.errors.push({ code: "missing-app-manifest", file: manifestFile, message: "Declared apps file does not exist." });
  }
  if (typeof manifest.mcpServers === "string") {
    const mcpPath = resolveContained(pluginRoot, manifest.mcpServers, "invalid-mcp-path", manifestFile, result);
    if (mcpPath && !(await exists(mcpPath))) {
      result.errors.push({ code: "missing-mcp-manifest", file: manifestFile, message: "Declared MCP file does not exist." });
    }
  }
  if (manifest.skills) await validateSkills(pluginRoot, manifest.skills, result);
}

async function validateMarketplaceRoot(root, result) {
  const marketplaceFile = path.join(root, ".agents", "plugins", "marketplace.json");
  const marketplace = await readJson(marketplaceFile, result);
  if (!marketplace) return;
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
      result.errors.push({ code: "invalid-installation-policy", file: marketplaceFile, message: `Invalid installation policy for '${name ?? "unknown"}'.` });
    }
    if (!AUTH_POLICIES.has(plugin?.policy?.authentication)) {
      result.errors.push({ code: "invalid-authentication-policy", file: marketplaceFile, message: `Invalid authentication policy for '${name ?? "unknown"}'.` });
    }
    requireString(plugin?.category, "missing-marketplace-category", marketplaceFile, result);

    const source = plugin?.source;
    const localPath = typeof source === "string" ? source : source?.source === "local" ? source.path : null;
    if (localPath) {
      const pluginRoot = resolveContained(root, localPath, "invalid-marketplace-source", marketplaceFile, result);
      if (pluginRoot) await validatePlugin(pluginRoot, name, result);
      continue;
    }
    if (source?.source === "url" && !source.url) {
      result.errors.push({ code: "missing-source-url", file: marketplaceFile, message: `URL source '${name}' has no URL.` });
    } else if (source?.source === "git-subdir" && (!source.url || !source.path)) {
      result.errors.push({ code: "invalid-git-subdir-source", file: marketplaceFile, message: `Git subdirectory source '${name}' requires url and path.` });
    } else if (source?.source === "npm" && !source.package) {
      result.errors.push({ code: "missing-npm-package", file: marketplaceFile, message: `npm source '${name}' has no package.` });
    } else if (!source || !["url", "git-subdir", "npm"].includes(source.source)) {
      result.errors.push({ code: "unsupported-marketplace-source", file: marketplaceFile, message: `Unsupported source for '${name ?? "unknown"}'.` });
    } else {
      result.warnings.push({ code: "remote-source-not-expanded", file: marketplaceFile, message: `Remote plugin '${name}' was not structurally expanded.` });
    }
  }
}

export async function validateTarget(target) {
  const root = path.resolve(target);
  const result = { target: root, kind: null, errors: [], warnings: [] };
  if (await exists(path.join(root, ".agents", "plugins", "marketplace.json"))) {
    result.kind = "marketplace";
    await validateMarketplaceRoot(root, result);
  } else if (await exists(path.join(root, ".codex-plugin", "plugin.json"))) {
    result.kind = "plugin";
    await validatePlugin(root, path.basename(root), result);
  } else {
    result.errors.push({ code: "unknown-target", file: root, message: "Expected a marketplace root or plugin root." });
  }
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
  }
  process.exitCode = result.errors.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
