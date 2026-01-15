# Subject Taxonomy

3-level hierarchy for content classification: Domain → Category → Subcategory

## Schema

```prisma
model Subject {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique  // e.g., "science-cs-ml"
  parentId    String?   // null = top-level domain
  level       Int       // 1=domain, 2=category, 3=subcategory
}

model ContentSubject {
  id          String  @id @default(cuid())
  subjectId   String
  contentType String  // milestone, glossary_term, person, etc.
  contentId   String
  isPrimary   Boolean @default(false)
  confidence  Float?  // 0-1 from AI classification
}

model SubjectSynonym {
  id        String @id @default(cuid())
  subjectId String
  synonym   String // e.g., "ML" → science-cs-ml
}
```

## API Endpoints

```
GET  /api/subjects/tree              # Full taxonomy
GET  /api/subjects/:slug             # Subject details
GET  /api/subjects/:slug/content     # Content by subject
GET  /api/subjects/:slug/stats       # Content counts
GET  /api/subjects/:slug/learning-path  # Auto-generated path
POST /api/subjects/cross-path        # Multi-subject path
GET  /api/subjects/related?contentType=&contentId=  # Related content

# Filters on existing endpoints
GET  /api/milestones/filter?subject=science-cs-ml
GET  /api/glossary?subject=science-cs-nlp
```

## Top-Level Domains
`science`, `business`, `policy`, `research`

## Pipeline Integration

New content auto-classified in `Stage 1.5` via Claude:
1. Extract subject mentions from content
2. Match to taxonomy (exact → synonym → fuzzy)
3. Create ContentSubject links with confidence scores
