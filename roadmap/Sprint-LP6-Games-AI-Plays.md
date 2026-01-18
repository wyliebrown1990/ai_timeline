# Sprint LP6: Games AI Plays

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: How game-playing AI drove breakthroughs in machine learning
**Duration**: ~40 minutes
**Milestones**: 10 | **Quizzes**: 14

This path shows how games became the proving ground for AI. From checkers to chess to Go to StarCraft, each challenge pushed researchers to invent new techniques that later transformed AI.

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E1952_CHECKERS` | Arthur Samuel's Checkers Program | 1952 | The first machine learning program |
| 2 | `E1997_DEEP_BLUE` | Deep Blue Defeats Kasparov | 1997 | Machine beats world chess champion |
| 3 | `E2013_DQN` | Deep Q-Network Plays Atari | 2013 | Deep RL learns from pixels |
| 4 | `E2016_ALPHAGO` | AlphaGo Defeats Lee Sedol | 2016 | AI conquers Go's intuition |
| 5 | `E2017_ALPHAGO_ZERO` | AlphaGo Zero Learns from Scratch | 2017 | Superhuman Go without human data |
| 6 | `E2017_ALPHAZERO` | AlphaZero Masters Three Games | 2017 | One algorithm, three games, superhuman |
| 7 | `E2018_OPENAI_FIVE` | OpenAI Five Plays Dota 2 | 2018 | Real-time strategy at scale |
| 8 | `E2019_ALPHASTAR` | AlphaStar Masters StarCraft II | 2019 | Real-time imperfect information |
| 9 | `E2020_MUZERO` | MuZero Learns Game Rules and Masters | 2020 | Learning to play without knowing the rules |
| 10 | `E2022_DIPLOMACY` | CICERO Plays Diplomacy | 2022 | AI negotiates and deceives |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `arthur-samuel` | Arthur Samuel | Coined "machine learning", checkers |
| `demis-hassabis` | Demis Hassabis | DeepMind founder, chess player |
| `david-silver` | David Silver | AlphaGo/Zero/MuZero lead |
| `garry-kasparov` | Garry Kasparov | Deep Blue opponent |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| Monte Carlo Tree Search | Key planning algorithm |
| Deep Reinforcement Learning | Neural networks + RL |
| Self-play | Learning by playing against yourself |
| Game-playing AI | AI for strategic games |
| Policy Network | Predicts best moves |
| Value Network | Evaluates positions |

---

## Quizzes

### Multiple Choice (4 questions)

**Q1: Samuel's Contribution**
```json
{
  "question": "What was revolutionary about Arthur Samuel's checkers program?",
  "options": [
    "It was the fastest computer of its time",
    "It could learn and improve through experience, coining 'machine learning'",
    "It beat the world champion immediately",
    "It used neural networks"
  ],
  "correct": 1,
  "explanation": "Samuel's program learned from playing games, improving over time. He coined the term 'machine learning' to describe this capability - the first use of the term."
}
```

**Q2: AlphaGo's Breakthrough**
```json
{
  "question": "Why was AlphaGo's victory over Lee Sedol considered a bigger milestone than Deep Blue's chess victory?",
  "options": [
    "Lee Sedol was a better player than Kasparov",
    "Go has far more possible positions and requires intuition, not just calculation",
    "AlphaGo used faster computers",
    "Chess was already easy for computers"
  ],
  "correct": 1,
  "explanation": "Go has 10^170 possible positions vs chess's 10^47. Expert Go play requires intuition about board positions that can't be brute-forced. AlphaGo learned this intuition from data and self-play."
}
```

**Q3: Self-Play Innovation**
```json
{
  "question": "What made AlphaGo Zero's approach fundamentally different from the original AlphaGo?",
  "options": [
    "It used bigger computers",
    "It learned entirely from self-play without any human game data",
    "It focused only on opening moves",
    "It was programmed with explicit Go rules by experts"
  ],
  "correct": 1,
  "explanation": "AlphaGo Zero started with only the rules and learned by playing itself. It surpassed the human-data-trained AlphaGo, suggesting self-discovered strategies can exceed human knowledge."
}
```

**Q4: Real-Time Challenge**
```json
{
  "question": "What new challenges did StarCraft II present compared to board games?",
  "options": [
    "Larger board size",
    "More players",
    "Real-time decisions, imperfect information, long-term planning",
    "More complex rules"
  ],
  "correct": 2,
  "explanation": "StarCraft requires decisions in real-time (not turn-based), has hidden information (fog of war), and demands balancing immediate tactics with long-term strategy - vastly harder than perfect-information board games."
}
```

### Timeline Ordering (4 questions)

**Q5: Classic Game AI**
```json
{
  "question": "Order these classic game AI milestones:",
  "items": [
    "Deep Blue beats Kasparov",
    "Watson wins Jeopardy!",
    "Samuel's checkers program",
    "TD-Gammon masters backgammon"
  ],
  "correct_order": [2, 3, 0, 1],
  "explanation": "Checkers (1952) → TD-Gammon (1992) → Deep Blue (1997) → Watson (2011). Each tackled increasingly complex challenges."
}
```

**Q6: AlphaGo Evolution**
```json
{
  "question": "Order the evolution of DeepMind's game-playing systems:",
  "items": [
    "AlphaZero masters three games",
    "AlphaGo beats Lee Sedol",
    "AlphaGo Zero surpasses AlphaGo",
    "MuZero learns without game rules"
  ],
  "correct_order": [1, 2, 0, 3],
  "explanation": "AlphaGo (2016) → AlphaGo Zero (2017) → AlphaZero (2017) → MuZero (2020). Each generalized more than the last."
}
```

**Q7: Multi-Player Games**
```json
{
  "question": "Order these multi-player game AI achievements:",
  "items": [
    "CICERO plays Diplomacy",
    "AlphaStar masters StarCraft II",
    "OpenAI Five plays Dota 2",
    "Libratus wins at poker"
  ],
  "correct_order": [3, 2, 1, 0],
  "explanation": "Libratus (2017) → OpenAI Five (2018) → AlphaStar (2019) → CICERO (2022). Imperfect information and multi-agent scenarios grew more complex."
}
```

**Q8: Deep RL Gaming**
```json
{
  "question": "Order these deep reinforcement learning milestones:",
  "items": [
    "AlphaGo uses deep RL for Go",
    "DQN plays Atari from pixels",
    "PPO enables OpenAI Five",
    "MuZero learns world models"
  ],
  "correct_order": [1, 0, 2, 3],
  "explanation": "DQN (2013) → AlphaGo (2016) → PPO/OpenAI Five (2017-18) → MuZero (2020). Deep RL techniques built on each other."
}
```

### Matching (3 questions)

**Q9: Game to AI System**
```json
{
  "question": "Match each game to the AI system that mastered it:",
  "left": ["Chess", "Go", "StarCraft II", "Diplomacy"],
  "right": ["CICERO", "AlphaStar", "Deep Blue / AlphaZero", "AlphaGo"],
  "correct_pairs": [[0, 2], [1, 3], [2, 1], [3, 0]],
  "explanation": "Deep Blue (and later AlphaZero) for chess, AlphaGo for Go, AlphaStar for StarCraft, CICERO for Diplomacy."
}
```

**Q10: Technique to Achievement**
```json
{
  "question": "Match each technique to what it enabled:",
  "left": ["Monte Carlo Tree Search", "Self-play", "Deep Q-Networks", "World models"],
  "right": ["Learning without rules (MuZero)", "Learning from pixels (Atari)", "Planning in games (AlphaGo)", "Surpassing human data (AlphaGo Zero)"],
  "correct_pairs": [[0, 2], [1, 3], [2, 1], [3, 0]],
  "explanation": "MCTS enables planning, self-play removes need for human data, DQN handles pixel inputs, world models enable rule-free learning."
}
```

**Q11: Year to Breakthrough**
```json
{
  "question": "Match each year to its game AI breakthrough:",
  "left": ["1997", "2013", "2016", "2019"],
  "right": ["AlphaStar masters StarCraft", "AlphaGo beats Lee Sedol", "Deep Blue beats Kasparov", "DQN plays Atari"],
  "correct_pairs": [[0, 2], [1, 3], [2, 1], [3, 0]],
  "explanation": "Deep Blue (1997) → DQN (2013) → AlphaGo (2016) → AlphaStar (2019)."
}
```

### Fill-in-the-Blank (3 questions)

**Q12: Machine Learning Coinage**
```json
{
  "question": "The term 'machine learning' was coined by Arthur _____ in 1959.",
  "answer": "Samuel",
  "alternatives": ["samuel"],
  "explanation": "Samuel coined the term while working on his checkers program at IBM, defining it as giving computers the ability to learn without being explicitly programmed."
}
```

**Q13: Go Complexity**
```json
{
  "question": "Go has approximately 10^_____ possible board positions, far more than chess's 10^47.",
  "answer": "170",
  "alternatives": ["one hundred seventy", "one hundred and seventy"],
  "explanation": "This massive state space is why brute-force search fails for Go. AlphaGo needed to develop intuition through pattern recognition and MCTS."
}
```

**Q14: AlphaGo Moment**
```json
{
  "question": "AlphaGo's famous 'Move _____' in Game 2 against Lee Sedol was so creative that commentators thought it was a mistake.",
  "answer": "37",
  "alternatives": ["thirty seven", "thirty-seven"],
  "explanation": "Move 37 was unlike any human strategy. AlphaGo placed a stone that seemed wrong but led to victory, demonstrating superhuman strategic insight."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "games-ai-plays"
- [ ] Insert 10 LearningPathStep records
- [ ] Insert 14 LearningPathQuiz records

### Content Validation
- [ ] Verify existing milestones exist
- [ ] Create missing milestones:
  - [ ] `E1952_CHECKERS`
  - [ ] `E2017_ALPHAGO_ZERO`
  - [ ] `E2017_ALPHAZERO`
  - [ ] `E2018_OPENAI_FIVE`
  - [ ] `E2019_ALPHASTAR`
  - [ ] `E2020_MUZERO`
  - [ ] `E2022_DIPLOMACY`
- [ ] Add key figure profiles:
  - [ ] Arthur Samuel
  - [ ] Demis Hassabis
  - [ ] David Silver
  - [ ] Garry Kasparov

### Quiz Testing
- [ ] Test all quizzes
- [ ] Verify game-specific facts
- [ ] Test timeline ordering

---

## Browser Validation (REQUIRED)

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/games-ai-plays`
- [ ] Screenshot path overview
- [ ] Verify 10 milestones display correctly
- [ ] Check 40 min duration shown

### Step Navigation
- [ ] Navigate all 10 steps
- [ ] Verify game imagery loads (if present)
- [ ] Test progress tracking

### Quiz Interactions
- [ ] Complete all 14 quizzes
- [ ] Verify game-specific explanations
- [ ] Test numeric answers (170, 37)

### Error Checking
- [ ] Check console: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network: `mcp__claude-in-chrome__read_network_requests`

---

## Notes for Future Developers

1. **Missing Milestones**: Many key game AI milestones need to be created - the DeepMind series especially (AlphaGo Zero, AlphaZero, MuZero, AlphaStar).

2. **Key Figures**: Demis Hassabis and David Silver are essential for this path. Also consider Garry Kasparov (perspective from the human side).

3. **Visual Opportunity**: Game boards, move 37 visualization, and gameplay footage would enhance this path significantly.

4. **Move 37 Story**: This is one of the most dramatic moments in AI history. Make sure the narrative captures the commentators' confusion, then revelation.

5. **Broader Implications**: End the path by connecting game-playing AI to real-world applications - AlphaFold's success used many same techniques.
