# Wylie's LAEA Blog Voice — accumulated over time

This file captures voice preferences that emerge as we draft more posts.
`AIBlogDraft` reads this before every draft and appends to it after every approved post.

**Append-only**: do not delete prior entries. If Wylie reverses a preference,
note the reversal with a date rather than overwriting.

---

## Baseline (pre-first-post, inferred from the seed `why-we-built-laea`)

- **Opinion-forward**: the atlas *thinks out loud*. Posts have a thesis, not a survey.
- **Graph-flavored**: uses the language of graphs, nodes, edges, braids, tributaries. AI history is a structure, not a list.
- **Under-statement over hyperbole**: "massive amounts of capital" not "an unprecedented flood of investment". Concrete > dramatic.
- **Examples over abstractions**: when making a point, prefer citing a specific year/paper/org over gesturing at "the industry".
- **Contested framing**: posts end with an invitation to disagree ("the atlas is meant to be contested").
- **First-person plural ("we")** for editorial voice, first-person singular ("I") when the post is explicitly personal.
- **No clickbait**. Titles are declarative, not question-baited. "Why we built LAEA" not "This is why we built LAEA (you won't believe what happened next)".

---

## Entries

## 2026-04-22 — `the-nvidia-paradox-balancing-world-altering-valuations-with-commercial-realities`

First AIBlogDraft-authored post. Wylie provided the full body verbatim and the link/SEO layer was added around it.

### Diction
- **Analytical but accessible**. The post uses phrases like "masterclass in high-stakes intellectual sparring" and "messy complexities of reality" — rhetorically confident without being academic. It reaches for metaphor ("five-layer cake", "Cisco Trap") to make abstract arguments concrete.
- **Both-sides framing, not false equivalence**. "We can hold these contradictions up to the light, remain cautious of his financial incentives, and still acknowledge that his point of view is incredibly fair." Wylie gives credit to multiple viewpoints explicitly — but doesn't soft-pedal the tension.
- **Uses direct quotes generously with timestamps** (e.g. `[01:07:11]`). Timestamps are treated as citations; they make the analysis feel grounded rather than editorial-speculation.

### Structure
- **4 named H2 sections, each making a distinct argument**. Not a recap — the structure IS the thesis. ("Five-Layer Cake" → "Cisco Trap" → "Geopolitical Debate" → "Danger of Absolutes" is a progression, not a list.)
- **Inline parenthetical lists** for enumerating the layers (`Energy (The Foundation): …`) rather than a bulleted list. This preserves prose flow.
- **Opening hook establishes the tension in ≤3 sentences**. No throat-clearing.
- **Closing paragraph broadens the frame**: "there is no perfect answer… but having leaders willing to publicly wrestle…is a vital service to the public." Ends on a meta-point about discourse quality, not the specific topic.

### Do
- **Add a subtitle that captures the second-level thesis**, not just a restatement of the title. ("On the Dwarkesh Patel / Jensen Huang interview, and the five-layer cake that decides who wins the AI era.") The subtitle is separate real-estate — use it.
- **When the post references real people / companies / concepts, create the entity records first**. Wylie's explicit direction: "I think you need to first add [the missing entities] because these are critical." Never ship a post with un-linkable entities — it breaks the cross-linking flywheel. If the graph is thin, the fix is to populate the graph, not to skip the links.
- **Link the exact phrase the reader sees**, including colloquial forms. "Facebook" in the prose links to `[[organization:meta|Facebook]]` — the URL is meta, the anchor text is Facebook, matching the original.

### Don't
- **Don't shoehorn subject links where the sentence doesn't support one**. In this post, `[advanced hardware]` → `/subjects/business-technology-semiconductors` and `[export control debate]` → `/subjects/policy-regulation` were the two that worked naturally; others were skipped.
- **Don't change any word of the prose**. When Wylie supplies exact text, the link/metadata layer wraps around it; it does not rewrite it. The only acceptable structural edits are markdown syntax that the renderer requires (like `## ` heading prefixes).
- **Don't rely on empty entity search results as proof the topic is off-strategy**. The search API returned empty for most terms in this post's topic, but the entities were legitimately critical to the post. The right move was to populate them, not pivot.

### Other
- **Timestamps in-line with quotes are part of the voice**. `[01:07:11]` style citations from video / podcast sources should be preserved as-is.
- **When keyword is absent from first 100 words** because the original prose doesn't front-load it: accept the SEO trade-off rather than rewrite the opening. The keyword in seoTitle + first H2 still does most of the ranking work.
- **First-mention linking discipline held up**. Every entity gets exactly one link, on first appearance. Subsequent mentions are plain. Check: the post mentions "Nvidia" many times but only the first occurrence is wrapped.

