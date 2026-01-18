# Sprint SEO-2: Answer Engine Optimization

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-17 by Claude (Tasks 1-6 complete, quick answers generated for 140 terms)

## Overview

Optimize content for Google AI Overviews and answer engines (ChatGPT, Perplexity, etc.).

**Why This Matters**:
- 60% of searches now end without a click due to AI Overviews
- 89% of AI citations come from outside the top 10 organic results
- FAQ schema can trigger rich results AND get cited in AI answers
- Question-based content is prioritized by AI systems

**Priority**: CRITICAL
**Estimated Effort**: 2-3 days

## Tasks

### 1. Add FAQ Schema Helper to SEO Component

**File**: `src/components/SEO.tsx`

- [x] Create `generateFAQJsonLd()` helper function
- [x] Accept array of `{ question: string, answer: string }` objects
- [x] Output valid FAQPage schema:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Who founded OpenAI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "OpenAI was founded in 2015 by Sam Altman, Elon Musk, Greg Brockman, Ilya Sutskever, and others."
        }
      }
    ]
  }
  ```
- [x] Update SEO component to accept multiple JSON-LD scripts

### 2. Add FAQ Schema to Person Profile Pages

**File**: `src/pages/PersonProfilePage.tsx`

- [x] Generate FAQ data from person fields:
  - "Who is {name}?" → shortBio
  - "What is {name} known for?" → contributions
  - "Where does {name} work?" → currentOrg + currentRole
  - "What is {name}'s background?" → background
- [x] Add FAQ JSON-LD to SEO component
- [x] Only include questions where data exists

**Example FAQ for Sam Altman:**
```typescript
const faqData = [
  {
    question: `Who is ${person.canonicalName}?`,
    answer: person.shortBio,
  },
  person.contributions && {
    question: `What is ${person.canonicalName} known for?`,
    answer: person.contributions.slice(0, 300) + '...',
  },
  person.currentOrg && {
    question: `Where does ${person.canonicalName} work?`,
    answer: `${person.canonicalName} is currently ${person.currentRole} at ${person.currentOrg.name}.`,
  },
].filter(Boolean);
```

### 3. Add FAQ Schema to Organization Profile Pages

**File**: `src/pages/OrganizationProfilePage.tsx`

- [x] Generate FAQ data from organization fields:
  - "What is {name}?" → shortDescription
  - "When was {name} founded?" → foundedYear
  - "Where is {name} headquartered?" → headquarters
  - "What does {name} do?" → mission
  - "What products does {name} make?" → products array
- [x] Add FAQ JSON-LD to SEO component

### 4. Add FAQ Schema to Glossary Page

**File**: `src/pages/GlossaryPage.tsx`

- [x] When a term is selected, generate FAQ:
  - "What is {term}?" → definition
  - "What category is {term}?" → category
  - Related questions based on term type
- [x] Add FAQ JSON-LD to SEO component for selected term
- Note: Individual glossary term pages need dedicated URLs (Sprint SEO-3) for term-specific FAQ schema. Currently adds general glossary FAQs to the main page.

### 5. Add "Quick Answer" Summaries to Glossary Terms

**Database**: Add new field to GlossaryTerm model

- [x] Add `quickAnswer` field to Prisma schema (50-70 words)
- [x] Run migration: `npx prisma migrate dev --name add_glossary_quick_answer`
- [x] Update GlossaryTerm API to return quickAnswer
- [x] Display quickAnswer prominently at top of term detail (GlossaryTermDetail.tsx)
- Note: Production migration was run via `/api/admin/glossary/run-quick-answer-migration` endpoint (2026-01-17)
- Note: Had to update `transformTerm()` in `server/src/controllers/glossary.ts` to include `quickAnswer` field in API response

**UI Change** (`src/components/Glossary/GlossaryTermDetail.tsx`):
```tsx
{term.quickAnswer && (
  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
      Quick Answer
    </h3>
    <p className="text-blue-900 dark:text-blue-100">
      {term.quickAnswer}
    </p>
  </div>
)}
```

### 6. Create Admin Tool to Generate Quick Answers

**Backend endpoints added** (`server/src/routes/glossary.ts`):

- [x] Add `POST /api/admin/glossary/:id/generate-quick-answer` - Generate quick answer for single term
- [x] Use Claude API to generate 50-70 word summary
- [x] Save to database
- [x] Add `POST /api/admin/glossary/generate-quick-answers-bulk` - Bulk generate option for all terms without quickAnswer

Note: Frontend admin UI button can be added later; backend API is ready for use.

**Bulk Generation Complete (2026-01-17)**:
- 140 quick answers generated via bulk endpoint (in batches of 5 to avoid Lambda timeout)
- 0 failures
- All glossary terms now have quick answers populated

**Prompt Template**:
```
Write a 50-70 word quick answer explaining "${term.term}" for someone
new to AI. Start with "${term.term} is..." and be factual and concise.
Do not use marketing language. Include when it was introduced if relevant.

