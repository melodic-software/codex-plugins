# Classification rubric for Codex release-note items

Each item gets one lens per owner surface it touches. A lens says what the
repository should do about one of its components, not how important the item
is.

| Lens | Meaning | Required sentence |
| --- | --- | --- |
| correct | A component states or relies on something the release made false: a removed command, skill, flag, or config key; a changed path, event, or default. Scripts, tests, and fixtures that encode the claim count, not only prose. | The claim as the component states it, and as the release states it. |
| replace | Codex now ships natively what a component builds by hand. | The problem the component solves, so the reader can judge whether the native surface solves the same one. |
| adopt | The item removes a workaround the repository carries or supplies something it lacks. | The problem the item solves for that component. |
| note | Worth knowing; changes no component. | None; one line under the table. |
| skip | Cosmetic, internal, or about a surface the repository does not have. | None; counted in the read summary only. |

`replace` reports; retiring a component is a separate decision. An `adopt` row
whose behavior the release note alone describes reads **defer** until a live
docs page states it or a local run shows it.

## What affects plugin and repository authors

Check items in these areas against the surfaces `discover_surfaces.py` printed.
They are where release notes most often change a repository's components:

- **Plugins and marketplaces:** manifest locations and fields, marketplace
  sources and policy fields, install, upgrade, and import commands, and
  manifests Codex reads from other hosts.
- **Skills:** discovery locations, `SKILL.md` and `agents/openai.yaml` keys,
  invocation and namespacing, and bundled or system skills that are added or
  removed.
- **Hooks:** events, configuration keys, trust and approval behavior, and
  payload shape.
- **MCP and apps:** server configuration, transports, authentication, and
  plugin `.mcp.json` or `.app.json` handling.
- **Configuration and instructions:** `config.toml` keys, profiles, and
  `AGENTS.md` discovery, overrides, and size limits.
- **CLI surface:** removed or renamed commands and flags that scripts, CI, docs,
  or tests invoke.
- **Sandbox and approvals:** changes that alter what a skill's scripts may do
  without a prompt.

## Defaults for the rest

- An item a component already states correctly is a note reading "already
  reflected" with the path, so a re-read range shows it was checked.
- A security fix is never skip. Check it against the repository's trust and
  approval guidance; the result is correct, adopt, or note.
- A removal or deprecation of something the repository uses is correct; of
  something it does not use, skip.
- An experimental feature is note, unless it solves a problem a component works
  around, which is adopt with defer.
- Terminal UI, model availability, app-server client APIs, and platform fixes
  are skip unless a surface names them.

## Source precedence

The release note is the newer statement of behavior; the live documentation
page stays the authority for syntax and shape. A row that rests on a release
note the docs do not yet reflect cites the release, names the disagreement, and
adds the pair to the docs-lag list. A docs-lag pair is never a decision row.
