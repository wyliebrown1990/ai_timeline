# Organic Keyword Strategy & Automation Pipeline

**Project:** AI Timeline Atlas (letaiexplainai.com)
**Date:** 2026-04-10
**Status:** Draft for review

---

## Executive Summary

letaiexplainai.com sits on a content goldmine — hundreds of milestones, glossary terms, person profiles, and news events — but today almost none of that content is discoverable through search because there's no systematic keyword targeting. The site already has strong SEO infrastructure (JSON-LD, sitemap, meta tags, dedicated URL patterns). What's missing is the strategy layer: knowing which keywords to target, generating content to match search intent, and automating the feedback loop.

This document lays out a three-phase strategy:
1. **Capture existing demand** — optimize what we already have for keywords people are already searching
2. **Programmatic expansion** — use our data to auto-generate thousands of long-tail pages
3. **Freshness engine** — tie the news ingestion pipeline to keyword opportunities in real-time

---

## Part 1: The Opportunity

### Why This Site Can Win

Most AI education content lives in blog posts (scattered, outdated) or Wikipedia (dense, academic). letaiexplainai.com has structural advantages:

- **Entity-rich data model**: Every person, org, milestone, and term has a dedicated URL with structured data. Google loves entity pages.
- **Layered content**: tldr + simpleExplanation + technicalDepth + businessImpact means one page can satisfy multiple search intents (quick answer vs. deep dive).
- **Freshness signals**: Automated news ingestion means content stays current — a ranking factor Google weights heavily for AI/tech queries.
- **Internal linking graph**: Milestones link to people, people link to orgs, orgs link to milestones. This is exactly the topical authority signal Google rewards.

### Keyword Categories We Should Own

| Category | Example Queries | Monthly Volume (est.) | Competition | Our Advantage |
|----------|----------------|----------------------|-------------|---------------|
| AI History | "history of artificial intelligence", "ai timeline" | 10K-50K | Medium | Core product — nobody has a better timeline |
| AI Explainers | "what is a transformer", "how does chatgpt work" | 50K-200K | High | Glossary + layered content + Explained pages |
| AI People | "who is sam altman", "geoffrey hinton bio" | 5K-20K each | Low-Medium | Person profiles with career history + milestones |
| AI Comparisons | "chatgpt vs claude", "openai vs anthropic" | 20K-100K | Medium | Compare pages with structured data |
| AI Inventions | "who invented deep learning", "who created chatgpt" | 5K-30K | Low | Who Invented pages + FAQ schema |
| AI News Recaps | "ai news this week", "latest ai developments" | 30K-100K | High | Automated news pipeline + quiz |
| AI Learning | "learn machine learning", "ai basics for beginners" | 20K-50K | High | Learning paths + flashcards |
| Company Timelines | "openai history", "google ai timeline" | 5K-15K each | Low | Filtered timeline views already exist |

**Total addressable organic traffic: 200K-600K monthly visits** within 12-18 months if executed well.

---

## Part 2: Strategy by Content Type

### 2.1 Glossary Terms (Highest ROI, Lowest Effort)

**Why**: Each glossary term page already has `quickAnswer` (featured snippet bait), `faqItems` (FAQ schema), `howItWorksSection`, and `historySection`. These are perfectly structured for search. We just need to make sure we're targeting the right terms.

**Keyword Pattern**: `"what is [term]"`, `"[term] explained"`, `"[term] definition ai"`

**Action Plan**:
1. **Audit existing terms** — Pull all glossary terms, check which have complete content (quickAnswer, faqItems, howItWorksSection all populated vs. empty)
2. **Gap analysis** — Cross-reference against top 200 AI terms people search for (see Appendix A). Identify terms we're missing.
3. **Optimize existing** — For each term, ensure:
   - Page title follows: `{Term} — What It Is & Why It Matters | AI Timeline Atlas`
   - quickAnswer is 50-70 words (Google featured snippet sweet spot)
   - At least 3 FAQ items with clear Q&A format
   - Internal links to related milestones and people
4. **Generate missing terms** — Use the content pipeline to auto-generate glossary entries for missing high-volume terms

**Automation**: Add a `keywordTarget` field to the GlossaryTerm model. When a new term is created (manually or via pipeline), auto-suggest target keywords based on the term name + related queries.

### 2.2 Person Profiles (Low Competition, High Intent)

