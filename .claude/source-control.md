# source-control configuration

Team-tracked layer consumed by the `source-control@melodic-software` plugin. Key names, valid
values, and resolution order are defined upstream in
<https://github.com/melodic-software/claude-code-plugins/blob/main/plugins/source-control/reference/config-resolution.md>
— `pr_body_required_sections` under "The config surface". Keys not listed here fall through to
inference per that resolution order.

## pr_body_required_sections

Must stay in step with what the `pr-issue-linkage / pr-issue-linkage` required check enforces
(`.github/workflows/pr-issue-linkage.yml`, which calls `ci-workflows`' reusable). That gate rejects a
body missing `## Fix` or `## Verification` by name, so listing a differently-named equivalent here
sends an author straight into a red required check.

- Summary
- Fix
- Verification
- Related
