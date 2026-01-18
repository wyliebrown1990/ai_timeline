# Sprint LP8: Intelligence Before Brains

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: The evolution of intelligence from single cells to complex nervous systems
**Duration**: ~35 minutes
**Milestones**: 9 | **Quizzes**: 12

This path explores how intelligence emerged in evolution - from bacterial chemotaxis to the Cambrian explosion to the human brain. Understanding biological intelligence illuminates what we're trying to build artificially.

---

## Milestones (Chronological Order - Evolutionary)

| # | ID | Title | Year/Era | Narrative Hook |
|---|-----|-------|----------|----------------|
| 1 | `E_CHEMOTAXIS_BACTERIA` | Bacterial Chemotaxis: First Decisions | ~3.5 Bya | Intelligence without neurons |
| 2 | `E1974_flagellar_rotation_bacteria` | Flagellar Motor Mechanism Revealed | 1974 | The world's smallest engine |
| 3 | `E1973_chemotaxis_c_elegans` | C. elegans Chemical Navigation | 1973 | 302 neurons navigate chemistry |
| 4 | `E1975_thermotaxis_c_elegans` | C. elegans Temperature Seeking | 1975 | Worms remember what's warm |
| 5 | `E_CAMBRIAN_EXPLOSION` | Cambrian Explosion and Eyes | ~540 Mya | Vision triggers intelligence arms race |
| 6 | `E1960_TRIUNE_BRAIN` | MacLean's Triune Brain Model | 1960 | Brain evolution in layers |
| 7 | `E1982_MARR_VISION` | Marr's Levels of Analysis | 1982 | How to understand the brain |
| 8 | `E2019_CELEGANS_CONNECTOME` | Complete C. elegans Connectome | 2019 | Every synapse mapped |
| 9 | `E2020_OCTOPUS_COGNITION` | Octopus Distributed Intelligence | 2020 | Smart without a centralized brain |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `sydney-brenner` | Sydney Brenner | C. elegans as model organism |
| `david-marr` | David Marr | Levels of analysis framework |
| `paul-maclean` | Paul MacLean | Triune brain theory |
| `karl-friston` | Karl Friston | Free energy principle |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| Chemotaxis | Navigation by chemical gradients |
| Bilateral Symmetry | Body plan enabling directed movement |
| Cambrian Explosion | Rapid evolution of complex life |
| Encephalization Quotient | Brain-to-body size ratio |
| Model-Free Learning | Reactive behavior patterns |
| Model-Based Learning | Internal world models |
| Free Energy Principle | Friston's universal theory |
| Cortical Columns | Brain's processing units |

---

## Quizzes

### Multiple Choice (3 questions)

**Q1: Bacterial Intelligence**
```json
{
  "question": "How do bacteria exhibit 'intelligent' behavior without any neurons?",
  "options": [
    "They have microscopic brains",
    "They use molecular sensors to detect chemicals and bias their movement toward attractants",
    "They communicate with radio waves",
    "They copy behavior from other bacteria"
  ],
  "correct": 1,
  "explanation": "Bacteria use receptor proteins to detect chemical concentrations, comparing levels over time. They bias their random tumbling to climb favorable gradients - a simple but effective decision-making system."
}
```

**Q2: Cambrian Trigger**
```json
{
  "question": "What is hypothesized to have triggered the Cambrian explosion of complex body plans?",
  "options": [
    "A meteor impact",
    "The evolution of eyes, creating an evolutionary arms race",
    "Climate cooling",
    "Volcanic activity"
  ],
  "correct": 1,
  "explanation": "When eyes evolved, predation became visual. This created pressure for prey to develop defenses, speed, and camouflage, and for predators to become smarter - an arms race that drove rapid brain evolution."
}
```

**Q3: Marr's Levels**
```json
{
  "question": "What are David Marr's three levels of analysis for understanding information-processing systems?",
  "options": [
    "Hardware, software, firmware",
    "Computational, algorithmic, implementational",
    "Sensory, motor, cognitive",
    "Input, processing, output"
  ],
  "correct": 1,
  "explanation": "Marr proposed analyzing systems at the computational level (what problem?), algorithmic level (what steps?), and implementational level (how is it physically realized?). This framework applies to brains and computers."
}
```

### Timeline Ordering (3 questions)

**Q4: Evolution of Intelligence**
```json
{
  "question": "Order these evolutionary developments from earliest to latest:",
  "items": [
    "Human language emerges",
    "First neurons evolve",
    "Bacterial chemotaxis",
    "Cambrian explosion"
  ],
  "correct_order": [2, 1, 3, 0],
  "explanation": "Chemotaxis (~3.5 Bya) → Neurons (~600 Mya) → Cambrian (~540 Mya) → Language (~100 Kya). Intelligence scaled up over billions of years."
}
```

**Q5: Scientific Discoveries**
```json
{
  "question": "Order these scientific discoveries about biological intelligence:",
  "items": [
    "Complete C. elegans connectome",
    "C. elegans chemotaxis characterized",
    "Marr's Levels of Analysis",
    "MacLean's Triune Brain"
  ],
  "correct_order": [3, 1, 2, 0],
  "explanation": "Triune Brain (1960) → Chemotaxis (1973) → Marr (1982) → Connectome (2019). Understanding progressed from theories to complete maps."
}
```

