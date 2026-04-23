---
name: AIBlogDraft
description: SEO blog creation pipeline for the AI Timeline Atlas (letaiexplainai.com). Supports three modes — verbatim (wraps link + SEO layer around Wylie-supplied prose), topic (Wylie supplies an angle or news URL; skill researches SERP and drafts), and research (skill scans the past week of admin-ingested news articles, proposes angles, Wylie picks, skill drafts). Always emulates Wylie's accumulated voice from blog_voice.md, scans the entity graph, enforces first-mention entity linking, and ships on approval via /api/admin/blog. Updates blog_voice.md after each approved post. USE WHEN the user asks to "write a blog post", "draft blog post", "blog about X", "what should I blog about", "find news angles", "aiblogdraft", or wants new editorial content for the AI Timeline blog.
---

# AIBlogDraft

Drafts LAEA blog posts that are keyword-targeted, linked into the existing entity graph, and ready to ship through the Blog-3 admin API. Every phase below is mandatory — do not skip.

---

## Invocation

Three modes. The skill detects which from the invocation; if ambiguous, it asks.

1. **Verbatim mode** — Wylie supplies a fully-written prose body (inline or pasted). The skill preserves prose word-for-word and only wraps the link / metadata / SEO layer around it. This is the mode the 2026-04-22 `blog_voice.md` "don't change any word of the prose" rule applies to.
2. **Topic mode** — Wylie supplies a topic, angle, or news URL ("write about transformer scaling", "news: <url>"). The skill runs full SERP research and drafts from scratch in Wylie's voice.
3. **Research mode** — Wylie asks for ideas or doesn't supply a topic ("what should I blog about this week?", "any good news angles?", bare `/AIBlogDraft`). The skill scans admin-ingested news articles from the past 7 days, proposes 2–3 angles (big moment / trend / theme) with SEO winnability + narrative strength, Wylie picks one or more, the skill drafts each.

Triggered by `/AIBlogDraft <topic>`, `/AIBlogDraft news: <URL>`, `/AIBlogDraft ideas` or `/AIBlogDraft research`, `/AIBlogDraft draft: <full prose>`, or natural-language equivalents.

**Inputs:**
- `body`: full prose (verbatim mode)
- `topic`: free text describing the post angle (topic mode)
- `news_url`: optional source article if the post is news-hooked (topic mode)
- `keyword`: optional target keyword/phrase — if omitted, propose 3 candidates in Phase 1 and wait for Wylie to pick

---

## Phase 0 — Mode selection

Before anything else, decide which mode this invocation is in:

- **Contains a full prose body** (multi-paragraph markdown that reads as a finished post) → **verbatim mode**. Run Phase 1 for keyword/metadata selection only — do NOT reshape the prose to satisfy keyword-placement rules. Accept the SEO trade-off on first-100-words keyword presence if the prose doesn't front-load it; the title + seoTitle + first H2 still carry most of the ranking weight (this rule is already in `blog_voice.md` 2026-04-22). Then run Phases 2–5 to wrap the link + metadata layer around the supplied prose.
- **Contains a topic, angle, or news URL** → **topic mode**. Run all phases 1 → 5 as a draft-from-scratch.
- **Asks for ideas or omits a topic** → **research mode**. Run Phase 1a (article scan + angle proposal) first; once Wylie picks an angle it becomes topic mode from Phase 1 onward. If Wylie picks multiple angles, treat each as a separate draft — run Phase 1 → 5 per angle, do not batch.

If the invocation is genuinely ambiguous (e.g. a short paragraph that could be either a topic or a mini-draft), ask Wylie which mode to run. Record the selected mode in the Phase 5 review artifact so the reviewer sees it.

---

## Phase 1 — Intake, SERP research, winnability