**Why**: "Who is [AI person]" queries have low competition and high click-through because Google shows knowledge panels — but many AI figures don't have good knowledge panels yet. Our person pages with structured Person schema can fill this gap.

**Keyword Pattern**: `"[name]"`, `"[name] ai"`, `"[name] biography"`, `"[name] net worth"` (we skip net worth but capture the traffic)

**Action Plan**:
1. **Priority list** — Rank persons by search volume. Start with: Sam Altman, Demis Hassabis, Dario Amodei, Yann LeCun, Geoffrey Hinton, Fei-Fei Li, Andrew Ng, Jensen Huang, Ilya Sutskever
2. **Content completeness** — Each person page needs: shortBio, fullBio (1000+ words), careerHistory, contributions, philosophy, currentlyDoing (updated from news)
3. **Schema optimization** — Ensure Person JSON-LD includes: name, jobTitle, worksFor, alumniOf, award, sameAs (Wikipedia, LinkedIn, Twitter links)
4. **News freshness** — The `currentlyDoing` field auto-updates from news extraction. This gives us a freshness edge over Wikipedia.

**Automation**: When the entity extraction pipeline detects a person in a news article, auto-update their `currentlyDoing` field and trigger a `dateModified` bump on their profile page. Google re-crawls pages with fresh `dateModified`.

### 2.3 Comparison Pages (Programmatic SEO)

**Why**: "X vs Y" queries are exploding in AI. "ChatGPT vs Claude", "GPT-4 vs Gemini", etc. Each comparison is a long-tail keyword with strong commercial intent.

**Keyword Pattern**: `"[model/company/person A] vs [model/company/person B]"`

**Action Plan**:
1. **Auto-generate comparison matrix** — For every pair of:
   - Top 20 AI models (GPT-4, Claude, Gemini, Llama, Mistral, etc.)
   - Top 15 AI companies (OpenAI, Anthropic, Google DeepMind, Meta AI, etc.)
   - Top 20 AI researchers
2. **Template-driven content** — Each comparison page pulls data from both entity profiles and generates structured comparison sections:
   - Quick comparison table (features, dates, key facts)
   - Detailed analysis paragraphs (from entity profiles)
   - Timeline overlay (milestones from both entities)
   - FAQ section ("Is X better than Y?", "What's the difference between X and Y?")
3. **Sitemap inclusion** — Already configured. Ensure all generated comparisons are in sitemap with 0.5 priority.

**Scale**: 20 models = 190 comparison pages. 15 companies = 105 pages. 20 researchers = 190 pages. **~485 pages from data we already have.**

**Automation**: 
- Nightly job checks for new persons/orgs/models added to the database
- Auto-generates comparison page stubs for high-value pairs (both entities have complete profiles)
- Uses Claude to generate the comparison narrative sections
- Queues for admin review before publishing (same review pipeline as news)

### 2.4 Explained Pages (Topical Authority)

**Why**: "[Topic] explained" is the highest-volume educational search pattern. Each Explained page is a comprehensive pillar page that links to glossary terms, milestones, and people — building topical authority.

**Keyword Pattern**: `"[topic] explained"`, `"how does [topic] work"`, `"[topic] for beginners"`

**Action Plan**:
1. **Pillar topics** — Identify 30-50 core AI topics that should each have an Explained page:
   - Foundational: Neural Networks, Deep Learning, Machine Learning, NLP, Computer Vision, Reinforcement Learning
   - Current: Large Language Models, Transformers, Diffusion Models, AI Agents, RAG, Fine-tuning
   - Applied: AI in Healthcare, AI in Finance, Autonomous Vehicles, AI Art
   - Conceptual: AI Safety, AI Alignment, AGI, Superintelligence, AI Ethics
2. **Content structure** — Each Explained page should be 2000-4000 words with:
   - TL;DR (featured snippet target)
   - "Explain like I'm 5" section
   - How it works (technical)
   - Why it matters (business)
   - Key milestones in this topic (pulled from timeline)
   - Key people (pulled from person profiles)
   - FAQ section (5-8 questions)
3. **Internal linking hub** — Each Explained page links to 5-15 glossary terms, 3-10 milestones, 2-5 people. These pages become topic hubs.

**Automation**: Use the subject taxonomy to auto-suggest Explained page topics. When a subject has 5+ linked milestones and 3+ linked glossary terms, flag it as ready for an Explained page. Generate draft content using Claude with the linked content as context.

### 2.5 Who Invented Pages (Featured Snippet Magnets)