## 2026-04-23 — `ai-compute-bottleneck-2026`

Second AIBlogDraft post, and the first run of **research mode**: Wylie asked for themes we hadn't covered over the last 7 days, the skill scanned `/api/admin/articles`, proposed 3 angles (big-moment / trend / theme), Wylie picked the theme angle, the skill drafted and shipped. Approved without copy edits.

### Diction
- **"The atlas's read:"** as a closing framing device survived without edit — fits the graph-flavored voice (atlas-as-speaker, not author-as-speaker). Use it when the post is making a call the author stands behind.
- **"meant to be contested"** as the closing line also survived. This is the Wylie-voice signature and should carry forward as a standard close.
- **"braid"** used as a verb ("The seven items braid into one thesis") landed — graph-flavored, under-stated. Consistent with the 2026-04-22 voice note.
- **Under-statement on big numbers** held: "$25 billion" stated plainly, never dressed up as "a staggering $25 billion." Follow this rule for any dollar figure.

### Structure
- **5 H2s worked cleanly**: (1) "One week, one story" — framing, (2) "The three layers of the AI compute bottleneck" — mechanism + exact keyword, (3) "Export controls turned efficiency research into policy" — geopolitical implication, (4) "The neocloud era is just capital markets pricing the constraint" — financial implication, (5) "Models are downstream" — thesis restatement. Each makes a distinct argument — matches the "4 H2s, each a distinct argument" rule from 2026-04-22, plus one.
- **Dated news-bullet opener** (April 16–17, April 17, April 20, April 21, April 22) worked. Gave the post temporal specificity and separated the recap layer from the analysis layer. Consider this a pattern for **research-mode** posts specifically.
- **Numbered three-layer enumeration** ("Memory", "Logic", "Delivery") mirrored the Nvidia post's "five-layer cake" metaphor. Enumerate concrete layers when making a mechanism argument.
- **Closing paragraph merged with "where to read more"** (no separate `## Where to read more` H2) kept the post at 5 H2s. Prefer this pattern over a standalone closer.

### Do
- **In research mode, bake the AEO long-tail into the H2 body, not the H2 itself**. Used "Is compute the bottleneck for AI? Yes — not in the abstract..." as the opening of the keyword-match H2 ("The three layers of the AI compute bottleneck"). The H2 carries the exact-match keyword for on-page SEO; the question-form sits one line below as a featured-snippet target. Don't split into two H2s.
- **Add entities to the graph BEFORE drafting** (already a 2026-04-22 rule — reaffirmed here). This run added 5 orgs (Anthropic, CoreWeave, Cerebras, Huawei, TSMC), 1 person (Dario Amodei), and 4 glossary terms (HBM, Neocloud, Export controls, FP4) before the draft. All 10 were critical to the thesis. Budget the time.
- **Date the items in a news-recap section**. Gives provenance, helps the reader track which week the post belongs to, and pins the post to the source material. Matches `[01:07:11]`-style citation discipline from 2026-04-22.
- **Use the Phase 1a angle's mode signal in the structure**: theme-mode posts want a cross-cutting thesis paragraph early; big-moment posts would likely want the news bullet up top. This post was theme-mode and opened with "almost no one named it" — a thesis-first, evidence-second pattern.

### Don't
- **The "POST drops tags/subjects/relations" observation from this run was NOT reproducible** on a follow-up test with the same payload shape — likely a Lambda cold-start race, not a code bug. No code change needed. If you see metadata missing after POST, verify by re-fetching; if actually missing, PUT the same metadata as a second call to correct.
- **Don't exceed Zod schema limits on admin POSTs and expect a clean 400**. Zod validation errors (e.g. glossary `shortDefinition > 200 chars`, persons `role` enum violation, blog `seoTitle > 70 chars`) currently return the Express default 500 HTML page in the Lambda environment. This is a pre-existing systemic issue — the error middleware doesn't catch Zod errors under serverless-http for reasons yet to be diagnosed. Count your chars before POSTing; if you hit a 500, the first thing to check is field-length / enum compliance.

