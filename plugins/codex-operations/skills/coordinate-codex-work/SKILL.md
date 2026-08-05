---
name: coordinate-codex-work
description: Coordinate multi-task, multi-agent, and long-running Codex work across local projects or projectless efforts. Use when the user asks Codex to direct parallel work, manage or monitor Codex tasks, reconcile dependencies, compare independent approaches, prepare handoffs, or turn a proven workflow into a scheduled task.
---

# Coordinate Codex Work

Coordinate outcomes, not activity. Treat human attention and integration capacity as scarce resources.

Read [references/operating-model.md](references/operating-model.md) when choosing among tasks, subagents, worktrees, and scheduled tasks or when preparing a control board or handoff. Read [references/evidence.md](references/evidence.md) only when auditing or revising this workflow.

## Establish outcome, context, and authority

1. State the desired outcome, constraints, and verifiable definition of done.
2. Read the active `AGENTS.md` hierarchy and relevant native project evidence before dispatching repository work.
3. Identify what the user authorized: read or report, change or build, external writes, publication, merging, archiving, scheduling, or monitoring.
4. Keep irreversible actions, external communication, permission changes, purchases, and consequential architectural choices behind explicit user gates unless already authorized.
5. Preserve the user's selected project, repository, model, browser, and execution surface. Do not widen scope merely because coordination tools are available.

When coordinating across repositories, treat each repository's instruction hierarchy and configuration as independent context. Never substitute the publisher's conventions for consumer repository policy.

## Choose the smallest execution unit

Use the current task for one coherent outcome, even when it has several sequential phases.

Use subagents for bounded, independent work inside the current outcome only when the user or applicable repository or skill guidance permits delegation. Prefer read-heavy parallelism and avoid concurrent writes to overlapping files.

Use separate Codex tasks only when the user asks for distinct user-owned tasks that need sidebar visibility, independent follow-up, different projects, or independent worktrees. Never create a separate task merely to hide a subtask of the current request.

Use a scheduled task only after the manual workflow is stable. Use an in-task schedule when continuity matters and a standalone schedule when runs should be independent or span projects.

## Design the work graph

1. Split work by independently reviewable outcomes, not arbitrary file counts.
2. Record dependencies and identify the critical path before dispatch.
3. Keep active workers within available concurrency and realistic review capacity.
4. Use isolated worktrees for parallel writers in one Git repository, with one owner per overlapping code area.
5. Compare multiple approaches only when uncertainty justifies the cost, using the same acceptance criteria.
6. Add independent verification when risk, ambiguity, or user impact warrants maker-checker separation.

## Dispatch complete briefs

Give every worker or task:

- an outcome-oriented title;
- the goal and why it matters;
- exact scope and exclusions;
- authoritative source paths, links, or task identifiers;
- constraints, authority, and dependency state;
- verification criteria and stopping conditions; and
- a return contract covering result, evidence, changed files, checks, blockers, and follow-ups.

Send the minimum context that makes the work self-contained. Prefer stable pointers over copied histories. Read an existing task before steering it.

## Monitor by exception

1. Wait for compact progress snapshots instead of repeatedly reading full histories.
2. Report only meaningful deltas: completed outcomes, blockers, changed assumptions, risks, failed verification, or decisions.
3. Do not interrupt workers for unchanged status. Steer only when evidence, dependencies, or user direction materially changes the work.
4. For three or more workstreams, maintain a compact board with outcome, status, dependency, next gate, and evidence.
5. Present decisions as a packet: decision, recommendation, alternatives, impact, and latest safe decision point.
6. Distinguish worker completion from verified integration.

## Integrate and close the loop

1. Require objective evidence where possible: tests, reproductions, screenshots, logs, diffs, or measurable checks.
2. Integrate dependency-ordered changes before dependent work and notify affected tasks when interfaces change.
3. Compare alternatives against acceptance criteria, not aesthetic preference alone.
4. Escalate intent conflicts and consequential tradeoffs; resolve routine implementation details within scope.
5. Pin only durable coordinators or tasks needing attention. Rename by outcome. Archive only after integration or explicit handoff.
6. Finish with outcomes, evidence, unresolved risks, decisions, and follow-up loops.

## Preserve long-running context

Keep one durable coordinator per important project or workstream, not one universal task. Store load-bearing decisions, open loops, and current state in a reviewable project artifact when the work will outlive the conversation.

If compaction makes a detail uncertain, reread the originating task or authoritative artifact. Treat `~/.codex/memories/` as generated state; keep required global rules in global `AGENTS.md`, repository rules in repository `AGENTS.md`, and reusable procedure in this skill.

## Avoid coordination failure modes

- Do not create workers merely because the interface permits it.
- Do not create duplicate or overlapping briefs.
- Do not let worker production exceed verification capacity.
- Do not flood the coordinator with raw logs or routine updates.
- Do not treat a worker report as independent proof.
- Do not schedule an unstable workflow.
- Do not assume a long-running task remembers every detail.
- Do not expand authority while trying to unblock work.
