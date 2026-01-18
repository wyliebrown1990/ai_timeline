# Sprint LP5: Understanding Other Minds

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: Theory of mind, consciousness, and the question of machine intelligence
**Duration**: ~35 minutes
**Milestones**: 8 | **Quizzes**: 12

This path explores the deep questions: What is intelligence? Can machines think? How do we test for consciousness? It traces from Turing's philosophical thought experiment through modern debates about AI sentience.

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E1950_TURING_TEST` | Turing Proposes the Imitation Game | 1950 | Can machines think? The wrong question |
| 2 | `E1966_ELIZA` | ELIZA Creates Illusion of Understanding | 1966 | When simple tricks fool humans |
| 3 | `E1972_mirror_self_recognition_study` | Mirror Self-Recognition Test | 1972 | Do animals recognize themselves? |
| 4 | `E1980_CHINESE_ROOM` | Searle's Chinese Room Argument | 1980 | Syntax vs. semantics in AI |
| 5 | `E2014_TURING_TEST_PASSED` | First Claims of Turing Test Passage | 2014 | When chatbots (briefly) fooled judges |
| 6 | `E2022_LAMDA_SENTIENCE` | LaMDA Sentience Claims | 2022 | Engineer believes AI is conscious |
| 7 | `E2023_great_ape_gestures` | Humans Understand Great Ape Gestures | 2023 | Cross-species communication |
| 8 | `E2024_CONSCIOUSNESS_DEBATE` | AI Consciousness Debate Intensifies | 2024 | Where does machine capability end and experience begin? |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `alan-turing` | Alan Turing | Proposed the Turing Test |
| `john-searle` | John Searle | Chinese Room argument |
| `gordon-gallup` | Gordon Gallup Jr. | Mirror self-recognition test |
| `joseph-weizenbaum` | Joseph Weizenbaum | Created ELIZA, later critic |
| `blake-lemoine` | Blake Lemoine | LaMDA sentience claims |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| Turing Test | Test for machine intelligence |
| Theory of Mind | Understanding others have minds |
| Consciousness | Subjective experience |
| Chinese Room | Thought experiment against AI understanding |
| Mirror Test | Self-recognition assessment |
| Sentience | Capacity for feeling |
| ELIZA Effect | Tendency to attribute understanding |

---

## Quizzes

### Multiple Choice (3 questions)

**Q1: Turing's Insight**
```json
{
  "question": "Why did Turing propose the 'imitation game' instead of directly answering 'Can machines think?'",
  "options": [
    "He didn't believe machines could think",
    "He thought the question of 'thinking' was too ambiguous to answer directly",
    "He wanted to make the test easier",
    "He was primarily interested in games"
  ],
  "correct": 1,
  "explanation": "Turing argued that 'thinking' is too vague to define. The imitation game sidesteps this by asking: can a machine behave indistinguishably from a thinking being? Behavior over metaphysics."
}
```

**Q2: Chinese Room**
```json
{
  "question": "What does Searle's Chinese Room argument claim?",
  "options": [
    "Machines can definitely understand language",
    "Chinese is too hard for computers",
    "Symbol manipulation alone doesn't constitute understanding",
    "The Turing Test is a perfect measure of intelligence"
  ],
  "correct": 2,
  "explanation": "Searle argues that following rules to manipulate symbols (syntax) doesn't create genuine understanding (semantics). A person following Chinese rules without knowing Chinese proves the point."
}
```

**Q3: ELIZA Effect**
```json
{
  "question": "What does the 'ELIZA Effect' describe?",
  "options": [
    "The tendency of AI to become more intelligent over time",
    "The human tendency to attribute understanding to simple programs",
    "The difficulty of programming emotional responses",
    "The superiority of rule-based AI"
  ],
  "correct": 1,
  "explanation": "People interacting with ELIZA often believed it understood them, despite it being a simple pattern-matcher. We project understanding onto machines that mimic conversational patterns."
}
```

### Timeline Ordering (3 questions)

**Q4: Philosophy of Mind Timeline**
```json
{
  "question": "Order these philosophical/experimental milestones:",
  "items": [
    "Chinese Room argument",
    "Turing Test proposed",
    "Mirror self-recognition test",
    "ELIZA chatbot created"
  ],
  "correct_order": [1, 3, 2, 0],
  "explanation": "Turing Test (1950) → ELIZA (1966) → Mirror Test (1972) → Chinese Room (1980). Each challenged our assumptions about intelligence."
}
```

**Q5: Modern AI Consciousness Debate**
```json
{
  "question": "Order these events in the AI consciousness debate:",
  "items": [
    "AI consciousness debate intensifies",
    "LaMDA sentience claims",
    "First Turing Test 'passage' claims",
    "ChatGPT launches"
  ],
  "correct_order": [2, 3, 1, 0],
  "explanation": "Turing claims (2014) → ChatGPT (2022) → LaMDA (2022) → Debate intensifies (2024). Capability advancement forced the philosophical questions."
}
```

**Q6: Self-Awareness Research**
```json
{
  "question": "Order these self-awareness research milestones:",
  "items": [
    "Humans understand ape gestures (modern study)",
    "Elephants pass mirror test",
    "Chimpanzees pass mirror test",
    "Magpies pass mirror test"
  ],
  "correct_order": [2, 1, 3, 0],
  "explanation": "Chimps (1970s) → Elephants (2006) → Magpies (2008) → Ape gestures (2023). Self-recognition has been found across diverse species."
}
```

### Matching (3 questions)

**Q7: Thinker to Concept**
```json
{
  "question": "Match each thinker to their key contribution:",
  "left": ["Alan Turing", "John Searle", "Joseph Weizenbaum", "Gordon Gallup"],
  "right": ["Mirror self-recognition test", "Chinese Room argument", "ELIZA chatbot", "Imitation Game / Turing Test"],
  "correct_pairs": [[0, 3], [1, 1], [2, 2], [3, 0]],
  "explanation": "Turing proposed the test, Searle critiqued AI understanding, Weizenbaum created ELIZA, Gallup developed the mirror test."
}
```

**Q8: Species to Self-Recognition**
```json
{
  "question": "Match each species group to their mirror test result:",
  "left": ["Great apes", "Most dogs", "Asian elephants", "Bottlenose dolphins"],
  "right": ["Fail - no self-recognition", "Pass - self-recognition", "Pass - self-recognition", "Pass - self-recognition"],
  "correct_pairs": [[0, 1], [1, 0], [2, 2], [3, 3]],
  "explanation": "Great apes, elephants, and dolphins pass; dogs generally fail, possibly due to their reliance on smell over vision."
}
```

**Q9: Argument to Conclusion**
```json
{
  "question": "Match each argument to its conclusion about AI:",
  "left": ["Turing Test", "Chinese Room", "ELIZA Effect", "Integrated Information Theory"],
  "right": ["Understanding requires more than symbol manipulation", "Consciousness depends on information integration", "Behavioral indistinguishability suffices for 'thinking'", "Humans overattribute understanding to machines"],
  "correct_pairs": [[0, 2], [1, 0], [2, 3], [3, 1]],
  "explanation": "These arguments reach different conclusions about machine intelligence and consciousness."
}
```

### Fill-in-the-Blank (3 questions)

**Q10: Turing's Question**
```json
{
  "question": "Turing's 1950 paper begins: 'I propose to consider the question, Can machines _____?'",
  "answer": "think",
  "alternatives": [],
  "explanation": "Turing then argues this question is too vague and proposes the imitation game as a practical test instead."
}
```

**Q11: Chinese Room Setup**
```json
{
  "question": "In Searle's Chinese Room, a person follows rules to respond to Chinese without actually _____ Chinese.",
  "answer": "understanding",
  "alternatives": ["knowing", "speaking"],
  "explanation": "The person produces correct Chinese outputs but has no semantic understanding - demonstrating that syntax doesn't imply semantics."
}
```

**Q12: ELIZA Creator**
```json
{
  "question": "Joseph _____ created ELIZA in 1966 and was later disturbed by how readily people attributed understanding to it.",
  "answer": "Weizenbaum",
  "alternatives": ["weizenbaum"],
  "explanation": "Weizenbaum became an AI critic, warning about the dangers of people anthropomorphizing simple programs."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "other-minds"
- [ ] Insert 8 LearningPathStep records
- [ ] Insert 12 LearningPathQuiz records
- [ ] Link to existing milestones

### Content Validation
- [ ] Verify existing milestones
- [ ] Create missing milestones:
  - [ ] `E1980_CHINESE_ROOM`
  - [ ] `E2014_TURING_TEST_PASSED`
  - [ ] `E2022_LAMDA_SENTIENCE`
  - [ ] `E2024_CONSCIOUSNESS_DEBATE`
- [ ] Add key figure profiles:
  - [ ] Alan Turing
  - [ ] John Searle
  - [ ] Joseph Weizenbaum
  - [ ] Blake Lemoine

### Quiz Testing
- [ ] Test philosophical nuance in MC questions
- [ ] Verify timeline accuracy
- [ ] Test matching logic

---

## Browser Validation (REQUIRED)

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/other-minds`
- [ ] Screenshot path overview
- [ ] Verify 8 milestones display correctly
- [ ] Check 35 min duration shown

### Step Navigation
- [ ] Navigate all 8 steps
- [ ] Verify philosophical content loads correctly
- [ ] Test progress tracking

### Quiz Interactions
- [ ] Complete all 12 quizzes
- [ ] Verify nuanced explanations show
- [ ] Test fill-in-blank validation

### Error Checking
- [ ] Check console: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network: `mcp__claude-in-chrome__read_network_requests`

---

## Notes for Future Developers

1. **Philosophical Sensitivity**: This path deals with consciousness and sentience. Be careful not to make definitive claims about AI consciousness - present the debate fairly.

2. **Missing Milestones**: Need to create several milestones around philosophy of mind - Chinese Room, Turing Test passage claims, LaMDA controversy, ongoing consciousness debate.

3. **Key Figures Gaps**: Alan Turing, John Searle, Joseph Weizenbaum need profiles. Weizenbaum's story is particularly interesting - he created ELIZA, then became a critic.

4. **Controversy Warning**: The LaMDA sentience claims were controversial. Blake Lemoine was fired from Google. Present this as a case study in the difficulty of assessing AI consciousness, not as settled fact.

5. **Living Debate**: This path touches ongoing philosophical debates. Users should understand these are open questions, not solved problems.
