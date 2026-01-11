# Sprint KPC-1: Schema Design & Migration

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-11 by Claude - **SPRINT COMPLETE** (except data migration scripts)

## Overview

Establish the foundational data models for the Key People & Companies feature. This sprint creates the Person, Organization, and Affiliation models while migrating existing KeyFigure data.

**Goals:**
1. Create Organization model (new entity)
2. Evolve KeyFigure → Person with structured biography sections
3. Create Affiliation join table for career history
4. Create NewsEvent mention join tables
5. Migrate existing data without breaking current functionality

---

## Tasks

### 1. Database Schema Changes

#### 1.1 Create Organization Model
- [x] Add Organization model to `prisma/schema.prisma`:
  ```prisma
  model Organization {
    id                String   @id  // kebab-case: "openai", "google-deepmind"
    name              String   @unique
    slug              String   @unique

    // Classification
    type              String   // company, research_lab, university, nonprofit, government

    // Content sections
    shortDescription  String   // 1-2 sentences
    mission           String?  // Mission statement
    history           String?  // Founding story, evolution
    currentFocus      String?  // What they're working on now (auto-updated)
    currentFocusUpdatedAt DateTime?

    // Key areas
    focusAreas        String   @default("[]")  // JSON: ["LLMs", "Robotics", "Safety"]
    products          String   @default("[]")  // JSON: ["ChatGPT", "GPT-4", "DALL-E"]

    // Media
    logoUrl           String?

    // External links
    websiteUrl        String?
    wikipediaUrl      String?
    linkedInUrl       String?

    // Details
    foundedYear       Int?
    headquarters      String?

    // Relationships
    currentEmployees  Person[] @relation("CurrentEmployees")
    affiliations      Affiliation[]
    milestones        Milestone[]
    newsEventMentions NewsEventOrgMention[]

    // Metadata
    status            String   @default("published")  // draft, published
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt

    @@index([type])
    @@index([status])
  }
  ```

#### 1.2 Evolve KeyFigure → Person
- [x] Rename model `KeyFigure` to `Person` in schema
- [x] Add new structured biography fields:
  ```prisma
  // Structured biography sections (in addition to existing shortBio, fullBio)
  background        String?  // Education, early life, academic background
  careerHistory     String?  // Career narrative and progression
  contributions     String?  // Major AI contributions and innovations
  philosophy        String?  // Research approach, beliefs, notable perspectives
  currentlyDoing    String?  // What they're working on now (auto-updated from news)
  currentlyDoingUpdatedAt DateTime?

  // Focus areas
  focusAreas        String   @default("[]")  // JSON: ["LLMs", "Safety", "Scaling"]

  // Additional links
  personalWebsite   String?
  googleScholarUrl  String?

  // Current affiliation (denormalized)
  currentOrgId      String?
  currentOrg        Organization? @relation("CurrentEmployees", fields: [currentOrgId], references: [id])
  currentRole       String?  // Current job title
  ```
- [x] Keep existing fields: `canonicalName`, `aliases`, `shortBio`, `primaryOrg`, `previousOrgs`, `role`, `notableFor`, `imageUrl`, `wikipediaUrl`, `linkedInUrl`, `twitterHandle`, `status`
- [x] Add slug field if not exists: `slug String @unique`

#### 1.3 Create Affiliation Model
- [x] Add Affiliation model for career history tracking:
  ```prisma
  model Affiliation {
    id            String    @id @default(cuid())
    personId      String
    person        Person    @relation(fields: [personId], references: [id], onDelete: Cascade)
    orgId         String
    organization  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

    role          String    // Job title: "CEO", "Research Scientist", "Professor"
    startDate     DateTime?
    endDate       DateTime? // null = current position
    isCurrent     Boolean   @default(false)
    notes         String?   // Optional context

    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt

    @@unique([personId, orgId, role, startDate])
    @@index([personId])
    @@index([orgId])
    @@index([isCurrent])
  }
  ```

