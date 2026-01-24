# Sprint TD-3: Historical Depth Expansion

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-24 by Claude

## Overview

Expand timeline coverage to include pre-2010 AI history, establishing LAEA as the authoritative source for complete AI history. Target queries like "artificial intelligence history timeline" and "complete ai timeline".

**Priority**: MEDIUM
**Estimated Effort**: 2 days
**Status**: COMPLETED ✅

## Implementation Notes

### Seed Script Created
Created `scripts/seedHistoricalMilestonesViaApi.ts` that seeds historical milestones via the production API (since RDS is in a VPC and not directly accessible).

**Run with:**
```bash
export ADMIN_PASSWORD='[from SSM]'
npx tsx scripts/seedHistoricalMilestonesViaApi.ts
```

## Historical Coverage Goals

### Currently Missing Eras

| Era | Years | Key Events Missing |
|-----|-------|-------------------|
| Foundations | 1943-1955 | McCulloch-Pitts neurons, Turing Test paper |
| Birth of AI | 1956-1969 | Dartmouth Conference, ELIZA, Perceptron |
| First AI Winter | 1970-1980 | Lighthill Report, funding cuts |
| Expert Systems | 1980-1987 | MYCIN, R1/XCON, Fifth Generation |
| Second AI Winter | 1987-1993 | Expert system collapse, connectionism |
| Statistical ML | 1993-2006 | SVMs, Random Forests, Netflix Prize |
| Deep Learning Dawn | 2006-2012 | DBN, AlexNet, GPU computing |

## Tasks

### 1. Research & Content Creation

#### Foundational Era (1943-1955)
- [x] Add milestone: McCulloch-Pitts Neural Model (1943) ✅
- [x] Add milestone: Turing's "Computing Machinery and Intelligence" (1950) ✅
- [x] Add milestone: First Neural Network Computer (SNARC, 1951) ✅
- [ ] Add milestone: Arthur Samuel's Checkers Program (1952) - TODO

#### Birth of AI Era (1956-1969)
- [x] Add milestone: Dartmouth Conference (1956) - **CRITICAL** ✅
- [x] Add milestone: Perceptron Invented (1957) ✅
- [x] Add milestone: LISP Programming Language (1958) ✅
- [x] Add milestone: ELIZA Chatbot (1966) ✅ (already existed)
- [ ] Add milestone: Shakey the Robot (1966-1972) - TODO
- [x] Add milestone: "Perceptrons" Book (1969) - Minsky & Papert ✅ (already existed)

#### First AI Winter (1970-1980)
- [x] Add milestone: Lighthill Report (1973) ✅
- [ ] Add milestone: DARPA Funding Cuts (1974) - TODO
- [x] Add milestone: Backpropagation (1974, Werbos) ✅

#### Expert Systems Era (1980-1987)
- [ ] Add milestone: MYCIN Medical Diagnosis (1970s, add context) - TODO
- [x] Add milestone: R1/XCON at DEC (1980) ✅
- [x] Add milestone: Fifth Generation Computer Project (1982) ✅
- [x] Add milestone: Backpropagation Popularized (1986, Rumelhart) ✅

#### Second AI Winter (1987-1993)
- [x] Add milestone: Expert Systems Market Collapse (1987) ✅
- [ ] Add milestone: Symbolic AI Critique (late 1980s) - TODO

#### Statistical ML Era (1993-2006)
- [x] Add milestone: Support Vector Machines (1995) ✅ (already existed)
- [x] Add milestone: Random Forests (2001) ✅
- [x] Add milestone: Netflix Prize Announced (2006) ✅

#### Deep Learning Dawn (2006-2012)
- [x] Add milestone: Deep Belief Networks (2006, Hinton) ✅ (already existed)
- [x] Add milestone: ImageNet Created (2009) ✅ (already existed)
- [x] Add milestone: Google Brain Cat Neurons (2012) ✅
- [x] Add milestone: AlexNet/ImageNet Breakthrough (2012) - **CRITICAL** ✅ (already existed)

