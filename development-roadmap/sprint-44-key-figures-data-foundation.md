# Sprint 44: Key Figures - Data Foundation

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 43 complete

**Status**: COMPLETE (2025-12-23)

## Overview

Introduce Key Figures as a first-class entity in the AI Timeline taxonomy. This sprint establishes the database schema, name normalization utilities, and matching algorithms needed for robust person tracking across the system.

**Goal**: Create the data foundation that supports manual CRUD, pipeline extraction, and intelligent deduplication of AI key figures.

---

## Phase 1: Database Schema

### 44.1 Create KeyFigure Model
- [x] Add `KeyFigure` model to `prisma/schema.prisma`
- [x] Fields: id (kebab-case), canonicalName (unique), aliases (JSON array)
- [x] Fields: shortBio, fullBio, primaryOrg, previousOrgs (JSON array)
- [x] Fields: role (enum: researcher, executive, founder, policy_maker, other)
- [x] Fields: notableFor, imageUrl, wikipediaUrl, linkedInUrl, twitterHandle
- [x] Fields: status (draft, pending_review, published), sourceArticleId
- [x] Fields: createdAt, updatedAt
- [x] Add indexes on canonicalName, role, status

### 44.2 Create MilestoneContributor Junction Table
- [x] Add `MilestoneContributor` model for M:N relationship
- [x] Fields: id, milestoneId, keyFigureId, contributionType
- [x] contributionType enum: lead, co_author, advisor, founder, mentioned
- [x] Add unique constraint on [milestoneId, keyFigureId]
- [x] Add relations to Milestone and KeyFigure models

### 44.3 Create KeyFigureDraft Model
- [x] Add `KeyFigureDraft` model for pipeline-extracted figures pending review
- [x] Fields: id, articleId (relation to IngestedArticle)
- [x] Fields: extractedName, normalizedName, context (sentence where mentioned)
- [x] Fields: suggestedBio, suggestedOrg, suggestedRole
- [x] Fields: matchedFigureId (potential duplicate), matchConfidence (0-1)
- [x] Fields: status (pending, approved, rejected, merged), reviewNotes
- [x] Fields: createdAt, updatedAt
- [x] Add indexes on status, articleId

### 44.4 Create Database Migration
- [x] Add migration SQL to `server/src/controllers/migrations.ts`
- [x] Add `0006_key_figures` to available migrations
- [x] Create local migration file in `prisma/migrations/0006_add_key_figures/`
- [x] Run migration in production via API

---

## Phase 2: Name Normalization Utility

### 44.5 Create Name Normalizer Module
- [x] Create `server/src/lib/nameNormalizer.ts`
- [x] Implement `normalizeName(name: string): NormalizedName`
- [x] Remove titles/suffixes: Dr., Prof., PhD, Jr., Sr., III, etc.
- [x] Handle middle initials (extract and store separately)
- [x] Lowercase for comparison
- [x] Generate kebab-case ID from normalized name

```typescript
interface NormalizedName {
  canonical: string;      // "Geoffrey Hinton"
  normalized: string;     // "geoffrey hinton"
  id: string;             // "geoffrey-hinton"
  middleInitial?: string; // "E"
  removedPrefixes: string[]; // ["Dr."]
  removedSuffixes: string[]; // ["PhD"]
}
```

### 44.6 Create Common Variants Generator
- [x] Implement `generateVariants(name: string): string[]`
- [x] First name nicknames: Geoffrey → Geoff, Jeff; William → Will, Bill
- [x] With/without middle initial variations
- [x] Store variant dictionary in `server/src/lib/nameVariants.ts`

### 44.7 Add Unit Tests for Normalizer
- [ ] Test title removal: "Dr. Geoffrey E. Hinton, PhD" → "Geoffrey Hinton"
- [ ] Test ID generation: "Sam Altman" → "sam-altman"
- [ ] Test variant generation
- [ ] Test edge cases: hyphenated names, suffixes, international names

---

## Phase 3: Matching Service

### 44.8 Create Key Figure Matcher Service
- [x] Create `server/src/services/keyFigureMatcher.ts`
- [x] Implement `findMatch(name: string): MatchResult`
- [x] Step 1: Exact canonical name match
- [x] Step 2: Exact alias match (check all KeyFigure.aliases arrays)
- [x] Step 3: Fuzzy match with confidence scoring

```typescript
interface MatchResult {
  matched: boolean;
  keyFigure?: KeyFigure;
  matchType: 'exact_canonical' | 'exact_alias' | 'fuzzy' | 'none';
  confidence: number;  // 0-1
  candidates?: Array<{ keyFigure: KeyFigure; confidence: number }>;
}
```

### 44.9 Implement Fuzzy Matching Algorithm
- [x] Implement Jaro-Winkler similarity (no external dependency)
- [x] Configure thresholds: ≥0.95 auto-match, 0.80-0.95 candidates, <0.80 no match
- [x] Return top 3 candidates when no exact match
- [x] Add nickname-aware matching boost

