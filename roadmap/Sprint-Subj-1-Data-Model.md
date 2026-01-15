# Sprint Subj-1: Data Model & Seed Taxonomy

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: [DATE] by [DEVELOPER]

## Overview

Create the foundational data models for the subject taxonomy system and seed the initial taxonomy hierarchy. This sprint establishes the schema and admin tooling for managing subjects.

## Prerequisites

- [ ] Review existing categorization systems in codebase
- [ ] Confirm taxonomy structure with stakeholders

---

## Tasks

### 1. Prisma Schema Changes

**File**: `prisma/schema.prisma`

- [ ] Add `Subject` model with hierarchy support
  ```prisma
  model Subject {
    id          String   @id @default(cuid())
    slug        String   @unique
    name        String
    description String?

    level       Int                        // 0=domain, 1=category, 2=subcategory
    parentId    String?
    parent      Subject?  @relation("SubjectHierarchy", fields: [parentId], references: [id])
    children    Subject[] @relation("SubjectHierarchy")

    path        String                     // "Science > Computer Science > NLP"
    domainSlug  String                     // For filtering by top-level domain

    defaultDifficulty  String?
    learningObjectives String @default("[]")

    color       String?
    icon        String?

    contentSubjects ContentSubject[]
    synonyms        SubjectSynonym[]

    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@index([level])
    @@index([domainSlug])
    @@index([parentId])
  }
  ```

- [ ] Add `SubjectSynonym` model
  ```prisma
  model SubjectSynonym {
    id        String  @id @default(cuid())
    subjectId String
    subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
    term      String  @unique

    @@index([subjectId])
  }
  ```

- [ ] Add `ContentSubject` polymorphic junction
  ```prisma
  model ContentSubject {
    id          String   @id @default(cuid())
    contentType String   // milestone, glossary_term, current_event, person, organization
    contentId   String
    subjectId   String
    subject     Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
    isPrimary   Boolean  @default(false)
    confidence  Float?
    source      String   @default("auto")  // auto, manual, migration
    createdAt   DateTime @default(now())

    @@unique([contentType, contentId, subjectId])
    @@index([contentType, contentId])
    @@index([subjectId])
    @@index([isPrimary, subjectId])
  }
  ```

- [ ] Add subject classification fields to `IngestedArticle`
  ```prisma
  // Add to IngestedArticle model
  classifiedSubjects    Json?
  subjectClassifiedAt   DateTime?
  ```

- [ ] Run migration: `npx prisma migrate dev --name add-subject-taxonomy`

### 2. Seed Taxonomy Data

**File**: `prisma/seeds/subjects.ts` (new)

- [ ] Create seed script with full taxonomy hierarchy
- [ ] Include all domains: Science, Business, Industry, Policy, Research
- [ ] Include categories and subcategories per domain
- [ ] Add common synonyms for each subject

