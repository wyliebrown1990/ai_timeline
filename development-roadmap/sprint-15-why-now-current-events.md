# Sprint 15: "Why Now?" Current Events Bridge

**Impact**: Medium | **Effort**: Low | **Dependencies**: Sprint 11 (Learning Paths), Sprint 9 (AI Companion)

## Overview
Connect today's AI headlines to historical context. When users see news about AI, this feature shows which milestones they should understand to make sense of it, and offers a quick contextual path through those milestones.

---

## Tasks

### 15.1 Current Events Data Model
- [x] Define CurrentEvent interface
- [x] Create events.json for curated current events
- [x] Link events to prerequisite milestones
- [x] Add manual curation workflow

### 15.2 Current Events Section
- [x] Add "In The News" section to homepage/sidebar
- [x] Display 3-5 current AI headlines
- [x] Show prerequisite milestone chips
- [x] "Take me through this context" CTA

### 15.3 Context Path Generator
- [x] Generate mini learning path from prerequisite milestones
- [x] Order milestones chronologically
- [x] Calculate estimated time
- [x] Use existing path navigation UI

### 15.4 News Entry Detail
- [x] Create `NewsContextModal` component
- [x] Show headline and brief summary
- [x] List prerequisite milestones with descriptions
- [x] Explain connection between history and current news
- [x] "Start context path" button

### 15.5 Content Curation
- [x] Create initial 5-10 current event entries
- [x] Establish update cadence (weekly/bi-weekly)
- [x] Define criteria for newsworthy events
- [x] Write connection explanations

### 15.6 AI-Assisted Context (Optional)
- [x] "Ask AI: Why is this news?" button
- [x] Claude generates explanation connecting news to history
- [x] Uses milestone context for grounded response

---

## Data Structure

```typescript
interface CurrentEvent {
  id: string;
  headline: string;
  summary: string;  // 2-3 sentences explaining the news
  sourceUrl?: string;
  sourcePublisher?: string;
  publishedDate: string;
  prerequisiteMilestoneIds: string[];  // Ordered by relevance
  connectionExplanation: string;  // How history connects to this news
  expiresAt?: string;  // When to stop showing (for dated news)
  featured: boolean;  // Show prominently
}

interface ContextPath {
  newsEventId: string;
  milestoneIds: string[];
  estimatedMinutes: number;
  title: string;  // e.g., "Understanding GPT-4o"
}
```

---

## Example Current Events

### Event 1: GPT-4o Release
```json
{
  "id": "gpt4o-may-2024",
  "headline": "OpenAI releases GPT-4o with vision capabilities",
  "summary": "OpenAI announced GPT-4o, a multimodal model that can see, hear, and speak in real-time. It's faster and cheaper than GPT-4 Turbo while matching its capabilities.",
  "sourceUrl": "https://openai.com/index/hello-gpt-4o/",
  "sourcePublisher": "OpenAI",
  "publishedDate": "2024-05-13",
  "prerequisiteMilestoneIds": [
    "transformer-2017",
    "gpt3-2020",
    "clip-2021",
    "gpt4-2023"
  ],
  "connectionExplanation": "GPT-4o builds on the Transformer architecture (2017), the scaling insights from GPT-3 (2020), and multimodal capabilities pioneered by CLIP (2021) and GPT-4 (2023).",
  "featured": true
}
```

### Event 2: Claude 3.5 Sonnet
```json
{
  "id": "claude-35-sonnet",
  "headline": "Anthropic releases Claude 3.5 Sonnet",
  "summary": "Anthropic's new model outperforms competitors on many benchmarks while being faster and cheaper, showing that architectural improvements can matter as much as scale.",
  "prerequisiteMilestoneIds": [
    "transformer-2017",
    "constitutional-ai-2022",
    "rlhf-2022",
    "claude-2023"
  ],
  "connectionExplanation": "Claude 3.5 represents Anthropic's approach to AI safety through Constitutional AI (2022) and RLHF alignment techniques, all built on Transformers."
}
```

### Event 3: EU AI Act
```json
{
  "id": "eu-ai-act-2024",
  "headline": "EU AI Act enters into force",
  "summary": "The world's first comprehensive AI regulation becomes law, creating requirements for transparency, safety testing, and human oversight of high-risk AI systems.",
  "prerequisiteMilestoneIds": [
    "asilomar-principles-2017",
    "gpt2-limited-release-2019",
    "chatgpt-2022"
  ],
  "connectionExplanation": "The EU AI Act responds to concerns raised since Asilomar (2017), amplified by GPT-2's limited release debate (2019), and made urgent by ChatGPT's explosive adoption (2022)."
}
```

---

## UI Components

