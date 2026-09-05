# source-control configuration

Team-tracked layer consumed by the `source-control@melodic-software` plugin. Key names, valid
values, and resolution order are defined upstream in
<https://github.com/melodic-software/claude-code-plugins/blob/main/plugins/source-control/reference/config-resolution.md>
— `pr_body_required_sections` under "The config surface". Keys not listed here fall through to
inference per that resolution order.

## pr_body_required_sections

Must stay in step with the section names the `pr-contract` composite reads. It runs as a step inside
`ci-status`, the single required check. A body missing `## Fix` or `## Verification` by name does not
turn that check red; the composite reports it with an advisory comment and the `needs-issue-linkage`
label. Listing a differently-named equivalent here sends an author straight into that advisory noise.

- Summary
- Fix
- Verification
- Related
