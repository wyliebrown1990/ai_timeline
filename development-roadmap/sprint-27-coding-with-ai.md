# Sprint 27: "Coding with AI" — Vibe Coding & Context Engineering Path

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 11 (Learning Paths), Sprint 10 (Layered Content)

**Status**: Content Phase Complete (2025-12-18)

### Completion Summary
Core content for the "Coding with AI" learning path has been created:
- ✅ Learning path definition with 5 milestones
- ✅ 4 new timeline milestones (Cursor, Claude Code, Vibe Coding, Context Engineering)
- ✅ Layered content with `codersGuide` for all new milestones
- ✅ 4 checkpoints with 11 questions
- ✅ Tool comparison data with decision helper

**Remaining**: UI integration to display the path on the Learn page, TypeScript types, ToolComparison component.

## Overview
Create a practical learning path for aspiring developers who want to build software using AI assistants. Focus on the emerging paradigm of "vibe coding" (describing what you want in natural language) and "context engineering" (structuring information to get better AI outputs). Target users who are curious about coding but intimidated by traditional programming education.

**Target Persona**: "Alex, 34"
- Product manager at a tech company, comfortable with spreadsheets and no-code tools
- Sees engineering colleagues shipping features rapidly with Cursor/Claude
- Heard Andrej Karpathy say "the hottest new programming language is English"
- Wants to build a simple internal tool without learning to code the traditional way
- Skeptical but curious—doesn't want to fake expertise or get stuck
- Has 30-40 minutes, prefers hands-on learning over theory

---

## Tasks

### 27.1 New Learning Path Definition
- [x] Create `coding-with-ai.json` path file
- [x] Define 8 milestone journey (practical focus)
- [x] Set difficulty: "beginner", duration: 35 min
- [x] Write approachable description emphasizing "no coding background needed"
- [ ] Add to path selector with prominent placement for technical-curious users

**Path Structure:**
```
1. "AI Learns to Complete Code" (GitHub Copilot, 2021)
2. "The 'Vibe Coding' Moment" (Karpathy tweet, Feb 2025)
3. "What is Context Engineering?" (From prompts to context)
4. "Your First AI Coding Session" (Plain English → working code)
5. "When AI Gets Stuck" (Debugging and iteration)
6. "Tools of the Trade" (Claude Code, Cursor, Copilot)
7. "Building Your Context Library" (CLAUDE.md, rules, docs)
8. "The Human in the Loop" (Review, testing, verification)
```

### 27.2 New Timeline Milestones
- [x] Create `E2021_GITHUB_COPILOT` milestone (already existed)
- [x] Create `E2023_CURSOR` milestone
- [x] Create `E2024_CLAUDE_CODE` milestone
- [x] Create `E2025_VIBE_CODING` milestone
- [x] Create `E2025_CONTEXT_ENGINEERING` milestone
- [x] Add milestones to main timeline data (index.json and filter.json)
- [x] Assign to appropriate era (multimodal_deployment)

**Milestone Definitions:**

