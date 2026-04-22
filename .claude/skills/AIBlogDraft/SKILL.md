---
name: AIBlogDraft
description: SEO blog creation pipeline for the AI Timeline Atlas (letaiexplainai.com). Researches live SERP for the given topic, scans the project's entity graph (milestones, people, organizations, glossary terms, subjects, news events, learning paths, eras), drafts a keyword-optimized post in Wylie's accumulated voice, enforces first-mention entity linking, and ships on approval via /api/admin/blog. Always updates blog_voice.md with voice learnings after each approved post. USE WHEN the user asks to "write a blog post", "draft blog post", "blog about X", "aiblogdraft", or wants new editorial content for the AI Timeline blog.
---

# AIBlogDraft

Drafts LAEA blog posts that are keyword-targeted, linked into the existing entity graph, and ready to ship through the Blog-3 admin API. Every phase below is mandatory — do not skip.

---

## Invocation

User-triggered via `/AIBlogDraft <topic>`, `/AIBlogDraft news: <URL>`, or natural-language ("write a blog post about …", "draft an op-ed on …").

**Inputs:**
- `topic`: free text describing the post angle (required)
- `keyword`: optional target keyword/phrase — if omitted, propose 3 candidates in Phase 1 and wait for Wylie to pick
- `news_url`: optional source article if the post is news-hooked

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

1. Re-read `blog_voice.md`. Emulate the accumulated preferences.
2. If `blog_voice.md` is empty (first run), draft in the voice of the seed post `why-we-built-laea`: opinionated, historical, graph-flavored, under-statement over hyperbole, concrete examples over abstractions.

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