Term definition: ${term.definition}
Category: ${term.category}
```

### 7. Optimize Content Structure for AI Extraction

**All Educational Pages**:

- [ ] Ensure H2/H3 headings are question-formatted where appropriate
- [ ] Keep answer paragraphs under 50 words when possible
- [ ] Front-load key facts in first sentence
- [ ] Add structured lists for multi-part answers

**Example restructure for Person pages**:
```markdown
## Who is Sam Altman?
Sam Altman is the CEO of OpenAI, the company behind ChatGPT...

## What is Sam Altman known for?
Sam Altman is best known for leading OpenAI through the launch of...

## Career History
- 2005-2014: President of Y Combinator
- 2015-present: CEO of OpenAI
```

### 8. Add HowTo Schema for Tutorial Content

**If applicable to Learning Paths**:

- [ ] Identify learning path content that could use HowTo schema
- [ ] Create `generateHowToJsonLd()` helper
- [ ] Add to relevant pages

## Browser Testing & Validation (REQUIRED)

> **CRITICAL**: Use Claude Chrome MCP tools to verify FAQ schema is rendering correctly.

### FAQ Schema Validation
- [ ] Navigate to `/people/sam-altman` and view page source
- [ ] Search for `FAQPage` in JSON-LD scripts
- [ ] Verify questions and answers are populated correctly
- [ ] Test with Google Rich Results Test: `https://search.google.com/test/rich-results?url=https://letaiexplainai.com/people/sam-altman`

### Organization FAQ Validation
- [ ] Navigate to `/organizations/openai` and view page source
- [ ] Verify FAQPage schema is present
- [ ] Test with Google Rich Results Test

### Quick Answer Display Validation
- [x] Navigate to `/glossary` and select a term with quickAnswer
- [x] Verify Quick Answer box displays prominently
- [x] Verified 2026-01-17 - Quick Answer displays in orange/amber gradient box with lightbulb icon

## Acceptance Criteria

- [x] FAQ schema appears on all Person profile pages
- [x] FAQ schema appears on all Organization profile pages
- [ ] FAQ schema validated by Google Rich Results Test (shows "FAQ" as valid)
- [x] Quick Answer field exists in database for glossary terms (140 terms populated)
- [x] Quick Answer displays prominently on glossary term detail
- [x] Admin can generate quick answers via Claude API
- [x] Quick Answer display validated in browser (2026-01-17)

## Notes for Future Developers

### FAQ Schema Best Practices
- Questions should be natural language (how users would search)
- Answers should be concise (under 300 characters ideally)
- Don't include questions without substantive answers
- Avoid promotional language in answers

### AI Overview Optimization Tips
- Lead with the answer, then provide context
- Use clear, factual language
- Include specific dates, numbers, names
- Structure content in easily extractable chunks

### Testing FAQ Rich Results
- Use Google's Rich Results Test tool
- Check Search Console for FAQ impressions
- Monitor for "FAQ" appearance in search results
- Note: FAQ results may take days/weeks to appear after indexing

## Dependencies

- Sprint SEO-1 must be completed (done)
- Claude API key for quick answer generation
- Database migration for quickAnswer field

## Estimated Impact

| Metric | Expected Change |
|--------|-----------------|
| FAQ Rich Results | New capability |
| AI Overview Citations | +20-30% visibility |
| Click-through Rate | +10-15% (FAQ snippets) |
| Time to Index | Faster (structured data) |