### Homepage "In The News" Section
```
┌─────────────────────────────────────────────────────────────┐
│  📰 IN THE NEWS → UNDERSTAND THE CONTEXT                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ "OpenAI releases GPT-4o with vision capabilities"   │    │
│  │                                                     │    │
│  │ To understand this, you should know:                │    │
│  │ → [Transformer (2017)] [CLIP (2021)] [GPT-4 (2023)] │    │
│  │                                                     │    │
│  │ [Take me through this context →]                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ "EU AI Act enters into force"                       │    │
│  │                                                     │    │
│  │ To understand this, you should know:                │    │
│  │ → [Asilomar (2017)] [GPT-2 Debate (2019)]           │    │
│  │                                                     │    │
│  │ [Take me through this context →]                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [See all current events →]                                 │
└─────────────────────────────────────────────────────────────┘
```

### News Context Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Understanding: "OpenAI releases GPT-4o"                    │
│  ─────────────────────────────────────────────────          │
│                                                             │
│  OpenAI announced GPT-4o, a multimodal model that can       │
│  see, hear, and speak in real-time. It's faster and         │
│  cheaper than GPT-4 Turbo while matching its capabilities.  │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  THE CONTEXT YOU NEED:                                      │
│                                                             │
│  1. Transformer Architecture (2017)                         │
│     The foundation that makes all modern AI possible        │
│                                                             │
│  2. CLIP (2021)                                             │
│     How AI learned to connect text and images               │
│                                                             │
│  3. GPT-4 (2023)                                            │
│     First multimodal GPT model                              │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  WHY THIS MATTERS:                                          │
│  GPT-4o builds on the Transformer architecture, the         │
│  scaling insights from GPT-3, and multimodal capabilities   │
│  pioneered by CLIP and GPT-4.                               │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  Estimated time: ~12 minutes                                │
│                                                             │
│  [Start Context Path →]              [Just show me GPT-4o]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Content Curation Guidelines

### What makes a good current event entry:
1. **Widely reported** - Major news outlets covered it
2. **Significant impact** - Changes how people use or think about AI
3. **Historical connections** - Can be explained through timeline milestones
4. **Accessible** - Non-technical readers can understand why it matters

### Update cadence:
- Review AI news weekly
- Add 1-2 new events per week when relevant
- Archive events after 2-3 months (unless evergreen)
- Keep 5-10 active events at any time

### Event freshness:
- Featured events: < 2 weeks old
- Regular events: < 2 months old
- Evergreen events: No expiration (e.g., "Understanding ChatGPT")

---

## Integration Points

### With AI Companion (Sprint 9)
```
User clicks "Ask AI: Why is this news?"

System prompt addition:
"The user is asking about this current AI news: [HEADLINE]
Context milestones: [MILESTONE_SUMMARIES]

Explain why this news matters and how it connects to the historical
milestones. Keep it accessible for non-technical readers."
```

### With Learning Paths (Sprint 11)
- Context paths use same navigation UI as learning paths
- Progress tracked separately (don't pollute main path progress)
- Can "promote" context path to saved learning path

---

## Success Criteria
- [x] 5+ current events curated at launch
- [x] Prerequisite milestones clearly explain the connection
- [x] Context path generates correctly from any event
- [x] News section visible on homepage without scrolling
- [ ] Events updated at least bi-weekly
- [ ] "Take me through context" reduces time to understanding
- [x] Works on mobile
- [x] Clear curation workflow documented for content team

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [ ] All Playwright tests passing locally
- [x] All 5+ current events validated against schema
- [x] Prerequisite milestone IDs verified to exist
- [x] No TypeScript errors (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)

### Deployment Steps
- [ ] Create PR with current events feature
- [ ] Verify CI pipeline passes
- [ ] Merge to main branch
- [ ] Deploy to S3/CloudFront (`npm run deploy`)
- [ ] Invalidate CloudFront cache

### Production Verification
- [ ] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [ ] Verify "In The News" section visible on homepage
- [ ] Check that 3-5 current events display
- [ ] Click on a current event card
- [ ] Verify context modal shows:
  - [ ] Headline and summary
  - [ ] Prerequisite milestones listed
  - [ ] "Why this matters" connection explanation
- [ ] Click "Take me through this context"
- [ ] Verify context path generates with correct milestones
- [ ] Navigate through context path
- [ ] Test "Ask AI: Why is this news?" if implemented
- [ ] Test on mobile device

### Rollback Plan
If issues found in production:
1. Revert merge commit: `git revert <commit-hash>`
2. Push to main and redeploy
3. Invalidate CloudFront cache

### Content Update Process
For ongoing current events updates:
1. Edit `src/content/current-events/events.json`
2. Add new event with valid milestone references
3. Run `npm run content:validate`
4. Create PR and merge
5. Deploy to production