**Seed data structure**:
```typescript
const taxonomy = [
  {
    slug: 'science',
    name: 'Science',
    level: 0,
    color: '#3B82F6',
    children: [
      {
        slug: 'science-biology',
        name: 'Biology',
        level: 1,
        children: [
          { slug: 'science-biology-genetics', name: 'Genetics', level: 2 },
          { slug: 'science-biology-neurobiology', name: 'Neurobiology', level: 2 },
          { slug: 'science-biology-synthetic', name: 'Synthetic Biology', level: 2 },
        ],
      },
      {
        slug: 'science-neuroscience',
        name: 'Neuroscience',
        level: 1,
        children: [
          { slug: 'science-neuroscience-cognitive', name: 'Cognitive Science', level: 2 },
          { slug: 'science-neuroscience-computational', name: 'Computational Neuroscience', level: 2 },
          { slug: 'science-neuroscience-bci', name: 'Brain-Computer Interfaces', level: 2 },
        ],
      },
      {
        slug: 'science-cs',
        name: 'Computer Science',
        level: 1,
        children: [
          { slug: 'science-cs-ml', name: 'Machine Learning', level: 2 },
          { slug: 'science-cs-nlp', name: 'Natural Language Processing', level: 2 },
          { slug: 'science-cs-vision', name: 'Computer Vision', level: 2 },
          { slug: 'science-cs-robotics', name: 'Robotics', level: 2 },
          { slug: 'science-cs-reinforcement', name: 'Reinforcement Learning', level: 2 },
        ],
      },
      {
        slug: 'science-physics',
        name: 'Physics',
        level: 1,
        children: [
          { slug: 'science-physics-quantum', name: 'Quantum Computing', level: 2 },
        ],
      },
    ],
  },
  {
    slug: 'business',
    name: 'Business',
    level: 0,
    color: '#10B981',
    children: [
      {
        slug: 'business-technology',
        name: 'Technology',
        level: 1,
        children: [
          { slug: 'business-technology-software', name: 'Software', level: 2 },
          { slug: 'business-technology-semiconductors', name: 'Semiconductors', level: 2 },
          { slug: 'business-technology-cloud', name: 'Cloud Infrastructure', level: 2 },
          { slug: 'business-technology-hardware', name: 'Consumer Hardware', level: 2 },
        ],
      },
      {
        slug: 'business-finance',
        name: 'Finance',
        level: 1,
        children: [
          { slug: 'business-finance-fintech', name: 'Fintech', level: 2 },
          { slug: 'business-finance-trading', name: 'Algorithmic Trading', level: 2 },
          { slug: 'business-finance-risk', name: 'Risk & Compliance', level: 2 },
        ],
      },
      {
        slug: 'business-operations',
        name: 'Operations',
        level: 1,
        children: [
          { slug: 'business-operations-supply-chain', name: 'Supply Chain', level: 2 },
          { slug: 'business-operations-automation', name: 'Enterprise Automation', level: 2 },
        ],
      },
    ],
  },
  {
    slug: 'industry',
    name: 'Industry',
    level: 0,
    color: '#F59E0B',
    children: [
      {
        slug: 'industry-healthcare',
        name: 'Healthcare',
        level: 1,
        children: [
          { slug: 'industry-healthcare-diagnostics', name: 'Diagnostics', level: 2 },
          { slug: 'industry-healthcare-drug-discovery', name: 'Drug Discovery', level: 2 },
          { slug: 'industry-healthcare-devices', name: 'Medical Devices', level: 2 },
        ],
      },
      {
        slug: 'industry-automotive',
        name: 'Automotive',
        level: 1,
        children: [
          { slug: 'industry-automotive-av', name: 'Autonomous Vehicles', level: 2 },
          { slug: 'industry-automotive-manufacturing', name: 'Manufacturing', level: 2 },
        ],
      },
      {
        slug: 'industry-media',
        name: 'Media & Entertainment',
        level: 1,
        children: [
          { slug: 'industry-media-content-gen', name: 'Content Generation', level: 2 },
          { slug: 'industry-media-gaming', name: 'Gaming', level: 2 },
        ],
      },
      {
        slug: 'industry-education',
        name: 'Education',
        level: 1,
        children: [
          { slug: 'industry-education-edtech', name: 'EdTech', level: 2 },
          { slug: 'industry-education-research-tools', name: 'Research Tools', level: 2 },
        ],
      },
    ],
  },
  {
    slug: 'policy',
    name: 'Policy & Governance',
    level: 0,
    color: '#EF4444',
    children: [
      {
        slug: 'policy-regulation',
        name: 'Regulation',
        level: 1,
        children: [
          { slug: 'policy-regulation-ai-safety', name: 'AI Safety Laws', level: 2 },
          { slug: 'policy-regulation-privacy', name: 'Data Privacy', level: 2 },
        ],
      },
      {
        slug: 'policy-ethics',
        name: 'Ethics',
        level: 1,
        children: [
          { slug: 'policy-ethics-alignment', name: 'Alignment', level: 2 },
          { slug: 'policy-ethics-bias', name: 'Bias & Fairness', level: 2 },
        ],
      },
      {
        slug: 'policy-geopolitics',
        name: 'Geopolitics',
        level: 1,
        children: [
          { slug: 'policy-geopolitics-competition', name: 'US-China Competition', level: 2 },
          { slug: 'policy-geopolitics-export', name: 'Export Controls', level: 2 },
        ],
      },
    ],
  },
  {
    slug: 'research',
    name: 'Research',
    level: 0,
    color: '#8B5CF6',
    children: [
      {
        slug: 'research-academic',
        name: 'Academic',
        level: 1,
        children: [
          { slug: 'research-academic-papers', name: 'Papers & Preprints', level: 2 },
          { slug: 'research-academic-conferences', name: 'Conferences', level: 2 },
        ],
      },
      {
        slug: 'research-corporate',
        name: 'Corporate R&D',
        level: 1,
        children: [
          { slug: 'research-corporate-labs', name: 'Research Labs', level: 2 },
          { slug: 'research-corporate-partnerships', name: 'Partnerships', level: 2 },
        ],
      },
      {
        slug: 'research-opensource',
        name: 'Open Source',
        level: 1,
        children: [
          { slug: 'research-opensource-models', name: 'Open Models', level: 2 },
          { slug: 'research-opensource-frameworks', name: 'Frameworks', level: 2 },
        ],
      },
    ],
  },
];
```

