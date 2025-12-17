---
paths: packages/content/**/*.{yaml,yml,md,mdx}
---

# Content Authoring Guidelines

## Content File Structure

```
packages/content/
├── events/
│   ├── 1940s/
│   │   └── 1943-mcculloch-pitts.yaml
│   ├── 2017/
│   │   └── 2017-06-transformer.yaml
│   └── ...
├── concepts/
│   ├── transformer.yaml
│   ├── self-attention.yaml
│   └── ...
├── people/
│   ├── geoffrey-hinton.yaml
│   └── ...
├── orgs/
│   ├── openai.yaml
│   └── ...
└── eras.yaml
```

## Event YAML Format

```yaml
# packages/content/events/2017/2017-06-transformer.yaml
id: E2017_TRANSFORMER
title: "Transformer architecture introduced"
date_start: "2017-06-12"
era: transformers_nlp
event_type: paper
is_guided_start: true

summary_md: |
  The "Attention Is All You Need" paper introduces the [[Transformer]] architecture,
  which replaces recurrence with [[Self-attention]] mechanisms. This enables
  efficient parallel training and becomes the foundation for modern LLMs.

why_it_mattered: |
  The Transformer eliminated the sequential bottleneck of RNNs, enabling training
  on much larger datasets and longer sequences. Nearly all frontier LLMs today
  are built on this architecture.

concept_ids:
  - C_TRANSFORMER
  - C_SELF_ATTENTION
  - C_POSITIONAL_ENCODING

person_ids:
  - P_ASHISH_VASWANI
  - P_NOAM_SHAZEER
  - P_ILLIA_POLOSUKHIN

org_ids:
  - O_GOOGLE_BRAIN

tags:
  - architecture
  - nlp
  - breakthrough

citations:
  - source_title: "Attention Is All You Need"
    source_url: "https://arxiv.org/abs/1706.03762"
    kind: paper
    arxiv: "1706.03762"
    is_primary: true
    excerpt: "We propose a new simple network architecture, the Transformer..."
```

## Concept YAML Format

```yaml
# packages/content/concepts/transformer.yaml
id: C_TRANSFORMER
name: "Transformer"

short_definition: |
  A neural network architecture using self-attention to process sequences
  in parallel, enabling efficient training on long sequences.

definition_md: |
  The **Transformer** is a neural network architecture introduced in 2017 that
  processes input sequences using [[Self-attention]] mechanisms instead of
  recurrence or convolution.

  ## Key Components
  - **Multi-head attention**: Allows the model to attend to information from
    different representation subspaces
  - **Positional encoding**: Injects sequence order information since attention
    is position-agnostic
  - **Feed-forward layers**: Applied independently to each position
  - **Layer normalization**: Stabilizes training

  ## Why It Matters
  Transformers enable parallel processing of sequences, dramatically reducing
  training time compared to RNNs. This scalability made training on billions
  of tokens feasible, leading to the LLM revolution.

prereq_concept_ids:
  - C_ATTENTION
  - C_NEURAL_NETWORK
  - C_EMBEDDING

related_concept_ids:
  - C_SELF_ATTENTION
  - C_BERT
  - C_GPT

visual_diagram_url: "/diagrams/transformer-architecture.svg"

citations:
  - source_title: "Attention Is All You Need"
    source_url: "https://arxiv.org/abs/1706.03762"
    kind: paper
    arxiv: "1706.03762"
    is_primary: true
```

## Person YAML Format

```yaml
# packages/content/people/geoffrey-hinton.yaml
id: P_GEOFFREY_HINTON
name: "Geoffrey Hinton"

bio_md: |
  British-Canadian cognitive psychologist and computer scientist, known as the
  "Godfather of AI." Pioneer of deep learning and backpropagation. Former Google
  researcher who left in 2023 to speak about AI risks. Turing Award winner (2018).

photo_url: "/people/geoffrey-hinton.jpg"

links:
  - label: "Google Scholar"
    url: "https://scholar.google.com/citations?user=JicYPdAAAAAJ"
  - label: "University of Toronto"
    url: "https://www.cs.toronto.edu/~hinton/"

key_event_ids:
  - E1986_BACKPROP
  - E2006_DEEP_BELIEF_NETS
  - E2012_ALEXNET

org_ids:
  - O_GOOGLE
  - O_UNIVERSITY_OF_TORONTO

citations:
  - source_title: "Learning representations by back-propagating errors"
    source_url: "https://www.nature.com/articles/323533a0"
    kind: paper
    is_primary: true
```

## Writing Style Guidelines

### Event Summaries
- Write in past tense for historical events
- 2-4 sentences maximum
- Focus on what happened and why it matters
- Use `[[Concept]]` syntax for key technical terms
- Avoid jargon without explanation

### Concept Definitions
- Start with a clear one-sentence definition
- Use markdown for structure (headers, lists, bold)
- Include "Why It Matters" section
- Link to prerequisite concepts
- Provide visual diagrams where helpful

### Person Bios
- 2-4 sentences
- Include most notable contributions
- Mention current/last institutional affiliation
- Note major awards if applicable

## Citation Requirements

### Primary Sources (Required)
Every event MUST have at least one primary source:
- Academic papers (arXiv, journals, conference proceedings)
- Official announcements (company blogs, press releases)
- Government/policy documents
- Dataset/benchmark release pages
- Official technical reports

### Source Kinds
| Kind | Use For |
|------|---------|
| `paper` | Academic papers (arXiv, journals, conferences) |
| `primary_doc` | Official announcements, policy documents |
| `book` | Published books |
| `media` | Podcasts, videos, interviews |
| `code_repo` | GitHub, GitLab repositories |
| `blog` | Official company/org blogs |
| `standard` | Technical standards documents |
| `dataset` | Dataset release pages |

### Citation Best Practices
- Prefer DOI or arXiv links for papers
- Use canonical URLs (avoid URL shorteners)
- Include publication date when available
- Add excerpt for context (optional but helpful)
- Mark `is_primary: true` for authoritative sources

## Concept Linking

Use `[[ConceptName]]` in any markdown field:

```yaml
summary_md: |
  The paper demonstrates that [[RLHF]] can align [[LLM]] outputs with
  human preferences, making models more helpful and less harmful.
```

### Rules
- Concept name must match a concept's `name` field exactly
- Link only on first occurrence in a text block
- Don't over-link; focus on key technical terms
- All links are validated during CI

## Content Linting

The CI pipeline validates:
1. **Schema compliance**: All fields match Zod schemas
2. **Required citations**: Every event has at least one primary source
3. **Date parsing**: All dates are valid ISO formats
4. **Concept resolution**: All `[[ConceptName]]` links resolve
5. **Reference integrity**: All person_ids, org_ids, concept_ids exist
6. **Link checking**: All URLs return 200 (periodic job)
7. **Era assignment**: Events fall within their assigned era's date range

## Content Quotas (Launch Target: 200 Events)

| Era | Target Count |
|-----|--------------|
| Foundations + Birth of AI | 20 |
| Symbolic + Expert Systems + Winters | 35 |
| Statistical ML | 25 |
| Deep Learning Resurgence (2012-2016) | 30 |
| Transformers + LLM Scaling (2017-2021) | 45 |
| ChatGPT + Productization (2022-present) | 45 |
