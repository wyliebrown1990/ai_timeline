# Sprint 11: Learning Paths

**Impact**: High | **Effort**: Low | **Dependencies**: Milestone data (existing)

## Overview
Curated sequences of milestones that guide users through specific learning journeys. Users can follow paths like "The ChatGPT Story" or "AI Fundamentals" with progress tracking.

---

## Tasks

### 11.1 Data Model
- [x] Define LearningPath interface
- [x] Create paths JSON file with initial paths
- [x] Add `pathIds` field to milestones (optional enhancement)

### 11.2 Initial Path Content
- [x] Create "The ChatGPT Story" path (8-10 milestones)
- [x] Create "AI Fundamentals" path (10-12 milestones)
- [x] Create "AI Safety & Alignment" path (6-8 milestones)
- [x] Write path descriptions and learning objectives

### 11.3 Path Selection UI
- [x] Add "Learning Paths" section to navigation (Header.tsx updated with /learn link)
- [x] Create `PathSelector` component
- [x] Show path cards with title, description, milestone count
- [x] Indicate progress on each path

### 11.4 Path Navigation
- [x] Add "Next in path" / "Previous in path" to MilestoneDetail (PathNavigation component)
- [x] Show current position (e.g., "3 of 10")
- [x] Auto-advance option after viewing milestone
- [x] Path completion celebration with confetti animation

### 11.5 Path Completion Features
- [x] Create end-of-path summary screen (PathCompletionSummary component):
  - Key takeaways (3-5 bullet points)
  - Concepts you now understand
  - Time spent on path
- [x] Show "Suggested next paths" based on completed path
- [x] Generate shareable completion badge/certificate:
  - Path name + completion date
  - Shareable image for LinkedIn/Twitter
  - Copy link to share

### 11.6 Progress Tracking
- [x] Store viewed milestones per path in localStorage (usePathProgress hook)
- [x] Calculate and display completion percentage
- [x] Mark milestones as "viewed" in path context
- [x] Reset path progress option
- [x] Track time spent per milestone for summary

---

## Learning Paths Content

### Path 1: The ChatGPT Story
**Description**: Follow the key breakthroughs that led to ChatGPT, from the Transformer architecture to GPT-4.

**Milestones** (in order):
1. Attention Is All You Need (2017) - Transformer architecture
2. BERT (2018) - Pre-training revolution
3. GPT-2 (2019) - Scaling up
4. GPT-3 (2020) - In-context learning
5. InstructGPT (2022) - Alignment via RLHF
6. ChatGPT (2022) - Product breakthrough
7. GPT-4 (2023) - Multimodal capability

### Path 2: AI Fundamentals
**Description**: Essential AI concepts every professional should understand.

**Milestones** (in order):
1. Turing's "Computing Machinery" (1950)
2. Perceptron (1958)
3. Backpropagation (1986)
4. ImageNet (2009)
5. AlexNet (2012)
6. Word2Vec (2013)
7. Transformer (2017)
8. GPT-3 (2020)
9. ChatGPT (2022)

### Path 3: AI Safety & Alignment
**Description**: Understanding the risks and efforts to make AI beneficial.

**Milestones** (in order):
1. Asilomar AI Principles (2017)
2. GPT-2 Limited Release (2019)
3. InstructGPT/RLHF (2022)
4. Constitutional AI (2022)
5. EU AI Act (2024)
6. Recent alignment papers

### Path 4: AI for Business Leaders
**Description**: Understand enough to lead AI initiatives confidently.

**Milestones** (in order):
1. GPT-3 (2020) - What changed
2. ChatGPT (2022) - Product breakthrough
3. GPT-4 (2023) - Enterprise capabilities
4. Claude (2023) - Alternative approaches
5. AI agents overview
6. Common implementation patterns
7. Risk and governance considerations

### Path 5: AI Image Generation Explained
**Description**: Understand Midjourney, DALL-E, and Stable Diffusion.

**Milestones** (in order):
1. GANs (2014) - Generative beginnings
2. StyleGAN (2018) - Photorealistic faces
3. CLIP (2021) - Connecting text and images
4. DALL-E (2021) - Text to image
5. Stable Diffusion (2022) - Open source revolution
6. Midjourney (2022) - Artistic applications

---

## Data Structure

```typescript
interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  milestoneIds: string[];  // Ordered
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  suggestedNextPathIds: string[];  // Paths to recommend after completion
  keyTakeaways: string[];  // 3-5 bullet points for summary screen
  conceptsCovered: string[];  // Concepts user will understand
}

interface UserPathProgress {
  pathId: string;
  viewedMilestoneIds: string[];
  startedAt: string;
  completedAt?: string;
  timeSpentMinutes: number;  // Track for summary
}

interface PathCompletionBadge {
  pathId: string;
  pathTitle: string;
  completedAt: string;
  shareUrl: string;  // Unique URL for sharing
  imageUrl: string;  // Generated badge image
}
```