### 44.10 Add Matcher Integration Tests
- [ ] Test exact canonical match
- [ ] Test alias match: "Geoff Hinton" matches "Geoffrey Hinton"
- [ ] Test fuzzy match: "Geoffrey Hinten" (typo) finds "Geoffrey Hinton"
- [ ] Test no-match returns candidates

---

## Phase 4: Seed Data

### 44.11 Create Key Figures Seed Script
- [x] Create `prisma/seedKeyFigures.ts`
- [x] Include foundational AI figures (24 people):
  - Pioneers: Alan Turing, Claude Shannon, John McCarthy, Marvin Minsky
  - Deep Learning: Geoffrey Hinton, Yann LeCun, Yoshua Bengio, Fei-Fei Li
  - Modern AI: Sam Altman, Dario Amodei, Demis Hassabis, Ilya Sutskever
  - Industry: Jensen Huang, Satya Nadella, Sundar Pichai, Mark Zuckerberg
- [x] Include common aliases for each figure
- [x] Include short bios sourced from Wikipedia

### 44.12 Add Seed Script to package.json
- [x] Add `npm run db:seed:key-figures` command
- [x] Add idempotent upsert logic (updates existing, creates new)

### 44.13 Test Seed Execution
- [x] Run seed via API endpoint (RDS in VPC requires Lambda access)
- [x] Verify all 22 figures created with correct data
- [x] Verify aliases stored correctly as JSON

---

## Phase 5: TypeScript Types

### 44.14 Create Key Figure Types
- [x] Create `src/types/keyFigure.ts`
- [x] Define Zod schemas for validation
- [x] Export TypeScript types derived from Zod
- [x] Define role enum values
- [x] Add role display labels and badge colors

```typescript
export const KeyFigureRoleEnum = z.enum([
  'researcher',
  'executive',
  'founder',
  'policy_maker',
  'engineer',
  'other'
]);

export const KeyFigureSchema = z.object({
  id: z.string(),
  canonicalName: z.string(),
  aliases: z.array(z.string()),
  shortBio: z.string(),
  fullBio: z.string().optional(),
  primaryOrg: z.string().optional(),
  previousOrgs: z.array(z.string()),
  role: KeyFigureRoleEnum,
  notableFor: z.string(),
  imageUrl: z.string().url().optional(),
  wikipediaUrl: z.string().url().optional(),
  status: z.enum(['draft', 'pending_review', 'published']),
});
```

### 44.15 Create Contribution Type Enum
- [x] Add `ContributionType` enum to types
- [x] Values: lead, co_author, advisor, founder, mentioned
- [x] Add contribution display labels

---

## Files Created/Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `prisma/schema.prisma` | MODIFY | Add KeyFigure, MilestoneContributor, KeyFigureDraft models |
| `prisma/migrations/0006_add_key_figures/migration.sql` | CREATE | Local migration SQL file |
| `server/src/controllers/migrations.ts` | MODIFY | Add 0006_key_figures migration SQL, handler, and seed endpoint |
| `server/src/routes/migrations.ts` | MODIFY | Add seed-key-figures route |
| `server/src/lib/nameNormalizer.ts` | CREATE | Name normalization utilities |
| `server/src/lib/nameVariants.ts` | CREATE | Nickname/variant dictionary (100+ names) |
| `server/src/services/keyFigureMatcher.ts` | CREATE | Matching service with Jaro-Winkler fuzzy search |
| `src/types/keyFigure.ts` | CREATE | Zod schemas and TypeScript types |
| `prisma/seedKeyFigures.ts` | CREATE | Seed data for foundational AI figures (local) |
| `package.json` | MODIFY | Add db:seed:key-figures script |

---

## Deployment Steps

### 1. Deploy Backend
```bash
cd infra && sam build && sam deploy --no-confirm-changeset
```

### 2. Run Migration
```bash
# Via API (admin authenticated)
POST https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/admin/migrations/run
Body: { "migration": "0006_key_figures" }
```

### 3. Run Seed (from local with prod DATABASE_URL)
```bash
export DATABASE_URL=$(aws ssm get-parameter \
  --name "/ai-timeline/prod/database-url" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text)

npm run db:seed:key-figures
```

### 4. Deploy Frontend (if needed)
```bash
npm run build
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"
```

---

## Success Criteria

- [x] KeyFigure, MilestoneContributor, KeyFigureDraft models in Prisma schema
- [x] Migration SQL ready for production deployment
- [x] Name normalizer correctly handles titles, suffixes, middle initials
- [x] Matcher finds exact matches by canonical name and aliases
- [x] Matcher returns fuzzy candidates with confidence scores (Jaro-Winkler)
- [x] 22 foundational AI figures seeded with bios and aliases
- [x] TypeScript types available for frontend consumption
- [x] Migration run in production (0006_key_figures)
- [x] Seed data inserted in production (22 KeyFigure records)

---

## Next Sprint

**Sprint 45**: Key Figures - API & Admin CRUD
- REST API endpoints for key figures
- Admin list page with search
- Create/Edit forms
- Basic integration with existing admin panel