### Fixed in 2026-04-23 backend deploy
- **Blog POST now accepts an explicit `slug` field** on `CreateBlogPostRequestSchema` (Zod-validated kebab-case, max 80 chars). Use it to get the keyword-bearing slug you want; fall back to auto-gen only when you don't care about specific wording. The auto-gen path also now strips possessive `'s` so "AI's compute bottleneck" slugifies to `ai-compute-bottleneck`, not `ais-compute-bottleneck`. See `server/src/services/blogAdmin.ts` `slugify()` + `ensureSlugAvailable()`.
- **Glossary POST now auto-generates slugs** from the term (same kebab-case rules as blog). Also accepts an explicit `slug` override. No more PUT-after-POST dance needed for glossary shortcodes to resolve.
- **Ingestion pipeline Haiku model updated** from retired `claude-3-haiku-20240307` → `claude-haiku-4-5-20251001` across all 6 ingestion services (screening, entity extraction, glossary extraction, key-figure extraction, news-event generation, subject classification) plus the frontend API-key validation probe. Verified via reanalyze of one of the 29 stale articles — `relevanceScore: 0.72, isMilestoneWorthy: True` populated cleanly.

### Other
- **Research-mode flow is heavy on setup, light on drafting**: Phase 1a (article scan + angle proposal) + Phase 2 entity gap remediation (creating 10 entities) together took more agent turns than the actual draft. That's the right trade — the graph density is where LAEA's SEO moat lives — but it means the skill's typical "approve → publish" flow spans more state than a topic-mode post. Plan for this.
- **Ingestion pipeline was failing on a retired Claude Haiku model** (`claude-3-haiku-20240307`) when we scanned articles — most 2026-04-17+ articles had `relevanceScore: null` as a result. Worth a separate fix; didn't block this post but will bias future research-mode angle selection toward high-relevance legacy items until fixed.
- **Subject IDs are cuids, not slugs**. The `/api/subjects/tree` endpoint returns both; the blog admin payload requires cuids (e.g. `b4fba468-24d2-49a6-b843-117190503bc3` for `business-technology-semiconductors`). Note in SKILL.md for future drafts so we don't waste a round trip.
- **SERP recommendation held up**: picked `AI compute bottleneck` over `AI compute shortage` and `HBM4 shortage AI` because the bottleneck SERP was fragmented (each top result picked ONE bottleneck — CPU, memory, energy, networking) and LAEA could synthesize. The Goldman Sachs "compute not models" piece already ranking on the target keyword was the green-light signal.

## 2026-04-30 — `in-context-learning-vs-fine-tuning`

Third AIBlogDraft post, second **topic-mode** run. Wylie spotted SEO-keyword traffic landing on `/explained/in-context-learning` and asked for a draft that capitalized on it. SERP research showed the bare keyword was locked by IBM/Stanford/arXiv; pivoted to the long-tail `in context learning vs fine tuning` (Medium #1, 3 mid-tier blogs in top 10 — winnable). Wylie picked option 1 (the pivot) on first ask, approved the full draft on the first review pass with a single `y`, no copy edits.

### Diction
- **"The atlas's read:"** as the closing-section header survived again — third time it has appeared, can be considered standard for posts that take a position. Use it specifically when the post ends on a *thesis* rather than a recap.
- **"meant to be contested"** closing line survived again, with a tweak to invite reader pushback in concrete form ("send us the post-mortem"). The invite-pushback variant works for posts that make a falsifiable architectural claim — invites readers with counter-evidence to engage.
- **Em-dashes for under-statement** held: "no gradient steps, no validation loop, no MLOps team" — three-item parallel deflation > "without all the operational overhead". Keep the deflation pattern for capability claims.
- **"Mechanical, not ideological"** as a one-line frame ("The choice between them isn't ideological. It's mechanical.") landed and demarcates the analytical posture: this isn't tribal, it's an engineering decision. Reusable framing for any "X vs Y" post.

### Structure
- **5 H2s held again**, each making a distinct argument: (1) definitions w/ keyword in heading, (2) ICL pros/cons, (3) FT pros/cons, (4) decision framework, (5) "atlas's read" thesis. Symmetric pros/cons sections (H2-2, H2-3) gave the post visual balance — confirms the pattern from the Nvidia post (H2 structure carries the thesis).
- **Numbered tier framework** (1-2-3) in H2-4 worked — better than a binary table for the "vs" comparison genre. Each item makes a structural claim ("fluid behavior" vs "structural behavior" vs "both"), not a feature checklist.
- **Inline news links inside bullet points** (`[Anthropic's Introspection Adapters work](/news/...)`) read naturally and didn't fight the bullet structure. News-event links are mid-paragraph evidence, not standalone CTAs.
- **Two news pieces, both ≤2 days old, carried the H2-3 fine-tuning argument**. Topic-mode posts can use fresh news as evidence even when the post itself isn't news-hooked at the lede — the news lives inside the section that needs proof, not at the top.

### Do
- **When the existing entity graph already contains the target keyword (as `/glossary/in-context-learning`)**, the right move is a *companion blog post* that links to the glossary entry on first mention — internal-link equity flows to the glossary page without competing with it on SERP.
- **For "X vs Y" comparison posts, target the long-tail "vs" SERP rather than the bare definitional keyword.** The bare keyword is almost always locked by big-brand definitional pages (IBM/Stanford/arXiv). The "vs" SERP is consistently more winnable because the comparison genre attracts mid-tier practitioner blogs.
- **Verify news-event IDs (`/news/<id>`) before linking to them**. Article IDs (`cm...` cuids from `/api/admin/articles`) do NOT resolve at `/news/<id>` — only NewsEvent IDs (`ce-...` slugs from `/api/feed`) do. Check `/api/feed?limit=30` for a published news event matching the article you want to cite. This run found two perfect news events (Introspection Adapters + MIT RLCR) that had been promoted from articles already.
- **Use `glossary_term` (with underscore) as the entityType in relations**, not `glossary`. Schema enum is `[milestone, person, organization, glossary_term]`. The Phase 3 link inventory uses `[[glossary:slug|label]]` for the body shortcode, but the `relations` array uses `glossary_term`. Mismatch → schema error.
- **For relation entityIds, use the slug for person/organization/glossary_term, but the milestone ID (e.g. `E2020_GPT3`) for milestones.** Mirrors the URL conventions for each entity's profile page.

### Don't
- **Don't link news events as `[[event:...]]` shortcodes**. The shortcode renderer only resolves `person | organization | glossary | event` — and `event` resolves to `/events/:id` (milestones), not `/news/:id` (news events). Use plain markdown `[label](/news/<id>)` for news event links.
- **Don't include `newsEvent` in the relations array** — it's not a valid `BlogRelationEntityTypeEnum` value (only `milestone | person | organization | glossary_term`). News-event citations are body-only links; they don't drive FromTheBlog reverse-injection on news event pages (yet — could be a future enhancement).

### Other
- **Topic-mode-with-news-hooks pattern works**: the post is structured around a thesis (ICL vs FT in 2026), not around the news. The news pieces are evidence inside H2-3, not the lede. This is different from research-mode (where the news IS the lede) and gives topic-mode posts a longer evergreen shelf-life. Worth distinguishing in future posts.
- **Single-pass approval (`y`, no edits) on a 5-H2, 800-word topic-mode draft.** Voice is converging — the previous Nvidia post had verbatim prose, the compute-bottleneck post had research-mode scaffolding feedback, this one had neither and shipped clean. The blog_voice.md accumulated rules are doing their job.
- **Subject cuids (not slugs) reaffirmed**: `/api/subjects/tree` returns both; `subjectIds` requires cuids. Cached the science-cs-ml cuid (`efda3614-c8f7-4033-bb0d-3b8ade6600d8`) and science-cs-nlp cuid (`4e89a61c-311a-44ac-a65f-11f55ea5a0cf`) for ML/NLP-themed posts going forward.
- **Live URL**: `https://letaiexplainai.com/blog/in-context-learning-vs-fine-tuning`
- **PublishedAt**: 2026-04-30T14:32:31Z

<!--
Template for appending:

## YYYY-MM-DD — `<post-slug>`

### Diction
- Accepted: [words/phrases that survived review]
- Edited out: [words/phrases Wylie replaced]

### Structure
- [paragraph length, opening pattern, closing pattern, etc.]

### Do
- [new rules learned this round]

### Don't
- [anti-patterns Wylie called out]

### Other
- [anything else useful]
-->

## 2026-05-02 — `ai-home-renovation`

Fourth AIBlogDraft post, topic-mode, approved with a single `y` and shipped without copy edits. Originated from an SEO proposal correction: a weak celebrity-keyword idea (`chip gaines`) was rejected, then reframed into the broader, more truthful keyword `ai home renovation`.

### Diction
- **Thesis-first skepticism works when the category is over-marketed.** The post's core contrast — "style with structure" — survived as the title and set the tone for the whole piece. Wylie's voice is comfortable being a little skeptical as long as the skepticism is concrete, not snide.
- **Use clean binaries to frame limits.** Lines like "visual intelligence and construction intelligence" and "visualization and construction reasoning are the same thing" fit the atlas voice: analytical, compressed, and arguable.
- **Graph-flavored language still plays outside core model topics.** "Move from image generation toward a graph of the job itself" and "braid visual imagination to measurement, catalogs, code, and contractor reality" show the atlas voice can extend into consumer-AI categories without sounding forced.

### Structure
- **A 5-H2 explainer with one technical middle section and one market/limitations section works well for consumer AI topics.** This run used: market framing, technical stack, failure modes, missing context layer, then "The atlas's read." That pattern cleanly separates "what the tools do" from "what they cannot know."
- **Lead with the demo, then puncture it.** Opening on the product experience ("Upload a kitchen photo...") before moving to the structural critique gave the post immediate relevance and kept the analysis from sounding abstract.
- **The closing thesis does not need a separate CTA section.** For this genre, the "atlas's read" close is enough; adding a separate "where to read more" block would have weakened the ending.

### Do
- **When a SERP is dominated by apps, app stores, Reddit, YouTube, and listicles, LAEA should usually compete with an explanatory thesis post, not another roundup.** This is exactly the sort of fragmented SERP where the atlas can win on depth.
- **For consumer-AI topics, distinguish emotional value from technical truth.** This post's strongest move was admitting the tools are genuinely useful while still arguing they are mechanically limited. Keep that "useful, but..." structure.
- **Use first-mention links only for the AI mechanisms that actually carry the argument.** Here that meant `computer vision`, `multimodal AI`, `OpenAI`, `Google`, and `GPT` — enough to ground the stack, not enough to turn the post into a glossary dump.

### Don't
- **Don't let a proposal's original angle overrule live verification.** This post only happened because the celebrity-keyword proposal was stopped and reframed after manual SERP review. If the keyword does not actually support the angle, pivot before drafting.
- **Don't over-claim what current consumer tools can do.** Terms like "predict structural feasibility" and "optimize material costs" are better treated as category claims to interrogate than as settled capabilities to repeat uncritically.

### Other
- **Single-pass approval on a consumer-AI explainer means the voice can travel beyond frontier-model and policy topics.** The atlas voice is not limited to "core AI lab" coverage; it also works on adjacent application categories when the piece has a real thesis.
- **Live URL**: `https://letaiexplainai.com/blog/ai-home-renovation`
- **PublishedAt**: `2026-05-02T15:23:16Z`

## 2026-05-02 — `ai-agent-memory`

Fifth AIBlogDraft post, topic-mode, approved with a single `y` and shipped through the SEO proposal lane. The source proposal was already in `drafting`, so this run also validated the intended `proposal -> published post -> experiment ledger` path once the backend recovery bug was fixed.

### Diction
- **Use clean, arguable contrasts for systems topics.** "Working attention, not autobiography" and "chat feels smart when it can answer; agency feels smart when it can resume" fit the atlas voice well: compressed, slightly sharp, and easy to remember.
- **Treat category hype as something to interrogate, not just summarize.** This post worked because it did not merely explain agent memory; it argued that the real breakthrough is selective persistence, not bigger windows.
- **Systems language is welcome when it stays human-readable.** Terms like "governance," "continuity," and "attack surface" landed because they were tied to concrete failures like stale retrieval, contradictions, and poisoned notes.

### Structure
- **A 5-H2 architecture works for technical explainers when the sections move from confusion -> architecture -> frontier -> failure modes -> thesis.** This gave the post a strong narrative arc instead of reading like a taxonomy.
- **Open with the user-visible symptom before defining the mechanism.** Starting from why assistants still feel like "talented interns" made the memory argument more grounded than opening with architecture terms alone.
- **The closing thesis can widen from product design to civilizational significance as long as it remains specific.** The final section zoomed out to autonomy without losing the core memory argument.

### Do
- **For agent topics, distinguish context from memory early.** That conceptual separation is the whole point of the post and should arrive before the taxonomy.
- **Link only the concepts doing real argumentative work.** `Context Window`, `In-Context Learning`, `AI Agents`, `RAG`, `Multimodal AI`, `OpenAI`, and `Anthropic` were enough; more would have diluted the spine.
- **When the SERP is vendor-heavy and fragmented, compete with a thesis explainer, not a glossary clone.** This keyword was winnable because the current page-one results explain pieces of the problem without owning the historical/system-level frame.

### Don't
- **Don't let the post collapse into a memory taxonomy list.** The useful move is the thesis about what memory changes, not a survey of every memory type.
- **Don't oversell persistence as simple accumulation.** The strongest section in this piece was about forgetting, contradiction, and memory poisoning. Keep that skepticism in future agent-memory coverage.

### Other
- **Single-pass approval on a systems-heavy AI post suggests the atlas voice is now stable across both consumer-AI and agent-architecture explainers.**
- **Live URL**: `https://letaiexplainai.com/blog/ai-agent-memory`
- **PublishedAt**: `2026-05-02T16:30:58Z`