```yaml
# E2021_GITHUB_COPILOT
id: E2021_GITHUB_COPILOT
title: "GitHub Copilot launches"
date_start: "2021-06-29"
era: scaling_llms
event_type: product_launch
summary_md: |
  GitHub and OpenAI release Copilot, an AI pair programmer that suggests code
  completions in real-time. Trained on public GitHub repositories, it marks the
  first mainstream AI coding assistant and begins shifting how developers write code.
why_it_mattered: |
  Copilot proved that AI could meaningfully assist with real programming tasks,
  not just toy examples. It planted the seed for "vibe coding"—the idea that
  describing intent could replace typing syntax.

# E2023_CURSOR
id: E2023_CURSOR
title: "Cursor AI-native IDE released"
date_start: "2023-03-01"
era: alignment_productization
event_type: product_launch
summary_md: |
  Cursor launches as a fork of VS Code rebuilt around AI assistance. Unlike
  plugins, AI is the core interaction model—users chat with their codebase,
  and the AI can read, write, and refactor across multiple files.
why_it_mattered: |
  Cursor demonstrated that AI coding tools work best when integrated deeply
  into the development environment, not bolted on as an afterthought.

# E2024_CLAUDE_CODE
id: E2024_CLAUDE_CODE
title: "Claude Code CLI released"
date_start: "2024-12-01"
era: multimodal_deployment
event_type: product_launch
summary_md: |
  Anthropic releases Claude Code, a command-line tool that brings Claude directly
  into the terminal. It can read files, execute commands, make edits, and work
  as an autonomous coding agent with user oversight.
why_it_mattered: |
  Claude Code showed that AI assistants could operate as agents—not just
  answering questions but taking actions. It introduced concepts like CLAUDE.md
  files for persistent project context.

# E2025_VIBE_CODING
id: E2025_VIBE_CODING
title: "'Vibe coding' enters the lexicon"
date_start: "2025-02-01"
era: multimodal_deployment
event_type: cultural
summary_md: |
  Andrej Karpathy tweets about "vibe coding"—a style of programming where you
  describe what you want in natural language and let AI write the implementation.
  "The hottest new programming language is English."
why_it_mattered: |
  The term crystallized a paradigm shift already underway. Programming was no
  longer just about syntax and algorithms—it was about clearly communicating
  intent to AI collaborators.

# E2025_CONTEXT_ENGINEERING
id: E2025_CONTEXT_ENGINEERING
title: "Context engineering emerges as a discipline"
date_start: "2025-01-01"
era: multimodal_deployment
event_type: milestone
summary_md: |
  As AI coding tools mature, practitioners recognize that "prompt engineering"
  is insufficient. Context engineering—structuring project files, documentation,
  and instructions to maximize AI effectiveness—becomes a distinct skill.
why_it_mattered: |
  Context engineering shifted focus from clever one-off prompts to systematic
  approaches: CLAUDE.md files, rules directories, architectural documentation.
  The best AI results come from well-organized context, not magic prompts.
```

### 27.3 Coder's Guide Content Layer
- [x] Add `codersGuide` field to MilestoneLayeredContent type
- [x] Create CodersGuideContent interface
- [x] Write coder's guide content for 4 new milestones (E2023_CURSOR, E2024_CLAUDE_CODE, E2025_VIBE_CODING, E2025_CONTEXT_ENGINEERING)
- [x] Focus on practical, hands-on activities

**CodersGuide Structure:**
```typescript
interface CodersGuideContent {
  whatYouCanDo: string;        // Practical capability this unlocks
  howToTry: string;            // Step-by-step getting started
  examplePrompt: string;       // Copy-paste prompt to try yourself
  commonMistakes: string[];    // What beginners typically get wrong
  whenToStepIn: string;        // Where human judgment is essential
}
```

### 27.4 Checkpoint Questions
- [x] Create checkpoints for coding-with-ai path (4 checkpoints added)
- [x] Write 10-12 practical questions (11 questions across checkpoints)
- [x] Include "Try it yourself" prompts (explain_back type)
- [x] Add before/after prompt comparisons
- [x] Include debugging scenarios
- [ ] Add "spot the problem" code review exercises

