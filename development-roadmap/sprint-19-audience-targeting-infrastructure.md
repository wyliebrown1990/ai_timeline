# Sprint 19: Audience Targeting Infrastructure

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 17, Sprint 18

## Overview
Build the shared infrastructure that enables audience-specific experiences across the platform. This includes user preference detection, content layer switching, and intelligent path recommendations. This sprint ensures Sprints 17 and 18 work together cohesively.

---

## Tasks

### 19.1 User Profile Enhancement
- [x] Extend UserProfile type with audience segment
- [x] Add `audienceType` field: 'everyday' | 'leader' | 'technical' | 'general'
- [x] Store in localStorage and context
- [x] Migrate existing users to 'general' default

```typescript
interface UserProfile {
  // Existing fields...
  audienceType: 'everyday' | 'leader' | 'technical' | 'general';
  accessibilityPreferences: {
    largerText: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
  };
  completedPaths: string[];
  readinessScore?: number; // From leader assessment
}
```

### 19.2 Onboarding Flow Update
- [x] Add audience selection to onboarding
- [x] Create visual cards for each audience type
- [x] Write compelling descriptions for each
- [x] Skip technical questions for 'everyday' audience
- [x] Fast-track 'leader' to business-focused content

**Audience Selection Screen:**
```
"What brings you to AI Timeline?"

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 🏠 Everyday     │  │ 📊 Business     │  │ 💻 Technical    │
│                 │  │                 │  │                 │
│ I want to       │  │ I need to make  │  │ I want deep     │
│ understand what │  │ AI decisions    │  │ technical       │
│ AI is and how   │  │ for my team or  │  │ understanding   │
│ it affects my   │  │ organization    │  │ of how AI       │
│ daily life      │  │                 │  │ actually works  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 19.3 Content Layer Switcher
- [x] Create ContentLayerContext for global layer preference
- [x] Build layer switcher component (dropdown)
- [x] Options: "Simple" | "Business" | "Technical" | "Full"
- [x] Remember preference per user
- [x] Auto-suggest based on audience type

### 19.4 Smart Path Recommendations
- [x] Update PathSelector to filter by audience
- [x] Show "Recommended for You" section
- [x] Deprioritize technical paths for 'everyday' users
- [x] Deprioritize basic paths for 'technical' users
- [x] Add "Not what you're looking for?" toggle

### 19.5 Milestone View Adaptation
- [x] MilestoneDetail checks user's audience type
- [x] Default to appropriate content layer
- [x] 'everyday' → plainEnglish layer
- [x] 'leader' → executiveBrief layer
- [x] 'technical' → technicalDepth layer
- [x] Allow switching with clear UI

### 19.6 Progress Sync Across Audiences
- [x] Track progress separately per path
- [x] Show cross-path achievements
- [x] "You've completed 2 paths!" celebration
- [x] Suggest next path based on history
- [x] Don't re-show completed milestones in new paths

### 19.7 Analytics Events
- [x] Track audience type selection
- [x] Track content layer switches
- [x] Track path completion by audience
- [x] Track drop-off points per audience
- [x] Create audience comparison dashboard

---

## Component Updates

### PathSelector Enhancement
```tsx
interface PathSelectorProps {
  audienceFilter?: 'everyday' | 'leader' | 'technical' | 'all';
  showRecommendations?: boolean;
}

// Shows:
// 1. "Recommended for You" (based on audience)
// 2. Audience-appropriate paths first
// 3. "Explore Other Paths" collapsed section
```

### MilestoneDetail Layer Switcher
```
┌─────────────────────────────────────────────────────────────┐
│  The ChatGPT Moment (November 2022)                        │
│                                                             │
│  View: [Simple ▼]  ← Dropdown                              │
│        ┌─────────────┐                                      │
│        │ ✓ Simple    │ ← Current                           │
│        │   Business  │                                      │
│        │   Technical │                                      │
│        │   Full      │                                      │
│        └─────────────┘                                      │
│                                                             │
│  [Content displays based on selection]                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model Updates

### layered-content.json Structure
```json
{
  "E2022_CHATGPT": {
    "tldr": "...",
    "simpleExplanation": "...",
    "businessImpact": "...",
    "technicalDepth": "...",
    "historicalContext": "...",
    "whyItMattersToday": "...",
    "commonMisconceptions": "...",

    "plainEnglish": {
      "whatHappened": "...",
      "thinkOfItLike": "...",
      "howItAffectsYou": "...",
      "tryItYourself": "...",
      "watchOutFor": "..."
    },

    "executiveBrief": {
      "bottomLine": "...",
      "businessImplications": "...",
      "questionsToAsk": ["..."],
      "competitorWatch": "...",
      "actionItems": ["..."],
      "furtherReading": ["..."]
    }
  }
}
```

### Path Metadata Addition
```json
{
  "id": "ai-for-everyday-life",
  "title": "AI for Everyday Life",
  "targetAudience": "everyday",
  "audienceDescription": "People who want to understand AI without technical background",
  "recommendedFor": ["everyday"],
  "notRecommendedFor": ["technical"],
  "prerequisites": [],
  "contentLayer": "plainEnglish"
}
```

---

## Success Criteria
- [x] Onboarding captures audience preference
- [x] Path recommendations change based on audience
- [x] Correct content layer shows by default
- [x] Users can switch layers manually
- [x] Progress tracked correctly across paths
- [x] Analytics events firing properly
- [ ] No regression in existing functionality (requires manual testing)

---

## Deployment Checklist

### Pre-Deployment
- [x] All new types compile without errors
- [x] Existing user profiles migrate correctly
- [x] Onboarding flow tested end-to-end
- [x] Content layer switching works
- [x] Analytics events verified in console

### Production Verification
- [ ] New user onboarding captures audience
- [ ] Returning users see appropriate recommendations
- [ ] Layer switcher functional on milestones
- [ ] Progress syncs correctly
- [ ] Mobile experience works

---

## Rollback Plan
If audience targeting causes issues:
1. Set all users to `audienceType: 'general'`
2. Hide audience selector in onboarding
3. Default to existing content layers
4. Revert PathSelector filtering