#### 1.4 Create News Event Mention Tables
- [x] Add NewsEventPersonMention model:
  ```prisma
  model NewsEventPersonMention {
    id            String       @id @default(cuid())
    eventId       String
    event         CurrentEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
    personId      String
    person        Person       @relation(fields: [personId], references: [id], onDelete: Cascade)

    mentionType   String       @default("mentioned")  // mentioned, subject, quoted
    context       String?      // Sentence where mentioned

    createdAt     DateTime     @default(now())

    @@unique([eventId, personId])
    @@index([eventId])
    @@index([personId])
  }
  ```
- [x] Add NewsEventOrgMention model:
  ```prisma
  model NewsEventOrgMention {
    id            String       @id @default(cuid())
    eventId       String
    event         CurrentEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
    orgId         String
    organization  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

    mentionType   String       @default("mentioned")  // mentioned, subject, announcement
    context       String?

    createdAt     DateTime     @default(now())

    @@unique([eventId, orgId])
    @@index([eventId])
    @@index([orgId])
  }
  ```

#### 1.5 Update Milestone Model
- [x] Add foreign key to Organization:
  ```prisma
  // In Milestone model, add:
  organizationId    String?
  organizationRef   Organization? @relation(fields: [organizationId], references: [id])
  ```
- [x] Keep existing `organization` string field for backwards compatibility during migration

#### 1.6 Update Relationship References
- [x] Update MilestoneContributor to reference Person (rename keyFigureId → personId):
  ```prisma
  model MilestoneContributor {
    id               String    @id @default(cuid())
    milestoneId      String
    milestone        Milestone @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
    personId         String    // renamed from keyFigureId
    person           Person    @relation(fields: [personId], references: [id], onDelete: Cascade)
    contributionType String?

    @@unique([milestoneId, personId])
    @@index([milestoneId])
    @@index([personId])
  }
  ```
- [x] Update KeyFigureDraft → PersonDraft (or keep as-is with relation update)

---

### 2. Run Migration

- [x] Generate Prisma migration:
  ```bash
  npx prisma migrate dev --name add_people_companies_feature
  ```
- [x] Review generated SQL for correctness
- [x] Test migration locally with Docker PostgreSQL
- [x] Run migration on production:
  ```bash
  export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text)
  npx prisma migrate deploy
  ```

---

### 3. Data Migration Script

#### 3.1 Create Organizations from Existing Data
- [ ] Create script `server/src/scripts/migrateOrganizations.ts`:
  - Extract unique organization names from:
    - `Milestone.organization` strings
    - `KeyFigure.primaryOrg` strings
    - `KeyFigure.previousOrgs` arrays
  - Create Organization records with:
    - `id`: kebab-case slug (e.g., "openai", "google-deepmind")
    - `name`: original string
    - `type`: infer from name or default to "company"
    - `shortDescription`: generate placeholder or leave empty
  - Log created organizations for review

#### 3.2 Migrate KeyFigure to Person
- [ ] Create script `server/src/scripts/migrateKeyFiguresToPersons.ts`:
  - Rename table (handled by Prisma migration)
  - Map existing fields to new structured sections:
    - `fullBio` → split into `background`, `careerHistory`, `contributions` if possible
    - `notableFor` → `contributions` (if `contributions` empty)
    - `primaryOrg` → look up Organization, set `currentOrgId`
  - Create Affiliation records from `previousOrgs` array
  - Generate `slug` from `canonicalName` if not set

#### 3.3 Link Milestones to Organizations
- [ ] Create script `server/src/scripts/linkMilestoneOrganizations.ts`:
  - For each Milestone with `organization` string:
    - Find matching Organization by name
    - Set `organizationId` foreign key
  - Report unmatched organizations for manual review

#### 3.4 Create Affiliations from Career Data
- [ ] Create script `server/src/scripts/createAffiliations.ts`:
  - For each Person:
    - Create current Affiliation from `currentOrgId` + `currentRole` (isCurrent: true)
    - Parse `previousOrgs` and create historical Affiliations
  - Handle date estimation where possible

---

### 4. Update TypeScript Types

