# Humanize revision rubric

Use this matrix for a complete revision. Evaluate every row that applies to the
artifact and destination. A match is a reason to inspect the writing, not proof
of how it was produced. Fix the underlying editorial problem; do not mechanically
swap words or add random variation.

## Contents

- [Handling classes](#handling-classes)
- [Context and invariants](#context-and-invariants)
- [Substance and reasoning](#substance-and-reasoning)
- [Diction and rhetoric](#diction-and-rhetoric)
- [Discourse and structure](#discourse-and-structure)
- [Formatting and typography](#formatting-and-typography)
- [Draft and interface leakage](#draft-and-interface-leakage)
- [Markup and platform artifacts](#markup-and-platform-artifacts)
- [Citations and source integrity](#citations-and-source-integrity)
- [Comments, summaries, and history](#comments-summaries-and-history)
- [Human variation and ineffective indicators](#human-variation-and-ineffective-indicators)
- [Historical patterns](#historical-patterns)
- [Final verification](#final-verification)
- [Research basis](#research-basis)

## Handling classes

| Class | Meaning | Default handling |
| --- | --- | --- |
| Provenance artifact (`P`) | Interface or generator residue that does not belong in the finished artifact. | Remove or repair after confirming it is not destination syntax. |
| Objective defect (`Q`) | A correctness, support, clarity, or format problem regardless of origin. | Fix; flag when required evidence is unavailable. |
| Contextual tendency (`C`) | A pattern that becomes a problem through density, repetition, or genre mismatch. | Revise only when the local context supports it. |
| Weak indicator (`W`) | A common human construction that should not drive revision by itself. | Preserve unless another editorial reason applies. |
| Historical pattern (`H`) | A pattern associated mainly with older systems or interfaces. | Inspect as ordinary prose; remove only when it is a real defect. |

Source keys used in the matrix: `WAI` Wikipedia advice page; `ISO` ISO plain
language; `DIG` Digital.gov; `CDC` CDC Clear Communication; `GOV` GOV.UK tone;
`MS` Microsoft style; `PNAS` register study; `ACL` discourse study; `SA` excess
vocabulary study; `NIST` synthetic-text detection report; `PAT` non-native false
positive study; `TACL` detector robustness study; `CORE` repository-owned
semantic-integrity and revision rules synthesized from the complete source set.

## Context and invariants

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| CTX-01 Audience and purpose | Q | Can the intended reader, purpose, channel, and desired action be inferred? | Put the information in the order that reader needs; ask only if a material choice remains. | Intended outcome and required detail. | ISO, DIG, CDC |
| CTX-02 Genre and register | Q | Does the prose sound like the actual genre rather than a generic essay? | Match the destination's formality, stance, density, and conventions. | Legitimate domain register. | GOV, MS, PNAS |
| CTX-03 Voice evidence | Q | Are explicit instructions, style guides, adjacent material, or exemplars available? | Derive observable traits such as directness, vocabulary, contractions, humor, and paragraph movement. | Writer identity and authorized preferences. | MS, PNAS |
| CTX-04 Semantic invariants | Q | Identify source claims, actors, dates, numbers, modality, uncertainty, quotations, citations, links, obligations, and structural hierarchy; separate substantive claims from generic filler and formulaic significance tails. Do not infer that an uncited source claim is unsupported. | Maintain a before-and-after invariant check. Preserve substantive claims unless fact-checking or available evidence establishes a defect; remove empty promotional framing while preserving clearly framed opinion, satire, and authorized brand voice. | Every protected fact, relationship, intended position, and meaningful structural choice. | ISO, CDC |
| CTX-05 Protected regions | Q | Does the artifact mix prose with code, commands, markup, frontmatter, schemas, identifiers, or generated data? | Edit only prose-bearing regions unless the request includes the others. | Executable and machine-readable structure. | DIG, MS |
| CTX-06 Unsupported specificity | Q | Would a more concrete rewrite require facts the source does not contain? | Flag the gap or retain qualified abstraction; never manufacture an example. | Epistemic limits. | CDC, WAI |

## Substance and reasoning

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| SUB-01 Regression to genericness | Q/C | Has specific, unusual material been replaced by broad praise or abstraction? | Restore concrete actors, actions, constraints, evidence, and consequences found in the source. | Valid generalization when it is the actual point. | WAI |
| SUB-02 Inflated significance | Q/C | Does an ordinary fact become pivotal, enduring, historic, transformative, or symbolic without support? | State the fact and evidenced consequence directly; remove the unsupported importance claim. | Supported significance and attribution. | WAI |
| SUB-03 Forced broader context | Q/C | Is a local detail linked to sweeping social, cultural, economic, or historical trends? | Keep only a relationship demonstrated by the source or necessary to the argument. | Relevant, sourced context. | WAI |
| SUB-04 Canned debate | Q/C | Is the subject automatically placed in a broad debate about identity, dignity, memory, authenticity, or society? | Name the actual disagreement, participants, and evidence or delete the generic frame. | Real controversy and nuance. | WAI |
| SUB-05 Generic ecology or conservation | Q/C | Does a species or place receive stock ecosystem, threat, research, or preservation language? | Report known status, function, threat, or uncertainty specifically. | Accurate conservation terminology. | WAI |
| SUB-06 Canned notability claim | Q/C | Does the prose announce media prominence rather than explain substantive coverage? | Summarize what reliable sources actually report and why it matters to the topic. | Necessary source attribution. | WAI |
| SUB-07 Source-type name-dropping | Q/C | Do outlet lists or labels such as prominent, independent, national, or trade replace content? | Integrate the sourced claim; remove résumé-like source accumulation. | Source names needed for attribution. | WAI |
| SUB-08 Social-presence boilerplate | Q/C | Is a person or organization praised for an active digital presence or engaging content? | Replace with a concrete, relevant fact or remove it. | Material platform activity. | WAI |
| SUB-09 Superficial analysis tail | Q | Does a fact end with an unsupported clause saying it highlights, reflects, ensures, fosters, or demonstrates something? | Delete the tail or substantiate the relationship with evidence. | Causal interpretation actually present in the source. | WAI, PNAS |
| SUB-10 Source laundering | Q | Is the writer's inference attributed to a source that does not make it? | Recheck the passage; quote, paraphrase accurately, or label the inference as analysis. | Source meaning and uncertainty. | WAI |
| SUB-11 Promotional or travel register | Q/C | Does the text use scenic, immersive, gateway, vibrant, renowned, elegant, or carefully crafted sales language? | Replace promotion with concrete description appropriate to the destination. | Brand language when explicitly required. | WAI, GOV |
| SUB-12 Heritage puffery | Q/C | Is culture reduced to a rich tapestry, living legacy, vital heritage, or window into tradition? | Name the practice, participants, history, and present function. | Community terminology and supported value. | WAI |
| SUB-13 Corporate press-release prose | Q/C | Are innovation, excellence, commitment, customer focus, craftsmanship, or sustainability used as generic filler or fact-like claims without expected support? | Convert factual claims into attributable actions, metrics, or documented policies; remove filler. | Clearly framed opinion and approved brand voice. | WAI, GOV |
| SUB-14 Vague authority | Q | Are claims assigned to experts, critics, observers, reports, researchers, or scholars without identification? | Name the authority and claim or remove the attribution. | Appropriate anonymization. | WAI, CDC |
| SUB-15 Quantity inflation | Q | Does one source become several, many, widely, scholarship, or broad consensus? | State the supported quantity and scope precisely. | Legitimate synthesis across verified sources. | WAI |
| SUB-16 Formulaic challenge-future arc | Q/C | Does the ending move mechanically from praise to generic challenges to optimistic adaptation? | End with the argument's actual consequence, unresolved issue, or next action. | Specific risks and plans. | WAI |
| SUB-17 Challenge language alone | W | Is only the ordinary word challenge present without the canned arc? | Leave it unless a more precise term helps. | Natural phrasing. | WAI |
| SUB-18 Title treated as entity | Q/C | Does a list, edition series, or broad article title get defined as though it were a standalone object? | Lead with what the page or section actually contains. | Required destination terminology. | WAI |

## Diction and rhetoric

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| LEX-01 Dense model-associated vocabulary | C | Do clusters of additionally, underscore, landscape, tapestry, pivotal, crucial, vibrant, intricate, enduring, robust, showcase, enhance, foster, align, highlight, emphasize, garner, interplay, testament, or valuable flatten the voice? | Replace only where a plainer or more exact word fits; revise the surrounding reasoning. | Literal and technical uses. | WAI, SA |
| LEX-02 Era-sensitive vocabulary | C/H | Does the document rely heavily on older ornate words or later alignment/showcase vocabulary? | Judge density and genre fit, not the individual word. | Historically or technically apt terms. | WAI, SA |
| LEX-03 Model-sensitive scientific wording | C | Are causal, empirical, correlate, underscore, or similar terms used to simulate rigor? | Require the actual relationship, method, or evidence. | Correct scientific usage. | WAI |
| LEX-04 Literal-context exception | W | Is a watched word used in its ordinary precise sense? | Keep it. Do not penalize synonyms by association. | Technical accuracy. | WAI |
| LEX-05 Copula avoidance | C | Are simple is, are, or has statements inflated into serves as, stands as, operates as, represents, features, offers, or maintains? | Prefer the direct construction when it improves precision. | Deliberate aspect or role distinction. | WAI, PNAS |
| LEX-06 Elaborate role wording | C | Is a simple role turned into ventured into, began a career as, or a marketing verb? | Name the role or action directly. | Necessary chronology. | WAI |
| LEX-07 Metalinguistic lead | C | Does refers to discuss a thing as though discussing only its term? | Define or describe the thing directly. | Genuine terminology discussions. | WAI |
| LEX-08 Nominalization density | C | Are actions hidden in strings of nouns such as implementation, enhancement, facilitation, or optimization? | Restore actors and strong verbs where doing so clarifies responsibility. | Established technical nouns. | PNAS, DIG |
| LEX-09 Participial tail density | C | Do repeated -ing clauses append generic interpretation to facts? | Split, substantiate, or remove the clause. | Clear temporal or causal relationships. | PNAS, WAI |
| LEX-10 Negative parallelism | C/W | Does the prose repeatedly correct misconceptions the reader was never given? | State the positive claim directly. | A real contrast under discussion. | WAI |
| LEX-11 Not only or not just | C/W | Do repeated not only, not just, does not just, or however frames manufacture importance? | Keep the strongest direct claim or specify the real contrast. | One purposeful contrast. | WAI |
| LEX-12 Not X but Y | C/W | Are portal, mirror, bridge, or identity antitheses repeated for effect? | Replace with the concrete relationship. | Memorable phrasing that fits the voice. | WAI |
| LEX-13 Rather than contrast | C/W | Does X rather than Y appear as a repeated rhetorical template? | Use it only when the distinction is necessary. | Accurate comparison. | WAI |
| LEX-14 Rule of three | C/W | Are ideas repeatedly packaged into three adjectives, nouns, or short clauses? | Use the number the content requires; merge overlapping items. | Natural triads and parallelism. | WAI |
| LEX-15 Excessive elegant variation | C | Are clear repeated terms replaced by unnecessary synonyms? | Repeat the precise term when reference matters. | Deliberate variation that avoids ambiguity. | WAI |
| LEX-16 Educational variation exception | W | Could synonym variation reflect a writer's education, language background, or separately written passages? | Preserve the voice unless clarity suffers. | Second-language traits. | WAI, PAT |
| LEX-17 Booster and hedge balance | C | Are vague boosters excessive, or has all ordinary hedging been scrubbed away? | Calibrate confidence to evidence; use natural perhaps, tends to, likely, or very when accurate. | Genuine stance. | PNAS, WAI |
| LEX-18 Canned empathy or call to action | C | Does the prose open with formulaic reassurance or close with a generic invitation? | Replace with context-specific acknowledgment or action. | Necessary support language. | MS, GOV |
| LEX-19 Agentless passive voice | C | Does passive voice hide who acts, decides, owns, or is responsible? | Name the actor and use active voice when it improves accountability; retain passive voice when the actor is unknown, immaterial, or deliberately backgrounded. | Useful passive constructions. | DIG, GOV, MS |
| LEX-20 Unfamiliar vocabulary and jargon | Q/C | Does the audience have to decode insider terms, abbreviations, or inflated vocabulary? | Prefer familiar precise language; define necessary technical terms and abbreviations at first use. | Domain terminology the audience expects. | ISO, DIG, CDC, MS |

## Discourse and structure

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| STR-01 Canned introduction | C | Does the opening define obvious terms, preview every section, or announce significance before making a point? | Lead with the reader's need, claim, event, or decision. | Required abstract or executive summary. | WAI, DIG |
| STR-02 Preview-summary repetition | C | Does each section announce, explain, and restate the same point? | Keep the version that advances the argument; remove duplicate summaries. | Deliberate recap in long or instructional work. | WAI |
| STR-03 Identical paragraph arcs | C | Do paragraphs follow the same fact-plus-generic-meaning template? | Give each paragraph a distinct job and progression. | Parallel structure when comparing like items. | WAI |
| STR-04 Mechanical symmetry | C | Are sections forced into equal length, matching item counts, or repeated rhetorical scaffolds? | Let evidence and reader needs determine shape. | Useful comparison symmetry. | WAI |
| STR-05 Excessive headings | Q/C | Do headings fragment a short argument or substitute for transitions? | Combine related material and use headings only for navigation. | Accessibility and destination conventions. | DIG, WAI |
| STR-06 One-sentence sections | C | Are many headings followed by a single shallow sentence? | Merge or develop the idea when evidence exists. | Reference formats that require atomic sections. | WAI |
| STR-07 List replacing reasoning | Q/C | Is an ordered or bulleted list used where relationships and tradeoffs need prose? | Convert to prose or add the missing relationship. | Scan-friendly procedures and inventories. | DIG, CDC |
| STR-08 Overlong itemized answer | C | Does every point become a titled mini-essay? | Group by the reader's decision and remove redundant labels. | Complex reference material. | WAI |
| STR-09 Abrupt topic transition | Q | Does the draft jump between claims with formulaic transitions but no logical bridge? | Reorder or add the actual causal, temporal, or contrastive relationship. | Intentional juxtaposition. | CORE |
| STR-10 Generic conclusion | Q/C | Does the ending merely say overall, in conclusion, or in summary and repeat the opening? | End on the consequence, decision, limitation, or next step. | Required academic conclusion. | WAI |
| STR-11 Useful information design | W | Do descriptive headings, chunked sections, lists, or selective emphasis make the main message easier to find and act on? | Preserve them; improve labels or grouping only when the reader's path is unclear. | Accessible hierarchy, scanning, and main-message emphasis. | CDC, DIG |
| STR-12 Register-specific discourse pattern | C/W | Does the document use a discourse motif that fits another domain better than this genre? | Align rhetorical progression with the destination while retaining useful structural variation. | Genre-appropriate motifs and deliberate variation. | ACL, PNAS |

## Formatting and typography

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| FMT-01 Title Case headings | C | Do headings capitalize nearly every major word contrary to destination style? | Match the local heading convention. | Brand or publication requirements. | WAI |
| FMT-02 Mechanical boldface | Q/C | Are labels, keywords, conclusions, or repeated terms bolded by formula? | Keep emphasis only where it aids scanning or meaning. | Established semantic emphasis. | WAI |
| FMT-03 Inline-header vertical lists | C | Does every bullet begin with a bold mini-heading and colon? | Use direct bullets, prose, or a table according to the information. | Genuine definition lists. | WAI |
| FMT-04 Wrong list markers | Q/C | Are literal bullets, emoji, hashes, hyphens, or numbers pasted into incompatible markup? | Convert to native destination syntax. | Content order and nesting. | WAI |
| FMT-05 Missing label punctuation | C/W | Do mini-headings run into descriptions without destination-standard punctuation? | Normalize only when it is a real readability issue. | Established discussion conventions. | WAI |
| FMT-06 Em-dash saturation or spacing mismatch | C/W | Are dashes repeatedly used for sales emphasis or parallel asides, or mechanically spaced where house style uses closed em dashes? Treat the pattern as more informative in conversational comments than polished article prose. | Choose commas, parentheses, colons, sentences, or destination-standard dash spacing where they fit better. | Intentional em dashes and house style. | WAI |
| FMT-07 Em dash alone | W | Is an em dash the only suspected issue? | Keep it. | Writer punctuation preference. | WAI |
| FMT-08 Emoji decoration | C/H | Do emoji decorate headings, bullets, timelines, invitations, or takeaways without audience value? | Remove or retain according to channel and voice. | Communities where emoji are normal. | WAI |
| FMT-09 Unnecessary small table | C/W | Are a few simple facts put into a table that impedes reading? | Use prose or an existing native component. | Comparable data that benefits from columns. | WAI, CDC |
| FMT-10 Curly punctuation | W | Are curly quotation marks or apostrophes the only concern? | Keep or normalize to house style. | Professional typography. | WAI |
| FMT-11 Mixed punctuation styles | C | Are straight and curly forms inconsistent within the artifact? | Normalize to destination convention without changing quoted content. | Literal code and source quotations. | WAI |
| FMT-12 Skipped heading levels | Q/C | Does the hierarchy jump levels or break accessibility? | Repair hierarchy while preserving section relationships. | Destination-specific structure. | WAI, CDC |
| FMT-13 Repeated thematic rules | C | Does every heading have a horizontal rule inherited from another format? | Remove rules that add no navigation value. | Required section separators. | WAI |

## Draft and interface leakage

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| LEAK-01 Assistant greeting or offer | P/Q | Does the deliverable contain of course, hope this helps, let me know, would you like, or here is a breakdown? | Remove interface conversation from the artifact. | Genuine correspondence voice. | WAI |
| LEAK-02 Instructions to the user | P/Q | Are paste, submit, delete, convert, upload, or placement directions left inside finished content? | Carry out the instruction or remove it from the deliverable. | Actual procedural documentation. | WAI |
| LEAK-03 Destination-policy coaching | P/Q | Does the artifact tell its author to comply with neutrality, sourcing, or submission rules rather than doing so? | Apply the rule and remove coaching text. | Policy documentation whose subject is the rule. | WAI |
| LEAK-04 Knowledge-cutoff disclaimer | Q/H | Does the text mention a last update or inability to know later events without a user-facing need? | Verify current facts or remove the disclaimer. | Time-bounded datasets and required as-of dates. | WAI |
| LEAK-05 Unsupported undocumented claim | Q | Does the text say information is not widely available, not public, or absent from results without evidence? | Verify the search scope or state only what is known. | Documented confidentiality. | WAI |
| LEAK-06 Failed-retrieval speculation | Q | Does missing information lead to guesses about likely facts, motives, private life, or themes? | Remove the guess or mark a specific verification need. | Clearly labeled, requested scenario analysis. | WAI |
| LEAK-07 Availability preamble | Q/C | Does based on available information introduce content without defining the evidence? | Begin with the supported claim and cite it. | Necessary scope statement. | WAI |
| LEAK-08 Fill-in-the-blank prose | P/Q | Are bracketed topic, person, link, source, date, language, or publisher fields unresolved? | Resolve from authorized evidence or flag them outside the clean revision. | Intentional templates. | WAI |
| LEAK-09 Placeholder citation metadata | P/Q | Do XX dates, INSERT, PASTE, SOURCE, or placeholder URLs remain? | Complete or remove the reference and flag the gap. | Explicit template source files. | WAI |
| LEAK-10 Future-work comments | C/W | Do comments request later additions that might be accidental drafting residue? | Remove when stale; preserve legitimate template guidance. | Maintainer comments. | WAI |
| LEAK-11 Report-outline residue | P/Q | Is a proposed outline, options list, or drafting plan mixed into the final artifact? | Execute the chosen structure and remove planning text. | Requested outline deliverables. | WAI |
| LEAK-12 Abrupt cutoff | Q/H | Does a sentence, list, code fence, citation, or section stop mid-thought? Check generation limits, malformed local copy/paste, incomplete imports, and possible copyright truncation. | Recover from authorized evidence or flag the missing source portion and any copyright concern. | Intentional excerpts with clear markers. | WAI |

## Markup and platform artifacts

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| MARK-01 Markdown in another destination | Q/C | Are hash headings, Markdown links, asterisks, rules, or fences invalid for the target? | Translate to native markup. | Markdown-native destinations. | WAI |
| MARK-02 Markdown alone | W | Is Markdown normal for the channel or repository? | Keep it. | Native source format. | WAI |
| MARK-03 Mixed Markdown and attempted destination syntax | P/Q | Are code fences, assistant prose, and malformed destination markup combined? | Extract the intended content and rebuild it in one valid syntax. | Legitimate documentation examples. | WAI |
| MARK-04 Broken markup or templates | Q/C | Are headings, braces, substitutions, parameters, or nesting malformed? | Validate and repair destination syntax. | Semantic structure. | WAI |
| MARK-05 OpenAI citation artifact | P | Do contentReference, oaicite, oai_citation, source-name `+1` or `+3` remnants, turn-search/file/news/image IDs, private markers, or attributableIndex JSON appear? | Remove the artifact and reconstruct a valid citation only from verified source data. | Verifiable source identity. | WAI |
| MARK-06 Gemini citation or span artifact | P | Do bracketed cite numbers or span start/end markers appear outside native syntax? | Remove residue and restore valid references. | Real numbered citations. | WAI |
| MARK-07 Grok card artifact | P | Do grok_card or grok_render_citation_card_json tags appear? | Remove residue and recover supported content. | None unless the destination defines it. | WAI |
| MARK-08 DeepSeek reference artifact | P | Do lenticular brackets, daggers, or line-number source fragments appear? | Convert only verified references to destination syntax. | Legitimate line citations in native format. | WAI |
| MARK-09 Perplexity attachment artifact | P | Do attached_file, web reference tokens, or ppl-ai upload URLs appear? | Remove interface tokens and use durable source links when available. | Valid attachments requested by the user. | WAI |
| MARK-10 Document-wrapper artifact | P | Do `:::writing` wrappers, variants, IDs, translated forms, or stray closing colons remain? | Remove wrapper syntax while preserving the content. | Destination-defined directives. | WAI |
| MARK-11 Hallucinated or obsolete category | Q/C | Is a plausible category nonexistent, redirected, stale, or irrelevant? | Verify against the destination and choose a valid category or none. | Existing valid taxonomy. | WAI |
| MARK-12 Hallucinated template or parameter | Q/C | Is an infobox, language template, field, or parameter invalid or a no-op? | Verify current schema and repair or remove it. | Valid destination components. | WAI |
| MARK-13 Encoding or conversion damage | Q | Did quotes, dashes, accents, line endings, or markup corrupt during editing? | Restore the original encoding and normalize only by destination policy. | Literal byte-sensitive content. | WAI |

## Citations and source integrity

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| CITE-01 Newly dead links | Q | Do multiple new URLs fail and lack credible archives? Check whether bots, scripts, or human copy/paste mangled or truncated them before judging the source. | Verify, repair, archive, replace, or remove the unsupported claim. | Paywalled and library-only citations that are otherwise valid. | WAI |
| CITE-02 Invalid identifier | Q | Does an ISBN fail checksum or a DOI fail resolution? | Correct from the source itself or flag/remove the citation. | Identifier formatting required by destination. | WAI |
| CITE-03 Valid identifier for wrong work | Q | Does a real DOI, PMID, or record point to unrelated material? | Replace with the correct work and recheck the claim. | The actual supporting source. | WAI |
| CITE-04 Real source, unsupported claim | Q | Does the cited passage fail to support the sentence? | Narrow the claim, find support, or remove it. | Accurate source meaning. | WAI |
| CITE-05 Missing locator | Q/C | Does a long book or report citation omit the page, chapter, section, or table needed for verification? | Add a verified locator or narrow the claim. | Sources where a locator is unnecessary. | WAI |
| CITE-06 Fabricated locator | Q | Does the cited page exist but not contain the alleged concept? | Correct against the source and repair the prose. | True page reference. | WAI |
| CITE-07 Broken reference reuse | Q | Are pseudo-footnotes, orphan superscripts, duplicate full citations, or invalid named references used? | Normalize to destination-native reference reuse. | Citation order and identity. | WAI |
| CITE-08 Irrelevant resolving source | Q | Does a link resolve but concern the wrong topic because an ordinal or ID was misread? Also check import and editor bugs that can select a real but irrelevant record. | Verify relevance, not just resolution. | Correct record. | WAI |
| CITE-09 Interface back-arrow | P/C | Do footnotes contain copied interface return arrows not used by the destination? | Remove only when they are interface residue. | Native backlink characters. | WAI |
| CITE-10 Model or assistant tracking parameter | P/C | Do URLs contain openai, chatgpt, copilot, grok, or similar referral parameters? | Remove nonessential tracking parameters and verify the canonical URL. | Query parameters required to reach the source. | WAI |
| CITE-11 Tracking false-positive exception | W | Could the tagged URL have been indexed or copied independently? | Treat it as URL hygiene, not a claim about the prose. | Source accessibility. | WAI |
| CITE-12 Unused defined reference | Q/C | Are named reference definitions never cited? | Cite where supported or remove the unused definition. | Reusable definitions required by a template. | WAI |
| CITE-13 Undefined named reference | Q/W | Does the body invoke a reference name with no local definition? Check whether the definition legitimately lives in a copied transclusion, shared bibliography, or another retained section. | Restore the definition from evidence or remove the unsupported citation. | Correct cross-file and transcluded reference systems. | WAI |
| CITE-14 Quotation drift | Q | Did editing change quoted language, punctuation, ellipses, or attribution? | Restore the source quotation exactly under destination rules. | Authorized typographic normalization. | CORE |
| CITE-15 Numerical drift | Q | Did units, percentages, dates, ranges, denominators, or comparisons change? | Reconcile every number against the source. | Intended rounding and formatting. | CORE |
| CITE-16 Toolchain damage false positive | W/Q | Could a bot, script, visual editor, import, extension, or truncated human copy/paste explain a broken or irrelevant citation? | Repair the defect and inspect the editing path before drawing broader conclusions. | Recoverable source metadata. | WAI |
| CITE-17 Historical low-identifier editor bug | W/Q | Could a real but irrelevant low-numbered biomedical record come from the documented VisualEditor-era bug? | Verify the record and replace or remove it; treat the bug as a provenance caveat. | Correct citation. | WAI |

## Numerical and risk communication

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| NUM-01 Unexplained number | Q/C | Can the intended audience tell what the number means and why it matters? | Add the minimum context, comparison, unit, timeframe, or consequence available in the source. | Exact value and uncertainty. | CDC |
| NUM-02 Unfamiliar representation | Q/C | Is a percentage, ratio, frequency, range, or unit harder to interpret than a familiar equivalent? | Use the audience-familiar representation or provide both without changing the value. | Original measure when required. | CDC |
| NUM-03 Denominator drift | Q | Do compared rates use different or unstated denominators, populations, or time windows? | Make denominators and bases explicit and stable. | Source-defined populations. | CDC |
| NUM-04 Reader calculation burden | Q/C | Must the reader perform arithmetic to understand the message? | Calculate and state the result when the source provides every required input; show the basis. | Source numbers and rounding. | CDC |
| NUM-05 Relative versus absolute risk | Q | Does relative risk exaggerate or obscure the underlying absolute change? | Present absolute and relative values together when available and material. | Valid risk framing. | CDC |
| NUM-06 Probability without words or visual context | Q/C | Would plain-language frequency, calibrated words, or a simple visual make probability understandable? | Add an accurate verbal or visual explanation supported by the source. | Numeric probability and uncertainty. | CDC |
| NUM-07 Unbalanced risk and benefit | Q/C | Does the message frame only risk or only benefit when the decision requires both? | Present the supported tradeoff proportionately. | Audience-relevant action. | CDC |

## Comments, summaries, and history

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| META-01 Invented or misquoted policy | Q/C | Does a comment cite a policy, shortcut, or rule inaccurately? | Verify and paraphrase the actual requirement. | Correct policy language. | WAI |
| META-02 Mention-triggered banner | C | Was a maintenance banner inserted merely because it was discussed? | Add it only when destination criteria are satisfied. | Required maintenance metadata. | WAI |
| META-03 Over-sectioned comment | C | Is a simple comment split into titled Markdown or formal report sections? | Convert to a concise, conversational comment. | Complex proposals needing structure. | WAI |
| META-04 Policy-compliance reassurance | C | Does the writer repeatedly assert neutrality, sourcing, clarity, or compliance instead of demonstrating it? | Describe the concrete change or evidence. | Required attestation forms. | WAI |
| META-05 Generic improvement request | C | Does a comment ask others to identify exactly what to improve without naming the uncertainty? | State the specific decision or evidence needed. | Genuine open-ended peer review. | WAI |
| META-06 Canned style-evidence defensiveness | C/W | Does a comment defensively accuse others of acting on speculation or demand proof in a formulaic way instead of addressing the concrete concern? | State the specific evidence, disagreement, or requested verification directly. | A legitimate procedural objection and the fact that style alone is inconclusive. | WAI, NIST |
| META-07 Verbose minor-edit summary | C | Is a small edit described in a formal first-person paragraph? | Name the concrete change concisely. | Required audit context. | WAI |
| META-08 Pasted summary label | P/Q | Does an edit summary include a chatbot name, preamble, or `Concise edit summary:` label? | Remove the label and retain the actual summary. | Product names when substantively relevant. | WAI |
| META-09 Canned summary assurances | C | Does the summary stack neutrality, tone, sourcing, flow, readability, and style claims? | Describe what content or structure changed. | Necessary compliance note. | WAI |
| META-10 Broad improvement bundle | C | Does one summary claim many loosely related improvements? | Split work or name the main material edits. | Legitimately broad refactors. | WAI |
| META-11 Preserved or retained formula | C | Does the summary say revised X to improve Y while preserving Z without specifics? | State the actual edit and reason. | A meaningful compatibility guarantee. | WAI |
| META-12 Sources as objects | C | Does the summary say added sourced content or reliable citations instead of what information changed? | Name the added or corrected information. | Citation-only maintenance. | WAI |
| META-13 Reviewer-feedback boilerplate | C | Does the summary announce that it addressed feedback without explaining how? | Name the addressed issue. | Traceability required by workflow. | WAI |
| META-14 Personal style discontinuity | C/W | Does the new prose sharply differ from the same writer's established grammar, register, or formatting? | Use authorized exemplars to restore continuity; do not treat difference alone as proof. | Intentional code-switching and improvement. | WAI, PAT |
| META-15 Language-variety mismatch | W | Is spelling or register variation the only concern? | Normalize only when house style requires it. | Multilingual and mixed-variety voice. | WAI, PAT |
| META-16 Era-tracking style shift | C | Does a long corpus change in step with successive formulaic model styles? | Review the actual quality and voice inconsistency. | Genuine evolution in the writer's style. | WAI |
| META-17 Reviewer-directed submission statement | P/Q | Does the artifact contain a note asserting notability, neutrality, and source quality to a future reviewer? | Integrate supported content and remove the submission pitch. | Required cover letters kept outside the artifact. | WAI |
| META-18 Pre-filled review or maintenance state | P/Q | Does a draft contain an unearned decline, review, date, language, or protection template? | Remove or correct against current state. | Valid system-maintained metadata. | WAI |
| META-19 Canned profile structure | C | Does a profile use generic welcome, about, interests, contributions, connect, and happy-editing sections? | Replace with the person's actual purpose and useful information. | Community conventions and chosen warmth. | WAI |
| META-20 High-volume benign rewrites | C/W | Is speed or volume being used by itself to infer permissions gaming? Conversely, is permissions gaming already established or reasonably suspected, making its rapid rewrites worth auditing? | Do not infer gaming from speed alone; when separate evidence exists, review the affected edits against the substantive rubric. | Efficient legitimate editing. | WAI |
| META-21 Approximate model differences | W | Is a rewrite based on stereotypes about one model's verbosity or vocabulary? | Use the artifact-specific matrix instead. | Observed local patterns as weak context. | WAI |

## Human variation and ineffective indicators

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| HUM-01 Simple copulas and direct verbs | W | Are is, has, wrote, moved, used, tried, or similarly direct verbs effective? | Keep them. | Direct human voice. | WAI |
| HUM-02 Natural hedge or intensifier | W | Does perhaps, very, tends to, or another ordinary stance marker accurately reflect confidence? | Keep or calibrate it; do not sterilize. | Epistemic stance. | WAI, PNAS |
| HUM-03 Isolated wordiness | W | Is one sentence idiosyncratically long or ornate but clear? | Preserve when it fits the voice. | Useful irregularity. | WAI |
| HUM-04 Explaining editorial decisions | W | Does the writer provide source passages, intended meaning, or a coherent reason for a choice? | Use that evidence to guide the revision. | Writer rationale. | WAI |
| HUM-05 Predating modern systems | W | Does an older source establish the wording as part of an existing voice? | Treat it as voice evidence, not text to homogenize. | Historical language unless modernization is requested. | WAI |
| HUM-06 Supported definitive or superlative statement | W | Is a strong construction such as is the only, was the first, or one of the best factually supported or clearly framed as opinion? | Preserve its directness; do not weaken it merely because it sounds emphatic. | Evidence, attribution, and scope. | WAI |
| WEAK-01 Perfect grammar | W | Is correctness the only concern? | Keep correct grammar. | House style. | WAI, NIST |
| WEAK-02 Mixed register | W | Does the writer blend casual, formal, clinical, emotional, playful, youthful, technical, or neurodivergent language? | Preserve intentional code-switching; fix only reader-facing incoherence. | Identity and context. | WAI, PAT |
| WEAK-03 Bland or robotic impression | W | Is the criticism only a vague feeling? | Identify a concrete row before revising. | Accurate plainness. | WAI |
| WEAK-04 Fancy or academic impression | W | Is formality alone being treated as a defect? | Match the actual audience and genre. | Scholarly voice and terminology. | WAI, PNAS |
| WEAK-05 Transition word alone | W | Is additionally, however, therefore, or another transition appropriate once? | Keep it; review only density and logic. | Coherent transitions. | WAI, SA |
| WEAK-06 Unsourced content alone | W/Q | Is the absence of citations the only stylistic concern? | Apply destination sourcing rules; do not infer authorship. | Genres that do not require citations. | WAI |
| WEAK-07 Bizarre markup alone | W/Q | Could a browser extension, editor, import, or conversion have caused it? | Repair the markup and inspect the toolchain. | Correct content. | WAI |
| WEAK-08 Correct markup | W | Is well-formed destination syntax considered suspicious? | Keep it. | Valid native formatting. | WAI |
| WEAK-09 Predictability and second-language prose | W | Is constrained vocabulary or syntax being treated as a quality defect by itself? | Preserve it unless the reader cannot understand it. | Second-language voice. | PAT, NIST |
| WEAK-10 Detector or perplexity score | W | Is a score being treated as decisive without validating text length, language, code content, model coverage, threshold, dataset, false-positive rate, distribution shift, paraphrase resistance, and stakes? | Treat it as limited contextual evidence only under validated conditions; never optimize the prose to the score or use it as the sole decision. | Human editorial judgment and due process. | NIST, TACL, PAT |
| WEAK-11 Unaided human intuition | W | Is a reviewer relying mainly on a stylistic hunch? Human accuracy varies with familiarity and can approach chance; language also adapts to common model phrasing. | Require concrete editorial defects or provenance artifacts before changing the text. | Experienced judgment as one bounded input. | WAI, NIST |

## Historical patterns

| ID and signal | Class | Applicability and inspection | Revision action | Preserve | Src |
| --- | --- | --- | --- | --- | --- |
| HIST-01 Didactic disclaimer | H/C | Does important to note, remember, consider, safety advice, or jurisdiction caveat interrupt the argument? | Integrate a necessary caveat where it affects the decision; remove empty throat-clearing. | Material safety and legal limits. | WAI |
| HIST-02 Repeated conclusion | H/C | Does each paragraph or section restate its thesis with in summary, overall, or in conclusion? | Keep only the recap the genre needs. | Required summaries. | WAI |
| HIST-03 Explicit model refusal | H/P | Does the artifact contain an apology, model identity, inability statement, and safer alternative? | Remove interface residue and complete the authorized deliverable. | A refusal quoted as evidence. | WAI |
| HIST-04 Token-limit cutoff | H/Q | Does the artifact end abruptly because generation, local copy/paste, import, or a potentially infringing copy stopped? | Recover only from authorized evidence; flag missing material and possible copyright concerns. | Intentional truncation markers. | WAI |
| HIST-05 Stale access dates | H/W | Are clustered access dates implausibly older than the edit? | Verify only where freshness matters; do not rewrite valid copied citations. | Accurate historical access dates. | WAI |

## Final verification

Run these checks after revision:

1. Compare every claim, name, number, date, unit, quotation, citation, link,
   modality, and obligation with the source.
2. Confirm that every paragraph has a useful job and that its order follows the
   reader's needs rather than a canned essay template.
3. Confirm that changed diction is more exact, not merely less associated with a
   watchlist.
4. Validate destination markup, heading hierarchy, links, references, code
   fences, tables, and file encoding.
5. Search again for interface residue, placeholders, malformed citations,
   unsupported analysis, and promotional inflation.
6. Read the revision for cadence and coherence. Preserve intentional variation;
   do not optimize sentence-length statistics or readability formulas blindly.
7. Report unresolved facts or citations instead of polishing uncertainty into
   confidence.

## Research basis

All sources were checked on 2026-08-05. The Wikipedia source is an advice page,
not policy, and its patterns are correlations rather than authorship tests. It is
primarily a field guide for Wikipedia and informational prose, explicitly omits
many fiction-specific patterns, and does not transfer every sign to every genre.
Its complete revision, sections, caveats, and examples were reviewed and
generalized into the matrix above without reproducing the example prose.

Detector and human-judgment evidence is condition-sensitive. Short text,
predictable prose, non-native English, code, unseen models, distribution shift,
mixed human/model text, paraphrasing, and style attacks can materially change
results. Use neither a detector nor unaided intuition as a sole or high-stakes
authorship decision.

- `WAI`: [Wikipedia: Signs of AI writing, permanent revision 1367680556](https://en.wikipedia.org/w/index.php?oldid=1367680556&title=Wikipedia%3ASigns_of_AI_writing) — revision dated 2026-08-04; Accessed 2026-08-05.
- `ISO`: [ISO 24495-1:2023 Plain language](https://www.iso.org/standard/78907.html).
- `DIG`: [Digital.gov plain-language principles](https://digital.gov/guides/plain-language/principles).
- `CDC`: [CDC Clear Communication Index](https://www.cdc.gov/ccindex/tool/index.html) and [readability guidance](https://www.cdc.gov/nceh/clearwriting/mod2/index.html).
- `GOV`: [GOV.UK right tone](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/tone-of-voice/right-tone/).
- `MS`: [Microsoft Writing Style Guide: simple and human](https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human) and [guide updates](https://learn.microsoft.com/en-us/style-guide/welcome/whats-new).
- `PNAS`: [Do LLMs write like humans?](https://doi.org/10.1073/pnas.2422455122).
- `ACL`: [Threads of Subtlety](https://aclanthology.org/2024.acl-long.298/).
- `SA`: [Delving into LLM-assisted writing in biomedical publications through excess vocabulary](https://doi.org/10.1126/sciadv.adt3813).
- `NIST`: [NIST.AI.100-4 Synthetic Content Transparency](https://doi.org/10.6028/NIST.AI.100-4).
- `PAT`: [GPT detectors are biased against non-native English writers](https://doi.org/10.1016/j.patter.2023.100779).
- `TACL`: [Red Teaming Language Model Detectors with Language Models](https://aclanthology.org/2024.tacl-1.10/).
- [OpenAI's retired classifier notice](https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/) supplies additional context on detector limitations.
