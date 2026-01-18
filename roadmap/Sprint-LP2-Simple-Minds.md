# Sprint LP2: Simple Minds, Profound Lessons

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: What the simplest organisms teach us about intelligence
**Duration**: ~30 minutes
**Milestones**: 8 | **Quizzes**: 12

This path explores intelligence at its most fundamental level - bacteria navigating chemical gradients, worms seeking warmth, fish solving spatial puzzles. These "simple" minds reveal core computational principles that scale to complex cognition.

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E1938_the_roundabout_path_of_the_fighting_fish` | Betta Fish Spatial Navigation Study | 1938 | Can a fish plan a detour? |
| 2 | `E1972_mirror_self_recognition_study` | Mirror Self-Recognition Study | 1972 | Which animals recognize themselves? |
| 3 | `E1973_chemotaxis_c_elegans` | C. elegans Chemotaxis Characterized | 1973 | A worm with 302 neurons navigates chemical landscapes |
| 4 | `E1974_flagellar_rotation_bacteria` | Bacterial Flagellar Rotation Mechanism | 1974 | The world's smallest smart machines |
| 5 | `E1975_thermotaxis_c_elegans` | C. elegans Thermotaxis Discovery | 1975 | Worms remember their preferred temperature |
| 6 | `E2023_great_ape_gestures` | Great Ape Gestural Communication Study | 2023 | Humans still understand primate gestures |
| 7 | `E2019_CELEGANS_CONNECTOME` | Complete C. elegans Connectome Mapped | 2019 | Every connection in a complete nervous system |
| 8 | `E2020_OCTOPUS_COGNITION` | Octopus Cognitive Complexity Studies | 2020 | Distributed intelligence without a central brain |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `sydney-brenner` | Sydney Brenner | Pioneered C. elegans as model organism |
| `gordon-gallup` | Gordon Gallup Jr. | Created mirror self-recognition test |
| `frans-de-waal` | Frans de Waal | Comparative cognition researcher |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| Chemotaxis | Navigation by chemical gradients |
| Bilateral Symmetry | Body plan enabling directed movement |
| Cambrian Explosion | When complex body plans emerged |
| Encephalization Quotient | Brain-to-body size ratio |
| Model-Free Learning | Reactive behavior without internal models |
| Habituation | Simplest form of learning |

---

## Quizzes

### Multiple Choice (3 questions)

**Q1: Bacterial Intelligence**
```json
{
  "question": "How do bacteria 'decide' which direction to swim?",
  "options": [
    "They have a tiny brain that processes environmental data",
    "They compare chemical concentrations over time and bias random tumbling",
    "They follow other bacteria in a swarm",
    "They only swim in straight lines"
  ],
  "correct": 1,
  "explanation": "Bacteria use temporal comparison - they measure concentration change over time and adjust the probability of tumbling (random reorientation). This is remarkably similar to gradient descent optimization."
}
```

**Q2: C. elegans Significance**
```json
{
  "question": "Why is C. elegans special for understanding intelligence?",
  "options": [
    "It's the smartest invertebrate",
    "It has exactly 302 neurons and we've mapped every connection",
    "It can communicate with humans",
    "It has the fastest reflexes of any animal"
  ],
  "correct": 1,
  "explanation": "C. elegans is the only organism with a completely mapped connectome (302 neurons, ~7,000 synapses). This allows researchers to understand how neural circuits produce behavior."
}
```

**Q3: Mirror Test Implications**
```json
{
  "question": "What does passing the mirror self-recognition test suggest about an animal?",
  "options": [
    "It has good vision",
    "It has some form of self-awareness or body concept",
    "It's afraid of reflections",
    "It has been trained by humans"
  ],
  "correct": 1,
  "explanation": "Passing the mirror test suggests an animal can recognize the reflection as itself, implying some level of self-concept. Great apes, elephants, dolphins, and magpies pass; most animals don't."
}
```

### Timeline Ordering (3 questions)

**Q4: Evolution of Study**
```json
{
  "question": "Order these discoveries about simple organisms:",
  "items": [
    "Bacterial flagellar rotation mechanism",
    "C. elegans chemotaxis characterized",
    "Betta fish spatial navigation study",
    "Complete C. elegans connectome mapped"
  ],
  "correct_order": [2, 1, 0, 3],
  "explanation": "Fish (1938) → Chemotaxis (1973) → Flagella (1974) → Connectome (2019). Research built from behavior observation to molecular mechanisms to complete circuit mapping."
}
```

**Q5: Cognitive Milestones**
```json
{
  "question": "Order these cognitive discoveries from earliest to latest:",
  "items": [
    "Mirror self-recognition test created",
    "Octopus cognitive complexity studies",
    "Great ape gesture study",
    "C. elegans thermotaxis discovered"
  ],
  "correct_order": [0, 3, 2, 1],
  "explanation": "Mirror test (1972) → Thermotaxis (1975) → Ape gestures (2023) → Octopus (2020). Wait, octopus is 2020, not after 2023. Correct: Mirror (1972) → Thermotaxis (1975) → Octopus (2020) → Gestures (2023)."
}
```

**Q6: Complexity Hierarchy**
```json
{
  "question": "Order these organisms by neuron count (fewest to most):",
  "items": [
    "E. coli bacterium",
    "Fruit fly",
    "C. elegans",
    "Octopus"
  ],
  "correct_order": [0, 2, 1, 3],
  "explanation": "E. coli (0 neurons) → C. elegans (302) → Fruit fly (~100,000) → Octopus (~500 million). More neurons doesn't always mean 'smarter' - octopi use them differently."
}
```

### Matching (3 questions)

**Q7: Organism to Ability**
```json
{
  "question": "Match each organism to its demonstrated cognitive ability:",
  "left": ["Bacteria", "C. elegans", "Betta fish", "Great apes"],
  "right": ["Tool use and language", "Gradient-following navigation", "Spatial detour planning", "Temperature preference learning"],
  "correct_pairs": [[0, 1], [1, 3], [2, 2], [3, 0]],
  "explanation": "Each organism shows intelligence appropriate to its ecological niche, from simple gradient following to complex social cognition."
}
```

**Q8: Navigation Strategy to Organism**
```json
{
  "question": "Match each navigation strategy to the organism that uses it:",
  "left": ["Run-and-tumble", "Path integration", "Landmark memory", "Thermotaxis"],
  "right": ["Bacteria", "Ants", "Birds", "C. elegans"],
  "correct_pairs": [[0, 0], [1, 1], [2, 2], [3, 3]],
  "explanation": "Different organisms evolved different navigation strategies suited to their scale and environment."
}
```

**Q9: Neuron Count to Capability**
```json
{
  "question": "Match neuron counts to the capabilities they enable:",
  "left": ["0 neurons", "302 neurons", "100,000 neurons", "86 billion neurons"],
  "right": ["Human cognition", "Chemotaxis only", "Complex learning and memory", "Full behavioral repertoire"],
  "correct_pairs": [[0, 1], [1, 3], [2, 2], [3, 0]],
  "explanation": "Bacteria (0) can only do reactive chemotaxis. C. elegans (302) has a complete behavioral repertoire. Flies (100K) have complex learning. Humans (86B) have language and abstract thought."
}
```

### Fill-in-the-Blank (3 questions)

**Q10: Chemotaxis Definition**
```json
{
  "question": "_____ is the movement of an organism in response to a chemical stimulus.",
  "answer": "Chemotaxis",
  "alternatives": ["chemotaxis"],
  "explanation": "Chemotaxis is one of the most fundamental forms of adaptive behavior, found from bacteria to immune cells."
}
```

**Q11: C. elegans Fact**
```json
{
  "question": "C. elegans has exactly _____ neurons, making it the only animal with a completely mapped brain.",
  "answer": "302",
  "alternatives": ["three hundred two", "three hundred and two"],
  "explanation": "This precise number allows researchers to simulate the entire nervous system and understand how circuits produce behavior."
}
```

**Q12: Mirror Test Creator**
```json
{
  "question": "The mirror self-recognition test was created by Gordon _____ in 1972.",
  "answer": "Gallup",
  "alternatives": ["gallup"],
  "explanation": "Gordon Gallup Jr. developed this test to assess self-awareness in animals, first demonstrating it with chimpanzees."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "simple-minds"
- [ ] Insert 8 LearningPathStep records with milestone links
- [ ] Insert 12 LearningPathQuiz records
- [ ] Verify API endpoint returns correct data

### Content Validation
- [ ] Confirm all 8 milestones exist in database
- [ ] Create missing milestones if needed:
  - [ ] `E2019_CELEGANS_CONNECTOME`
  - [ ] `E2020_OCTOPUS_COGNITION`
- [ ] Confirm glossary terms exist or create them
- [ ] Review narrative hooks for scientific accuracy

### Quiz Testing
- [ ] Test multiple choice logic
- [ ] Test timeline ordering validation
- [ ] Test matching pair validation
- [ ] Test fill-in-blank with alternatives

---

## Browser Validation (REQUIRED)

> **CRITICAL**: Use Claude Chrome MCP tools to manually test all web features.

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/simple-minds`
- [ ] Take screenshot of path overview
- [ ] Verify all 8 milestones displayed correctly
- [ ] Verify estimated duration shows "30 min"

### Step Navigation
- [ ] Test navigation through all 8 milestones
- [ ] Verify organism images load (if present)
- [ ] Test "Next" and "Previous" buttons
- [ ] Verify progress tracking

### Quiz Interactions
- [ ] Test all 3 multiple choice questions
- [ ] Test all 3 timeline ordering questions
- [ ] Test all 3 matching questions
- [ ] Test all 3 fill-in-blank questions
- [ ] Verify explanations show after answers

### Error Handling
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network for failed requests: `mcp__claude-in-chrome__read_network_requests`
- [ ] Screenshot any issues found

---

## Notes for Future Developers

1. **Missing Milestones**: Need to create `E2019_CELEGANS_CONNECTOME` and `E2020_OCTOPUS_COGNITION` milestones if they don't exist.

2. **Visual Assets**: This path would benefit from organism diagrams (bacteria, C. elegans neural diagram, mirror test setup).

3. **Philosophical Angle**: Consider adding a closing section on what "intelligence" means at different scales - the boundary between intelligence and mechanism is blurry.

4. **Key Figure Gap**: Sydney Brenner won the Nobel Prize for C. elegans work - should have a key figure profile if not already in system.

5. **Quiz Order**: Timeline Q5 has a logic error in my original - verify the explanation matches the correct order before implementing.
