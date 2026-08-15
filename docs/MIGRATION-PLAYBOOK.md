# Plugin migration playbook

Use this playbook to port a capability between Claude Code, Cursor, Codex, or a
legacy Codex package. Port the user capability and its evidence, not the source
host's packaging assumptions. The [plugin philosophy](PLUGIN-PHILOSOPHY.md) is
binding throughout.

## Definition of done

A migration is complete only when the target plugin:

- is independently useful with the source marketplace and sibling plugins
  disabled;
- uses current target-host native surfaces;
- adapts to the active repository's instructions and project context;
- has explicit component dispositions and intentional differences;
- contains no user, employer, machine, credential, or source-install
  dependency; and
- passes structural and behavioral validation on the target host.

## 1. Establish authority and evidence

Before editing:

1. Record the source repository, exact commit, source plugin version, and target
   repository base commit.
2. Read the source manifest, marketplace entry, skills, agents, hooks, scripts,
   MCP/app configuration, assets, tests, and user documentation completely.
3. Complete the live-documentation preflight in `AGENTS.md` for both the source
   host and Codex. Use [OFFICIAL-DOCS.md](OFFICIAL-DOCS.md) as the pointer index.
4. Inspect current target CLI help for every command the target package will
   invoke.
5. Record links and the verification date. Do not copy upstream prose into the
   migration artifact.

Official source-host documentation establishes what the source component does.
Official OpenAI documentation and verified Codex behavior establish how the
target must express it. When either side is unclear, record the gap and stop the
affected component instead of guessing.

## 2. Define the user-goal slice

Write a compact use-case inventory before mapping files:

| Field | Required content |
| --- | --- |
| User goal | Outcome the user is trying to achieve |
| Inputs | Explicit inputs and repository context needed |
| Output | Observable result and quality bar |
| Side effects | Read, preview, write, destructive, or external actions |
| Boundaries | Unsupported or intentionally excluded behavior |
| Variations | Platform, repository, tool, and integration differences |
| Acceptance evidence | Tests or examples proving the capability |

Split unrelated goals into separate vertical slices. Do not recreate the source
host's folder tree as an architecture.

## 3. Inventory assumptions and context

Identify every source assumption about:

- user identity, employer, organization, or repository name;
- absolute paths, home directories, operating system, shell, or installed
  executables;
- source-host tools, commands, events, permissions, or lifecycle behavior;
- credentials, subscriptions, workspace policy, or network access;
- sibling plugins, shared state, generated files, or install location; and
- implicit defaults that should instead come from repository context.

For each assumption, choose one target treatment: explicit input, active
`AGENTS.md` or native project discovery, native Codex configuration,
capability-detected adapter, safe default, or unsupported result.

## 4. Classify every component

Create a component ledger. Every source component receives exactly one
disposition:

- **Keep:** portable domain content already matches the target contract.
- **Reshape:** preserve the capability but rewrite its host-facing contract.
- **Replace:** use a target-native surface that serves the goal better.
- **Drop:** no target equivalent exists, the component is unsafe, or it is not
  needed for the user goal.

Record the target owner and evidence for every row:

| Source component | Disposition | Target surface | Preserved behavior | Difference or reason | Test |
| --- | --- | --- | --- | --- | --- |

Never silently omit a component. A replacement is not complete until its
behavioral difference is explicit and tested.

## 5. Design the target architecture

Before implementation, identify:

- the cohesive domain core;
- inbound ports for user intent, invocation input, repository context, and
  lifecycle events;
- outbound ports for files, shell, MCP, connectors, network, UI, and writes;
  and
- the smallest Codex-native adapter for each port.

Apply interface segregation: a read workflow must not depend on a broad write
adapter, and an optional integration must not become a package-wide
requirement. Keep adapters replaceable and avoid speculative abstraction.

Select target surfaces deliberately:

- skill for a focused repeatable workflow;
- consumer `AGENTS.md` for durable repository policy;
- native configuration for project or personal settings;
- MCP/app connection for authenticated live data and controlled actions;
- hook for justified lifecycle enforcement; and
- marketplace metadata for installation and presentation.

Do not invent a compatibility shim or plugin-local configuration system merely
to preserve the source file shape.

## 6. Rebuild natively