**Why**: "Who invented [X]?" queries trigger featured snippets. Google wants a direct answer + brief context. Our `whoInventedQuickAnswer` field on glossary terms is built for exactly this.

**Keyword Pattern**: `"who invented [technology]"`, `"who created [product]"`, `"who founded [company]"`

**Action Plan**:
1. **Ensure every glossary term has `whoInventedQuickAnswer`** — 1-2 sentence direct answer
2. **Link to person profiles** — The answer should link to the inventor's profile page
3. **FAQ schema** — Include "Who invented X?" as the first FAQ item on the glossary term page
4. **Dedicated pages** — For high-volume queries, create standalone Who Invented pages with deeper content

**Automation**: When a new glossary term is created, auto-generate the `whoInventedQuickAnswer` by querying the milestone database for the earliest milestone related to that term and extracting the contributors.

### 2.6 News & Current Events (Freshness + Recurring Traffic)

**Why**: AI news searches spike constantly. Each news cycle is an opportunity to capture traffic with timely content. Our automated ingestion pipeline already fetches and processes news — we just need to optimize the output for search.

**Keyword Pattern**: `"[event/announcement] explained"`, `"ai news this week"`, `"[company] announcement today"`

**Action Plan**:
1. **Optimize NewsDetailPage titles** — Currently uses headline. Should follow: `{Headline} — What It Means for AI | AI Timeline Atlas`
2. **Add "Why It Matters" section** — Pull from `connectionExplanation` field. This differentiates us from pure news aggregators.
3. **Weekly recap pages** — Auto-generate weekly AI news roundup pages (tied to quiz week):
   - URL: `/news/week/{yyyy-mm-dd}`
   - Content: Top 5-10 events of the week with context
   - Target: "ai news this week", "ai updates [month] [year]"
4. **News event → Explained page pipeline** — When a news event scores high relevance and relates to a topic without an Explained page, flag it as an Explained page opportunity.

**Automation**: 
- Weekly recap page auto-generated on same schedule as quiz (Friday)
- Title optimization applied automatically during content generation
- "Why It Matters" section populated from pipeline output

---

## Part 3: Automation Pipeline

### Architecture

```
                    ┌─────────────────────────┐
                    │   Keyword Intelligence   │
                    │   (Weekly Cron Job)       │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
     ┌────────────┐   ┌──────────────┐   ┌───────────┐
     │  Gap        │   │  Opportunity │   │  Freshness│
     │  Detector   │   │  Scorer      │   │  Monitor  │
     └─────┬──────┘   └──────┬───────┘   └─────┬─────┘
           │                  │                  │
           ▼                  ▼                  ▼
     ┌─────────────────────────────────────────────┐
     │          Content Generation Queue            │
     │  (prioritized by estimated traffic value)    │
     └──────────────────────┬──────────────────────┘
                            │
                            ▼
     ┌─────────────────────────────────────────────┐
     │          Claude Content Generator             │
     │  (glossary terms, explained pages,            │
     │   comparisons, who-invented, weekly recaps)   │
     └──────────────────────┬──────────────────────┘
                            │
                            ▼
     ┌─────────────────────────────────────────────┐
     │          Admin Review Queue                   │
     │  (same pipeline as news content drafts)       │
     └──────────────────────┬──────────────────────┘
                            │
                            ▼
     ┌─────────────────────────────────────────────┐
     │          Publish + Sitemap Update             │
     │  + Internal Link Injection                    │
     └──────────────────────┬──────────────────────┘
                            │
                            ▼
     ┌─────────────────────────────────────────────┐
     │          Performance Tracker                  │
     │  (GSC API → impressions/clicks per page)      │
     └─────────────────────────────────────────────┘
```

### 3.1 Keyword Intelligence (Weekly Cron)

**What it does**: Identifies keyword opportunities by cross-referencing our content with search demand.

