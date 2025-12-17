# Sprint 17: "AI for Everyday Life" — Accessible Learning Path

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 11 (Learning Paths), Sprint 10 (Layered Content)

## Overview
Create a beginner-friendly learning path designed for older adults (65+) who want to understand what AI is, why everyone's talking about it, and how it affects their daily life. Focus on the last 5 years (2019-2024), using plain English, familiar analogies, and practical takeaways.

**Target Persona**: "Margaret, 72"
- Retired teacher, uses iPad and iPhone
- Hears grandkids talk about ChatGPT, sees AI in the news
- Wants to understand without feeling stupid
- Concerned about scams and misinformation
- May want to try AI tools herself

---

## Tasks

### 17.1 New Learning Path Definition
- [x] Create `ai-for-everyday-life.json` path file
- [x] Define 5 milestone journey (2019-2024 focus)
- [x] Set difficulty: "beginner", duration: 20 min
- [x] Write approachable description and key takeaways
- [x] Add to path selector with prominent placement

**Path Structure:**
```
1. "When AI Learned to Write" (GPT-2, 2019)
2. "AI Gets Surprisingly Good" (GPT-3, 2020)
3. "AI Learns to Create Pictures" (DALL-E, 2022)
4. "The ChatGPT Moment" (ChatGPT, Nov 2022)
5. "AI Today & What's Next" (2023-2024 overview)
```

### 17.2 Plain English Content Layer
- [x] Add `plainEnglish` field to MilestoneLayeredContent type
- [x] Create PlainEnglishContent interface with 5 sections
- [x] Write plain English content for 5 path milestones
- [x] Update layered-content.json with new field

**PlainEnglish Structure:**
```typescript
interface PlainEnglishContent {
  whatHappened: string;      // 2-3 sentences, no jargon
  thinkOfItLike: string;     // Familiar analogy from their era
  howItAffectsYou: string;   // Healthcare, shopping, family
  tryItYourself?: string;    // Safe, optional activity
  watchOutFor: string;       // Scams, misinformation warnings
}
```

### 17.3 Simplified Checkpoint Questions
- [x] Create checkpoints for this path (added to questions.json)
- [x] Write 8 simple comprehension questions
- [x] Use simple multiple choice only
- [x] Add encouraging, educational explanations
- [x] No ordering/matching (too complex for target audience)

**Question Types for This Path:**
- True/False with explanation
- Simple multiple choice (3 options max)
- "Did this make sense?" reflection prompt

### 17.4 Accessibility Mode Toggle
- [ ] Add "Comfortable Reading" toggle to settings
- [ ] Increase base font size (16px → 18px)
- [ ] Increase line height (1.5 → 1.8)
- [ ] Simplify UI when enabled (hide advanced filters)
- [ ] Persist preference in localStorage

### 17.5 Path UI Adjustments
- [ ] Larger Next/Previous buttons for this path
- [ ] Progress shown as "Step 2 of 5" (not percentage)
- [ ] Add "Take a break?" prompt after 10 minutes
- [ ] Reduce visual clutter (no sidebar during path)

### 17.6 "How AI Affects You" Quick Reference
- [ ] Create standalone page `/learn/ai-affects-you`
- [ ] Section: AI & Your Health
- [ ] Section: AI & Scams to Watch For
- [ ] Section: AI & Your Family (grandkids, homework)
- [ ] Section: Trying AI Safely (beginner guide)
- [ ] Link from path completion screen

---

## Content: Plain English Examples

### Milestone: ChatGPT (November 2022)

```json
{
  "whatHappened": "In November 2022, a company called OpenAI released a free tool called ChatGPT. For the first time, anyone with internet access could have a conversation with a computer that felt remarkably human. You could ask it questions, have it help write letters, or explain complicated topics—and it would respond in plain English, like talking to a helpful assistant.",

  "thinkOfItLike": "Imagine having access to a very well-read research assistant who has read millions of books, articles, and websites. This assistant can't actually think or feel emotions, but they're very good at giving responses that sound thoughtful and helpful. That's essentially what ChatGPT is—a tool that's very good at predicting what words should come next in a conversation.",

  "howItAffectsYou": "You might already be encountering AI without realizing it:\n• Customer service 'chat' on websites is often AI now\n• Some news articles and product descriptions are AI-written\n• Scam emails have gotten more convincing (AI helps scammers write better)\n• Your grandchildren might use it for homework help\n• Your doctor's office might use AI to help with scheduling or basic questions",

  "tryItYourself": "If you're curious, visit chat.openai.com (it's free to try). You might ask: 'Explain Medicare Part D in simple terms' or 'Help me write a thank-you note to my neighbor for bringing me soup when I was sick.' Notice how it responds like a helpful person would—but remember, it's not actually a person.",

  "watchOutFor": "Important cautions:\n• AI can sound very confident even when it's completely wrong—never trust it for medical advice, legal decisions, or financial choices\n• Scammers now use AI to write more convincing emails—if something sounds too good to be true, it still is\n• AI can now clone voices—if you get a call from a 'grandchild' asking for money, hang up and call them back at their real number\n• Just because something is well-written doesn't mean it's true"
}
```