**Q6: Complexity Emergence**
```json
{
  "question": "Order these organisms by when their intelligence type evolved:",
  "items": [
    "Social insects (collective intelligence)",
    "Octopi (distributed intelligence)",
    "Bacteria (chemical sensing)",
    "Mammals (emotional learning)"
  ],
  "correct_order": [2, 1, 0, 3],
  "explanation": "Bacteria (3.5 Bya) → Octopi (500 Mya) → Social insects (100 Mya) → Mammals (200 Mya). Different intelligence architectures for different niches."
}
```

### Matching (3 questions)

**Q7: Organism to Intelligence Type**
```json
{
  "question": "Match each organism to its intelligence architecture:",
  "left": ["E. coli", "C. elegans", "Octopus", "Human"],
  "right": ["Cortical hierarchy", "Distributed network", "Complete neural circuit", "Molecular sensors"],
  "correct_pairs": [[0, 3], [1, 2], [2, 1], [3, 0]],
  "explanation": "Bacteria use molecules, C. elegans has 302 neurons, octopi have distributed arm-brains, humans have hierarchical cortex."
}
```

**Q8: Researcher to Contribution**
```json
{
  "question": "Match each researcher to their theory:",
  "left": ["David Marr", "Paul MacLean", "Karl Friston", "Sydney Brenner"],
  "right": ["C. elegans model organism", "Free Energy Principle", "Triune Brain", "Levels of Analysis"],
  "correct_pairs": [[0, 3], [1, 2], [2, 1], [3, 0]],
  "explanation": "Marr (levels), MacLean (triune brain), Friston (free energy), Brenner (C. elegans)."
}
```

**Q9: Neuron Count to Capability**
```json
{
  "question": "Match approximate neuron counts to the organism:",
  "left": ["0", "302", "100 million", "86 billion"],
  "right": ["Human", "Bacteria", "C. elegans", "Jellyfish"],
  "correct_pairs": [[0, 1], [1, 2], [2, 3], [3, 0]],
  "explanation": "Bacteria (0) → C. elegans (302) → Jellyfish (~100K) → Human (86B). More neurons enable more complex behaviors."
}
```

### Fill-in-the-Blank (3 questions)

**Q10: C. elegans Number**
```json
{
  "question": "The C. elegans worm has exactly _____ neurons, making it the only animal with a completely mapped nervous system.",
  "answer": "302",
  "alternatives": ["three hundred two", "three hundred and two"],
  "explanation": "This exact count comes from electron microscopy reconstruction of every neuron and synapse - enabling complete circuit-level understanding."
}
```

**Q11: Cambrian Era**
```json
{
  "question": "The Cambrian explosion occurred approximately _____ million years ago, marking rapid diversification of complex life.",
  "answer": "540",
  "alternatives": ["five hundred forty", "five hundred and forty"],
  "explanation": "This period saw the emergence of most major animal body plans, driven by the evolution of predation and sensory capabilities."
}
```

**Q12: Marr's Approach**
```json
{
  "question": "David Marr argued that to understand vision (or any cognitive system), we must analyze it at three _____ of explanation.",
  "answer": "levels",
  "alternatives": ["level"],
  "explanation": "Marr's three levels - computational, algorithmic, implementational - provide a framework for understanding both biological and artificial intelligence."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "intelligence-before-brains"
- [ ] Insert 9 LearningPathStep records
- [ ] Insert 12 LearningPathQuiz records

### Content Validation
- [ ] Create missing milestones:
  - [ ] `E_CHEMOTAXIS_BACTERIA` (evolutionary milestone)
  - [ ] `E_CAMBRIAN_EXPLOSION` (evolutionary milestone)
  - [ ] `E1982_MARR_VISION`
  - [ ] `E2019_CELEGANS_CONNECTOME`
  - [ ] `E2020_OCTOPUS_COGNITION`
- [ ] Add key figure profiles:
  - [ ] Sydney Brenner
  - [ ] David Marr

### Quiz Testing
- [ ] Test evolutionary timeline logic
- [ ] Verify scientific accuracy
- [ ] Test matching pairs

---

## Browser Validation (REQUIRED)

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/intelligence-before-brains`
- [ ] Screenshot path overview
- [ ] Verify 9 milestones display correctly
- [ ] Check 35 min duration shown

### Step Navigation
- [ ] Navigate all 9 steps
- [ ] Verify content loads for evolutionary milestones
- [ ] Test progress tracking

### Quiz Interactions
- [ ] Complete all 12 quizzes
- [ ] Verify evolutionary facts correct
- [ ] Test timeline ordering with Mya/Bya dates

### Error Checking
- [ ] Check console: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network: `mcp__claude-in-chrome__read_network_requests`

---

## Notes for Future Developers

1. **Evolutionary Milestones**: This path needs milestones for evolutionary events (Cambrian explosion, bacterial chemotaxis origin). These are different from research discoveries - handle date display differently.

2. **Scientific Accuracy**: Evolutionary dates are approximate. Use "~" prefix and be clear about uncertainty.

3. **Key Figures**: Sydney Brenner (Nobel laureate) and David Marr (died young but hugely influential) are essential. Marr's framework is still used in cognitive science.

4. **Philosophical Depth**: This path touches on deep questions about the nature of intelligence. The bacterial chemotaxis → AI connection is profound - same optimization principles at vastly different scales.

5. **Visual Assets**: Diagrams of C. elegans nervous system, flagellar motor, and octopus distributed nervous system would enhance this path.