**Data sources**:
- Google Search Console API (impressions, clicks, avg position for existing pages)
- Our content database (what pages exist, what's missing)
- Trending AI topics (from our news ingestion pipeline — what topics are spiking?)

**Implementation**:
```
New Lambda: ai-timeline-keyword-intelligence
Schedule: Weekly (Monday 6 AM UTC)
Flow:
  1. Pull GSC data for last 7 days (top 1000 queries)
  2. Pull all existing content slugs from database
  3. Identify:
     a. "Almost there" keywords — we rank position 5-20, content exists but could be improved
     b. "Missing content" keywords — we get impressions but have no dedicated page
     c. "Trending" keywords — news pipeline shows topic spike, no existing content
  4. Score each opportunity: estimated_monthly_traffic × (1 / competition_level)
  5. Write results to KeywordOpportunity table
  6. Top 10 opportunities → admin dashboard notification
```

**New database model**:
```
KeywordOpportunity {
  id            String   @id @default(cuid())
  keyword       String
  category      String   // gap, improvement, trending
  searchVolume  Int?
  currentRank   Float?
  existingPageUrl String?
  suggestedAction String  // create_glossary, create_explained, optimize_existing, create_comparison
  suggestedSlug  String?
  score         Float    // priority score
  status        String   // pending, in_progress, published, dismissed
  createdAt     DateTime @default(now())
}
```

### 3.2 Gap Detector

**What it does**: Finds keywords people search for that we don't have content for.

**Logic**:
1. GSC query has 100+ impressions but 0 clicks → we're showing up but page doesn't match intent
2. GSC query matches a pattern we support (e.g., "[term] explained") but no Explained page exists for that term
3. News pipeline detects a new AI concept mentioned 3+ times across articles → no glossary term exists

**Output**: Adds entries to ContentGenerationQueue with `type: gap_fill`

### 3.3 Opportunity Scorer

**What it does**: Ranks content creation tasks by expected impact.

**Scoring formula**:
```
score = estimated_monthly_traffic 
        × click_through_rate_estimate 
        × (1 - competition_difficulty)
        × content_readiness_bonus
```

Where:
- `estimated_monthly_traffic` = GSC impressions × 4 (weekly → monthly) or keyword tool estimate
- `click_through_rate_estimate` = based on expected rank (position 1 = 30%, position 3 = 10%, etc.)
- `competition_difficulty` = 0-1 based on domain authority of current top 5 results
- `content_readiness_bonus` = 1.5x if we already have related entities in database (person, org, milestones to link to)

### 3.4 Freshness Monitor

**What it does**: Detects when existing content becomes stale or when news creates a keyword spike.

**Triggers**:
- Person's `currentlyDoing` updated → bump `dateModified` on profile + linked milestone pages
- New milestone added for an organization → bump org profile `dateModified`
- Trending news topic matches an existing Explained page → add "Latest Update" section
- Glossary term's related technology has a new milestone → add to term's timeline section

### 3.5 Internal Link Injection

**What it does**: Automatically builds internal links between content to strengthen topical authority.

**Rules**:
1. Every glossary term mention in a milestone description → auto-link to glossary page
2. Every person name mention in any content → auto-link to person profile
3. Every Explained page → links to 5-15 most relevant glossary terms (by subject overlap)
4. Every comparison page → links to both entity profiles + shared milestones
5. Max 3 links per paragraph, max 50 internal links per page

**Implementation**: Server-side content enrichment during render. Store raw content in DB, inject links at API response time. Cache aggressively.

---

## Part 4: Content Calendar & Velocity

### Automated Content Velocity Targets

| Content Type | Current Count | Target (6 months) | Generation Method |
|--------------|--------------|-------------------|-------------------|
| Glossary Terms | ~100 | 300 | Gap detector + Claude generation |
| Explained Pages | ~10-20 | 50 | Subject taxonomy triggers |
| Comparison Pages | ~20 | 500 | Programmatic from entity pairs |
| Who Invented | ~10 | 100 | Glossary term enrichment |
| Person Profiles | ~100 | 250 | Entity extraction from news |
| Org Profiles | ~30-50 | 100 | Entity extraction from news |
| Weekly Recaps | 0 | 26 (weekly) | Automated from news pipeline |
| Company Timelines | ~5 | 20 | Manual curation |

**Total new pages in 6 months: ~1,000+**

### Monthly Priorities

**Month 1: Foundation**
- [ ] Set up Google Search Console API integration
- [ ] Audit glossary term completeness (quickAnswer, faqItems populated?)
- [ ] Optimize top 20 glossary terms for featured snippets
- [ ] Generate 50 missing high-volume glossary terms
- [ ] Ensure all person profiles have complete structured data

**Month 2: Programmatic Expansion**
- [ ] Build comparison page auto-generator
- [ ] Generate 200 comparison pages (models, companies, researchers)
- [ ] Create 10 pillar Explained pages for highest-volume topics
- [ ] Launch weekly recap page generation

**Month 3: Intelligence Loop**
- [ ] Deploy keyword intelligence Lambda
- [ ] Build KeywordOpportunity model and admin dashboard section
- [ ] Start measuring GSC performance per content type
- [ ] Optimize based on first month of GSC data

**Month 4-6: Scale & Optimize**
- [ ] Generate remaining comparison pages
- [ ] Fill glossary gaps identified by keyword intelligence
- [ ] A/B test title formats for click-through rate
- [ ] Build internal link injection system
- [ ] Expand to 50 Explained pages
- [ ] Launch trending topic → content pipeline

---

## Part 5: Technical Implementation

### New Infrastructure Required

1. **Google Search Console API access** — OAuth service account with read access to letaiexplainai.com property
2. **New Lambda** — `ai-timeline-keyword-intelligence` (weekly cron, 5-min timeout)
3. **New database models** — `KeywordOpportunity`, `ContentGenerationTask`
4. **Admin dashboard additions** — Keyword opportunities view, content generation queue
5. **SSM parameters** — GSC credentials, content generation config

### Modifications to Existing Pipeline

1. **Content Generator** — Add templates for:
   - Weekly recap pages
   - Comparison narrative sections
   - Missing glossary term generation
2. **Sitemap** — Already handles most content types. Add weekly recaps.
3. **Review Queue** — Extend to handle auto-generated SEO content (comparisons, explained pages)
4. **Entity Extraction** — When creating a PersonDraft, also check if a comparison page should be generated

### Performance Monitoring

Track weekly via automated report:
- Total indexed pages (GSC)
- Total impressions and clicks (GSC)
- Average position for target keyword clusters
- Pages with impressions but 0 clicks (title/meta description problems)
- New pages indexed vs. published
- Content type breakdown (which types drive most traffic?)

---

## Part 6: Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Thin content penalty from auto-generated pages | High | Admin review queue for all auto-generated content. Minimum word count thresholds. |
| Duplicate content across comparison/explained/glossary | Medium | Canonical URLs already implemented. Ensure each page has unique primary content section. |
| Over-indexing low-quality pages | Medium | noindex pages below quality threshold. Monitor GSC for crawl budget waste. |
| News content goes stale | Low | Already have freshness pipeline. Add automated "Last updated" dates. |
| Keyword cannibalization (multiple pages targeting same term) | Medium | Keyword-to-page mapping table. One primary page per target keyword. |

---

## Appendix A: Priority Keyword List (Top 100)

### Tier 1: High Volume, Achievable (Target in Month 1-2)

1. what is artificial intelligence
2. ai timeline
3. history of ai
4. what is machine learning
5. what is deep learning
6. what is a neural network
7. what is chatgpt
8. how does chatgpt work
9. what is a large language model
10. what is a transformer (ai)
11. chatgpt vs claude
12. openai vs anthropic
13. openai history
14. who created chatgpt
15. who is sam altman
16. what is generative ai
17. ai explained
18. what is natural language processing
19. what is computer vision
20. gpt-4 vs gemini

### Tier 2: Medium Volume, Low Competition (Month 2-3)

21. who invented deep learning
22. anthropic history
23. google deepmind timeline
24. what is ai alignment
25. what is ai safety
26. what is reinforcement learning
27. what is a diffusion model
28. what is rag (retrieval augmented generation)
29. what is fine tuning
30. llama vs mistral
31. geoffrey hinton biography
32. yann lecun biography
33. who is dario amodei
34. what is constitutional ai
35. transformer architecture explained
36. attention mechanism explained
37. what is agi
38. what is superintelligence
39. ai in healthcare
40. ai art history

### Tier 3: Long-Tail, Featured Snippet Targets (Month 3-6)

41. who invented the transformer model
42. who invented neural networks
43. who coined artificial intelligence
44. when was ai invented
45. first ai program
46. history of chatbots
47. openai founding story
48. deepmind alphago explained
49. gpt-1 vs gpt-2 vs gpt-3 vs gpt-4
50. ai winter explained
51-100: [Company] + "ai strategy", model comparisons, researcher profiles, concept deep-dives — derived from GSC data after Month 1

---

## Next Steps

1. **Review this strategy** — Wylie approves direction and priorities
2. **GSC API setup** — Connect Search Console to enable the intelligence loop
3. **Sprint plan** — Break Month 1 into implementation tasks
4. **Glossary audit** — Run completeness check on existing terms (can be automated)
5. **First batch** — Generate 50 missing glossary terms + optimize top 20 existing
