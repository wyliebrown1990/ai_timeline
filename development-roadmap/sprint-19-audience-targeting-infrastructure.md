# Sprint 19: Audience Targeting Infrastructure

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 17, Sprint 18

## Overview
Build the shared infrastructure that enables audience-specific experiences across the platform. This includes user preference detection, content layer switching, and intelligent path recommendations. This sprint ensures Sprints 17 and 18 work together cohesively.

---

## Tasks

### 19.1 User Profile Enhancement
- [ ] Extend UserProfile type with audience segment
- [ ] Add `audienceType` field: 'everyday' | 'leader' | 'technical' | 'general'
- [ ] Store in localStorage and context
- [ ] Migrate existing users to 'general' default

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
- [ ] Add audience selection to onboarding
- [ ] Create visual cards for each audience type
- [ ] Write compelling descriptions for each
- [ ] Skip technical questions for 'everyday' audience
- [ ] Fast-track 'leader' to business-focused content

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
- [ ] Create ContentLayerContext for global layer preference
- [ ] Build layer switcher component (dropdown)
- [ ] Options: "Simple" | "Business" | "Technical" | "Full"
- [ ] Remember preference per user
- [ ] Auto-suggest based on audience type

### 19.4 Smart Path Recommendations
- [ ] Update PathSelector to filter by audience
- [ ] Show "Recommended for You" section
- [ ] Deprioritize technical paths for 'everyday' users
- [ ] Deprioritize basic paths for 'technical' users
- [ ] Add "Not what you're looking for?" toggle

### 19.5 Milestone View Adaptation
- [ ] MilestoneDetail checks user's audience type
- [ ] Default to appropriate content layer
- [ ] 'everyday' → plainEnglish layer
- [ ] 'leader' → executiveBrief layer
- [ ] 'technical' → technicalDepth layer
- [ ] Allow switching with clear UI

### 19.6 Progress Sync Across Audiences
- [ ] Track progress separately per path
- [ ] Show cross-path achievements
- [ ] "You've completed 2 paths!" celebration
- [ ] Suggest next path based on history
- [ ] Don't re-show completed milestones in new paths

### 19.7 Analytics Events
- [ ] Track audience type selection
- [ ] Track content layer switches
- [ ] Track path completion by audience
- [ ] Track drop-off points per audience
- [ ] Create audience comparison dashboard

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
- [ ] Onboarding captures audience preference
- [ ] Path recommendations change based on audience
- [ ] Correct content layer shows by default
- [ ] Users can switch layers manually
- [ ] Progress tracked correctly across paths
- [ ] Analytics events firing properly
- [ ] No regression in existing functionality

---

## Deployment Checklist

### Pre-Deployment
- [ ] All new types compile without errors
- [ ] Existing user profiles migrate correctly
- [ ] Onboarding flow tested end-to-end
- [ ] Content layer switching works
- [ ] Analytics events verified in console

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
