# Sprint 14: Personalized Onboarding

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 11 (Learning Paths)

## Overview
Create a first-time user flow that personalizes the learning experience based on role, goals, and time availability. The onboarding generates a custom learning path and sets the default explanation level.

---

## Tasks

### 14.1 Onboarding Flow UI
- [ ] Create `OnboardingModal` component
- [ ] Step 1: Role selection (single select)
- [ ] Step 2: Goal selection (multi-select, 1-3 goals)
- [ ] Step 3: Time commitment selection
- [ ] Progress indicator showing steps
- [ ] Skip option (use defaults)

### 14.2 User Profile Storage
- [ ] Define UserProfile interface
- [ ] Store profile in localStorage
- [ ] Create profile context for app-wide access
- [ ] Support profile editing from settings

### 14.3 Path Recommendation Engine
- [ ] Map role + goals to recommended paths
- [ ] Filter paths by time commitment
- [ ] Prioritize paths by relevance score
- [ ] Generate "Your personalized learning plan"

### 14.4 Content Personalization
- [ ] Set default explanation level based on role:
  - Executive/Leadership → Business Impact
  - Developer → Technical
  - Others → Simple
- [ ] Customize AI Companion system prompt with role context
- [ ] Show role-relevant examples in explanations

### 14.5 First-Time Experience
- [ ] Detect first-time visitors
- [ ] Show onboarding before main content
- [ ] "Welcome back" message for returning users
- [ ] Quick profile summary in header/sidebar

### 14.6 Results Screen
- [ ] Show personalized path recommendations
- [ ] Display estimated total learning time
- [ ] "Start your journey" CTA
- [ ] Option to explore all paths instead

---

## Data Structure

```typescript
type UserRole =
  | 'executive'
  | 'product_manager'
  | 'marketing_sales'
  | 'operations_hr'
  | 'developer'
  | 'student'
  | 'curious';

type LearningGoal =
  | 'discuss_at_work'      // Understand AI well enough to discuss it at work
  | 'evaluate_tools'       // Evaluate AI tools for my team
  | 'hype_vs_real'         // Know what's hype vs. real
  | 'industry_impact'      // Prepare for AI's impact on my industry
  | 'build_with_ai'        // Build products/features with AI
  | 'career_transition';   // Transition into AI-related role

type TimeCommitment =
  | 'quick'     // 15 minutes - just the essentials
  | 'standard'  // 1 hour - solid foundation
  | 'deep';     // Deep dive - comprehensive

interface UserProfile {
  id: string;
  role: UserRole;
  goals: LearningGoal[];
  timeCommitment: TimeCommitment;
  preferredExplanationLevel: 'simple' | 'business' | 'technical';
  createdAt: string;
  updatedAt: string;
}

interface PersonalizedPlan {
  recommendedPaths: {
    pathId: string;
    relevanceScore: number;  // 0-100
    reason: string;          // Why this path matches their goals
  }[];
  estimatedTotalMinutes: number;
  suggestedStartPath: string;
}
```

---

## Role → Path Mapping

```typescript
const rolePathMapping: Record<UserRole, string[]> = {
  executive: ['ai-for-business-leaders', 'chatgpt-story', 'ai-safety'],
  product_manager: ['chatgpt-story', 'ai-for-business-leaders', 'ai-image-generation'],
  marketing_sales: ['chatgpt-story', 'ai-for-business-leaders'],
  operations_hr: ['ai-for-business-leaders', 'ai-safety'],
  developer: ['ai-fundamentals', 'chatgpt-story', 'ai-image-generation'],
  student: ['ai-fundamentals', 'chatgpt-story', 'ai-safety'],
  curious: ['chatgpt-story', 'ai-fundamentals'],
};

const goalPathMapping: Record<LearningGoal, string[]> = {
  discuss_at_work: ['chatgpt-story', 'ai-for-business-leaders'],
  evaluate_tools: ['ai-for-business-leaders', 'chatgpt-story'],
  hype_vs_real: ['ai-fundamentals', 'ai-safety'],
  industry_impact: ['ai-for-business-leaders', 'ai-safety'],
  build_with_ai: ['ai-fundamentals', 'chatgpt-story', 'ai-image-generation'],
  career_transition: ['ai-fundamentals', 'chatgpt-story', 'ai-safety'],
};

const timeFilterMinutes: Record<TimeCommitment, number> = {
  quick: 20,
  standard: 60,
  deep: 999,  // No limit
};
```

---

## UI Components