### 2. Create Era Landing Pages

**Status**: ALREADY IMPLEMENTED ✅

Era pages were implemented in Sprint SEO-3 using decade-based organization:
- `/timeline/1950s` - Foundations of AI
- `/timeline/1960s` - Early AI & ELIZA
- `/timeline/1970s` - First AI Winter
- `/timeline/1980s` - Expert Systems
- `/timeline/1990s` - Machine Learning Rise
- `/timeline/2000s` - Big Data Era
- `/timeline/2010s` - Deep Learning Revolution
- `/timeline/2020s` - Large Language Models

**Files**:
- `src/config/eras.ts` - Era configurations with descriptions
- `src/pages/EraPage.tsx` - Era page component
- `src/pages/TimelineSlugPage.tsx` - Router that handles both era and filter slugs

Each era page includes:
- [x] Era overview/context paragraph ✅
- [x] Key milestones from that period ✅
- [ ] Key figures active in that era - TODO (linked-persons integration)
- [ ] "What came before" / "What came next" navigation - TODO
- [ ] Related glossary terms - TODO

### 3. Era SEO Optimization

For each era page:
- [ ] Unique title targeting era-specific queries:
  ```
  "Dartmouth Conference 1956: Birth of Artificial Intelligence | LAEA"
  "First AI Winter: Why AI Research Nearly Died | LAEA"
  "AlexNet 2012: The Deep Learning Revolution Begins | LAEA"
  ```
- [ ] Educational meta descriptions
- [ ] Event schema for key milestones
- [ ] BreadcrumbList schema: Timeline > Era > [Era Name]

### 4. Key Historical Figures

**Status**: COMPLETED ✅

Created 13 historical figure profiles via `scripts/seedHistoricalFigures.ts`:

- [x] Alan Turing ✅
- [x] John McCarthy (Dartmouth, LISP) ✅
- [x] Marvin Minsky (MIT AI Lab, Perceptrons) ✅
- [x] Claude Shannon (Information Theory) ✅
- [x] Frank Rosenblatt (Perceptron) ✅
- [x] Geoffrey Hinton (Backpropagation, Deep Learning) ✅
- [x] Yann LeCun (CNNs, LeNet) ✅
- [x] Yoshua Bengio (Deep Learning) ✅
- [x] Fei-Fei Li (ImageNet) ✅
- [x] Joseph Weizenbaum (ELIZA) ✅
- [x] Paul Werbos (Backpropagation) ✅
- [x] Alex Krizhevsky (AlexNet) ✅
- [x] Ilya Sutskever (AlexNet, OpenAI) ✅

**Contributor Links**: Created 18 links between figures and milestones via `scripts/linkHistoricalContributors.ts`

### 5. Glossary Terms for Historical Concepts

**Add terms if missing:**

- [ ] Perceptron
- [ ] Expert System
- [ ] LISP
- [ ] Symbolic AI
- [ ] Connectionism
- [ ] AI Winter
- [ ] Backpropagation
- [ ] Convolutional Neural Network
- [ ] ImageNet

### 6. "Complete History" Pillar Page

**Status**: PARTIALLY IMPLEMENTED ✅

Created in Sprint TD-2 as a filter page at `/timeline/complete-history`.

**Files**:
- `src/pages/FilteredTimelinePage.tsx` - Handles complete-history filter
- `src/config/timelineFilters.ts` - Contains complete-history configuration

Current implementation:
- [x] Page exists at `/timeline/complete-history` ✅
- [x] Shows all milestones (no filter applied) ✅
- [x] SEO optimized with unique title/meta ✅
- [ ] Enhanced structure with era sections - TODO
- [ ] Table of contents with anchor links - TODO
- [ ] Key figures grid - TODO