- [ ] Create synonym mappings
  ```typescript
  const synonyms = [
    { term: 'LLMs', subjectSlug: 'science-cs-nlp' },
    { term: 'Large Language Models', subjectSlug: 'science-cs-nlp' },
    { term: 'GPT', subjectSlug: 'science-cs-nlp' },
    { term: 'chips', subjectSlug: 'business-technology-semiconductors' },
    { term: 'GPU', subjectSlug: 'business-technology-semiconductors' },
    { term: 'neural networks', subjectSlug: 'science-cs-ml' },
    { term: 'deep learning', subjectSlug: 'science-cs-ml' },
    { term: 'self-driving', subjectSlug: 'industry-automotive-av' },
    { term: 'AGI', subjectSlug: 'policy-ethics-alignment' },
    { term: 'generative AI', subjectSlug: 'science-cs-ml' },
    // ... add more
  ];
  ```

- [ ] Add seed command to `package.json`
- [ ] Run seed: `npx prisma db seed`

### 3. TypeScript Types & Zod Schemas

**File**: `src/types/subject.ts` (new)

- [ ] Create Subject type
  ```typescript
  export interface Subject {
    id: string;
    slug: string;
    name: string;
    description?: string;
    level: number;
    parentId?: string;
    path: string;
    domainSlug: string;
    defaultDifficulty?: 'beginner' | 'intermediate' | 'advanced';
    learningObjectives: string[];
    color?: string;
    icon?: string;
    children?: Subject[];
  }
  ```

- [ ] Create ContentSubject type
  ```typescript
  export interface ContentSubject {
    id: string;
    contentType: 'milestone' | 'glossary_term' | 'current_event' | 'person' | 'organization';
    contentId: string;
    subjectId: string;
    subject?: Subject;
    isPrimary: boolean;
    confidence?: number;
    source: 'auto' | 'manual' | 'migration';
  }
  ```

- [ ] Create Zod schemas for API validation

**File**: `server/src/schemas/subject.ts` (new)

- [ ] Create subjectSchema
- [ ] Create contentSubjectSchema
- [ ] Create createSubjectSchema (for admin API)
- [ ] Create updateSubjectSchema

### 4. Backend API Routes

**File**: `server/src/routes/subjects.ts` (new)

- [ ] `GET /api/subjects/tree` - Get full taxonomy tree
- [ ] `GET /api/subjects/:slug` - Get single subject with children
- [ ] `GET /api/subjects/:slug/ancestors` - Get parent chain

