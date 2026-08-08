---
name: humanize
description: Revise pasted writing or text-bearing files for natural, specific, context-aware prose while preserving meaning, evidence, citations, formatting, and the writer's legitimate voice. Use when a user asks to humanize, naturalize, de-AI, polish, rewrite, or audit formulaic writing in documents, Markdown, emails, articles, reports, comments, docstrings, or other prose-bearing artifacts. Do not use for a pure authorship-classification request with no editing goal.
---

# Humanize

Revise the writing itself, not merely a word list. Improve substance, specificity,
structure, rhythm, register, and formatting while retaining the writer's real
meaning and useful irregularities.

## Discover the governing context

Inspect only the context relevant to the requested writing, in this order:

1. Read the explicit request, target paths, audience, destination, exemplars,
   and requested edit mode.
2. When a repository is involved, read the active `AGENTS.md` chain from its
   root to the target's directory.
3. Inspect relevant repository-owned style guides, brand or voice guidance,
   contribution rules, lint configuration, adjacent documents, and established
   destination conventions.
4. Apply user-, team-, or company-supplied exemplars without inferring private
   preferences from publisher metadata or unrelated machine state.
5. Use the generic rubric only where more specific authorized context is silent.

Surface a material conflict instead of silently overriding a higher-precedence
instruction. Infer audience, genre, and formality when the artifact makes them
clear. Ask one concise question only when the missing choice would materially
change the result. If the request says only "for publication," "professional,"
"on brand," or "make it better" without identifying the audience, destination,
or applicable exemplar, ask which audience or destination to target before
revising. Do not silently choose among plausible registers, terminology,
formatting, or structures.

## Select the edit mode

Honor an explicit `review-only`, `return-text`, `copy`, or `in-place` request.
Otherwise choose the quietest logical default:

- For pasted text, return the revision in the conversation.
- For a tracked file in a version-controlled repository, edit it in place when
  the request authorizes a change.
- For an untracked or non-versioned file, create a sibling named
  `<stem>.humanized<ext>`. If it exists, use `.humanized-2`, then the next
  available integer. Do not overwrite the source implicitly.
- For multiple files, decide per file and keep every write within the requested
  scope.
- For a structured or binary format, use an available format-aware capability
  that preserves structure. If none is available, stop with an actionable
  unsupported result instead of performing a lossy conversion.
- For a read-only request, report findings without changing files.

Before editing a mixed artifact, separate prose from code, frontmatter, schemas,
commands, identifiers, markup, citations, and generated data. Edit protected
regions only when the user explicitly includes them.

## Run the complete revision

Read all of [references/revision-rubric.md](references/revision-rubric.md)
before every full audit or revision. Apply every applicable criterion; do not
replace the matrix with a short checklist or a detector score.

1. Establish the document's purpose, audience, genre, destination, desired
   action, voice, and current strengths.
2. Record invariants: factual claims, the writer's intended position,
   evidence, names, numbers, dates, modality, uncertainty, quotations, citations,
   links, terminology, obligations, structural hierarchy, and intentional
   stylistic choices. Preserve clearly framed personal or organizational opinion,
   satire, and authorized brand voice. Treat substantive source claims as
   invariants even when the artifact does not include a citation. Do not infer
   that a claim is unsupported merely because no source was supplied. Generic
   promotional filler and formulaic significance tails are not invariants.
3. Audit the entire artifact against each applicable rubric row. Treat clusters
   and context-sensitive signals as prompts for judgment, not banned forms.
4. Rewrite substance first. Remove generic reasoning, formulaic significance,
   promotional inflation, canned structure, chat leakage, and platform artifacts.
   Prefer clear actors, precise verbs, concrete relationships, and paragraph
   movement that follows the actual thought.
5. Preserve heading levels, list and table semantics, paragraph order, and other
   structural choices by default. Reorganize only when the user authorizes a
   structural rewrite or the current structure is itself an applicable rubric
   defect. Do not invent anecdotes, emotions, opinions, credentials, testimonials,
   facts, evidence, or sources.
6. Remove generic filler. Preserve substantive fact-like, causal, quantitative,
   and significance claims unless the user requests fact-checking or available
   evidence establishes a defect; flag them for author verification when support
   is needed. When concrete information is followed by generic benefits or a
   formulaic significance tail, retain the concrete information and omit only the
   empty framing. Preserve clearly framed opinion and authorized voice. Flag a
   content gap when specificity is unavailable.
7. Preserve legitimate dialect, second-language traits, neurodivergent style,
   technical vocabulary, formality, passive voice, repetition, fragments, long
   sentences, headings, and punctuation when they serve the artifact.
8. Compare source and revision. Recheck every invariant and repair semantic
   drift, citation damage, format breakage, unsupported confidence, or unresolved
   placeholder introduced or left behind.

Do not add typos, random slang, arbitrary fragments, punctuation noise, or
mechanical sentence-length variation to simulate naturalness. Do not decide
authorship from style or report an AI probability.

## Return the result

For writes, identify each changed or created file and summarize material
editorial decisions. For returned text, provide the clean revision first. In
either mode, list only unresolved facts, citations, placeholders, or context
questions that need the writer's attention. Keep the report proportional to the
artifact and do not restate the rubric.
