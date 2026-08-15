# Codex capability cheat sheet

<!-- markdownlint-disable MD013 -->

Quick reference for choosing and explicitly invoking Codex skills. This is a
user-facing snapshot, verified on 2026-08-05 against the live official docs and
the installed Codex CLI. Availability can vary by release, plan, workspace,
platform, and installed plugins.

## The short version

| Kind | What it is | Codex invocation |
| --- | --- | --- |
| Built-in system skill | A user-facing skill shipped with Codex; no plugin install is needed | `$skill-name` |
| Official bundled or runtime plugin | An OpenAI plugin shipped or made available with the Codex environment | `$plugin-name:skill-name` |
| Curated directory plugin | An installable OpenAI or partner plugin; it may require authentication | `$plugin-name:skill-name` after install |
| Personal or team marketplace plugin | An installable bundle from a configured marketplace such as this repository | `$plugin-name:skill-name` after install |

Natural language is usually enough: Codex can select an enabled skill when the
request matches its description. Add the `$` mention when the exact workflow
matters. In Codex CLI, `/skills` browses skills and `/plugins` browses plugins.
After installing a plugin, start a new task or CLI session so its skills are
discovered.

## Built-in system skills

These are the user-facing system skills available in the verified Codex
environment. They are skills, not plugins.

| Capability | Natural-language request | Explicit Codex request |
| --- | --- | --- |
| Image generation | `Create a wide illustrated banner for this README.` | `$imagegen Create a wide illustrated banner for this README.` |
| Official OpenAI docs | `Check the current official Codex docs and explain how hooks work.` | `$openai-docs Check the current official Codex docs and explain how hooks work.` |
| Plugin creation | `Create a Codex plugin for this reusable workflow.` | `$plugin-creator Create a Codex plugin for this reusable workflow.` |
| Skill creation | `Turn this repeated release checklist into a skill.` | `$skill-creator Turn this repeated release checklist into a skill.` |
| Skill installation | `Install the skill from openai/skills.` | `$skill-installer Install the skill from openai/skills.` |

`$imagegen` is the important special case: it is built-in image generation,
not an image-generation marketplace plugin. Attach or identify reference images
and state what must change and what must remain fixed when editing.

## Official bundled and runtime plugins

The following plugins were installed and enabled in the verified environment.
Use the exact namespaced skill identifier shown below when invoking one
explicitly.

| Plugin capability | Natural-language request | Explicit Codex request |
| --- | --- | --- |
| In-app browser | `Open the local app in the in-app browser and test sign-in.` | `$browser:control-in-app-browser Open the local app and test sign-in.` |
| Chrome | `Use my existing Chrome session to check the signed-in dashboard.` | `$chrome:control-chrome Check the signed-in dashboard.` |
| Windows computer use | `Open the Windows app and update the setting.` | `$computer-use:computer-use Open the Windows app and update the setting.` |
| Word documents | `Create and visually verify a Word report from these notes.` | `$documents:documents Create and visually verify a Word report from these notes.` |
| PDFs | `Inspect this PDF form and summarize its fields.` | `$pdf:pdf Inspect this PDF form and summarize its fields.` |
| Spreadsheet files | `Create and verify an XLSX budget workbook.` | `$spreadsheets:Spreadsheets Create and verify an XLSX budget workbook.` |
| Live Excel | `Update the open Excel workbook and preserve its formulas.` | `$spreadsheets:excel-live-control Update the open workbook and preserve its formulas.` |
| Presentations | `Create a PowerPoint deck from this outline.` | `$presentations:Presentations Create a PowerPoint deck from this outline.` |
| Artifact templates | `Turn this approved deck into a reusable personal template skill.` | `$template-creator:template-creator Turn this approved deck into a reusable template skill.` |
| Build a Site | `Build a hosted project intake dashboard with Sites.` | `$sites:sites-building Build a project intake dashboard.` |
| Host a Site | `Publish the reviewed Sites project and return its URL.` | `$sites:sites-hosting Publish the reviewed project and return its URL.` |
| Visualizations | `Make an interactive chart for these scenarios.` | `$visualize:visualize Make an interactive chart for these scenarios.` |

Surface support still matters. For example, interactive Visualizations and
Sites management require a supported ChatGPT surface even when the skill is
visible to Codex. Prefer purpose-built connectors or APIs over browser or
computer control when they expose the same operation safely.

## Official plugins that are available, not built in

The OpenAI-curated directory is intentionally not copied into this file: it is
large, changes independently, and can differ by account. Browse it with
`/plugins`, or inspect it with:

```powershell
codex plugin list --available --json
codex plugin marketplace list --json
```

At verification time, the official bundled marketplace also offered the
uninstalled `latex` plugin. Install it before using skills such as
`$latex:latex-doctor` or `$latex:latex-compile`:

```powershell
codex plugin add latex@openai-bundled
```

Partner connectors, Codex Security, and other OpenAI-curated entries are
plugins, not built-in system skills. Installation, authentication, policy, and
surface availability determine whether their skills and tools can run.

## This marketplace

These are personal-marketplace plugins from `melodic-software/codex-plugins`,
not OpenAI built-ins.

| Plugin | Explicit examples |
| --- | --- |
| `plugin-ops` | `$plugin-ops:install-marketplace`, `$plugin-ops:update-plugins`, `$plugin-ops:verify-plugin`, `$plugin-ops:migrate-plugin` |
| `codex-operations` | `$codex-operations:coordinate-codex-work`, `$codex-operations:find-skill-candidates` |
| `scheduled-tasks` | `$scheduled-tasks:manage-scheduled-tasks` |
| `humanize` | `$humanize:humanize` |

## Keep the snapshot current

Use live product state instead of treating this page as an entitlement list:

```powershell
codex plugin list --json
codex plugin list --available --json
codex plugin marketplace list --json
```

When this snapshot changes, update the tables and the verification date. Keep
the full dynamic plugin directory out of the repository.

## Official pointers

- [Skills and plugins](https://learn.chatgpt.com/docs/skills-and-plugins)
- [Image generation](https://learn.chatgpt.com/docs/image-generation)
- [Use plugins](https://learn.chatgpt.com/docs/plugins)
- [Codex CLI command reference](https://learn.chatgpt.com/docs/developer-commands.md?surface=cli)
- [Build skills](https://developers.openai.com/plugins/build/skills)
- [Package plugins and marketplaces](https://developers.openai.com/plugins/build/plugins)