1. **Read voice**: open `.claude/skills/AIBlogDraft/blog_voice.md`. This file accumulates what we know about Wylie's blog voice. If it's empty, proceed and plan to seed it from this post.
2. **Clarify scope** in one round of questions if the topic is vague. Never make up intent.
3. **Live SERP** via the `Agent` tool with `WebSearch`. Query Google for the target keyword (or top 3 candidate keywords if none provided). Report back in a short block:
   - Top 10 titles + domains for each keyword
   - Dominant intent (informational / commercial / navigational)
   - "Difficulty read" based on the SERP: big-brand-only vs long-tail winnable
   - A recommendation: pick this keyword, pivot to this adjacent keyword, or reframe the angle
4. **Winnability**: explicitly say whether LAEA can plausibly win the SERP given our E-E-A-T posture (timeline data, author bylines, entity graph depth). If no — recommend a narrower or more specific angle before drafting.
5. **Wait for Wylie to pick** the keyword and confirm the angle before moving to Phase 2. Do not draft blind.

---

## Phase 1a — Research mode: news scan + angle proposal

**Only run in research mode.** Feeds Phase 1: you pick an angle here, then run SERP research on that angle in Phase 1 proper.

### 1. Fetch admin-ingested articles from the past 7 days

```bash
# Admin JWT (same pattern used in Phase 5)
ADMIN_USER=$(aws ssm get-parameter --name "/ai-timeline/prod/admin-username" --with-decryption --query "Parameter.Value" --output text)
ADMIN_PWD=$(aws ssm get-parameter --name "/ai-timeline/prod/admin-password" --with-decryption --query "Parameter.Value" --output text)
TOKEN=$(curl -sS -X POST https://letaiexplainai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PWD\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')

# Pull recent articles (paginate / bump limit if the endpoint supports it;
# otherwise fetch default page and filter client-side)
curl -sS "https://letaiexplainai.com/api/admin/articles" \
  -H "Authorization: Bearer $TOKEN"
```

Filter client-side: articles with `publishedAt` (or `createdAt` fallback) in the past 7 days. Sort by `relevanceScore` desc. Do NOT restrict to `isMilestoneWorthy=true` only — a cluster of medium-relevance articles on the same topic is often the best trend signal.

### 2. Identify candidate angles

Cluster the articles and look for three distinct signal types:

- **Big moment** — one high-relevance article representing a standalone event (major model release, policy ruling, leadership change, lawsuit, acquisition).
- **Trend** — ≥3 articles in the same subject cluster over the week (e.g. multiple stories on reasoning-model economics, or on export controls, or on agentic coding). The thesis is the *pattern*, not any one article.
- **Theme** — a cross-cutting pattern showing up in otherwise unrelated coverage (e.g. "compute-for-labor trades", "AI + power grid constraints", "ritualized AI safety theater"). Lower confidence signal but often the most distinctive post.

### 3. Propose 2–3 angles to Wylie

Each proposal includes:

- **Working title** + one-sentence thesis (what the post argues, not what it covers)
- **Mode signal**: big-moment / trend / theme
- **Backing articles**: titles + sources for the 2–6 articles supporting this angle (link to the article pages if useful)
- **SEO gut-check**: a candidate target keyword + quick read on winnability — no full SERP yet, that's Phase 1 proper after Wylie picks
- **Narrative strength**: one line on why this angle has a *thesis* (something to argue or reframe), not just a news recap
- **LAEA fit**: how deep the entity graph goes on this topic (people / orgs / glossary terms / milestones already present — drives cross-linking flywheel)

Rank the 2–3 angles so Wylie can see your recommendation, but include all so he can choose differently.

### 4. Wait for Wylie to pick one or more angles

Do not draft blind. If he picks multiple, run Phase 1 → Phase 5 independently per angle — do not batch-draft, and do not share sections between drafts.