Use `$plugin-creator` for the target package and `$skill-creator` for each
skill. Use the installed `$migrate-plugin` component map as a checklist, then
override it when current official documentation differs.

During implementation:

- preserve domain logic only after removing source-host tool names, paths,
  prompts, settings, and lifecycle assumptions;
- keep plugin paths relative and resources owned by the vertical slice;
- make repository behavior discover the active `AGENTS.md` hierarchy and
  native project evidence before applying defaults;
- use explicit, narrow adapters for optional tools and integrations;
- preserve unrelated working-tree changes;
- keep secrets and private endpoints outside the package; and
- add no runtime lookup of source or sibling marketplaces.

## 7. Define configuration and fallbacks

For every variable behavior, record:

| Decision | Source |
| --- | --- |
| Invocation-specific choice | Explicit input |
| Repository convention | Active `AGENTS.md` or native project config |
| Personal default | User Codex config |
| External authorization | Native MCP or connector authentication |
| Safe generic behavior | Documented plugin default |

Each optional dependency needs a capability check and either a useful fallback
or a clear unsupported result. A fallback must not silently reduce safety,
write to a broader scope, or change the user goal.

## 8. Validate the target in isolation

Run the repository validator, built-in plugin validator, and skill quick
validator. Then install the target from a local marketplace and start a new
Codex task with the source marketplace and sibling plugins disabled.

Exercise this matrix:

| Case | What to prove |
| --- | --- |
| Direct invocation | Expected goal and output |
| Indirect invocation | Correct skill activation |
| Negative request | No over-activation |
| Incomplete input | Minimal material question or safe inference |
| Root and nested repository context | Correct `AGENTS.md` precedence |
| Conflicting generic default | Repository context wins safely |
| Missing optional tool or connector | Useful fallback or clear stop |
| Supported platform variants | Equivalent outcome through adapters |
| Unsupported platform | Safe, actionable result |
| Existing working-tree changes | Unrelated changes preserved |
| Partial external failure | Retry or recovery contract honored |
| Source marketplace absent | No hidden runtime dependency |

Compare outcomes and side effects, not wording. Record unsupported source
behavior and intentional differences.

## 9. Publish the evidence

The pull request must include:

- source and target commits;
- live official URLs consulted and date checked;
- user-goal inventory and acceptance criteria;
- complete component ledger;
- core, ports, adapters, and native-surface decisions;
- repository-context discovery and precedence;
- configuration ownership, defaults, and fallbacks;
- security, trust, approval, and side-effect boundaries;
- structural and behavioral validation evidence; and
- follow-ups that are explicitly outside this migration.

Do not claim parity when a component was dropped, replaced, or remains
untested. Merge only when the target capability is independently useful and all
required checks pass.

## 10. Maintain independent hosts

After migration, each host remains an independent source of truth. Improvements
may be ported in either direction using this playbook, but no repository is
generated from another at install time and no automatic synchronization is
introduced. Shared concepts stay conceptual; native packaging and runtime
contracts stay local to their host.

### Evaluation carve-out: parallel packaging for assessment

The packaging-locality sentence above has exactly one exception, and nothing
wider. A deliberate, hand-built, time-boxed parallel package set MAY be
produced in a separate evaluation repository to assess a cross-host packaging
format, when all of the following hold:

- every existing host repository remains the source of truth for its host and
  keeps its own manifests, releases, tests, and native adapters;
- every native marketplace catalog is retained, because a format that defines
  no catalog or listing format does not replace one;
- the parallel set is built by hand and reviewed by a human, never emitted by
  a tool that reads one repository and writes another; and
- the evaluation has a written end date and a named owner who reports the
  outcome.

Both prohibitions above continue to apply, to the evaluation set as much as to
anything else: no repository is generated from another at install time, no
automatic synchronization is introduced, and no host loads another host's
packages at run time.

This carve-out authorizes assessment only. It does not authorize retiring a
host repository, merging host-specific content, collapsing plugins that share
a skill name across hosts, or dropping a native catalog. Retiring a host
repository is a separate decision and needs its own amendment, resting on
evidence that does not exist yet: the section 8 matrix exercised per skill
with the evidence published per section 9, and every mapped trigger verified
by invocation from a clean consumer repository. A package that loads is not a
package at parity; section 9 already forbids claiming parity for a component
that was dropped, replaced, or remains untested.