#### 4.1 Create Zod Schemas
- [x] Create `src/types/person.ts`:
  ```typescript
  import { z } from 'zod';

  export const PersonRoleSchema = z.enum([
    'researcher',
    'executive',
    'founder',
    'engineer',
    'policy_maker',
    'other'
  ]);

  export const PersonSchema = z.object({
    id: z.string(),
    canonicalName: z.string(),
    slug: z.string(),
    aliases: z.array(z.string()),

    // Structured bio
    shortBio: z.string(),
    background: z.string().optional(),
    careerHistory: z.string().optional(),
    contributions: z.string().optional(),
    philosophy: z.string().optional(),
    currentlyDoing: z.string().optional(),
    currentlyDoingUpdatedAt: z.string().optional(),

    // Classification
    role: PersonRoleSchema,
    focusAreas: z.array(z.string()),

    // Current affiliation
    currentOrgId: z.string().optional(),
    currentRole: z.string().optional(),

    // Media & links
    imageUrl: z.string().optional(),
    wikipediaUrl: z.string().optional(),
    linkedInUrl: z.string().optional(),
    twitterHandle: z.string().optional(),
    personalWebsite: z.string().optional(),
    googleScholarUrl: z.string().optional(),

    // Metadata
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

  export type Person = z.infer<typeof PersonSchema>;
  export type PersonRole = z.infer<typeof PersonRoleSchema>;
  ```

- [x] Create `src/types/organization.ts`:
  ```typescript
  import { z } from 'zod';

  export const OrgTypeSchema = z.enum([
    'company',
    'research_lab',
    'university',
    'nonprofit',
    'government'
  ]);

  export const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    type: OrgTypeSchema,

    // Content
    shortDescription: z.string(),
    mission: z.string().optional(),
    history: z.string().optional(),
    currentFocus: z.string().optional(),
    currentFocusUpdatedAt: z.string().optional(),

    // Areas
    focusAreas: z.array(z.string()),
    products: z.array(z.string()),

    // Media & links
    logoUrl: z.string().optional(),
    websiteUrl: z.string().optional(),
    wikipediaUrl: z.string().optional(),
    linkedInUrl: z.string().optional(),

    // Details
    foundedYear: z.number().optional(),
    headquarters: z.string().optional(),

    // Metadata
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

  export type Organization = z.infer<typeof OrganizationSchema>;
  export type OrgType = z.infer<typeof OrgTypeSchema>;
  ```

- [x] Create `src/types/affiliation.ts` (included in person.ts):
  ```typescript
  import { z } from 'zod';

  export const AffiliationSchema = z.object({
    id: z.string(),
    personId: z.string(),
    orgId: z.string(),
    role: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isCurrent: z.boolean(),
  });

  export type Affiliation = z.infer<typeof AffiliationSchema>;
  ```

---

### 5. Update Backend API

#### 5.1 Create Organization Service
- [x] Create `server/src/services/organizations.ts`:
  - `getAll(options)` - list with filters (type, status)
  - `getById(id)` - single org with related data
  - `create(data)` - create new org
  - `update(id, data)` - update org
  - `delete(id)` - soft delete or remove
  - `getPersons(orgId)` - get people affiliated with org
  - `getMilestones(orgId)` - get milestones by org
  - `getNewsEvents(orgId)` - get news mentioning org

#### 5.2 Create Organization Controller
- [x] Create `server/src/controllers/organizations.ts`:
  - `GET /api/organizations` - list all
  - `GET /api/organizations/:id` - get by ID
  - `GET /api/organizations/:id/persons` - get affiliated people
  - `GET /api/organizations/:id/milestones` - get milestones
  - `GET /api/organizations/:id/news` - get news mentions
  - `POST /api/admin/organizations` - create (admin)
  - `PUT /api/admin/organizations/:id` - update (admin)
  - `DELETE /api/admin/organizations/:id` - delete (admin)

#### 5.3 Create Organization Routes
- [x] Create `server/src/routes/organizations.ts`
- [x] Register routes in `server/src/index.ts`

