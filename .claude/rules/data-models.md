# Data Models & Schemas

## Core Entity Schemas

All schemas defined using Zod for runtime validation and TypeScript type inference.

### Event Schema

```typescript
import { z } from 'zod'

export const CitationSchema = z.object({
  id: z.string(),
  source_url: z.string().url(),
  source_title: z.string().min(1),
  publisher: z.string().optional(),
  date: z.string().optional(), // ISO date or year
  kind: z.enum(['paper', 'primary_doc', 'book', 'media', 'code_repo', 'blog', 'standard', 'dataset']),
  doi: z.string().optional(),
  arxiv: z.string().optional(),
  is_primary: z.boolean().default(true),
  excerpt: z.string().optional(),
  note: z.string().optional(), // "What this supports"
})

export const MediaEmbedSchema = z.object({
  type: z.enum(['youtube', 'spotify', 'apple', 'vimeo', 'other']),
  embed_url: z.string().url(),
  display_title: z.string(),
  thumbnail_url: z.string().url().optional(),
})

export const EventSchema = z.object({
  id: z.string().regex(/^E\d{4}_[A-Z0-9_]+$/), // e.g., E2017_TRANSFORMER
  title: z.string().min(1).max(200),
  date_start: z.string(), // ISO date (YYYY-MM-DD) or partial (YYYY or YYYY-MM)
  date_end: z.string().optional(),
  era: z.string(), // References Era.id
  event_type: z.enum([
    'paper',
    'model_release',
    'dataset',
    'benchmark',
    'hardware',
    'company_launch',
    'product_launch',
    'policy',
    'cultural',
    'milestone',
  ]),
  summary_md: z.string().min(10).max(2000),
  why_it_mattered: z.string().optional(), // For "Start Here" events
  is_guided_start: z.boolean().default(false), // Part of guided narrative
  concept_ids: z.array(z.string()).default([]),
  person_ids: z.array(z.string()).default([]),
  org_ids: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  media_embeds: z.array(MediaEmbedSchema).default([]),
  citations: z.array(CitationSchema).min(1), // At least one citation required
})

export type Event = z.infer<typeof EventSchema>
export type Citation = z.infer<typeof CitationSchema>
export type MediaEmbed = z.infer<typeof MediaEmbedSchema>
```

### Concept Schema

```typescript
export const ConceptSchema = z.object({
  id: z.string().regex(/^C_[A-Z0-9_]+$/), // e.g., C_TRANSFORMER
  name: z.string().min(1).max(100),
  definition_md: z.string().min(10).max(3000),
  short_definition: z.string().max(200), // For tooltip display
  prereq_concept_ids: z.array(z.string()).default([]),
  related_concept_ids: z.array(z.string()).default([]),
  visual_diagram_url: z.string().url().optional(),
  citations: z.array(CitationSchema).default([]),
  tags: z.array(z.string()).default([]),
})

export type Concept = z.infer<typeof ConceptSchema>
```

### Person Schema

```typescript
export const PersonSchema = z.object({
  id: z.string().regex(/^P_[A-Z0-9_]+$/), // e.g., P_GEOFFREY_HINTON
  name: z.string().min(1).max(100),
  bio_md: z.string().min(20).max(1000), // 2-4 sentence bio
  photo_url: z.string().url().optional(),
  links: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).default([]),
  key_event_ids: z.array(z.string()).default([]), // 5-15 linked events
  org_ids: z.array(z.string()).default([]),
  citations: z.array(CitationSchema).default([]), // 3-8 primary sources
})

export type Person = z.infer<typeof PersonSchema>
```

### Organization Schema

```typescript
export const OrgSchema = z.object({
  id: z.string().regex(/^O_[A-Z0-9_]+$/), // e.g., O_OPENAI
  name: z.string().min(1).max(100),
  org_type: z.enum(['lab', 'company', 'university', 'government', 'nonprofit', 'consortium']),
  bio_md: z.string().min(20).max(1000),
  logo_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  founded_year: z.number().optional(),
  links: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).default([]),
  key_event_ids: z.array(z.string()).default([]),
  key_person_ids: z.array(z.string()).default([]),
  citations: z.array(CitationSchema).default([]),
})

export type Org = z.infer<typeof OrgSchema>
```

### Era Schema

```typescript
export const EraSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_year: z.number(),
  end_year: z.number().nullable(), // null for ongoing eras
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), // Hex color for timeline band
  description: z.string().optional(),
  order: z.number(), // Display order
})

export type Era = z.infer<typeof EraSchema>
```

## Era Definitions

```typescript
export const ERAS: Era[] = [
  { id: 'foundations', name: 'Foundations', start_year: 1940, end_year: 1955, color: '#6B7280', order: 1 },
  { id: 'birth_of_ai', name: 'Birth of AI', start_year: 1956, end_year: 1969, color: '#8B5CF6', order: 2 },
  { id: 'symbolic_expert', name: 'Symbolic & Expert Systems', start_year: 1970, end_year: 1987, color: '#3B82F6', order: 3 },
  { id: 'winters_statistical', name: 'Winters & Statistical ML', start_year: 1988, end_year: 2011, color: '#10B981', order: 4 },
  { id: 'deep_learning_resurgence', name: 'Deep Learning Resurgence', start_year: 2012, end_year: 2016, color: '#F59E0B', order: 5 },
  { id: 'transformers_nlp', name: 'Transformers & Modern NLP', start_year: 2017, end_year: 2019, color: '#EF4444', order: 6 },
  { id: 'scaling_llms', name: 'Scaling & LLMs', start_year: 2020, end_year: 2021, color: '#EC4899', order: 7 },
  { id: 'alignment_productization', name: 'Alignment & Productization', start_year: 2022, end_year: 2023, color: '#8B5CF6', order: 8 },
  { id: 'multimodal_deployment', name: 'Multimodal & Deployment', start_year: 2024, end_year: null, color: '#06B6D4', order: 9 },
]
```

## Concept Link Syntax

In `summary_md` and other markdown fields, use `[[ConceptName]]` to create interactive concept links:

```markdown
The [[Transformer]] architecture uses [[Self-attention]] to process sequences in parallel,
replacing the sequential nature of [[LSTM]] networks.
```

At render time, these are converted to `<ConceptLink>` components that:
- Display bold text
- Show tooltip with `short_definition` on hover
- Navigate to concept page on click

## ID Conventions

| Entity  | Pattern              | Example            |
|---------|----------------------|--------------------|
| Event   | `E{YEAR}_{NAME}`     | `E2017_TRANSFORMER`|
| Concept | `C_{NAME}`           | `C_SELF_ATTENTION` |
| Person  | `P_{NAME}`           | `P_GEOFFREY_HINTON`|
| Org     | `O_{NAME}`           | `O_OPENAI`         |
| Era     | lowercase_snake_case | `deep_learning_resurgence` |

## Validation Rules

1. **Events must have at least one primary citation**
2. **Dates must parse correctly** (YYYY, YYYY-MM, or YYYY-MM-DD)
3. **All concept links must resolve** to existing concept IDs
4. **Person/org references must exist** in their respective collections
5. **Era references must match** a defined era ID
