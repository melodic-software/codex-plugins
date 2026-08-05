# Codex coordination operating model

## Select the surface

| Situation | Use | Avoid |
| --- | --- | --- |
| One coherent outcome with sequential phases | Current task | Separate tasks for every phase |
| Bounded independent exploration, testing, or review | Subagent, when delegation is permitted | Permanent subagent project managers |
| Distinct outcomes needing user visibility or follow-up | Separate Codex tasks requested by the user | Creating user-owned tasks for hidden subtasks |
| Parallel writers in one repository | Isolated worktrees with explicit ownership | Concurrent overlapping writes |
| Genuine alternative approaches | Independent tasks with shared acceptance criteria | Forking to escape accumulated context |
| Stable recurring method | Skill | Repeating a long prompt |
| Recurrence preserving one conversation | In-task scheduled task | Fresh runs that lose required context |
| Independent recurring runs | Standalone scheduled task | An unbounded universal coordinator |
| Required repository behavior | Repository `AGENTS.md` | Globalizing project-specific rules |
| Required personal behavior across repositories | Global `AGENTS.md` | Generated memories |
| Frequently changing external data or actions | Connector or MCP tool | Copied external state |

## Dispatch brief

```text
Outcome:
Why it matters:
Scope:
Out of scope:
Sources and current state:
Dependencies:
Constraints and authority:
Done when:
Verification:
Return: result, evidence, changed files, checks, blockers, and follow-ups.
```

Name work after the desired outcome rather than `investigate` or `task-3`.

## Compact control board

Use a board only when it reduces coordination cost.

| Outcome | Status | Depends on | Next gate | Evidence |
| --- | --- | --- | --- | --- |
| Short outcome | queued, active, needs-attention, verifying, integrated, or blocked | Task or decision | Concrete next event | Task, PR, file, or report |

Update it only when state changes.

## Decision packet

```text
Decision needed:
Recommendation and why:
Alternatives:
Impact of each option:
Latest safe decision point:
What continues without the decision:
```

Escalate user intent, irreversible actions, external communication, security or privacy exposure, architectural commitments, scope expansion, and conflicting requirements. Resolve ordinary implementation choices within the authorized brief.

## Backpressure and verification

Treat verification and integration as the throughput limit. Reduce active work when reviews queue, conflicts rise, briefs overlap, or coordination costs exceed delivery.

Use independent checking when the result is consequential, difficult to inspect, or vulnerable to self-confirmation. Give the checker the goal, acceptance criteria, and raw artifact, not the maker's intended conclusion.

## Scheduled loops

Test the workflow manually before scheduling it. Define what each run inspects, what counts as change, what evidence it preserves, what it may do, what needs approval, when it notifies, and when it stops.

Keep the method in a skill and cadence in the scheduled task.

## Durable state

For important workstreams, keep a small reviewable artifact with the objective, definition of done, active workstreams, decisions, open loops, verified results, and next checkpoint. Keep code truth in its repository and never substitute generated Codex memories for required instructions.