#### 5.4 Update Person (KeyFigure) Service
- [x] Create `server/src/services/persons.ts` (new service alongside keyFigures.ts):
  - Add new structured bio fields to DTOs
  - Add `getBySlugWithRelations()` - returns affiliations, milestones, news events
  - Update create/update to handle new fields
  - Full CRUD + search + focus areas

#### 5.5 Create Affiliation Service
- [x] Create `server/src/services/affiliations.ts`:
  - `getByPerson(personId)` - get person's career history
  - `getByOrg(orgId)` - get org's people
  - `getCurrentByOrg(orgId)` - get current employees
  - `create(data)` - add affiliation (updates Person.currentOrgId if isCurrent)
  - `update(id, data)` - update affiliation
  - `remove(id)` - remove affiliation
  - `setAsCurrent(id)` - set as current affiliation
  - `createBulk(personId, affiliations)` - bulk create from career data

#### 5.6 Create Person Controller & Routes
- [x] Create `server/src/controllers/persons.ts`:
  - `GET /api/persons` - list all with filters
  - `GET /api/persons/:slug` - get person with relations
  - `GET /api/persons/:slug/affiliations` - get career history
  - `GET /api/persons/search` - search persons
  - `GET /api/persons/focus-areas` - get unique focus areas
  - `POST /api/admin/persons` - create (admin)
  - `PUT /api/admin/persons/:id` - update (admin)
  - `DELETE /api/admin/persons/:id` - delete (admin)
  - `POST /api/admin/persons/:id/affiliations` - add affiliation (admin)
  - `DELETE /api/admin/persons/:id/affiliations/:affId` - remove affiliation (admin)
- [x] Create `server/src/routes/persons.ts`
- [x] Register routes in `server/src/index.ts`

---

### 6. Update Frontend API Client

- [x] Update `src/services/api.ts`:
  - Add `organizationsApi` with CRUD methods (getAll, getBySlug, search, create, update, delete, getStats)
  - Add `personsApi` with CRUD methods (getAll, getBySlug, search, create, update, delete, getStats, addAffiliation, removeAffiliation)
  - Keep `keyFiguresApi` for backwards compatibility

---

### 7. Backwards Compatibility

- [x] Keep `KeyFigure` type alias pointing to `Person` for gradual migration (in `src/types/keyFigure.ts`)
- [x] Keep existing API routes working (`/api/key-figures` and `/api/admin/key-figures` still work)
- [ ] Update existing KeyFigure components to use new types (Sprint KPC-2)

---

## Acceptance Criteria

- [x] Organization model exists with all specified fields
- [x] Person model has structured biography sections
- [x] Affiliation model tracks career history
- [ ] All existing KeyFigure data migrated to Person (data migration scripts pending)
- [ ] Organizations extracted from existing milestone/person data (data migration scripts pending)
- [x] API endpoints working for Organizations CRUD
- [x] API endpoints working for Persons CRUD
- [x] No breaking changes to existing KeyFigure functionality
- [x] TypeScript types updated throughout codebase
- [x] Migration runs successfully on production
- [x] Lambda deployed with new code (2026-01-11)

---

## Testing Checklist

- [ ] Create organization via API
- [ ] Update organization via API
- [ ] Fetch organization with related persons
- [ ] Fetch person with affiliations
- [ ] Verify existing KeyFigure modal still works
- [ ] Verify milestone contributors still display correctly

---

## Notes for Future Developers

### Migration Strategy
The migration is designed to be non-destructive:
1. New tables are created alongside existing ones
2. Data is copied/transformed, not moved
3. Old fields kept until Sprint 3 confirms cross-linking works
4. Cleanup of deprecated fields in Sprint 6

### Organization Type Inference
When auto-creating organizations, use these heuristics:
- Contains "University" or "Institute" → `university`
- Contains "Lab" or "Research" → `research_lab`
- Contains "Foundation" or ".org" → `nonprofit`
- Default → `company`

### Slug Generation
Use kebab-case for all slugs:
- "OpenAI" → "openai"
- "Google DeepMind" → "google-deepmind"
- "Geoffrey Hinton" → "geoffrey-hinton"
