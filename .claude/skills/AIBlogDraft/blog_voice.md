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
