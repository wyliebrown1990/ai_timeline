# Sprint 43: Glossary Extraction Pipeline Refactor

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 32 (AI Analysis Pipeline)

**Status**: ✅ COMPLETE (2025-12-22)

## Overview

Refactor the glossary term extraction pipeline to remove the flawed "guess if there are new terms" gate and run extraction for all relevant articles.

**Problem**: The screening stage asked Claude Haiku to guess `hasNewGlossaryTerms: true/false` without knowing what terms already exist in the database. This caused terms like "RLVR" to be missed.

**Solution**: Always run glossary extraction for relevant articles, deduplicate against both published terms AND pending drafts.

---

## What Was Broken

```
Screening (Haiku) → guesses "hasNewGlossaryTerms" (no DB context!) → maybe runs extraction
```

## What Was Fixed

```
Screening → if (milestone-worthy OR relevance >= 0.6) → Extract terms → Dedupe against DB + pending drafts → Create drafts
```

---

## Implementation Summary

### 43.1 Removed `hasNewGlossaryTerms` from Screening ✅
- [x] Removed field from `ScreeningResult` interface in `screening.ts`
- [x] Removed field from screening prompt
- [x] Removed from Zod validation schema

### 43.2 Updated Article Analyzer ✅
- [x] Removed `if (screening.hasNewGlossaryTerms)` gate
- [x] Changed gate to `if (screening.isMilestoneWorthy || screening.relevanceScore >= 0.6)`
- [x] Added `getPendingGlossaryDrafts()` function for deduplication
- [x] Deduplication now checks both published terms AND pending drafts

### 43.3 Glossary Extractor Improvements ✅
- [x] Increased `max_tokens` from 1500 to 2500 to prevent truncation
- [x] Added JSON repair function for malformed LLM responses
- [x] Added better logging for debugging
- [x] Existing prompt already handles extraction + definition in one call (simpler than planned multi-stage approach)

### 43.4 Async Reanalyze Endpoint ✅
- [x] Modified `reanalyzeArticle` to reset status without running analysis synchronously
- [x] Prevents 30s API Gateway timeout issues
- [x] Analysis runs via Ingestion Lambda (300s timeout)

---

## Testing Results ✅

### Manual Test: Karpathy "2025 LLM Year in Review" Article
- [x] Article reset to pending
- [x] Re-analyzed via Ingestion Lambda
- [x] **RLVR term created** - "Reinforcement Learning from Verifiable Rewards (RLVR)"
- [x] **Bonus term created** - "Ghosts vs. Animals / Jagged Intelligence"
- [x] Deduplication working (103 published + pending drafts checked)

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `server/src/services/ingestion/screening.ts` | MODIFY | Removed `hasNewGlossaryTerms` field and prompt |
| `server/src/services/ingestion/articleAnalyzer.ts` | MODIFY | Changed gate logic, added pending drafts deduplication |
| `server/src/services/ingestion/glossaryExtractor.ts` | MODIFY | JSON repair, increased tokens, better logging |
| `server/src/controllers/articles.ts` | MODIFY | Async reanalyze endpoint |

---

## Success Criteria - All Met ✅

- [x] `hasNewGlossaryTerms` removed from screening
- [x] Glossary extraction runs for milestone-worthy OR high-relevance (>=0.6) articles
- [x] Deduplication against published terms AND pending drafts
- [x] Re-analyzing Karpathy article creates RLVR draft
- [x] No duplicate glossary drafts created

---

## Future Enhancements (Not Implemented)

The original plan included more sophisticated features that weren't needed for the core fix:

1. **Multi-stage extraction**: Separate extraction → deduplication → generation calls
2. **Acronym matching**: RLVR ↔ "Reinforcement Learning from Verifiable Rewards"
3. **Fuzzy matching**: "test-time compute" ↔ "test time compute"

These could be added later if duplicate detection needs improvement.