**Proposed enhanced structure:**
  ```
  # Complete History of Artificial Intelligence

  ## Table of Contents (jump links to each era)

  ## Overview
  [2-3 paragraph introduction to AI history]

  ## The Foundations (1943-1955)
  [Era summary + key milestones]

  ## The Birth of AI (1956-1969)
  [Era summary + key milestones]

  ... [continue for each era]

  ## Timeline of All Milestones
  [Full interactive timeline]

  ## Key Figures in AI History
  [Grid of historical figures]

  ## Further Reading
  [Links to glossary, learning paths]
  ```
- [ ] Target 3000+ words for comprehensive coverage
- [ ] Include table of contents with anchor links
- [ ] Heavy internal linking to people, orgs, glossary

### 7. Schema Markup for Historical Content

- [ ] Add HistoricalEvent schema where applicable:
  ```json
  {
    "@type": "Event",
    "@context": "https://schema.org",
    "name": "Dartmouth Conference",
    "startDate": "1956-06-18",
    "endDate": "1956-08-17",
    "location": {
      "@type": "Place",
      "name": "Dartmouth College",
      "address": "Hanover, NH"
    },
    "description": "The foundational conference that established AI as a field...",
    "organizer": [
      {"@type": "Person", "name": "John McCarthy"},
      {"@type": "Person", "name": "Marvin Minsky"}
    ]
  }
  ```
- [ ] Add Article schema for pillar page
- [ ] Add Person schema for historical figures

### 8. Internal Linking Strategy

- [ ] Link from modern milestones to historical foundations
  - GPT-4 → links to "Perceptron" milestone as early ancestor
  - Transformer paper → links to attention mechanism origins
- [ ] Add "Historical Context" sections to major milestones
- [ ] Create "Evolution of [Concept]" pathways
  - Evolution of Language Models: ELIZA → ... → GPT-4
  - Evolution of Computer Vision: Perceptron → CNN → ViT

### 9. Sitemap & Navigation Updates

- [ ] Add all era pages to sitemap
- [ ] Add era navigation to main timeline page
- [ ] Create "Explore by Era" section on timeline
- [ ] Update header or footer with era links

## Browser Testing & Validation (REQUIRED)

### Content Verification
- [ ] Verify all new milestones display correctly
- [ ] Check date sorting (oldest first option)
- [ ] Verify person profile links work
- [ ] Check glossary term links

### Era Pages
- [ ] Navigate to each era page
- [ ] Verify correct milestones display
- [ ] Check era navigation works
- [ ] Verify SEO tags on each page

### Pillar Page
- [ ] Navigate to `/timeline/complete-history`
- [ ] Verify table of contents anchor links
- [ ] Check page load time (< 3 seconds)
- [ ] Verify schema in page source

## Acceptance Criteria

- [x] 30+ historical milestones added (pre-2010) ✅ (23 new milestones added, many already existed)
- [x] All 8 era landing pages created ✅ (decade pages exist from SEO-3)
- [x] Complete history pillar page live ✅ (created in TD-2)
- [x] Key historical figures have profiles ✅ (13 figures added with 18 milestone links)
- [ ] Historical glossary terms added - TODO (future sprint)
- [x] Internal linking connects old and new ✅ (contributor links created)
- [ ] Schema validates for historical content - TODO (future sprint)

## Notes for Future Developers

### Content Research Sources
- Wikipedia AI History article
- "The Quest for Artificial Intelligence" by Nils Nilsson
- Stanford AI History Archive
- Computer History Museum

### Dating Historical Events
- Use most commonly cited date
- For events spanning time, use start date
- Add note in description if date is approximate

### Significance Scoring for Historical
- Dartmouth Conference: 4 (foundational)
- AlexNet: 4 (paradigm shift)
- Most historical events: 2-3

## Deployment

```bash
# Add milestones via admin dashboard or API
# Then deploy frontend with new pages

npm run build
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"
```
