# AI Timeline - Development Roadmap

## Project Vision

**AI Timeline** is evolving from a timeline visualization into an **AI Fluency Platform** - helping non-technical professionals understand AI through interactive learning, contextual explanations, and personalized paths.

**Live Production**: https://d33f170a3u5yyl.cloudfront.net

---

## Completed Foundation (Sprints 1-8)

| Sprint | What Was Built |
|--------|----------------|
| 1-3 | React + TypeScript app, PostgreSQL/Prisma data layer, timeline UI foundation |
| 4-5 | Interactive features, filtering, admin data management |
| 6-7 | Search, keyboard navigation, accessibility, dark mode |
| 7.5 | Semantic zoom (pills/cards/dots based on density), mobile vertical layout |
| 8 | AWS deployment (S3 + CloudFront), static JSON API |

**Current State**: 62 milestones from 1943-2025, horizontal timeline with semantic zoom, mobile-optimized vertical layout, dark mode, full-text search, category filtering.

---

## Technology Stack

| Layer | Current | Future |
|-------|---------|--------|
| **Frontend** | React + TypeScript + Tailwind | Add Framer Motion |
| **Backend** | Static JSON on S3 | Lambda + DynamoDB |
| **AI** | - | Claude API (Anthropic) |
| **Auth** | - | Cognito (anonymous first) |
| **CDN** | CloudFront | CloudFront |
| **Testing** | Playwright E2E | Continue |

---

## New Data Entities (Sprint 8.5+)

| Entity | Description | Used By |
|--------|-------------|---------|
| `MilestoneLayeredContent` | 7 explanation layers per milestone | Sprint 10 |
| `LearningPath` | Curated milestone sequences | Sprint 11, 14 |
| `GlossaryEntry` | AI term definitions with business context | Sprint 12 |
| `Checkpoint` | Knowledge test questions per path | Sprint 13 |
| `Flashcard` | Term/definition cards for review | Sprint 13 |
| `CurrentEvent` | AI news linked to historical milestones | Sprint 15 |
| `UserProfile` | Role, goals, preferences (localStorage) | Sprint 14 |

---

## Upcoming Sprints

### Phase 0: Foundations (Required First)
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 8.5](./sprint-08.5-data-foundations.md) | Data Layer & Content Foundations | Critical | Medium |

*Sprint 8.5 defines schemas, creates content structure, and generates seed data for all subsequent features.*

### Phase 1: Core AI Fluency Features
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 9](./sprint-09-ai-companion.md) | AI Learning Companion | Very High | Medium |
| [Sprint 10](./sprint-10-layered-explanations.md) | Layered Explanations | High | Low |

### Phase 2: Structured Learning
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 11](./sprint-11-learning-paths.md) | Learning Paths | High | Low |
| [Sprint 12](./sprint-12-business-glossary.md) | Business Glossary | Medium | Low |

### Phase 3: Knowledge Testing & Personalization
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 13](./sprint-13-concept-checkpoints.md) | Concept Checkpoints | Medium | Medium |
| [Sprint 14](./sprint-14-personalized-onboarding.md) | Personalized Onboarding | High | Medium |

### Phase 4: Current Events & Security
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 15](./sprint-15-why-now-current-events.md) | "Why Now?" Current Events | Medium | Low |
| [Sprint 16](./sprint-16-secure-api-key-management.md) | Secure API Key Management | High | Medium |

### Phase 5: Audience-Specific Learning Paths
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 17](./sprint-17-ai-for-everyday-life.md) | "AI for Everyday Life" Path (65+ audience) | High | Medium |
| [Sprint 18](./sprint-18-ai-for-leaders.md) | "AI for Leaders" Path (Executives) | High | Medium |
| [Sprint 19](./sprint-19-audience-targeting-infrastructure.md) | Audience Targeting Infrastructure | High | Medium |
| [Sprint 20](./sprint-20-audience-content-completion.md) | Content Completion & User Testing | High | High |

**Phase 5 Goal**: Make AI Timeline accessible to non-technical audiences:
- **Everyday Life Track**: For 65+ users who want to understand AI in plain English, with familiar analogies and practical safety tips
- **Leaders Track**: For 40s-50s executives who need to make AI decisions but don't know where to start

### Phase 6: Study & Retention
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 22](./sprint-22-flashcard-infrastructure.md) | Flashcard Infrastructure | High | Medium |
| [Sprint 23](./sprint-23-study-center.md) | Study Center | High | Medium |
| [Sprint 24](./sprint-24-flashcard-statistics.md) | Flashcard Statistics | Medium | Low |
| [Sprint 25](./sprint-25-prebuilt-decks-polish.md) | Prebuilt Decks & Polish | Medium | Medium |

### Phase 7: Operations & Monitoring
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 26](./sprint-26-api-monitoring-persistence.md) | API Monitoring Persistence (MVP) | Medium | Low |

**Phase 7 Goal**: Production operations and cost management for AI features.

### Phase 8: Practical AI Skills
| Sprint | Focus | Impact | Effort |
|--------|-------|--------|--------|
| [Sprint 27](./sprint-27-coding-with-ai.md) | "Coding with AI" Path (Vibe Coding) | High | Medium |

**Phase 8 Goal**: Extend from AI understanding to AI creation—teaching users to build with AI tools.
- **Coding with AI Track**: For curious professionals who want to build software using AI assistants without traditional programming education
- Introduces "vibe coding" and "context engineering" concepts
- Hands-on, practical activities with copy-paste prompts

---

## Quick Start

```bash
# Development
git clone <repository-url>
cd ai_timeline
npm install
npm run dev

# Run tests
npx playwright test

# Build for production
npm run build
```

---

## AWS Resources

- **S3 Bucket**: `ai-timeline-frontend-1765916222`
- **CloudFront**: `E23Z9QNRPDI3HW` (d33f170a3u5yyl.cloudfront.net)
- **API**: Static JSON at `/api/milestones.json`