### Step 1: Role Selection
```
┌─────────────────────────────────────────────────────────────┐
│  Welcome! Let's personalize your learning.                  │
│                                                             │
│  ○ ○ ○  Step 1 of 3                                         │
│                                                             │
│  What's your role?                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Executive / Leadership                            │    │
│  │ ○ Product / Project Manager                         │    │
│  │ ○ Marketing / Sales                                 │    │
│  │ ○ Operations / HR                                   │    │
│  │ ○ Developer (non-ML)                                │    │
│  │ ○ Student / Career changer                          │    │
│  │ ○ Just curious                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Skip]                                      [Next →]       │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Goal Selection
```
┌─────────────────────────────────────────────────────────────┐
│  ● ○ ○  Step 2 of 3                                         │
│                                                             │
│  What are your goals? (Select 1-3)                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑ Understand AI well enough to discuss it at work   │    │
│  │ ☐ Evaluate AI tools for my team                     │    │
│  │ ☑ Know what's hype vs. real                         │    │
│  │ ☐ Prepare for AI's impact on my industry            │    │
│  │ ☐ Build products/features with AI                   │    │
│  │ ☐ Transition into an AI-related role                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [← Back]                                    [Next →]       │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Time Commitment
```
┌─────────────────────────────────────────────────────────────┐
│  ● ● ○  Step 3 of 3                                         │
│                                                             │
│  How much time do you have?                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ 15 minutes                                        │    │
│  │   Just the essentials - the key moments you         │    │
│  │   need to know                                      │    │
│  │                                                     │    │
│  │ ● 1 hour                                            │    │
│  │   A solid foundation - understand the major         │    │
│  │   breakthroughs and their impact                    │    │
│  │                                                     │    │
│  │ ○ Deep dive                                         │    │
│  │   Comprehensive understanding - explore the         │    │
│  │   full history and technical details                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [← Back]                          [Create My Plan →]       │
└─────────────────────────────────────────────────────────────┘
```

### Results Screen
```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Your Personalized Learning Plan                         │
│                                                             │
│  Based on your goals, here's what we recommend:             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. The ChatGPT Story                    ~15 min     │    │
│  │    Perfect for discussing AI at work                │    │
│  │    [Start Here →]                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 2. AI for Business Leaders              ~25 min     │    │
│  │    Evaluate tools and lead initiatives              │    │
│  │    [Add to Plan]                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Total estimated time: ~40 minutes                          │
│                                                             │
│  [Explore All Paths Instead]                                │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Companion Integration

When user has a profile, inject into system prompt:

```
User context:
- Role: [ROLE]
- Goals: [GOALS]
- Preferred depth: [LEVEL]

Adjust your explanations to be most relevant for their role.
For example, if they're in marketing, use marketing examples.
If they're a developer, you can be slightly more technical.
```

---

## localStorage Schema

```typescript
interface StoredUserData {
  profile?: UserProfile;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
}

// Key: 'ai-timeline-user'
```

---

## Success Criteria
- [ ] Onboarding completes in < 60 seconds
- [ ] Path recommendations feel relevant to selected role/goals
- [ ] Skip option available for users who want to explore freely
- [ ] Profile persists across sessions
- [ ] AI Companion adapts responses to user profile
- [ ] Explanation level defaults match user role
- [ ] Mobile-friendly onboarding flow
- [ ] Returning users see personalized greeting

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [ ] All Playwright tests passing locally
- [ ] Onboarding flow tested with all role/goal combinations
- [ ] Path recommendation logic verified
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)

### Deployment Steps
- [ ] Create PR with onboarding feature
- [ ] Verify CI pipeline passes
- [ ] Merge to main branch
- [ ] Deploy to S3/CloudFront (`npm run deploy`)
- [ ] Invalidate CloudFront cache

### Production Verification
- [ ] Open incognito/private browser window
- [ ] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [ ] Verify onboarding modal appears for new users
- [ ] Complete full onboarding flow:
  - [ ] Select role (Executive)
  - [ ] Select goals (2-3 options)
  - [ ] Select time commitment (1 hour)
- [ ] Verify personalized path recommendations appear
- [ ] Start recommended path
- [ ] Verify AI Companion mentions your role in responses
- [ ] Verify default explanation tab matches role
- [ ] Close browser, reopen, verify no onboarding (returning user)
- [ ] Verify "Welcome back" or profile indicator shows
- [ ] Test "Skip" button on fresh session
- [ ] Test complete flow on mobile device

### Rollback Plan
If issues found in production:
1. Revert merge commit: `git revert <commit-hash>`
2. Push to main and redeploy
3. Invalidate CloudFront cache
4. Note: User profiles in localStorage will persist
