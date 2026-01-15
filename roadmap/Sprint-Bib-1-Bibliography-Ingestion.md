# Sprint Bib-1: Bibliography Ingestion Automation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-15 by Claude

## Overview

Automate ingestion of bibliography entries from "A Brief History of Intelligence" by Max Bennett into the AI Timeline milestone database.

**Source**: https://www.abriefhistoryofintelligence.com/bibliography
**Estimated Entries**: ~1,200 total, filter to ~200-300 AI/ML-focused
**Content Type**: Milestones (historical events/papers/breakthroughs)

### Key Requirements
1. Fetch and parse all bibliography entries from the webpage
2. Filter to AI/ML-focused entries using LLM classification
3. Deduplicate against existing milestones by title similarity
4. For each new entry:
   - Try to web scrape source URL for metadata + actual publication date
   - If scraping fails, use LLM to generate full milestone data
5. Auto-assign categories (RESEARCH, MODEL_RELEASE, BREAKTHROUGH, etc.)
6. Create validated milestone objects
7. Track and report success/failure rates

---

## Tasks

### Phase 1: Bibliography Parser

- [ ] Create `server/src/services/ingestion/bibliographyIngestion/` directory
- [ ] Create `types.ts` with interfaces:
  ```typescript
  interface BibliographyEntry {
    title: string;
    authors: string[];
    year: number;
    sourceUrl?: string;
    type: 'book' | 'paper' | 'article' | 'conference' | 'other';
    doi?: string;
  }

  interface ParsedBibliography {
    entries: BibliographyEntry[];
    parseErrors: string[];
    totalFound: number;
  }
  ```
- [ ] Create `bibliographyParser.ts`:
  - [ ] Fetch webpage using PlaywrightFetcher or direct HTTP
  - [ ] Parse HTML to extract bibliography entries
  - [ ] Handle multiple citation formats (APA, Chicago, etc.)
  - [ ] Extract: title, authors, year, URL/DOI, publication type
  - [ ] Return structured `ParsedBibliography` object
- [ ] Add unit tests for parser with sample HTML

### Phase 2: AI/ML Filter

- [ ] Create `aimlFilter.ts`:
  - [ ] Define AI/ML topic keywords list:
    ```
    artificial intelligence, machine learning, neural network, deep learning,
    reinforcement learning, natural language processing, computer vision,
    robotics, cognitive science, computational neuroscience, expert systems,
    pattern recognition, backpropagation, perceptron, transformer, attention,
    GPT, BERT, CNN, RNN, LSTM, GAN, autoencoder, optimization, gradient descent
    ```
  - [ ] Create LLM-based classifier function:
    ```typescript
    async function classifyEntry(entry: BibliographyEntry): Promise<{
      isAIML: boolean;
      confidence: number;
      reasoning: string;
      suggestedCategory: MilestoneCategory;
    }>
    ```
  - [ ] Batch processing with rate limiting (50 entries at a time)
  - [ ] Cache classification results to avoid re-processing
- [ ] Target: Filter 1,200 entries down to ~200-300 AI/ML relevant

### Phase 3: Duplicate Detection

- [ ] Create `bibliographyDeduplicator.ts`:
  - [ ] Implement title similarity scoring (Levenshtein + normalized)
  - [ ] Function signature:
    ```typescript
    async function checkDuplicate(entry: BibliographyEntry): Promise<{
      isDuplicate: boolean;
      matchedMilestoneId?: string;
      matchedTitle?: string;
      similarityScore: number;
    }>
    ```
  - [ ] Threshold: > 0.85 similarity = duplicate
  - [ ] Also check by author + year combination
  - [ ] Also check by DOI if available
- [ ] Fetch all existing milestones for comparison
- [ ] Log duplicates found for review

### Phase 4: Source URL Scraper

- [ ] Create `sourceMetadataFetcher.ts`:
  - [ ] Try to fetch source URL using PlaywrightFetcher
  - [ ] Extract metadata from academic sources:
    - [ ] DOI.org redirects
    - [ ] arXiv.org papers
    - [ ] ACM Digital Library
    - [ ] IEEE Xplore
    - [ ] Google Scholar
    - [ ] PubMed/NCBI
    - [ ] Publisher sites (Springer, Elsevier, etc.)
  - [ ] Extract actual publication date (not just year)
  - [ ] Extract abstract/description if available
  - [ ] Extract organization/institution
  - [ ] Handle rate limiting and retries
