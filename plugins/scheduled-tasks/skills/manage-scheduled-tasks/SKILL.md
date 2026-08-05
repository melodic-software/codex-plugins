---
name: manage-scheduled-tasks
description: Explain, recommend, list, inspect, create, update, pause, resume, or delete native Codex Scheduled tasks. Use when a user asks about recurring work, reminders, monitors, scheduled follow-ups, the Scheduled page, a task that should return to the current chat, or a standalone task that should start a new chat for each run.
---

# Manage Scheduled Tasks

Manage Scheduled tasks through the current native Codex capability. Do not
implement scheduling, persistence, or configuration in this plugin.

## Current-contract preflight

Complete this preflight on every invocation, including read-only requests:

1. Read the current request and authorization. When a repository is involved,
   inspect the active `AGENTS.md` chain and only the relevant repository
   evidence.
2. Search the active tool catalog for the native capability whose current
   description explicitly covers Scheduled tasks, recurring runs, reminders,
   follow-ups, or monitors. Read its full description and input schema before
   deciding what operations are available. Do not depend on a remembered tool
   name or argument shape.
3. Refresh the official [Scheduled tasks documentation](https://learn.chatgpt.com/docs/automations).
   Prefer an available OpenAI documentation or Codex-manual helper that verifies
   upstream freshness on this invocation; otherwise fetch the live page
   directly. Do not use bundled documentation or model memory as a substitute.
4. Use only the user-facing terminology in the current documentation. If the
   documentation and active tool disagree, report the discrepancy and use the
   narrower verified tool behavior for the current environment.

If current documentation cannot be verified, stop before changing Scheduled
state. If no native Scheduled management capability is available, provide
read-only guidance from the verified documentation and direct the user to
**Scheduled** in ChatGPT web or the desktop app.

## Choose the destination

- Choose a **scheduled task inside the current chat** when future runs should
  return to this conversation and use its existing context. Prefer this for
  follow-ups, polling, reminders, and continuation loops discussed here.
- Choose a **standalone scheduled task** when each run should start from its
  saved prompt and report separately in **Scheduled**. Prefer this for
  independent reports or recurring project work.

Infer the destination when the request and current context make it clear. Ask
one concise question only when the choice would materially change the result.
Never silently change an existing task's destination.

## Perform the requested operation

- **Explain or recommend:** Use the refreshed documentation and current tool
  capabilities. Do not change state.
- **List:** Prefer a native list operation. If none exists, use only a read-only
  discovery mechanism explicitly documented by the active tool. Do not guess a
  personal directory layout or scan unrelated user data. If neither mechanism
  exists, explain the limitation and point to **Scheduled**.
- **Inspect:** Resolve the exact task through native list, search, or view
  support. Ask the user to disambiguate matches before proceeding.
- **Create:** Draft a durable prompt that states what each run should do, what
  warrants a report, when to stop, and when to ask for input. Resolve the
  cadence, destination, and any supported project or execution environment.
- **Update:** View the existing task first. Preserve every field the user did
  not ask to change, and supply the complete update shape required by the
  current tool.
- **Pause or resume:** Resolve and view the task before changing its status.
- **Delete:** Resolve the exact task, summarize what will be removed, and obtain
  confirmation immediately before deletion.

Use the native Scheduled tool for all state changes. Do not edit configuration
or task files, invoke an undocumented endpoint, or construct a CLI or scheduler
workaround.

## Preview and verify changes

Before a state change, show the resolved task name, purpose, human-readable
cadence, destination, and any supported project, execution environment, model,
reasoning, notification, or status choices that materially affect behavior.
Keep recurrence syntax internal when the tool requires it.

Scheduled tasks run unattended. Call out filesystem, network, connector, or
broad sandbox access when relevant, and prefer the narrowest supported access.
For repository changes, explain the isolation tradeoff between a worktree and
the active project without overriding repository policy.

After a state change, use native view or list support to verify the saved task.
Report what changed, its next run when available, where results will appear, and
any limitation the current tool exposed.
