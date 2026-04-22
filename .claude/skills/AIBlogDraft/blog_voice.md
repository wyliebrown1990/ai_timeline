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