- [ ] Return structured metadata or `null` on failure:
  ```typescript
  interface ScrapedMetadata {
    actualDate?: Date;
    abstract?: string;
    organization?: string;
    additionalAuthors?: string[];
    citations?: number;
    pdfUrl?: string;
  }
  ```

### Phase 5: LLM Fallback Generator

- [ ] Create `milestoneGenerator.ts`:
  - [ ] Use Claude to generate milestone data from bibliography entry
  - [ ] Prompt template for historical AI/ML works:
    ```
    Generate milestone data for this historical AI/ML work:
    Title: {title}
    Authors: {authors}
    Year: {year}

    Provide:
    1. description (2-3 paragraphs, educational tone)
    2. significance (1-4 scale based on historical impact)
    3. category (research/model_release/breakthrough/product/regulation/industry)
    4. tldr (1-2 sentences)
    5. simpleExplanation (plain English)
    6. businessImpact (why it mattered)
    7. historicalContext (how it fits in AI history)
    8. tags (5-8 relevant keywords)
    9. bestGuessDate (if only year known, estimate month based on conference/publication patterns)
    ```
  - [ ] Validate generated data against milestone schema
  - [ ] Handle edge cases (very old papers, obscure works)

### Phase 6: Category Auto-Assignment

- [ ] Create `categoryAssigner.ts`:
  - [ ] Rules-based initial classification:
    ```
    - Conference papers → RESEARCH
    - Journal articles → RESEARCH
    - Books → RESEARCH (unless product-focused)
    - Technical reports → RESEARCH
    - Product announcements → PRODUCT
    - Policy documents → REGULATION
    - Company papers → INDUSTRY (if about business, else RESEARCH)
    ```
  - [ ] LLM refinement for ambiguous cases
  - [ ] Special handling for breakthrough papers:
    - [ ] Check if paper introduced foundational concept
    - [ ] Check citation count (if available) > 1000 → likely BREAKTHROUGH
    - [ ] Known breakthrough papers list (Attention Is All You Need, ImageNet, etc.)

### Phase 7: Milestone Validation & Publishing

- [ ] Create `bibliographyPublisher.ts`:
  - [ ] Validate all required fields present
  - [ ] Generate milestone ID in format: `E{YEAR}_{SLUG}`
  - [ ] Ensure date is valid (use Jan 1 if only year known, with flag)
  - [ ] Create milestone using existing `milestoneService.create()`
  - [ ] Link to subjects using existing subject classification pipeline
  - [ ] Batch publishing with transaction support
- [ ] Create dry-run mode for testing without database writes

### Phase 8: Orchestration & Reporting

- [ ] Create `bibliographyIngestionOrchestrator.ts`:
  - [ ] Main entry point function:
    ```typescript
    async function ingestBibliography(options: {
      sourceUrl: string;
      dryRun?: boolean;
      batchSize?: number;
      maxEntries?: number;
    }): Promise<IngestionReport>
    ```
  - [ ] Progress tracking with callbacks
  - [ ] Resume capability (save state to database)
- [ ] Create `IngestionReport` interface:
  ```typescript
  interface IngestionReport {
    totalEntriesParsed: number;
    aimlFiltered: number;
    duplicatesSkipped: number;
    scrapingSucceeded: number;
    scrapingFailed: number;
    llmGenerated: number;
    milestonesCreated: number;
    validationErrors: Array<{ entry: string; error: string }>;
    processingTimeMs: number;
  }
  ```
- [ ] Generate markdown report file after completion

### Phase 9: Admin API Endpoints

- [ ] Add routes to `server/src/routes/admin.ts`:
  - [ ] `POST /api/admin/bibliography/ingest` - Start ingestion
  - [ ] `GET /api/admin/bibliography/status` - Check progress
  - [ ] `GET /api/admin/bibliography/report` - Get last report
  - [ ] `POST /api/admin/bibliography/cancel` - Cancel in-progress
- [ ] Add controller in `server/src/controllers/bibliography.ts`

### Phase 10: Testing & Validation

