# Sprint LP9: The Alignment Problem

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: How do we make AI systems do what we actually want?
**Duration**: ~40 minutes
**Milestones**: 11 | **Quizzes**: 14

This path explores AI alignment - from early safety research through RLHF to Constitutional AI and the emerging regulatory landscape. How do we ensure powerful AI serves humanity?

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E2015_CONCRETE_PROBLEMS` | Concrete Problems in AI Safety Published | 2015 | Defining what can go wrong |
| 2 | `E2016_FAULTY_REWARD` | Faulty Reward Demonstrations | 2016 | When AI finds loopholes |
| 3 | `E2018_OPENAI_CHARTER` | OpenAI Charter on Safety | 2018 | Committing to beneficial AGI |
| 4 | `E2022_INSTRUCTGPT` | InstructGPT and RLHF | 2022 | Learning from human preferences |
| 5 | `E2022_CONSTITUTIONAL_AI` | Constitutional AI Proposed | 2022 | Principles over preferences |
| 6 | `E2023_NIST_AIRMF` | NIST AI Risk Management Framework | 2023 | Standards for AI safety |
| 7 | `E2023_DPO` | Direct Preference Optimization | 2023 | Simpler alignment training |
| 8 | `E2023_US_EO_14110` | US Executive Order on AI | 2023 | Federal AI governance begins |
| 9 | `E2024_EU_AI_ACT` | EU AI Act Becomes Law | 2024 | Risk-based regulation |
| 10 | `E2025_US_EO_14110_REVOKED` | US EO 14110 Revoked | 2025 | Policy shifts continue |
| 11 | `E2025_CLAUDE_OPUS_4_5` | Claude Opus 4.5 Alignment Advances | 2025 | State-of-the-art safety |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `dario-amodei` | Dario Amodei | Anthropic CEO, Constitutional AI |
| `paul-christiano` | Paul Christiano | RLHF pioneer |
| `jan-leike` | Jan Leike | OpenAI alignment lead |
| `stuart-russell` | Stuart Russell | AI safety researcher, author |
| `sam-altman` | Sam Altman | OpenAI CEO |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| AI Alignment | Core problem |
| AI Safety | Research field |
| RLHF | Reinforcement Learning from Human Feedback |
| Constitutional AI | Principle-based training |
| Guardrails (AI) | Safety constraints |
| AI Governance | Policy frameworks |
| EU AI Act | Major regulation |
| Preference optimization | Training approach |
| Jailbreak (AI) | Bypassing safety measures |

---

## Quizzes

### Multiple Choice (4 questions)

**Q1: Alignment Definition**
```json
{
  "question": "What is the 'alignment problem' in AI?",
  "options": [
    "Making AI faster",
    "Ensuring AI systems pursue goals that are actually beneficial to humans",
    "Aligning hardware components",
    "Making AI systems agree with each other"
  ],
  "correct": 1,
  "explanation": "Alignment ensures AI systems do what we actually want, not just what we literally ask for. A misaligned superintelligent AI could be catastrophic."
}
```

**Q2: RLHF Purpose**
```json
{
  "question": "What problem does RLHF (Reinforcement Learning from Human Feedback) solve?",
  "options": [
    "Making models larger",
    "Training models to match human preferences when those preferences are hard to specify",
    "Reducing compute costs",
    "Speeding up inference"
  ],
  "correct": 1,
  "explanation": "RLHF trains a reward model from human comparisons, then uses RL to optimize for that reward. This captures nuanced preferences that are hard to specify as rules."
}
```

**Q3: Constitutional AI**
```json
{
  "question": "How does Constitutional AI differ from standard RLHF?",
  "options": [
    "It uses more training data",
    "It trains the model to critique itself according to stated principles, reducing reliance on human feedback",
    "It's faster to train",
    "It only works for chatbots"
  ],
  "correct": 1,
  "explanation": "Constitutional AI (CAI) gives the model principles to follow and trains it to self-critique. This scales better than human feedback and makes values more explicit."
}
```

**Q4: EU AI Act**
```json
{
  "question": "What is the core framework of the EU AI Act?",
  "options": [
    "Ban all AI systems",
    "Risk-based regulation with different requirements for high/limited/minimal risk systems",
    "Only regulate chatbots",
    "Let companies self-regulate"
  ],
  "correct": 1,
  "explanation": "The EU AI Act categorizes AI by risk level. High-risk systems (medical, legal, hiring) face strict requirements; minimal-risk systems face minimal regulation."
}
```

### Timeline Ordering (4 questions)

**Q5: Early Alignment Research**
```json
{
  "question": "Order these early alignment milestones:",
  "items": [
    "OpenAI Charter",
    "Faulty reward demonstrations",
    "Concrete Problems in AI Safety",
    "InstructGPT / RLHF"
  ],
  "correct_order": [2, 1, 0, 3],
  "explanation": "Concrete Problems (2015) → Faulty Rewards (2016) → Charter (2018) → InstructGPT (2022). Theory preceded practice."
}
```

**Q6: Alignment Techniques**
```json
{
  "question": "Order these alignment training techniques by introduction:",
  "items": [
    "Direct Preference Optimization (DPO)",
    "Constitutional AI",
    "RLHF for language models",
    "Reward modeling"
  ],
  "correct_order": [3, 2, 1, 0],
  "explanation": "Reward modeling (early) → RLHF (2022) → CAI (2022) → DPO (2023). Each simplified or improved the previous."
}
```

**Q7: AI Regulation**
```json
{
  "question": "Order these AI governance developments:",
  "items": [
    "EU AI Act becomes law",
    "US EO 14110 revoked",
    "US EO 14110 issued",
    "NIST AI RMF published"
  ],
  "correct_order": [3, 2, 0, 1],
  "explanation": "NIST RMF (Jan 2023) → US EO (Oct 2023) → EU AI Act (2024) → EO Revoked (2025). Regulation is evolving rapidly."
}
```

**Q8: Anthropic Development**
```json
{
  "question": "Order these Anthropic alignment developments:",
  "items": [
    "Claude Opus 4.5 released",
    "Constitutional AI paper",
    "Anthropic founded",
    "Claude 3 family released"
  ],
  "correct_order": [2, 1, 3, 0],
  "explanation": "Founded (2021) → CAI paper (2022) → Claude 3 (2024) → Opus 4.5 (2025). Anthropic built alignment-first from the start."
}
```

### Matching (3 questions)

**Q9: Technique to Purpose**
```json
{
  "question": "Match each alignment technique to its primary purpose:",
  "left": ["RLHF", "Constitutional AI", "Red teaming", "Guardrails"],
  "right": ["Run-time safety constraints", "Discover vulnerabilities", "Learn from human preferences", "Train on explicit principles"],
  "correct_pairs": [[0, 2], [1, 3], [2, 1], [3, 0]],
  "explanation": "RLHF learns preferences, CAI uses principles, red teaming finds flaws, guardrails enforce limits at runtime."
}
```

**Q10: Organization to Contribution**
```json
{
  "question": "Match each organization to their alignment contribution:",
  "left": ["OpenAI", "Anthropic", "DeepMind", "NIST"],
  "right": ["AI Risk Management Framework", "Constitutional AI", "AI Safety research", "RLHF / InstructGPT"],
  "correct_pairs": [[0, 3], [1, 1], [2, 2], [3, 0]],
  "explanation": "OpenAI pioneered RLHF, Anthropic developed CAI, DeepMind does broad safety research, NIST created governance frameworks."
}
```

**Q11: Risk Level to Requirement (EU AI Act)**
```json
{
  "question": "Match EU AI Act risk levels to their requirements:",
  "left": ["Unacceptable risk", "High risk", "Limited risk", "Minimal risk"],
  "right": ["No requirements", "Transparency obligations", "Banned outright", "Conformity assessment required"],
  "correct_pairs": [[0, 2], [1, 3], [2, 1], [3, 0]],
  "explanation": "Unacceptable (banned) → High (strict assessment) → Limited (transparency) → Minimal (no requirements)."
}
```

### Fill-in-the-Blank (3 questions)

**Q12: RLHF Expansion**
```json
{
  "question": "RLHF stands for Reinforcement Learning from Human _____.",
  "answer": "Feedback",
  "alternatives": ["feedback"],
  "explanation": "RLHF uses human comparison judgments to train a reward model, then optimizes the AI policy using that learned reward."
}
```

**Q13: Constitutional AI**
```json
{
  "question": "Constitutional AI trains models to critique their own outputs according to a set of _____ or principles.",
  "answer": "rules",
  "alternatives": ["principles", "guidelines", "values"],
  "explanation": "CAI makes values explicit through a 'constitution' of principles, reducing reliance on extensive human feedback."
}
```

**Q14: EU AI Act Year**
```json
{
  "question": "The EU AI Act became law in _____, making it the world's first comprehensive AI regulation.",
  "answer": "2024",
  "alternatives": ["twenty twenty four", "twenty twenty-four"],
  "explanation": "After years of negotiation, the EU AI Act was adopted in 2024, setting a global precedent for AI regulation."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "alignment-problem"
- [ ] Insert 11 LearningPathStep records
- [ ] Insert 14 LearningPathQuiz records

### Content Validation
- [ ] Verify existing milestones
- [ ] Create missing milestones:
  - [ ] `E2015_CONCRETE_PROBLEMS`
  - [ ] `E2016_FAULTY_REWARD`
- [ ] Add key figure profiles:
  - [ ] Dario Amodei
  - [ ] Paul Christiano
  - [ ] Jan Leike
  - [ ] Stuart Russell

### Quiz Testing
- [ ] Test policy-related questions
- [ ] Verify acronym expansions
- [ ] Test EU AI Act risk levels

---

## Browser Validation (REQUIRED)

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/alignment-problem`
- [ ] Screenshot path overview
- [ ] Verify 11 milestones display correctly
- [ ] Check 40 min duration shown

### Step Navigation
- [ ] Navigate all 11 steps
- [ ] Verify regulatory content loads
- [ ] Test progress tracking

### Quiz Interactions
- [ ] Complete all 14 quizzes
- [ ] Verify policy explanations accurate
- [ ] Test year-based answers

### Error Checking
- [ ] Check console: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network: `mcp__claude-in-chrome__read_network_requests`

---

## Notes for Future Developers

1. **Living Policy**: AI regulation is evolving rapidly. The US policy reversals show this. Keep this path updated.

2. **Technical + Policy Mix**: This path combines technical alignment (RLHF, CAI) with policy (EU AI Act). Balance is important.

3. **Key Figures**: Dario Amodei, Paul Christiano (RLHF inventor), and Stuart Russell ("Human Compatible") are essential figures.

4. **Missing Milestones**: "Concrete Problems in AI Safety" (2015) is a foundational paper - needs a milestone.

5. **Balanced View**: Present different alignment approaches fairly. RLHF vs CAI vs DPO have different tradeoffs. Don't oversimplify.

6. **Jailbreak Discussion**: Consider adding content about adversarial attacks / jailbreaks as an alignment failure mode.
