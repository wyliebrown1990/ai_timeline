# Sprint LP1: The Reward Revolution

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: The evolution of reinforcement learning from animal behavior to AI alignment
**Duration**: ~45 minutes
**Milestones**: 12 | **Quizzes**: 16

This path traces the intellectual lineage from Pavlov's dogs to modern RLHF, showing how our understanding of reward-driven learning in biological systems directly inspired the algorithms that now align AI behavior.

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E1897_PAVLOVIAN_CONDITIONING` | Pavlov Discovers Classical Conditioning | 1897 | The salivating dogs that launched a science |
| 2 | `E1898_LAW_OF_EFFECT` | Thorndike Formulates Law of Effect | 1898 | Cats in puzzle boxes reveal learning's secret |
| 3 | `E1949_HEBBIAN_LEARNING` | Hebb Proposes Neural Learning Rule | 1949 | "Neurons that fire together, wire together" |
| 4 | `E1960_TRIUNE_BRAIN` | MacLean Proposes Triune Brain Theory | 1960 | The emotional brain's role in reward |
| 5 | `E1988_TD_LEARNING` | Temporal Difference Learning Formalized | 1988 | Predicting future rewards step by step |
| 6 | `E1997_SCHULTZ_DOPAMINE` | Schultz Links Dopamine to Reward Prediction | 1997 | The brain's own TD algorithm discovered |
| 7 | `E2013_DQN` | Deep Q-Network Plays Atari from Pixels | 2013 | When deep learning met reinforcement learning |
| 8 | `E2016_ALPHAGO` | AlphaGo Defeats Lee Sedol | 2016 | Machine intuition masters humanity's oldest game |
| 9 | `E2017_PPO` | Proximal Policy Optimization (PPO) Introduced | 2017 | The algorithm that trained ChatGPT |
| 10 | `E2021_ALPHAFOLD` | AlphaFold Solves Protein Folding | 2021 | RL helps crack biology's 50-year challenge |
| 11 | `E2022_INSTRUCTGPT` | InstructGPT Demonstrates Effective RLHF | 2022 | Teaching AI through human preferences |
| 12 | `E2023_DPO` | Direct Preference Optimization Simplifies RLHF | 2023 | Making alignment practical at scale |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `ivan-pavlov` | Ivan Pavlov | Pioneer of classical conditioning |
| `edward-thorndike` | Edward Thorndike | Discovered operant conditioning |
| `donald-hebb` | Donald Hebb | "Fire together, wire together" rule |
| `paul-maclean` | Paul MacLean | Triune brain and emotional learning |
| `richard-sutton` | Richard Sutton | Father of modern RL, TD learning |
| `andrew-barto` | Andrew Barto | Co-created foundational RL algorithms |
| `wolfram-schultz` | Wolfram Schultz | Dopamine as reward prediction error |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| Classical Conditioning | Foundation: stimulus-response learning |
| Dopamine Prediction Error | Biology's reward signal |
| Actor-Critic Architecture | Policy + value network combo |
| Temporal Difference Learning | Core RL algorithm family |
| Hebbian Learning | Neural plasticity rule |
| RLHF | Reinforcement Learning from Human Feedback |
| Basal Ganglia | Brain's RL circuitry |

---

## Quizzes

### Multiple Choice (4 questions)

**Q1: Foundational Concept**
```json
{
  "question": "What was the key insight from Pavlov's dog experiments?",
  "options": [
    "Dogs can be trained to perform complex tasks",
    "Neutral stimuli can trigger learned responses through association",
    "Animals have an innate understanding of reward",
    "Salivation is controlled by conscious decision-making"
  ],
  "correct": 1,
  "explanation": "Pavlov showed that a neutral stimulus (bell) could trigger a biological response (salivation) when repeatedly paired with a reward (food). This classical conditioning became foundational to understanding learning."
}
```

**Q2: Modern Application**
```json
{
  "question": "What does RLHF stand for and what problem does it solve?",
  "options": [
    "Rapid Learning for Higher Functions - speeds up training",
    "Reinforcement Learning from Human Feedback - aligns AI with human preferences",
    "Recursive Learning with Hybrid Features - improves model architecture",
    "Reward Learning with Hierarchical Frameworks - structures reward signals"
  ],
  "correct": 1,
  "explanation": "RLHF uses human feedback to shape AI behavior toward human preferences, solving the alignment problem of making AI do what humans actually want."
}
```

**Q3: Biological Connection**
```json
{
  "question": "What did Wolfram Schultz discover about dopamine neurons?",
  "options": [
    "They fire constantly during all brain activity",
    "They only respond to direct food consumption",
    "They encode reward prediction errors, not rewards themselves",
    "They are unique to primates"
  ],
  "correct": 2,
  "explanation": "Schultz found that dopamine neurons fire not for rewards, but for the difference between expected and received rewards - exactly what TD learning algorithms compute."
}
```

**Q4: Algorithm Understanding**
```json
{
  "question": "Why is PPO (Proximal Policy Optimization) significant in modern AI?",
  "options": [
    "It was the first RL algorithm ever created",
    "It enables stable training and was used to train ChatGPT",
    "It only works for video game applications",
    "It requires no compute resources"
  ],
  "correct": 1,
  "explanation": "PPO solved stability issues in policy gradient methods, making RL practical for training language models. It's the workhorse behind RLHF for ChatGPT and Claude."
}
```

### Timeline Ordering (4 questions)

**Q5: Early Foundations**
```json
{
  "question": "Order these foundational discoveries from earliest to latest:",
  "items": [
    "Thorndike's Law of Effect",
    "Pavlov's Classical Conditioning",
    "Hebb's Learning Rule",
    "Shannon's Information Theory"
  ],
  "correct_order": [1, 0, 3, 2],
  "explanation": "Pavlov (1897) → Thorndike (1898) → Shannon (1948) → Hebb (1949). These formed the theoretical foundation for understanding learning."
}
```

**Q6: Deep RL Era**
```json
{
  "question": "Order these deep reinforcement learning breakthroughs:",
  "items": [
    "AlphaGo defeats Lee Sedol",
    "Deep Q-Network plays Atari",
    "PPO algorithm introduced",
    "AlphaFold solves protein folding"
  ],
  "correct_order": [1, 0, 2, 3],
  "explanation": "DQN (2013) → AlphaGo (2016) → PPO (2017) → AlphaFold (2020). Each built on prior breakthroughs."
}
```

**Q7: Alignment Evolution**
```json
{
  "question": "Order these alignment techniques from earliest to most recent:",
  "items": [
    "Direct Preference Optimization (DPO)",
    "InstructGPT with RLHF",
    "Constitutional AI",
    "OpenAI Charter principles"
  ],
  "correct_order": [3, 1, 2, 0],
  "explanation": "OpenAI Charter (2018) → InstructGPT (2022) → Constitutional AI (2022) → DPO (2023)."
}
```

**Q8: Brain to Machine**
```json
{
  "question": "Order these discoveries connecting biology to computation:",
  "items": [
    "Schultz discovers dopamine prediction errors",
    "MacLean proposes Triune Brain",
    "TD Learning algorithm formalized",
    "Hebb proposes neural learning rule"
  ],
  "correct_order": [3, 1, 2, 0],
  "explanation": "Hebb (1949) → MacLean (1960) → TD Learning (1988) → Schultz (1997). Theory preceded computational formalization which was then validated biologically."
}
```

### Matching (4 questions)

**Q9: Researcher to Discovery**
```json
{
  "question": "Match each researcher to their key contribution:",
  "left": ["Ivan Pavlov", "Richard Sutton", "Wolfram Schultz", "Donald Hebb"],
  "right": ["TD Learning algorithm", "Classical conditioning", "Dopamine prediction errors", "Synaptic plasticity rule"],
  "correct_pairs": [[0, 1], [1, 0], [2, 2], [3, 3]],
  "explanation": "Each researcher made foundational contributions: Pavlov (conditioning), Sutton (TD), Schultz (dopamine), Hebb (plasticity)."
}
```

**Q10: Concept to Application**
```json
{
  "question": "Match each RL concept to its primary application:",
  "left": ["Policy Gradient", "Q-Learning", "Actor-Critic", "RLHF"],
  "right": ["Value-based game playing", "Language model alignment", "Continuous control tasks", "Direct action selection"],
  "correct_pairs": [[0, 3], [1, 0], [2, 2], [3, 1]],
  "explanation": "Different RL approaches excel at different tasks based on their mathematical properties."
}
```

**Q11: Brain Region to Function**
```json
{
  "question": "Match each brain region to its role in reward learning:",
  "left": ["Basal Ganglia", "Prefrontal Cortex", "Amygdala", "VTA (Ventral Tegmental Area)"],
  "right": ["Dopamine production", "Action selection", "Emotional valence", "Planning & evaluation"],
  "correct_pairs": [[0, 1], [1, 3], [2, 2], [3, 0]],
  "explanation": "The reward system involves multiple brain regions working together, each with specialized functions."
}
```

**Q12: Algorithm to Paper/Year**
```json
{
  "question": "Match each algorithm to its introduction year:",
  "left": ["Deep Q-Network", "PPO", "TD(λ)", "DPO"],
  "right": ["2017", "1988", "2023", "2013"],
  "correct_pairs": [[0, 3], [1, 0], [2, 1], [3, 2]],
  "explanation": "TD(λ) (1988) → DQN (2013) → PPO (2017) → DPO (2023)"
}
```

### Fill-in-the-Blank (4 questions)

**Q13: Classical Definition**
```json
{
  "question": "Thorndike's Law of Effect states that behaviors followed by _____ consequences are more likely to be repeated.",
  "answer": "satisfying",
  "alternatives": ["positive", "rewarding", "pleasant"],
  "explanation": "The Law of Effect is the foundation of operant conditioning - satisfying outcomes strengthen behavior."
}
```

**Q14: Hebbian Rule**
```json
{
  "question": "Hebb's rule is often summarized as 'Neurons that fire together, _____ together.'",
  "answer": "wire",
  "alternatives": [],
  "explanation": "This captures synaptic plasticity - simultaneous activation strengthens neural connections."
}
```

**Q15: Prediction Error**
```json
{
  "question": "In TD learning, the _____ signal equals the actual reward minus the expected reward.",
  "answer": "error",
  "alternatives": ["prediction error", "TD error", "delta"],
  "explanation": "The TD error drives learning by signaling unexpected outcomes - exactly what dopamine neurons compute."
}
```

**Q16: Modern Alignment**
```json
{
  "question": "RLHF trains AI systems to align with human _____ rather than simple reward functions.",
  "answer": "preferences",
  "alternatives": ["values", "intentions"],
  "explanation": "RLHF collects human preference comparisons to train a reward model, avoiding reward hacking."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "reward-revolution"
- [ ] Insert 12 LearningPathStep records with milestone links
- [ ] Insert 16 LearningPathQuiz records
- [ ] Verify API endpoint returns correct data

### Content Validation
- [ ] Confirm all 12 milestones exist in database
- [ ] Confirm all 7 key figure profiles exist
- [ ] Confirm all 7 glossary terms exist
- [ ] Review narrative hooks for accuracy

### Quiz Testing
- [ ] Test multiple choice logic
- [ ] Test timeline ordering with drag/drop
- [ ] Test matching pair validation
- [ ] Test fill-in-blank with alternatives

---

## Browser Validation (REQUIRED)

> **CRITICAL**: Use Claude Chrome MCP tools to manually test all web features.
> Do NOT mark tasks complete without browser validation.

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/reward-revolution`
- [ ] Take screenshot of path overview
- [ ] Verify all 12 milestones displayed in correct order
- [ ] Verify key figures section shows 7 figures
- [ ] Verify estimated duration shows "45 min"

### Step Navigation
- [ ] Click first milestone step
- [ ] Verify milestone content loads correctly
- [ ] Test "Next" and "Previous" navigation
- [ ] Verify progress indicator updates

### Quiz Interactions
- [ ] Navigate to first multiple choice quiz
- [ ] Test selecting wrong answer - verify feedback
- [ ] Test selecting correct answer - verify feedback
- [ ] Take screenshot of quiz completion state

- [ ] Navigate to timeline ordering quiz
- [ ] Test drag and drop functionality
- [ ] Submit incorrect order - verify feedback
- [ ] Submit correct order - verify progression

- [ ] Navigate to matching quiz
- [ ] Test connecting pairs
- [ ] Verify incorrect match feedback
- [ ] Verify correct match completion

- [ ] Navigate to fill-in-blank quiz
- [ ] Test text input validation
- [ ] Test alternative answers accepted
- [ ] Verify explanation shown after answer

### Console & Network Checks
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network for failed API calls: `mcp__claude-in-chrome__read_network_requests`
- [ ] Verify all milestone data loads without errors
- [ ] Screenshot any issues for debugging

### Mobile Responsiveness
- [ ] Resize browser to mobile viewport
- [ ] Verify quiz UI adapts correctly
- [ ] Test touch-friendly interactions
- [ ] Screenshot mobile layout

---

## Notes for Future Developers

1. **Dopamine-TD Connection**: The link between Schultz's neuroscience findings and Sutton's TD algorithm is one of the most compelling stories in this path. Emphasize that biology validated computational theory.

2. **PPO Significance**: Don't understate PPO's importance - it's the backbone of RLHF and thus modern AI alignment. Users should understand why stability matters.

3. **Missing Milestone**: Consider adding `E1988_TD_LEARNING` if it doesn't exist - this is the Sutton & Barto TD(λ) paper that formalized the algorithm family.

4. **Missing Milestone**: Consider adding `E1997_SCHULTZ_DOPAMINE` for Wolfram Schultz's dopamine prediction error paper.

5. **Quiz Balance**: This path has strong multiple choice questions but timeline ordering may need visual polish for the drag-drop UX.