- [ ] Unit tests for each module
- [ ] Integration test with sample of 10 entries
- [ ] Verify milestones appear correctly on timeline
- [ ] Check subject classification worked
- [ ] Validate no duplicate milestones created

---

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to validate after deployment.

### Post-Ingestion Validation
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to https://letaiexplainai.com/timeline and screenshot
- [ ] Search for newly created milestone titles
- [ ] Verify milestone cards display correctly
- [ ] Check milestone detail pages load
- [ ] Verify dates and categories are correct
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network for failed requests: `mcp__claude-in-chrome__read_network_requests`
- [ ] Screenshot sample of new milestones as evidence

---

## Acceptance Criteria

- [ ] Successfully parse 1,200+ entries from bibliography page
- [ ] Filter to 200-300 AI/ML-focused entries
- [ ] Skip all entries that match existing milestones (>0.85 similarity)
- [ ] For entries with accessible URLs, scrape actual publication dates
- [ ] For entries without scrapable URLs, generate complete milestone data via LLM
- [ ] All milestones have valid: title, description, date, category, significance
- [ ] Categories auto-assigned correctly (RESEARCH for papers, etc.)
- [ ] Generate comprehensive report with success/failure breakdown
- [ ] New milestones visible on production timeline
- [ ] No console errors on frontend
- [ ] All browser validation tasks completed with screenshots

---

## Technical Notes

### Existing Infrastructure to Leverage
- `PlaywrightFetcher` - For web scraping source URLs
- `milestoneService.create()` - For creating milestones
- `duplicateDetector.calculateTitleSimilarity()` - For deduplication
- `subjectClassifier` - For auto-tagging subjects
- `contentGenerator` prompt patterns - For LLM milestone generation

### Rate Limiting Considerations
- Anthropic API: Batch LLM calls, 50 at a time with delays
- Source URLs: 1 request per second, respect robots.txt
- Database: Use transactions for batch inserts

### Error Handling
- Continue on individual entry failures
- Log all errors with entry context
- Retry transient failures (network, rate limits) up to 3 times
- Generate partial report if cancelled mid-process

### Date Handling
- If only year known: Use January 1st with `dateApproximate: true` flag
- Try to find actual date from:
  1. Scraped source metadata
  2. Conference dates (if conference paper)
  3. Journal publication date
  4. LLM best guess based on historical knowledge

### Category Mapping
| Publication Type | Default Category | Override Conditions |
|-----------------|------------------|---------------------|
| Journal article | RESEARCH | If about product → PRODUCT |
| Conference paper | RESEARCH | If breakthrough → BREAKTHROUGH |
| Book | RESEARCH | If policy → REGULATION |
| Technical report | RESEARCH | If company → may be INDUSTRY |
| Preprint (arXiv) | RESEARCH | - |

---

## Files to Create

```
server/src/services/ingestion/bibliographyIngestion/
├── types.ts                    # Interfaces and types
├── bibliographyParser.ts       # HTML parsing
├── aimlFilter.ts               # LLM-based filtering
├── bibliographyDeduplicator.ts # Title similarity checking
├── sourceMetadataFetcher.ts    # URL scraping
├── milestoneGenerator.ts       # LLM fallback generation
├── categoryAssigner.ts         # Auto-categorization
├── bibliographyPublisher.ts    # Milestone creation
├── bibliographyIngestionOrchestrator.ts  # Main orchestrator
└── index.ts                    # Exports

server/src/controllers/
└── bibliography.ts             # Admin API handlers

server/src/routes/
└── (update admin.ts)           # Add bibliography routes
```

---

## Notes for Future Developers

1. **Bibliography Format**: The source page may have citations in various formats (APA, Chicago, etc.). The parser needs to handle multiple formats gracefully.

2. **DOI Resolution**: Many academic papers have DOIs - use doi.org redirects to find canonical URLs and metadata.

3. **Historical Papers**: Some papers from 1950s-1980s may not have online sources. LLM generation is critical for these.

4. **Significance Scoring**: Historical importance varies - foundational papers (Turing, Shannon, Minsky) should be 4, incremental work should be 1-2.

5. **Resume Capability**: The orchestrator should be able to resume from where it left off if interrupted. Consider storing progress in database.

6. **Dry Run First**: Always test with `dryRun: true` before actual ingestion to preview what would be created.
