# Plugin philosophy (Codex)

This is the durable design policy for every plugin, skill, hook, script, MCP
mapping, and marketplace entry in this repository. The
[migration playbook](MIGRATION-PLAYBOOK.md) applies it when translating a
capability from another host.

`MUST` and `MUST NOT` are release gates. `SHOULD` describes the default; a pull
request may depart from it only with a written, tested reason.

## Outcome and boundary

A plugin MUST deliver an independently useful vertical slice of one cohesive
user capability. Organize around the user goal and its acceptance criteria, not
around a source host's folders or a generic technical layer.

Publisher metadata may identify Melodic Software. Runtime behavior MUST NOT
depend on a particular user, employer, organization, repository, machine,
absolute path, subscription, workspace policy, or undocumented directory
layout. A plugin MUST remain useful when installed by itself.

This repository is the Codex-only source of truth. Claude Code, Cursor, and
Codex packages have independent manifests, releases, tests, and native
adapters. Ideas may be ported deliberately in either direction; runtime
cross-loading and automatic cross-repository synchronization are prohibited.

## Context before defaults

Repository context is the primary adaptation mechanism. Before deciding how to
act, a plugin MUST discover context in this order:

1. The current request, authorization, and explicit invocation inputs.
2. The active `AGENTS.md` instruction chain from repository root to the current
   working directory.
3. Native repository evidence relevant to the goal: manifests, configuration,
   CI, tests, documentation, established code patterns, and current changes.
4. Available Codex capabilities, tools, connectors, hooks, platform, and trust
   state.
5. Plugin defaults and optional fallbacks.

More specific authorized context wins over a generic default. The plugin MUST
surface a material conflict instead of silently replacing repository policy.
It MUST NOT infer employer policy, personal taste, or credentials from publisher
metadata, machine state, or a sibling plugin.

Repository discovery must be proportional. Inspect only the context needed for
the user goal and avoid collecting unrelated repository or personal data.

## Prefer native extension points

Select the smallest current Codex surface that owns the behavior:

| Need | Native owner |
| --- | --- |
| One invocation's choice | Prompt or explicit skill input |
| Repeatable workflow | Focused skill |
| Durable repository convention | Consumer `AGENTS.md` |
| Project or personal setting | Native Codex configuration |
| Live external data or controlled action | MCP server or supported connector |
| Lifecycle enforcement | Hook with explicit trust review |
| Independent delegated role | Current native Codex agent surface, when the documented package contract supports it |
| Scheduled follow-up | Codex automation, outside the plugin package |
| Installable distribution | Plugin manifest and marketplace |

A plugin MUST NOT introduce a second configuration, credential, scheduling, or
policy system when a current native surface can express the requirement. When a
native gap is real, the change MUST document the missing capability and isolate
the workaround behind a replaceable adapter.

`agents/openai.yaml` is skill presentation and invocation metadata, not a
custom execution agent. Keep it synchronized with its `SKILL.md`. Package or
migrate a custom agent only when current official Codex documentation defines
the discovery and packaging contract; otherwise express the cohesive workflow
as a skill or use normal task coordination.

## Ports and adapters

Treat host and environment integrations as adapters around a cohesive core:

- **Core:** user-goal decisions, validation rules, transformations, and output
  contracts that do not depend on Codex or a source host.
- **Inbound ports:** user intent, explicit skill inputs, repository context, and
  hook or automation events.
- **Outbound ports:** filesystem operations, shell or CLI execution, MCP tools,
  connectors, network access, UI, and external writes.
- **Adapters:** the smallest Codex-native implementation of one port, including
  capability detection, validation, approvals, and fallback behavior.

The core MUST NOT locate another plugin, read a personal config path directly,
or depend on a concrete connector when a narrow capability interface is enough.
Adapters SHOULD be replaceable without rewriting the domain workflow.

Use an abstraction only when it protects a real boundary or variation. Do not
create speculative frameworks. Interfaces MUST be segregated by the smallest
capability a workflow consumes; read and write capabilities MUST remain
distinct when the underlying tool permits it.

## Coupling, cohesion, and encapsulation

- Each skill MUST have one recognizable trigger and outcome.
- Related instructions, tests, references, scripts, and assets SHOULD live with
  the capability that owns them.
- Internal representation and host-specific details MUST be encapsulated behind
  the owning skill, script, or adapter.
- Plugins MUST NOT share mutable runtime state or private file layouts.
- Collaboration between plugins requires a documented public seam, explicit
  user intent, and a useful standalone fallback.
- Cross-cutting helpers are justified only after more than one real vertical
  slice needs the same stable contract.

This produces high cohesion inside a capability and low coupling between
capabilities without sacrificing simple, direct implementations.

## Configuration and extensibility

Configuration SHOULD flow through native surfaces in this order:

1. explicit invocation input;
2. active repository instructions or project configuration;
3. personal Codex configuration;
4. authenticated MCP or connector configuration; and
5. a documented plugin default.

Defaults MUST be quiet, safe, reversible, and non-blocking when a safe choice
exists. Required questions MUST be limited to material choices that cannot be
derived from authorized context. Optional integrations MUST be capability-
detected and MUST have either a useful fallback or a clear unsupported result.

Extension points MUST describe their input, output, error, and trust boundary.
Do not expose an entire tool or environment when a smaller port is sufficient.

## Safety and user control

- Keep credentials and secret values outside the package.
- Separate read, preview, write, and destructive operations.
- Preserve unrelated working-tree changes and scope writes to the request.
- Make external state changes visible and follow Codex approval boundaries.
- Treat hooks as executable trust boundaries and keep them optional unless the
  capability cannot be correct without enforcement.
- Detect platform-specific behavior and provide a safe unsupported path.
- Never assume a third-party executable, connection, network route, or product
  entitlement exists without checking.

Idempotent or safely retryable behavior is preferred. When an operation cannot
be safely retried, its contract MUST say so and verification MUST cover partial
failure.

## Documentation discipline

Every plugin action MUST complete the live-documentation preflight in
`AGENTS.md`. [OFFICIAL-DOCS.md](OFFICIAL-DOCS.md) contains upstream pointers,
not copied rules. Pull requests record the live URLs and verification date.

Repository prose SHOULD explain our decision, boundary, and test—not restate an
upstream manual. If a current product contract changes, update the affected
implementation, tests, source pointer, and local decision together.

## Release gates

A plugin is releasable only when all of these are true:

- It has a clear user goal and cohesive vertical-slice boundary.
- It follows current native Codex contracts verified from live sources.
- It adapts through authorized repository context before defaults.
- Its core is isolated from host and environment adapters where variation is
  material.
- It has no user, organization, machine, sibling-plugin, or source-host runtime
  dependency.
- Paths are relative to the plugin, marketplace, or active repository root.
- Configuration uses native surfaces or documents a narrow native gap.
- Optional capabilities have tested fallback behavior.
- Writes preserve unrelated changes and respect trust and approval boundaries.
- Direct, indirect, negative, incomplete, context-variation, platform, and
  missing-dependency cases are tested.
- The package passes repository, plugin, and skill validators.

One-off behavior is acceptable only when the capability is intentionally
specific, the boundary is named, and the implementation still follows the same
context, safety, adapter, and validation rules.
