# Live upstream source map

This file is a maintained navigation index. It is not a cached specification,
a bibliography to reproduce, or permission to copy upstream prose. Open the
relevant live pages before acting, record the URLs and verification date in the
pull request, and keep only repository-owned decisions in this repository.

## Required OpenAI sources

Read the smallest complete set that covers the affected surface.

| Surface | Live pointer |
| --- | --- |
| Plugin overview and builder routing | [Build plugins](https://learn.chatgpt.com/docs/build-plugins) |
| Skill and plugin distinction and explicit invocation | [Skills and plugins](https://learn.chatgpt.com/docs/skills-and-plugins) |
| Built-in image generation and `$imagegen` invocation | [Image generation](https://learn.chatgpt.com/docs/image-generation) |
| Plugin boundaries and component model | [Plugin architecture](https://developers.openai.com/plugins/concepts/plugins) |
| Skill format, triggers, resources, and tests | [Build skills](https://developers.openai.com/plugins/build/skills) |
| Skill loading, distribution, and the `agents/openai.yaml` keys `interface`, `policy`, and `dependencies` | [Build skills for Codex](https://learn.chatgpt.com/docs/build-skills) |
| MCP tools, authentication, and server behavior | [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server) |
| Optional MCP-backed UI | [Add optional UI](https://developers.openai.com/plugins/build/chatgpt-ui) |
| Manifests, paths, marketplaces, and packaging | [Package plugins and marketplaces](https://developers.openai.com/plugins/build/plugins) |
| Local connection and behavioral testing | [Connect and test plugins](https://developers.openai.com/plugins/deploy/connect-chatgpt) |
| Durable repository instruction discovery | [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) |
| Lifecycle extension and trust | [Hooks](https://learn.chatgpt.com/docs/hooks) |
| Installation and supported plugin surfaces | [Use plugins](https://learn.chatgpt.com/docs/plugins) |
| Installed CLI inventory and `/skills` or `/plugins` behavior | [Codex CLI command reference](https://learn.chatgpt.com/docs/developer-commands.md?surface=cli) |
| Scheduled task behavior and management | [Scheduled tasks](https://learn.chatgpt.com/docs/automations) |
| Native import behavior from another agent | [Import from another agent](https://learn.chatgpt.com/docs/import) |
| Sandbox, approvals, and action boundaries | [Agent approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security) |
| Native project instruction and configuration discovery | [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced) |

The marketplace is public and Git-backed, but it is not submitted to OpenAI's
universal public directory. Keep [submission requirements](https://developers.openai.com/plugins/deploy/submission)
as a pointer for compatibility review only unless repository policy changes.

## Normative ecosystem contracts

Use these when a component relies on the corresponding open standard. Agent
Plugins is the packaging contract that compatible clients load; Agent Skills and
the Model Context Protocol are the separate component contracts it packages, and
reading one does not cover a claim that rests on another:

- [Agent Plugins specification](https://agent-plugins.org/specification)
- [Agent Skills specification](https://agentskills.io/specification)
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/latest)

OpenAI's current product contract still controls how Codex packages, discovers,
trusts, and runs those components.

## Official implementation evidence

Use public implementations to test assumptions after reading the product
contract. Treat examples as evidence, not templates to copy blindly:

- [OpenAI plugins](https://github.com/openai/plugins)
- [OpenAI skills](https://github.com/openai/skills)

## Source-host documentation for migrations

Read the current official source-host documentation for every migrated
component and record the exact pages in the migration pull request:

- [Claude Code documentation](https://code.claude.com/docs/en/overview)
- [Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [Cursor documentation](https://cursor.com/docs)
- [Cursor plugins](https://cursor.com/docs/plugins)

If a source host moves a page, update this index in the same change that relies
on the new location. Do not use third-party tutorials to establish a host
contract when official documentation exists.

## Engineering design pointers

Use these only when the architecture decision they address is material. They do
not override Codex documentation:

- [Hexagonal architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [The Twelve-Factor App: configuration](https://12factor.net/config)
- [Semantic Versioning](https://semver.org/)

## Freshness and failure rules

- Fetch live pages for every plugin action covered by `AGENTS.md`; do not rely
  on this index alone.
- Record URLs and the date checked, not quotations or copied examples.
- Verify CLI syntax with the installed release when commands are involved.
- When a pointer is unavailable, search only the upstream owner's official
  properties before using another source.
- When the current target contract remains uncertain, stop the contract change
  and record the unresolved question. Do not turn an assumption into policy.
- Review this index whenever a plugin surface changes and during each migration.