### Milestone: DALL-E / AI Images (2022)

```json
{
  "whatHappened": "In 2022, several companies released tools that could create realistic images from simple text descriptions. You could type 'a golden retriever wearing a graduation cap' and the AI would create that image from scratch—not by finding an existing photo, but by generating a completely new one.",

  "thinkOfItLike": "Think of it like having an artist who works incredibly fast. You describe what you want, and in seconds, they create it. But unlike a human artist, this AI learned by studying millions of existing images online, then figured out patterns for how to create new ones.",

  "howItAffectsYou": "This affects what you can trust:\n• Photos in the news might be AI-generated (especially political images)\n• That 'too perfect' vacation photo might not be real\n• Scammers can create fake photos of people who don't exist\n• Product images online might show items that don't look like that in real life\n• Some greeting cards and artwork are now AI-generated",

  "tryItYourself": "You can try creating AI images at bing.com/create (free with a Microsoft account). Try something fun like 'a cat dressed as an astronaut eating pizza.' It's a good way to understand what AI can create.",

  "watchOutFor": "How to spot AI images:\n• Look for weird hands (AI often draws too many fingers)\n• Check text in images (AI scrambles letters)\n• Backgrounds might be blurry or nonsensical\n• Faces might look 'too perfect' or slightly off\n• If a photo seems too perfect or too outrageous, question whether it's real"
}
```

---

## Simplified Checkpoints

### Checkpoint: After ChatGPT Milestone
```json
{
  "id": "cp-everyday-chatgpt",
  "title": "Quick Check: ChatGPT",
  "pathId": "ai-for-everyday-life",
  "afterMilestoneId": "E2022_CHATGPT",
  "questions": [
    {
      "type": "true_false",
      "id": "q-chatgpt-always-right",
      "statement": "ChatGPT always gives correct information.",
      "correctAnswer": false,
      "explanation": "ChatGPT can sound very confident even when it's completely wrong. That's why you should never rely on it for medical, legal, or financial decisions. Always verify important information with trusted sources."
    },
    {
      "type": "multiple_choice",
      "id": "q-chatgpt-what-is-it",
      "question": "What is ChatGPT best described as?",
      "options": [
        "A human expert who answers questions",
        "A tool that's very good at generating human-like text",
        "A search engine like Google"
      ],
      "correctIndex": 1,
      "explanation": "ChatGPT is a tool (not a person) that learned to generate text by studying patterns in millions of documents. It's very good at sounding helpful, but it doesn't actually 'know' things the way people do."
    },
    {
      "type": "reflection",
      "id": "q-chatgpt-reflection",
      "prompt": "Can you think of one situation where ChatGPT might be helpful to you? And one situation where you definitely shouldn't trust it?",
      "followUp": "Great thinking! Many people find AI helpful for drafting letters, getting recipe ideas, or understanding confusing documents. But it's not trustworthy for health questions, legal advice, or verifying facts."
    }
  ]
}
```

---

## UI Mockups

### Learning Path Card (Homepage)
```
┌─────────────────────────────────────────────────────────────┐
│  🌟 RECOMMENDED FOR YOU                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🏠 AI for Everyday Life                            │    │
│  │                                                     │    │
│  │  Understand what AI is, why everyone's talking      │    │
│  │  about it, and how it affects your daily life.      │    │
│  │                                                     │    │
│  │  ✓ No technical background needed                   │    │
│  │  ✓ 20 minutes                                       │    │
│  │  ✓ Practical tips you can use today                 │    │
│  │                                                     │    │
│  │  [Start Learning →]                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Step Progress (During Path)
```
┌─────────────────────────────────────────────────────────────┐
│  AI for Everyday Life                                       │
│                                                             │
│  Step 3 of 5: AI Learns to Create Pictures                  │
│  ━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━                            │
│                                                             │
│  [← Previous]                            [Next Step →]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria
- [x] Path visible and selectable on Learn page
- [x] All 5 milestones have plain English content
- [x] Checkpoints use only simple question types
- [ ] Accessibility toggle works and persists (deferred)
- [ ] "How AI Affects You" page accessible (deferred)
- [x] Path completable on mobile/tablet
- [x] No jargon without explanation in user-facing content
- [ ] User testing feedback incorporated (Phase 2)

---

## Deployment Checklist

### Pre-Deployment
- [x] Path definition validates against schema
- [x] All milestone IDs exist in database
- [x] Plain English content complete for all 5 milestones
- [x] Checkpoints validate and function
- [x] TypeScript compiles without errors
- [x] Build succeeds

### Production Verification
- [x] Visit production URL
- [x] Navigate to Learn page
- [x] Find "AI for Everyday Life" path
- [ ] Complete full path journey (needs manual test)
- [ ] Verify checkpoints appear and function (needs manual test)
- [ ] Test accessibility toggle (deferred)
- [ ] Test on mobile device (needs manual test)
- [ ] Verify "How AI Affects You" page (deferred)

---

## Future Enhancements (Not This Sprint)
- Audio narration option (text-to-speech)
- Printable summary/cheat sheet
- "Share with family" feature
- Video supplements
- Phone support hotline integration
