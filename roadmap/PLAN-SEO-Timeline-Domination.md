# SEO Timeline Domination Plan

> **Goal**: Rank #1 for AI timeline-related search queries where letaiexplainai.com currently has impressions but 0 clicks.

## Problem Statement

Google Search Console shows the site appearing for valuable queries but getting no clicks:

| Query | Status |
|-------|--------|
| "ai timeline" | Impressions, 0 clicks |
| "timeline of major ai model releases" | Impressions, 0 clicks |
| "artificial intelligence history timeline" | Impressions, 0 clicks |
| "major ai breakthroughs timeline 2019-2024" | Impressions, 0 clicks |
| "openai timeline" | Impressions, 0 clicks |
| "generative ai timeline" | Impressions, 0 clicks |

**Root Cause**: Generic page titles, missing dedicated landing pages, weak schema markup for timeline content.

## Strategy Overview

### Phase 1: Quick Wins (Sprint TD-1)
- Optimize existing timeline page titles/meta
- Add ItemList schema markup for timeline
- Create "Last updated" freshness signals

### Phase 2: Dedicated Landing Pages (Sprint TD-2)
- Create company-specific timelines (OpenAI, Anthropic, Google)
- Create category-filtered views (Generative AI, LLMs)
- Create date-range focused pages (2019-2024 breakthroughs)

### Phase 3: Historical Depth (Sprint TD-3)
- Expand timeline pre-2010 (Dartmouth 1956, Deep Blue 1997)
- Add era landing pages (AI Winter, Deep Learning Era)
- Create "Complete History" authoritative page

### Phase 4: Linkable Assets (Sprint TD-4)
- Downloadable PDF timeline
- Embeddable timeline widget
- Annual AI Progress Reports
- Social-optimized infographics

### Phase 5: UX & Intent Matching (Sprint TD-5)
- Jump-to-year navigation
- Category filter bar above fold
- Timeline search functionality
- Mobile-optimized timeline view

### Phase 6: Link Building & Outreach (Sprint TD-6)
- Newsletter pitches (The Rundown, AI Breakfast)
- University course outreach
- Wikipedia reference additions
- HARO/journalist outreach

## Sprint Breakdown

| Sprint | Focus | Priority | Effort |
|--------|-------|----------|--------|
| TD-1 | Quick Wins - Meta & Schema | HIGH | 1 day |
| TD-2 | Dedicated Landing Pages | HIGH | 2-3 days |
| TD-3 | Historical Depth Expansion | MEDIUM | 2 days |
| TD-4 | Linkable Assets Creation | MEDIUM | 3-4 days |
| TD-5 | UX & Search Intent | MEDIUM | 2 days |
| TD-6 | Outreach & Link Building | LOW | Ongoing |

## Target Keywords & Pages

| Keyword | Target URL | Page Type |
|---------|------------|-----------|
| "ai timeline" | `/timeline` | Main timeline (optimized) |
| "timeline of major ai model releases" | `/timeline/models` | Filtered view |
| "artificial intelligence history timeline" | `/timeline/complete-history` | Full history |
| "major ai breakthroughs timeline 2019-2024" | `/timeline/2019-2024` | Date-range |
| "openai timeline" | `/timeline/openai` | Company-specific |
| "anthropic timeline" | `/timeline/anthropic` | Company-specific |
| "google ai timeline" | `/timeline/google` | Company-specific |
| "generative ai timeline" | `/timeline/generative-ai` | Category-filtered |
| "llm timeline" | `/timeline/llm` | Category-filtered |
| "chatgpt timeline" | `/timeline/chatgpt` | Product-specific |

## Success Metrics

### 30-Day Goals
- [ ] All target keywords have dedicated optimized pages
- [ ] Schema markup validated for all timeline pages
- [ ] Position improvement for "ai timeline" query

### 90-Day Goals
- [ ] Top 3 ranking for "ai timeline"
- [ ] Top 5 ranking for company-specific queries
- [ ] 50+ backlinks to timeline pages
- [ ] Featured in at least 1 AI newsletter

### 6-Month Goals
- [ ] #1 ranking for "ai timeline"
- [ ] 10,000+ monthly organic visitors to timeline pages
- [ ] Cited in 5+ AI Overviews
- [ ] Wikipedia references established

## Technical Architecture

```
/timeline                    → Main timeline (all milestones)
/timeline/:company           → Company-filtered (openai, anthropic, google)
/timeline/:category          → Category-filtered (generative-ai, llm, models)
/timeline/:startYear-:endYear → Date-range filtered (2019-2024)
/timeline/complete-history   → Full history from 1950s
/timeline/download           → PDF download page
/timeline/embed              → Embeddable widget page
```

## Schema Markup Strategy

### ItemList (Timeline pages)
```json
{
  "@type": "ItemList",
  "name": "AI Timeline - Complete History",
  "numberOfItems": 250,
  "itemListElement": [
    { "@type": "Event", "name": "...", "startDate": "..." }
  ]
}
```

### Event (Individual milestones)
```json
{
  "@type": "Event",
  "name": "GPT-4 Release",
  "startDate": "2023-03-14",
  "description": "...",
  "organizer": { "@type": "Organization", "name": "OpenAI" }
}
```

## References

- Existing SEO plan: `roadmap/PLAN-SEO-Improvements.md`
- Completed foundation: `roadmap/Sprint-SEO-1-Foundation.md`
- Schema.org Event: https://schema.org/Event
- Schema.org ItemList: https://schema.org/ItemList