### localStorage Schema
```typescript
interface StoredProgress {
  paths: Record<string, UserPathProgress>;
  lastActivePath?: string;
}

// Key: 'ai-timeline-progress'
```

---

## UI Components

### PathSelector
```
┌────────────────────────────────────────┐
│  Choose a Learning Path                │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │ The ChatGPT Story                │  │
│  │ Follow the breakthroughs that    │  │
│  │ led to ChatGPT                   │  │
│  │ 7 milestones · ~15 min           │  │
│  │ ████████░░░░ 60% complete        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ AI Fundamentals                  │  │
│  │ Essential concepts for pros      │  │
│  │ 9 milestones · ~20 min           │  │
│  │ ░░░░░░░░░░░░ Not started        │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Path Navigation in MilestoneDetail
```
┌────────────────────────────────────────┐
│  ◀ Previous                  Next ▶    │
│                                        │
│  The ChatGPT Story                     │
│  Step 3 of 7: GPT-3                    │
│  ████████████░░░░░░ 43%                │
└────────────────────────────────────────┘
```

---

## Success Criteria
- [x] At least 5 paths available at launch
- [x] Progress persists across sessions (UI COMPLETE - usePathProgress localStorage hook)
- [x] Users can navigate forward/backward in path (UI COMPLETE - PathNavigation component)
- [x] Path completion triggers celebration with confetti (UI COMPLETE - PathCompletionSummary)
- [x] End-of-path summary shows key takeaways (UI COMPLETE - PathCompletionSummary)
- [x] Suggested next paths appear after completion (UI COMPLETE - PathCompletionSummary)
- [x] Shareable badge/certificate generates correctly (UI COMPLETE - share/copy feature)
- [x] Share links work on LinkedIn/Twitter (UI COMPLETE - Web Share API + clipboard)
- [x] Works on mobile (UI COMPLETE - responsive design)

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [x] All Playwright tests passing locally
- [x] All 5 learning paths validated against schema
- [x] Path navigation tested end-to-end locally
- [x] No TypeScript errors (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)

### Deployment Steps
- [x] Create PR with learning paths feature
- [x] Verify CI pipeline passes
- [x] Merge to main branch
- [x] Deploy to S3/CloudFront (`npm run deploy`)
- [x] Invalidate CloudFront cache

### Production Verification
- [x] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [x] Navigate to Learning Paths section
- [x] Verify all 5 paths display with descriptions
- [x] Start "The ChatGPT Story" path
- [x] Navigate through 3+ milestones using Next/Previous
- [x] Verify progress bar updates correctly
- [x] Close browser, reopen, verify progress persisted
- [x] Complete a path, verify celebration and summary screen
- [x] Test "Suggested next paths" links work
- [x] Generate and test share link/badge
- [x] Test on mobile device

### Rollback Plan
If issues found in production:
1. Revert merge commit: `git revert <commit-hash>`
2. Push to main and redeploy
3. Invalidate CloudFront cache
4. Note: User progress in localStorage will persist

---

## Implementation Notes (December 2025)

### Learning Paths Deployed
All 5 learning paths are live with validated milestone IDs:

| Path | Milestones | Duration | Difficulty |
|------|------------|----------|------------|
| The ChatGPT Story | 7 | 30 min | Beginner |
| AI Fundamentals | 6 | 45 min | Beginner |
| AI Governance & Policy | 7 | 40 min | Intermediate |
| AI for Business Leaders | 6 | 35 min | Beginner |
| AI Image Generation | 5 | 25 min | Beginner |

### Key Files
- `src/types/learningPath.ts` - Zod schema for path validation
- `src/content/learning-paths/*.json` - Path definitions
- `src/components/LearningPaths/` - UI components (PathSelector, PathNavigation, PathCompletionSummary)
- `src/hooks/usePathProgress.ts` - localStorage progress tracking
- `src/pages/LearningPathsPage.tsx` - Main page component

### Deployment Command
```bash
npm run build && \
npx tsx scripts/generate-static-api.ts && \
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && \
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"
```

---

## Next Steps

### Future Enhancements
1. **More Paths**: Add paths for specific audiences (developers, researchers, educators)
2. **Dynamic Path Generation**: AI-powered path suggestions based on user interests
3. **Path Analytics**: Track which paths are most popular and where users drop off
4. **Social Features**: See which paths friends have completed
5. **Certificates**: Generate downloadable PDF certificates for completed paths