**Question Types for This Path:**
- Prompt comparison (which prompt would work better?)
- Debugging scenarios (AI gave wrong output—what do you ask next?)
- Context assessment (what's missing from this project setup?)
- "Try it yourself" with copy-paste prompts
- Code review basics (spot obvious issues)

### 27.5 Tool Comparison Reference
- [x] Create tool comparison data structure (`src/content/ai-coding-tools.json`)
- [x] Add Claude Code details (terminal, agentic, CLAUDE.md)
- [x] Add Cursor details (IDE, chat + edit, .cursorrules)
- [x] Add GitHub Copilot details (inline, autocomplete, chat)
- [x] Add Windsurf/other emerging tools (ChatGPT also included)
- [x] Create "Which tool fits you?" decision helper (decisionHelper in JSON)

**Tool Comparison Matrix:**
```typescript
interface AICodeTool {
  id: string;
  name: string;
  type: 'ide' | 'cli' | 'plugin' | 'web';
  bestFor: string[];
  contextMethod: string;        // How it handles project context
  pricingModel: string;
  learningCurve: 'low' | 'medium' | 'high';
  autonomyLevel: 'autocomplete' | 'chat' | 'agentic';
  website: string;
}
```

### 27.6 Practical Activities
- [ ] Create "First Prompt" starter activity
- [ ] Create "Debug This" interactive exercise
- [ ] Create downloadable CLAUDE.md template
- [ ] Create sample .cursorrules template
- [ ] Create "Context Checklist" reference card

### 27.7 Path Completion Resources
- [ ] Create `/learn/coding-with-ai-resources` page
- [ ] Curated getting-started guides for each tool
- [ ] Example CLAUDE.md files from real projects
- [ ] Recommended YouTube tutorials
- [ ] Community links (Discord, Reddit)
- [ ] "What to build first" project ideas

---

## Content: Coder's Guide Examples

### Milestone: The "Vibe Coding" Moment

```json
{
  "whatYouCanDo": "Describe what you want a program to do in plain English, and have AI write working code. You don't need to know the syntax—you need to know what you want.",

  "howToTry": "1. Open Claude (claude.ai) or ChatGPT\n2. Describe a simple tool: 'Create a Python script that takes a folder of images and renames them with today's date plus a sequence number'\n3. Copy the code it generates\n4. Ask follow-up questions: 'How do I run this?' or 'Can you add error handling?'\n5. Iterate until it works",

  "examplePrompt": "I need a simple web page that shows a countdown timer to New Year's Eve. It should have a dark background, large white numbers, and update every second. I don't know HTML or JavaScript—please create the complete file I can open in a browser.",

  "commonMistakes": [
    "Being too vague ('make me a website') instead of specific ('make a single-page site that displays my resume with sections for experience, education, and skills')",
    "Not providing context about your environment ('I'm on a Mac, using VS Code, and have Python installed')",
    "Accepting the first response without iterating—AI code usually needs refinement",
    "Not testing the code before assuming it works",
    "Trying to build something too complex for your first attempt"
  ],

  "whenToStepIn": "AI can write code, but you need to:\n• Verify it does what you actually wanted (test it!)\n• Check for obvious security issues (is it asking for passwords? storing sensitive data?)\n• Understand the general approach (ask AI to explain if unclear)\n• Make judgment calls about edge cases and error handling"
}
```

### Milestone: What is Context Engineering?

```json
{
  "whatYouCanDo": "Set up your project so AI tools understand your codebase, your preferences, and your constraints—before you even ask a question. Better context = better code.",

  "howToTry": "1. Create a CLAUDE.md file (or .cursorrules) in your project root\n2. Add: What this project does (2-3 sentences)\n3. Add: Key technologies and patterns you're using\n4. Add: Things to avoid (e.g., 'Don't use any external dependencies')\n5. Add: How to test ('run npm test')\n6. Watch how AI responses improve with this context",

  "examplePrompt": "Here's what to put in a CLAUDE.md file for a simple project:\n\n```markdown\n# My Recipe App\n\nSimple web app for storing family recipes.\n\n## Stack\n- HTML/CSS/JavaScript (no frameworks)\n- LocalStorage for data persistence\n- No build tools—just open index.html\n\n## Preferences\n- Keep it simple, I'm learning\n- Add comments explaining what code does\n- No external dependencies\n\n## Commands\n- Just open index.html in browser to test\n```",

  "commonMistakes": [
    "Writing a novel—context files should be scannable, not exhaustive",
    "Forgetting to update context when the project evolves",
    "Being inconsistent between what your context says and what you ask for",
    "Not including the 'how to run/test' information",
    "Omitting constraints (AI will add complexity if you don't limit it)"
  ],

  "whenToStepIn": "Context engineering is about your judgment:\n• What patterns matter for YOUR project?\n• What mistakes do YOU keep making that AI should avoid?\n• What does AI keep getting wrong that needs explicit guidance?\n• Review AI suggestions against your actual requirements"
}
```

### Milestone: When AI Gets Stuck

```json
{
  "whatYouCanDo": "Recognize when AI-generated code isn't working and know exactly how to help AI fix it. Debugging with AI is a conversation, not a dead end.",

  "howToTry": "When code doesn't work:\n1. Run it and copy the exact error message\n2. Paste the error to AI: 'I got this error: [error]. Here's my code: [code]'\n3. If no error but wrong behavior: 'The code runs but [describe what happens] instead of [what you expected]'\n4. If AI's fix doesn't work, say: 'That didn't fix it. The error now is [new error]'\n5. Sometimes start fresh: 'Let's try a different approach to [goal]'",

  "examplePrompt": "When debugging, try prompts like:\n\n'This code gives me: TypeError: Cannot read property 'map' of undefined at line 15. What's wrong and how do I fix it?'\n\n'The function returns the wrong result. Input: [1,2,3], Expected: 6, Got: undefined. Here's my code:'\n\n'This worked yesterday but now throws an error. I didn't change anything. What could cause this?'",

  "commonMistakes": [
    "Saying 'it doesn't work' without specifying what happens",
    "Not including the actual error message",
    "Making multiple changes at once (change one thing, test, repeat)",
    "Assuming AI's explanation is correct—verify by testing",
    "Giving up too early—sometimes it takes 3-4 iterations"
  ],

  "whenToStepIn": "Debugging requires your judgment:\n• Is the AI going in circles? Time to try a different approach\n• Is the fix getting increasingly complex? Maybe the original approach was wrong\n• Are you in over your head? Ask AI: 'Is this getting too complex for a beginner project?'\n• Trust your instincts—if a solution feels hacky, it probably is"
}
```

---

## Checkpoint Examples

### Checkpoint: Prompt Comparison
```json
{
  "id": "cp-coding-prompt-compare",
  "title": "Which Prompt Works Better?",
  "pathId": "coding-with-ai",
  "afterMilestoneId": "E2025_VIBE_CODING",
  "questions": [
    {
      "type": "comparison",
      "id": "q-prompt-compare-1",
      "scenario": "You want AI to create a to-do list app. Which prompt will get better results?",
      "optionA": "Make me a to-do app",
      "optionB": "Create a simple to-do list web app using HTML, CSS, and JavaScript. Features: add tasks, mark as complete, delete tasks. Store tasks in localStorage so they persist. Keep the code in a single HTML file I can open in my browser.",
      "correctOption": "B",
      "explanation": "Prompt B specifies the technology (HTML/CSS/JS), the features (add, complete, delete), the persistence method (localStorage), and the constraints (single file). This gives AI clear boundaries and requirements. Prompt A could result in anything from a React app to a Python script."
    },
    {
      "type": "comparison",
      "id": "q-prompt-compare-2",
      "scenario": "You're debugging code that won't run. Which approach is better?",
      "optionA": "This doesn't work, please fix it: [paste code]",
      "optionB": "I'm getting this error when I run the code: 'SyntaxError: Unexpected token on line 12'. Here's my code: [paste code]. What's wrong?",
      "correctOption": "B",
      "explanation": "Always include the specific error message. 'Doesn't work' could mean many things—syntax error, wrong output, crashes, runs forever. The error message tells AI exactly where to look and what type of problem to solve."
    }
  ]
}
```

### Checkpoint: Context Assessment
```json
{
  "id": "cp-coding-context",
  "title": "Context Engineering Check",
  "pathId": "coding-with-ai",
  "afterMilestoneId": "E2025_CONTEXT_ENGINEERING",
  "questions": [
    {
      "type": "multiple_choice",
      "id": "q-context-missing",
      "question": "A developer's CLAUDE.md says: 'This is a React app.' What crucial information is missing?",
      "options": [
        "The app's color scheme",
        "How to run the project and run tests",
        "The developer's name",
        "A list of every file in the project"
      ],
      "correctIndex": 1,
      "explanation": "AI needs to know how to verify its work. 'Run npm start' and 'npm test' are essential so AI can tell you how to test changes. Color schemes are nice-to-have, and AI can discover files itself."
    },
    {
      "type": "multiple_select",
      "id": "q-good-context",
      "question": "Which of these belong in a CLAUDE.md file? (Select all that apply)",
      "options": [
        "Project description (what it does)",
        "Your entire git history",
        "Commands to run and test the project",
        "Patterns to follow or avoid",
        "Every function's documentation"
      ],
      "correctIndices": [0, 2, 3],
      "explanation": "Good context files are concise: what the project is, how to run/test it, and key patterns or constraints. AI can read your actual code for details—the context file provides the 'how to think about this project' guidance."
    }
  ]
}
```

### Checkpoint: Try It Yourself
```json
{
  "id": "cp-coding-try-it",
  "title": "Your First AI Coding Task",
  "pathId": "coding-with-ai",
  "afterMilestoneId": "first-ai-coding-session",
  "questions": [
    {
      "type": "activity",
      "id": "q-first-task",
      "title": "Build Something Simple",
      "prompt": "Try this right now with Claude or ChatGPT:",
      "activity": "Copy and paste this prompt:\n\n\"Create a single HTML file that displays the current time, updating every second. Style it with a dark background (#1a1a1a) and large white text centered on the page. Add a greeting that says 'Good morning', 'Good afternoon', or 'Good evening' based on the time.\"\n\nThen:\n1. Copy the code AI generates\n2. Save it as 'clock.html'\n3. Open it in your browser\n4. If it doesn't work, paste the error back to AI",
      "successCriteria": "You've successfully vibe-coded if you have a working clock in your browser—even if it took a few iterations to get there!",
      "reflection": "What was easier than you expected? What was harder? Did you need to iterate?"
    }
  ]
}
```

---

## Data Structures

### Learning Path Definition
```typescript
// src/content/learning-paths/coding-with-ai.json
{
  "id": "coding-with-ai",
  "title": "Coding with AI",
  "subtitle": "From 'Vibe Coding' to Building Real Projects",
  "description": "Learn to build software by describing what you want in plain English. No coding background required—just curiosity and willingness to experiment.",
  "targetAudience": "Curious professionals who want to build tools without traditional programming education",
  "milestoneIds": [
    "E2021_GITHUB_COPILOT",
    "E2025_VIBE_CODING",
    "E2025_CONTEXT_ENGINEERING",
    "first-ai-coding-session",
    "debugging-with-ai",
    "ai-coding-tools",
    "building-context-library",
    "human-in-the-loop"
  ],
  "estimatedMinutes": 35,
  "difficulty": "beginner",
  "suggestedNextPathIds": ["ai-fundamentals", "applied-ai"],
  "keyTakeaways": [
    "You can build working software by describing what you want in plain English",
    "Context engineering (CLAUDE.md, rules files) dramatically improves AI output",
    "Debugging with AI is a conversation—include error messages and iterate",
    "Different tools (Claude Code, Cursor, Copilot) suit different workflows",
    "Human judgment remains essential for testing, security, and design decisions"
  ],
  "conceptsCovered": [
    "Vibe coding",
    "Context engineering",
    "Prompt iteration",
    "AI code debugging",
    "Human-in-the-loop development"
  ],
  "prerequisites": [],
  "tags": ["practical", "hands-on", "coding", "tools"]
}
```

### Tool Comparison Data
```typescript
// src/content/ai-coding-tools.json
{
  "tools": [
    {
      "id": "claude-code",
      "name": "Claude Code",
      "type": "cli",
      "company": "Anthropic",
      "bestFor": ["Terminal users", "Agentic workflows", "Multi-file projects"],
      "contextMethod": "CLAUDE.md file in project root",
      "pricingModel": "Usage-based (Claude API)",
      "learningCurve": "medium",
      "autonomyLevel": "agentic",
      "keyFeature": "Can execute commands, read/write files, work autonomously with oversight",
      "website": "https://claude.ai/code"
    },
    {
      "id": "cursor",
      "name": "Cursor",
      "type": "ide",
      "company": "Cursor Inc",
      "bestFor": ["Visual learners", "Chat-based editing", "Codebase Q&A"],
      "contextMethod": ".cursorrules file + automatic codebase indexing",
      "pricingModel": "Subscription ($20/month Pro)",
      "learningCurve": "low",
      "autonomyLevel": "chat",
      "keyFeature": "Chat with your entire codebase, AI applies edits directly",
      "website": "https://cursor.sh"
    },
    {
      "id": "github-copilot",
      "name": "GitHub Copilot",
      "type": "plugin",
      "company": "GitHub/Microsoft",
      "bestFor": ["VS Code users", "Inline suggestions", "Code completion"],
      "contextMethod": "Automatic from open files + .github/copilot-instructions.md",
      "pricingModel": "Subscription ($10/month individual)",
      "learningCurve": "low",
      "autonomyLevel": "autocomplete",
      "keyFeature": "Seamless inline suggestions as you type",
      "website": "https://github.com/features/copilot"
    }
  ]
}
```

---

## UI Components

### Path Card (Learn Page)
```
┌─────────────────────────────────────────────────────────────┐
│  💻 START BUILDING                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Coding with AI                                     │    │
│  │                                                     │    │
│  │  Build software by describing what you want.        │    │
│  │  No coding background required.                     │    │
│  │                                                     │    │
│  │  ✓ Hands-on activities                              │    │
│  │  ✓ 35 minutes                                       │    │
│  │  ✓ Walk away with something you built               │    │
│  │                                                     │    │
│  │  [Start Building →]                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Tool Comparison Widget
```
┌─────────────────────────────────────────────────────────────┐
│  WHICH AI CODING TOOL IS RIGHT FOR YOU?                     │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Claude Code │ │   Cursor    │ │  Copilot    │           │
│  │    (CLI)    │ │   (IDE)     │ │  (Plugin)   │           │
│  ├─────────────┤ ├─────────────┤ ├─────────────┤           │
│  │ Best for:   │ │ Best for:   │ │ Best for:   │           │
│  │ Terminal    │ │ Visual      │ │ Quick       │           │
│  │ power users │ │ learners    │ │ completions │           │
│  │             │ │             │ │             │           │
│  │ Autonomy:   │ │ Autonomy:   │ │ Autonomy:   │           │
│  │ ●●●●○       │ │ ●●●○○       │ │ ●●○○○       │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  [Take the quiz to find your match →]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria
- [ ] Path visible and selectable on Learn page (requires UI integration)
- [ ] All 8 milestones have coder's guide content (4 new milestones complete, existing E2021_COPILOT needs codersGuide added)
- [x] 5 new timeline milestones added (Copilot existed, Cursor, Claude Code, Vibe Coding, Context Engineering added)
- [x] Checkpoints include hands-on activities
- [x] Tool comparison reference complete (`src/content/ai-coding-tools.json`)
- [ ] Path completable on mobile
- [x] "Try it yourself" activities are copy-paste ready
- [x] No assumed coding knowledge in user-facing content

---

## Deployment Checklist

### Pre-Deployment
- [ ] Path definition validates against schema
- [ ] All milestone IDs exist in database
- [ ] Coder's guide content complete for all milestones
- [ ] Checkpoints validate and function
- [ ] Tool comparison data complete
- [ ] TypeScript compiles without errors
- [ ] Build succeeds

### Production Verification
- [ ] Visit production URL
- [ ] Navigate to Learn page
- [ ] Find "Coding with AI" path
- [ ] Complete full path journey
- [ ] Verify checkpoints appear and function
- [ ] Test "Try it yourself" activities
- [ ] Test tool comparison widget
- [ ] Test on mobile device
- [ ] Verify new milestones appear on timeline

---

## Implementation Notes

### Files Created/Modified (Completed 2025-12-18)
- [x] `src/content/learning-paths/coding-with-ai.json` - Path definition (5 milestones, 35 min)
- [x] `public/api/milestones/index.json` - Added 4 new milestones
- [x] `public/api/milestones/filter.json` - Added 4 new milestones
- [x] `src/content/milestones/layered-content.json` - Added codersGuide content for new milestones
- [x] `src/content/checkpoints/questions.json` - Added 4 checkpoints with 11 questions
- [x] `src/content/ai-coding-tools.json` - Tool comparison data with decision helper

### Remaining Implementation
- [ ] `src/types/layeredContent.ts` - Add CodersGuideContent interface (type definition)
- [ ] `src/components/LearningPaths/ToolComparison.tsx` - New component for tool selection
- [ ] UI integration to show path on Learn page

### Content Cross-Links
- Link from "AI Fundamentals" path completion → "Ready to build? Try Coding with AI"
- Link from ChatGPT milestone → "Want to code with AI? Start here"
- Add to personalized onboarding for "technical curious" personas

---

## Future Enhancements (Not This Sprint)
- Interactive prompt playground (live prompt → response demo)
- Video walkthroughs for each tool
- Community showcase of things people built
- "Office hours" or Discord integration
- Project templates gallery
- Integration with actual AI coding tools (deep links)
- Progress tracking for "Try it yourself" activities
- Certification/badge for completing hands-on challenges