**File**: `server/src/routes/admin/subjects.ts` (new)

- [ ] `GET /api/admin/subjects` - List all subjects (flat with pagination)
- [ ] `POST /api/admin/subjects` - Create new subject
- [ ] `PUT /api/admin/subjects/:id` - Update subject
- [ ] `DELETE /api/admin/subjects/:id` - Delete subject (with reassignment option)
- [ ] `GET /api/admin/subjects/synonyms` - List all synonyms
- [ ] `POST /api/admin/subjects/synonyms` - Create synonym
- [ ] `DELETE /api/admin/subjects/synonyms/:id` - Delete synonym

### 5. Subject Service

**File**: `server/src/services/subjectService.ts` (new)

- [ ] `getSubjectTree()` - Build hierarchical tree from flat records
- [ ] `getSubjectBySlug(slug)` - Get subject with children
- [ ] `getSubjectAncestors(slug)` - Get parent chain
- [ ] `createSubject(data)` - Create with auto-generated slug and path
- [ ] `updateSubject(id, data)` - Update, cascade path changes to children
- [ ] `deleteSubject(id, reassignTo?)` - Delete or reassign content
- [ ] `findSubjectByTerm(term)` - Match term against slugs, names, and synonyms

### 6. Admin UI - Subject Management

**File**: `src/pages/admin/SubjectsPage.tsx` (new)

- [ ] Create tree view of taxonomy
- [ ] Expand/collapse nodes
- [ ] Show subject details on selection
- [ ] Count of tagged content per subject

**File**: `src/components/admin/SubjectEditor.tsx` (new)

- [ ] Create/edit form for subjects
- [ ] Parent selector (dropdown with tree structure)
- [ ] Color picker
- [ ] Icon selector
- [ ] Learning objectives editor
- [ ] Synonym management inline

**File**: `src/components/admin/SubjectTree.tsx` (new)

- [ ] Recursive tree component
- [ ] Drag-and-drop reordering (future)
- [ ] Inline add child button

### 7. Add to Admin Navigation

**File**: `src/pages/admin/AdminLayout.tsx`

- [ ] Add "Subjects" link to admin sidebar
- [ ] Add route in App.tsx: `/admin/subjects`

---

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test all web features.

### Admin Subject Management - Browser Validation

- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/admin/subjects` and take screenshot
- [ ] Verify taxonomy tree renders correctly
- [ ] Test creating a new subject at each level (domain, category, subcategory)
- [ ] Test editing an existing subject
- [ ] Test deleting a subject (verify confirmation dialog)
- [ ] Test synonym CRUD operations
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network for failed requests: `mcp__claude-in-chrome__read_network_requests`
- [ ] Screenshot final state as evidence

---

## Acceptance Criteria

- [ ] All three Prisma models created and migrated
- [ ] Seed data populates full taxonomy (~50+ subjects)
- [ ] Public API returns taxonomy tree correctly
- [ ] Admin can CRUD subjects and synonyms
- [ ] Admin UI displays tree with expand/collapse
- [ ] TypeScript types exported for frontend use
- [ ] All browser validation tasks completed with screenshots

---

## Notes for Future Developers

### Slug Convention
Slugs use hierarchical format: `{domain}-{category}-{subcategory}`
- `science-cs-nlp` (not just `nlp`)
- Enables prefix matching for "all science" queries

### Path Denormalization
The `path` field stores the full display path ("Science > Computer Science > NLP") for UI display without joins. Must be updated when ancestors change.

### Domain Slug
`domainSlug` stores the top-level domain (e.g., "science") for fast filtering. All descendants share their root's domain slug.

### Synonym Uniqueness
Synonyms are globally unique across all subjects. "LLMs" can only map to one subject. If ambiguity exists, prefer the most common meaning.

### Content Counts
Consider adding a `contentCount` field to Subject and updating via triggers or scheduled job for performance.
