---
name: find-skill-candidates
description: Find evidence-backed opportunities to create or improve user-authored Codex skills by scanning a bounded window of local Codex session logs. Use explicitly when reviewing recent work for repeated workflows, skill friction, missed triggers, or reusable skill opportunities. Report recommendations only; do not modify skills.
---

# Find Skill Candidates

Review local Codex sessions for reusable workflow opportunities. Keep the workflow recommendation-only: do not create, edit, delete, disable, or move skills unless a later user request explicitly authorizes that separate change.

## Collect bounded evidence

1. Read the current request and applicable `AGENTS.md` instructions. Use the requested lookback window; otherwise use the previous rolling 24 hours.
2. Resolve this skill's directory from the loaded `SKILL.md`, then locate `scripts/collect_recent_sessions.py` relative to it. Do not assume a user name, home path, plugin cache path, operating system, or marketplace name.
3. Resolve an available Python 3 executable without installing one. Run the collector with the platform-appropriate shell syntax:

   ```text
   <python-3> <skill-directory>/scripts/collect_recent_sessions.py --hours 24
   ```

4. When the user identifies additional user-authored skill roots, pass each one as a separate `--skills-dir <path>` argument. The collector otherwise inspects the skills bundled beside this skill and the native user skill directory when it exists.
5. Read the collector output before drawing conclusions. Report missing directories, unavailable Python, or parse errors as limitations.
6. Keep collected evidence local to the task. Do not upload session excerpts or send them to an external connector.

The collector is read-only. It bounds record text and excerpt counts, ignores known static instruction and approval-review payloads, and redacts common credential forms before output.

## Evaluate candidates

Treat these as useful evidence:

- A stable workflow appears repeatedly across sessions or turns.
- The user repeats the same procedural instructions.
- An existing skill still requires recurring correction or workaround.
- A task nearly triggers an existing user-authored skill but its description or boundary is too narrow.
- A script, reference, template, or checklist would prevent repeated reconstruction.

Do not recommend a skill for a one-off task, vague frustration, unsupported speculation, or behavior better owned by `AGENTS.md`, native configuration, a hook, an automation, an MCP integration, or repository-local instructions.

## Apply repository and surface boundaries

- Prefer no recommendation over weak evidence.
- Separate new-skill candidates from updates to existing user-authored skills.
- Treat bundled, system, curated, administrator-managed, and unrelated marketplace skills as out of scope unless the user explicitly includes them.
- Keep automation timing, cadence, and notifications out of skill content.
- Keep proposed skill names lowercase, hyphenated, under 64 characters, and preferably verb-led.
- Put trigger conditions in the proposed description and detailed procedure in the body.
- If scope or ownership remains material, recommend a discussion instead of drafting a complete skill.

## Report

When candidates exist, report:

- **Candidate:** proposed skill name or existing skill target.
- **Type:** new skill or update.
- **Confidence:** high, medium, or low.
- **Evidence:** bounded session-derived signals with dates or counts when available.
- **Proposed content:** concise capability and resource boundary.
- **Reason not applied:** this workflow is recommendation-only.

When no strong candidate exists, say so briefly.
