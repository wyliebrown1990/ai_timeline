# Sprint LP10: The Neuromodulator Code

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: How brain chemistry shapes learning, emotion, and behavior
**Duration**: ~40 minutes
**Milestones**: 10 | **Quizzes**: 14

This path explores neuromodulation - how chemicals like dopamine, serotonin, and norepinephrine orchestrate brain function. These systems directly inspired reinforcement learning and have implications for AI alignment.

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E1897_PAVLOVIAN_CONDITIONING` | Pavlov's Conditioning Discovery | 1897 | Learning tied to reward |
| 2 | `E1949_HEBBIAN_LEARNING` | Hebb's Synaptic Learning Rule | 1949 | Wiring through firing |
| 3 | `E1960_TRIUNE_BRAIN` | MacLean's Emotional Brain | 1960 | The limbic system's role |
| 4 | `E1977_DOPAMINE_REWARD` | Dopamine-Reward Connection | 1977 | Pleasure's chemical signature |
| 5 | `E1981_neural_control_vocal_behavior` | Neural Control of Behavior | 1981 | Brain circuits shape action |
| 6 | `E1997_SCHULTZ_DOPAMINE` | Schultz: Dopamine = TD Error | 1997 | The brain's prediction signal |
| 7 | `E2000_LEDOUX_FEAR` | LeDoux: Fear Circuitry | 2000 | Amygdala's rapid response |
| 8 | `E2006_FRISTON_FREE_ENERGY` | Friston's Free Energy Principle | 2006 | Universal brain theory |
| 9 | `E2015_SEROTONIN_PATIENCE` | Serotonin Linked to Patience | 2015 | Chemistry of delayed gratification |
| 10 | `E2020_NEUROAI` | NeuroAI Movement Emerges | 2020 | Neuroscience meets AI again |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `wolfram-schultz` | Wolfram Schultz | Dopamine prediction errors |
| `joseph-ledoux` | Joseph LeDoux | Fear and emotion circuits |
| `karl-friston` | Karl Friston | Free Energy Principle |
| `paul-maclean` | Paul MacLean | Triune brain model |
| `read-montague` | Read Montague | Computational neuroscience of value |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| Dopamine Prediction Error | Core reward signal |
| Basal Ganglia | Reward learning center |
| Amygdala | Fear and emotion hub |
| Hippocampus | Memory formation |
| Cerebellum | Motor learning |
| Free Energy Principle | Friston's framework |
| Hebbian Learning | Synaptic plasticity |
| Neuromodulator | Chemical brain messenger |

---

## Quizzes

### Multiple Choice (4 questions)

**Q1: Dopamine Function**
```json
{
  "question": "What did Wolfram Schultz discover about dopamine neurons?",
  "options": [
    "They fire constantly during happy experiences",
    "They encode reward prediction errors - the difference between expected and received reward",
    "They only respond to food",
    "They inhibit all learning"
  ],
  "correct": 1,
  "explanation": "Schultz found dopamine neurons fire not for rewards themselves, but for unexpected rewards. They go silent when expected rewards arrive and dip below baseline when expected rewards don't come - exactly computing TD error."
}
```

**Q2: Amygdala Role**
```json
{
  "question": "What is the amygdala's primary function in emotional learning?",
  "options": [
    "Storing long-term memories",
    "Rapid threat detection and fear conditioning",
    "Motor control",
    "Language processing"
  ],
  "correct": 1,
  "explanation": "The amygdala processes threatening stimuli faster than conscious awareness, enabling rapid defensive responses. It's essential for learning what to fear."
}
```

**Q3: Free Energy**
```json
{
  "question": "What does Friston's Free Energy Principle propose about the brain?",
  "options": [
    "The brain runs on glucose",
    "The brain minimizes surprise by predicting sensory inputs",
    "The brain doesn't need energy",
    "Free energy is stored in neurons"
  ],
  "correct": 1,
  "explanation": "Friston proposes the brain constantly predicts sensory inputs and acts to minimize prediction errors (surprise). This provides a unified explanation for perception, action, and learning."
}
```

**Q4: Serotonin Function**
```json
{
  "question": "What role does serotonin play in decision-making according to recent research?",
  "options": [
    "It speeds up all decisions",
    "It promotes patience and willingness to wait for delayed rewards",
    "It causes immediate impulsive action",
    "It has no effect on decisions"
  ],
  "correct": 1,
  "explanation": "Research shows serotonin helps override immediate impulses, enabling patience for larger delayed rewards. It complements dopamine's reward signaling with temporal discounting control."
}
```

### Timeline Ordering (4 questions)

**Q5: Foundational Discoveries**
```json
{
  "question": "Order these foundational neuroscience discoveries:",
  "items": [
    "Hebb's Learning Rule",
    "MacLean's Triune Brain",
    "Dopamine-Reward Connection",
    "Pavlov's Conditioning"
  ],
  "correct_order": [3, 0, 1, 2],
  "explanation": "Pavlov (1897) → Hebb (1949) → MacLean (1960) → Dopamine (1977). Behavioral observations preceded molecular understanding."
}
```

**Q6: Modern Neuromodulation**
```json
{
  "question": "Order these modern neuroscience milestones:",
  "items": [
    "NeuroAI movement emerges",
    "Serotonin-patience connection",
    "Friston's Free Energy Principle",
    "Schultz dopamine-TD discovery"
  ],
  "correct_order": [3, 2, 1, 0],
  "explanation": "Schultz (1997) → Friston (2006) → Serotonin (2015) → NeuroAI (2020). Understanding deepened over time."
}
```

**Q7: Brain Region Discoveries**
```json
{
  "question": "Order these discoveries about brain regions:",
  "items": [
    "LeDoux maps fear circuits",
    "MacLean describes limbic system",
    "Basal ganglia linked to RL",
    "Cerebellum's motor role established"
  ],
  "correct_order": [3, 1, 2, 0],
  "explanation": "Cerebellum (early 1900s) → Limbic (1960) → Basal ganglia RL (1990s) → LeDoux fear (2000). Each region's function was discovered differently."
}
```

**Q8: TD Connection**
```json
{
  "question": "Order these developments linking biology to computation:",
  "items": [
    "NeuroAI reconnects fields",
    "Sutton formalizes TD Learning",
    "Schultz validates TD in dopamine",
    "Actor-Critic architectures proposed"
  ],
  "correct_order": [1, 3, 2, 0],
  "explanation": "TD Learning (1988) → Actor-Critic (1980s-90s) → Schultz validation (1997) → NeuroAI (2020). Computation predicted what biology confirmed."
}
```

### Matching (3 questions)

**Q9: Neuromodulator to Function**
```json
{
  "question": "Match each neuromodulator to its primary function:",
  "left": ["Dopamine", "Serotonin", "Norepinephrine", "Acetylcholine"],
  "right": ["Attention and learning", "Patience and mood", "Arousal and alertness", "Reward prediction"],
  "correct_pairs": [[0, 3], [1, 1], [2, 2], [3, 0]],
  "explanation": "Dopamine signals reward, serotonin modulates patience/mood, norepinephrine controls arousal, acetylcholine supports attention and learning."
}
```

**Q10: Brain Region to Role**
```json
{
  "question": "Match each brain region to its role:",
  "left": ["Basal ganglia", "Amygdala", "Hippocampus", "Prefrontal cortex"],
  "right": ["Executive control", "Fear processing", "Action selection", "Memory formation"],
  "correct_pairs": [[0, 2], [1, 1], [2, 3], [3, 0]],
  "explanation": "Basal ganglia selects actions, amygdala processes fear, hippocampus forms memories, prefrontal cortex controls executive function."
}
```

**Q11: Researcher to Discovery**
```json
{
  "question": "Match each researcher to their key discovery:",
  "left": ["Wolfram Schultz", "Joseph LeDoux", "Karl Friston", "Paul MacLean"],
  "right": ["Triune brain model", "Dopamine = TD error", "Fear circuitry", "Free Energy Principle"],
  "correct_pairs": [[0, 1], [1, 2], [2, 3], [3, 0]],
  "explanation": "Schultz discovered dopamine computes TD errors, LeDoux mapped fear circuits, Friston proposed Free Energy, MacLean described the triune brain."
}
```

### Fill-in-the-Blank (3 questions)

**Q12: Dopamine Signal**
```json
{
  "question": "Dopamine neurons encode reward prediction _____, not rewards themselves.",
  "answer": "errors",
  "alternatives": ["error"],
  "explanation": "This was Schultz's key insight - dopamine signals the difference between expected and actual reward, exactly what TD learning algorithms compute."
}
```

**Q13: Limbic System**
```json
{
  "question": "MacLean's model describes the _____ system as the 'emotional brain' sitting between the reptilian and neocortical brains.",
  "answer": "limbic",
  "alternatives": [],
  "explanation": "The limbic system includes the amygdala, hippocampus, and other structures involved in emotion and memory - the middle layer in the triune model."
}
```

**Q14: Free Energy**
```json
{
  "question": "According to Friston, the brain minimizes _____ energy, which corresponds to prediction error or surprise.",
  "answer": "free",
  "alternatives": [],
  "explanation": "Free energy (from physics) becomes a measure of how well the brain's predictions match sensory input. Minimizing it drives perception, action, and learning."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "neuromodulator-code"
- [ ] Insert 10 LearningPathStep records
- [ ] Insert 14 LearningPathQuiz records

### Content Validation
- [ ] Create missing milestones:
  - [ ] `E1977_DOPAMINE_REWARD`
  - [ ] `E1997_SCHULTZ_DOPAMINE`
  - [ ] `E2000_LEDOUX_FEAR`
  - [ ] `E2006_FRISTON_FREE_ENERGY`
  - [ ] `E2015_SEROTONIN_PATIENCE`
  - [ ] `E2020_NEUROAI`
- [ ] Verify key figure profiles:
  - [ ] Wolfram Schultz
  - [ ] Joseph LeDoux
  - [ ] Karl Friston
  - [ ] Read Montague

### Quiz Testing
- [ ] Test neuroscience accuracy
- [ ] Verify matching pairs
- [ ] Test fill-in-blank chemistry terms

---

## Browser Validation (REQUIRED)

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/neuromodulator-code`
- [ ] Screenshot path overview
- [ ] Verify 10 milestones display correctly
- [ ] Check 40 min duration shown

### Step Navigation
- [ ] Navigate all 10 steps
- [ ] Verify neuroscience content loads
- [ ] Test progress tracking

### Quiz Interactions
- [ ] Complete all 14 quizzes
- [ ] Verify brain region explanations
- [ ] Test chemical terms

### Error Checking
- [ ] Check console: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network: `mcp__claude-in-chrome__read_network_requests`

---

## Notes for Future Developers

1. **Many Missing Milestones**: This path requires creating several neuroscience milestones that don't exist yet - Schultz's dopamine work, LeDoux's fear research, Friston's Free Energy Principle.

2. **Key Figures Exist**: Most key figures (Schultz, LeDoux, Friston, MacLean) should already be in the system from previous work. Verify profiles are complete.

3. **Scientific Accuracy**: Neuroscience is complex. Have domain experts review the quiz explanations for accuracy.

4. **AI Connection**: Emphasize throughout how these biological discoveries directly inspired AI algorithms. The dopamine-TD connection is one of the great intellectual bridges between neuroscience and AI.

5. **Visual Assets**: Brain diagrams showing dopamine pathways, limbic structures, and the triune model would enhance learning significantly.

6. **NeuroAI Movement**: This is a current research trend - brain-inspired AI meeting AI-informed neuroscience. Consider linking to recent papers and labs.