Once an angle is selected, proceed to Phase 1 (SERP research on the chosen angle's keyword).

---

## Phase 2 — Dataset scan (entity graph lookup)

Goal: build a **link inventory** of every LAEA entity that plausibly belongs in this post. The inventory drives Phase 3 linking and Phase 4 audit.

Run these in parallel via Bash against the prod API. Filter by relevance to the chosen topic; cap each list at 30 so the skill doesn't drown in irrelevant matches.

```bash
# Topic-relevant entities — adjust the search terms per post
curl -sS "https://letaiexplainai.com/api/persons/search?q=<terms>&limit=30"
curl -sS "https://letaiexplainai.com/api/organizations/search?q=<terms>&limit=30"
curl -sS "https://letaiexplainai.com/api/glossary/search?q=<terms>&limit=30"
curl -sS "https://letaiexplainai.com/api/milestones?q=<terms>&limit=30"

# Broad-context lookups — fetched once, filtered client-side
curl -sS "https://letaiexplainai.com/api/subjects/tree"
curl -sS "https://letaiexplainai.com/api/feed?limit=50"          # recent news events
curl -sS "https://letaiexplainai.com/api/learning-paths"         # for learning-path links
```

Collect each result into a table of `{ type, slug (or id), canonicalName, aliases[] }`. Aliases matter: "Sam Altman", "Altman", "@sama" should all resolve to the same person.

**Do not invent entities.** If something feels like it should be in the graph but isn't, note it for Wylie rather than linking to a URL that doesn't exist.

---

## Phase 3 — Draft the post

### Voice

**Always re-read `blog_voice.md` first** and emulate the accumulated preferences, regardless of mode.

- **Verbatim mode**: preserve Wylie's prose word-for-word. The only edits allowed are markdown syntax the renderer requires (`## ` heading prefixes the renderer auto-demotes, shortcode substitution on first-mention entities, trimming stray whitespace). Do not rewrite, condense, reorder, re-paragraph, or "polish". This is the 2026-04-22 `blog_voice.md` rule and it is absolute. If a keyword placement rule conflicts with preserving the prose, preserve the prose — rely on title / seoTitle / first H2 for ranking weight instead.
- **Topic mode and research mode**: draft from scratch in Wylie's voice as captured in `blog_voice.md`. If the file is empty (first run), draft in the voice of the seed post `why-we-built-laea`: opinionated, historical, graph-flavored, under-statement over hyperbole, concrete examples over abstractions. In research mode specifically, ground claims in the backing articles surfaced in Phase 1a — cite them via outbound links where they're the primary source for a specific fact, and anchor the thesis to the pattern you identified, not to generic recap.

### Structure

- **No leading `# Title`** in the body — BlogPostPage renders `post.title` as the page `<h1>`. Start the body with prose or an `## H2`. BlogMarkdown auto-demotes body `#` → `<h2>` as a safety net (Blog-2 fix) but authoring clean is better.
- Opening hook in the first 100 words with the target keyword.
- 3–5 `## H2` sections. Each gets a keyword-adjacent heading.
- Close with a "what's next" / "where to read more" paragraph that links to 2–3 entity pages (drives FromTheBlog reverse-injection on those pages).

### Linking rules (NON-NEGOTIABLE)

**Shortcode format** (the 4 types resolved automatically by `BlogMarkdown`):
- People: `[[person:sam-altman|Sam Altman]]` → `/people/sam-altman`
- Orgs: `[[organization:openai|OpenAI]]` → `/organizations/openai`
- Glossary: `[[glossary:transformer|Transformer architecture]]` → `/glossary/transformer`
- Milestones: `[[event:E2017_TRANSFORMER|Attention is All You Need paper]]` → `/events/E2017_TRANSFORMER`

**Plain markdown links** (no shortcode support yet; use the canonical path):
- Subjects: `[machine learning](/subjects/science-cs-ml)`
- News events: `[OpenAI's latest release](/news/<eventId>)`
- Learning paths: `[Transformer learning path](/learn/transformers-deep-dive)`
- Eras: `[the 2010s](/timeline/2010s)`

**Linking policy:**

- **First-mention linking**: link the first occurrence of each entity; leave subsequent mentions plain. Prevents link-spam.
- **Natural anchor text only**: the anchor text IS the entity name or a natural noun phrase. Never "click here", "read more", "this post", "the timeline".
- **Only link when natural**: if the entity isn't actually relevant to the sentence, don't shoehorn a link in. Forced links hurt reader trust and SEO both.
- **Ambiguity**: if a name could match multiple entities (e.g. "Anthropic" the company vs "anthropic principle" the philosophy), pause and ask Wylie which before linking.
- **Minimum 3 internal links per post**. If the topic legitimately has fewer than 3 linkable entities, tell Wylie — the post may not fit LAEA's content posture.
- **Outbound links**: use sparingly for primary-source citations (arxiv papers, company announcements). Always `rel="noopener"` (markdown auto-handles this in the renderer config).

### Entity matching mechanics

For each entity in the link inventory, do a case-insensitive word-boundary scan against the draft. Match against `canonicalName` first, then each alias. On the first hit per entity, replace the plain occurrence with the shortcode or markdown link.

---

## Phase 4 — Link audit (self-check before review)

Before handing the draft to Wylie:

1. Count distinct linked entities. Target ≥3; hard warn if <3.
2. Flag any entity mentioned ≥2× that wasn't linked on first mention.
3. Flag any plain-text reference to something obviously in the dataset that you missed (e.g. "Sam Altman" appears with no `[[person:sam-altman|…]]`).
4. Run through the SEO checklist below. Any ❌ is a blocker, not a nag.

### SEO checklist (all items must pass)

- [ ] **Target keyword** appears in: title, first 100 words, at least one `<h2>`, meta description, URL slug
- [ ] **Title ≤60 chars** (SERP truncation)
- [ ] **Meta description 140–160 chars** (optimal SERP snippet)
- [ ] **Slug** is kebab-case, keyword-bearing, ≤80 chars
- [ ] **One primary subject** assigned + 0–2 additional subjects
- [ ] **3–5 tags** — topical, lowercase
- [ ] **Relations array** includes every milestone / person / org / glossary term the post *cites directly* — this drives FromTheBlog injections on those entity pages (Blog-4)
- [ ] **≥3 internal links** to entity pages
- [ ] **Images** (if used): every `<img>` alt text is descriptive and not the raw filename
- [ ] **Featured** flag set only if Wylie intends this as a homepage-hero post
- [ ] **Excerpt** reads as a standalone 1–2 sentence hook (it's the RSS `<description>`, OG description, and card teaser — not a teaser of a teaser)

---

## Phase 5 — Review & publish

1. Emit a single review artifact to Wylie:

   ```
   ## Draft preview
   (rendered title + subtitle + excerpt)

   ## Body markdown
   ```...full draft...```

   ## SEO metadata
   mode: verbatim | topic | research
   slug: …
   seoTitle: …
   seoDescription: …
   tags: [...]
   primarySubject: <slug>
   subjectIds: [...]
   relations: [
     { entityType, entityId, relationLabel? },
     ...
   ]
   featured: false

   ## Link audit
   - 4 entities linked: [[person:…]], [[organization:…]], [[glossary:…]], [[event:…]]
   - SEO checklist: ✅ all green
   - (research mode only) Backing articles: <list of article titles + sources>

   Approve? (y / edit / abort)
   ```

2. **Wait for explicit "y" / "approved" / "ship it"**. Do not publish speculatively.

3. **On approval**: publish via the admin API. Fetch the admin JWT fresh each run.

   ```bash
   ADMIN_USER=$(aws ssm get-parameter --name "/ai-timeline/prod/admin-username" --with-decryption --query "Parameter.Value" --output text)
   ADMIN_PWD=$(aws ssm get-parameter --name "/ai-timeline/prod/admin-password" --with-decryption --query "Parameter.Value" --output text)
   TOKEN=$(curl -sS -X POST https://letaiexplainai.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PWD\"}" \
     | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')

   # Create draft (body in a temp JSON file to keep the command readable)
   curl -sS -X POST https://letaiexplainai.com/api/admin/blog \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     --data @/tmp/blog-draft.json

   # Capture returned post.id, then publish (or schedule on request)
   curl -sS -X POST https://letaiexplainai.com/api/admin/blog/<id>/publish \
     -H "Authorization: Bearer $TOKEN"
   ```

4. After publish, confirm the post appears on `/api/blog` and `/blog/:slug`. Report back with the live URL.

5. **Update `blog_voice.md`** with what you learned about Wylie's voice from this post:
   - Words/phrases he accepted vs edited
   - Structural preferences (short paragraphs? long ones?)
   - Tone calibrations (more/less contrarian?)
   - Do / Don't rules he explicitly stated
   Append to the file; do not rewrite prior entries.

---

## Voice file protocol

Path: `.claude/skills/AIBlogDraft/blog_voice.md`

- **Read before every draft** (Phase 3).
- **Append after every approved post** (Phase 5.5).
- Append-only — don't delete prior learnings unless Wylie explicitly reverses a preference, in which case note the reversal with date rather than deleting.
- Structured as dated entries. Each entry has: diction notes, structural notes, do rules, don't rules.

---

## Safety + anti-patterns

- **Never publish without explicit approval**. A user saying "looks good, let me read once more" is NOT approval.
- **Never invent entities**. If a person/org isn't in the graph, reference them by name without linking. Tell Wylie "consider adding [name] to the People table" as a note.
- **Never emit the shortcode format for types the renderer doesn't support** (subject/news/path/era). Use plain markdown links instead — see Phase 3 linking rules.
- **Never force ≥3 links if the topic doesn't support it**. Instead, flag the topic as off-strategy and ask Wylie to reframe.
- **Never skip Phase 4 audit**. It's the only thing stopping sloppy posts from shipping.
- **Always verify slug uniqueness** before creating the draft — the backend auto-appends `-2`, `-3`, etc., but if the draft expects `why-we-built-laea` and it collides, your SEO plan goes sideways.

---

## Reference

**API base**: `https://letaiexplainai.com/api`
**Admin API base**: `https://letaiexplainai.com/api/admin`
**SSM creds**: `/ai-timeline/prod/admin-username`, `/ai-timeline/prod/admin-password`

**Admin endpoints used by this skill**:
- `POST /api/auth/login` — get JWT
- `POST /api/admin/blog` — create draft
- `PUT /api/admin/blog/:id` — update (for edit cycles)
- `POST /api/admin/blog/:id/publish`
- `POST /api/admin/blog/:id/schedule`
- `POST /api/admin/blog/:id/preview-token` — for a preview URL before publish

**Public endpoints for dataset scan**:
- `/api/persons`, `/api/persons/search?q=`, `/api/persons/:slug`
- `/api/organizations`, `/api/organizations/search?q=`
- `/api/glossary`, `/api/glossary/search?q=`
- `/api/milestones`
- `/api/subjects/tree`, `/api/subjects/:slug`
- `/api/feed`
- `/api/learning-paths`

**URL patterns for links**:
| Entity | URL | Shortcode? |
|---|---|---|
| Person | `/people/:slug` | `[[person:<slug>\|<label>]]` |
| Organization | `/organizations/:slug` | `[[organization:<slug>\|<label>]]` |
| Glossary term | `/glossary/:slug` | `[[glossary:<slug>\|<label>]]` |
| Milestone | `/events/:id` | `[[event:<id>\|<label>]]` |
| Subject | `/subjects/:slug` | plain markdown |
| News event | `/news/:id` | plain markdown |
| Learning path | `/learn/:pathId` | plain markdown |
| Era | `/timeline/<decade>` (e.g. `2010s`) | plain markdown |

**Shortcode regex** (in `src/components/Blog/BlogMarkdown.tsx`):
```
/\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]/g
```
If you need shortcode support for a new type, it's a 2-line change in that file — flag it to Wylie rather than hacking around it.
