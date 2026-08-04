# Plugin philosophy (Codex)

This is the durable design policy for plugins in this marketplace. The
[migration playbook](MIGRATION-PLAYBOOK.md) applies it when translating a
capability from another host.

## Design boundary

A plugin is an independently useful vertical slice of one cohesive capability.
Publisher metadata may identify Melodic Software; runtime behavior must not
depend on a particular user, employer, repository, machine, absolute path, or
undocumented directory layout.

Plugins must be horizontally decoupled:

- Own all skills, hooks, MCP configuration, scripts, references, and assets
  needed for the capability.
- Never import a sibling plugin or discover another plugin's install directory.
- Cooperate only through a documented public seam with a useful fallback.
- Remain useful when installed alone.

This repository is the **Codex-only** source of truth. Translate ideas between
the Claude Code, Cursor, and Codex marketplaces deliberately; do not share
runtime manifests or generate one host's package from another at install time.

## Native and adaptive

Prefer the smallest current Codex surface that fits the behavior:

| Need | Prefer |
| --- | --- |
| Repeatable workflow | Skill |
| Durable repository convention | Repository `AGENTS.md` |
| User or project setting | Native Codex configuration |
| External data or action | MCP server or supported app connector |
| Lifecycle enforcement | Hook with explicit trust review |
| Scheduled follow-up | Automation, outside the plugin package |

Discover project policy through the active `AGENTS.md` hierarchy and repository
contents. Treat that external context as authoritative for the current task.
Do not copy one consumer's policy into a supposedly universal plugin.

Use quiet, reversible defaults when a safe default exists. When configuration
is required, prefer native Codex configuration or an explicit invocation input.
Ask the user only when the choice is material and cannot be inferred safely.

## Portability gates

A plugin is portable only when all of these are true:

- Paths are relative to the plugin, marketplace, or active repository root.
- Secret values and credentials are absent from the package.
- User, company, and machine names appear only in publisher metadata or tests.
- Platform-specific behavior is detected and has a safe unsupported path.
- Writes are scoped to the user's request and preserve unrelated changes.
- Instructions do not assume a particular subscription, workspace policy, or
  preinstalled third-party tool without checking.
- The plugin still produces a useful result when optional integrations are
  unavailable.

## Live documentation gate

Before changing layout, manifests, hooks, MCP wiring, marketplace behavior, or
installation advice:

1. Fetch the relevant official pages from [OFFICIAL-DOCS.md](OFFICIAL-DOCS.md).
2. Inspect the installed `codex plugin ... --help` output when CLI behavior is
   involved.
3. Prefer the live documentation and verified CLI over repository prose.
4. Update repository guidance when the current product contract changes.

## Configuration ownership

| Concern | Owner |
| --- | --- |
| One invocation's choice | Prompt or explicit skill argument |
| Repository convention | Consumer repository `AGENTS.md` or project config |
| Personal default | User Codex configuration |
| Bundled resource | Plugin-relative file |
| Secret | Native authenticated connector, MCP auth, or external secret store |

Never commit secret values, personal paths, or employer-only policy to a public
plugin.
