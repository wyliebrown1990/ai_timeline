# Sprint LP4: The Attention Economy

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: How attention mechanisms revolutionized AI and created the LLM era
**Duration**: ~45 minutes
**Milestones**: 12 | **Quizzes**: 16

This path follows the development of attention mechanisms from a translation trick to the dominant paradigm in AI. It traces the line from seq2seq through Transformers to GPT-4 and beyond.

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E2014_SEQ2SEQ` | Sequence-to-Sequence Learning | 2014 | Encoding entire sentences into vectors |
| 2 | `E2014_ATTENTION_NMT` | Attention for Neural Machine Translation | 2014 | The birth of attention |
| 3 | `E2015_ADAM` | Adam Optimizer Published | 2015 | The optimizer that trains Transformers |
| 4 | `E2017_TRANSFORMER` | Attention Is All You Need | 2017 | The paper that changed AI |
| 5 | `E2018_GPT1` | GPT-1: Generative Pre-Training | 2018 | Pre-training meets generation |
| 6 | `E2018_BERT` | BERT: Bidirectional Transformers | 2018 | Understanding context from both sides |
| 7 | `E2019_GPT2` | GPT-2: Emergent Capabilities | 2019 | "Too dangerous to release" |
| 8 | `E2020_GPT3` | GPT-3: Few-Shot Learning at Scale | 2020 | 175 billion parameters change everything |
| 9 | `E2020_SCALING_LAWS` | Scaling Laws for Neural LMs | 2020 | Why bigger is predictably better |
| 10 | `E2022_CHATGPT` | ChatGPT Launches | 2022 | AI meets the mainstream |
| 11 | `E2023_GPT4` | GPT-4: Multimodal Reasoning | 2023 | Vision meets language |
| 12 | `E2024_CLAUDE3` | Claude 3: Approaching Human-Level | 2024 | The frontier advances |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `ilya-sutskever` | Ilya Sutskever | Seq2seq, GPT series, scaling |
| `ashish-vaswani` | Ashish Vaswani | Lead author, Transformer paper |
| `alec-radford` | Alec Radford | GPT series, CLIP |
| `dario-amodei` | Dario Amodei | Scaling laws, founded Anthropic |
| `sam-altman` | Sam Altman | OpenAI CEO, ChatGPT launch |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| Attention Mechanism | Core innovation enabling context |
| Transformer | The dominant architecture |
| Self-attention | Attention within a single sequence |
| BERT | Bidirectional pre-training approach |
| GPT | Generative Pre-trained Transformer |
| Context Window | How much text a model can "see" |
| Few-shot Learning | Learning from examples in the prompt |
| Emergent Behavior | Capabilities that appear at scale |
| Foundation Model | Large pre-trained model for many tasks |

---

## Quizzes

### Multiple Choice (4 questions)

**Q1: Attention Intuition**
```json
{
  "question": "What problem does the attention mechanism solve?",
  "options": [
    "It makes training faster",
    "It lets the model focus on relevant parts of the input when generating each output",
    "It reduces the number of parameters needed",
    "It eliminates the need for training data"
  ],
  "correct": 1,
  "explanation": "Attention allows the model to dynamically weight different parts of the input for each output token, solving the bottleneck problem where all information had to flow through a fixed-size vector."
}
```

**Q2: Transformer Innovation**
```json
{
  "question": "What was the key insight of 'Attention Is All You Need'?",
  "options": [
    "Recurrence is essential for sequence processing",
    "Self-attention alone can replace recurrence, enabling parallel processing",
    "Convolutional networks work best for text",
    "Smaller models are better"
  ],
  "correct": 1,
  "explanation": "By removing recurrence and relying solely on attention, Transformers can process all positions in parallel, dramatically speeding up training and enabling much larger models."
}
```

**Q3: Scaling Laws**
```json
{
  "question": "What do the scaling laws predict?",
  "options": [
    "Smaller models are more efficient",
    "Performance improves predictably with more data, compute, and parameters",
    "There's a hard ceiling on AI capabilities",
    "Training cost decreases over time"
  ],
  "correct": 1,
  "explanation": "The scaling laws show smooth power-law relationships between model size, data, compute, and performance - suggesting we can predict (and achieve) better capabilities by scaling up."
}
```

**Q4: ChatGPT Impact**
```json
{
  "question": "Why was ChatGPT such a breakthrough moment?",
  "options": [
    "It was the first language model ever created",
    "It was the largest model by parameter count",
    "It made AI capabilities accessible and intuitive for the general public",
    "It achieved superintelligence"
  ],
  "correct": 2,
  "explanation": "ChatGPT's chat interface made powerful AI accessible to everyone, reaching 100 million users in 2 months. The underlying technology existed; the interface was the innovation."
}
```

### Timeline Ordering (4 questions)

**Q5: Pre-Transformer Era**
```json
{
  "question": "Order these pre-Transformer developments:",
  "items": [
    "Attention for NMT",
    "Sequence-to-Sequence learning",
    "Adam optimizer",
    "LSTM networks"
  ],
  "correct_order": [3, 1, 0, 2],
  "explanation": "LSTM (1997) → Seq2Seq (2014) → Attention NMT (2014) → Adam (2015). LSTMs enabled seq2seq, attention improved seq2seq, Adam made training easier."
}
```

**Q6: GPT Series**
```json
{
  "question": "Order the GPT model releases:",
  "items": [
    "GPT-3",
    "GPT-2",
    "GPT-4",
    "GPT-1"
  ],
  "correct_order": [3, 1, 0, 2],
  "explanation": "GPT-1 (2018) → GPT-2 (2019) → GPT-3 (2020) → GPT-4 (2023). Each generation showed dramatic capability improvements."
}
```

**Q7: 2022-2024 Explosion**
```json
{
  "question": "Order these 2022-2024 milestones:",
  "items": [
    "Claude 3 release",
    "ChatGPT launch",
    "GPT-4 release",
    "Gemini announcement"
  ],
  "correct_order": [1, 2, 3, 0],
  "explanation": "ChatGPT (Nov 2022) → GPT-4 (Mar 2023) → Gemini (Dec 2023) → Claude 3 (Mar 2024). The race accelerated after ChatGPT's success."
}
```

**Q8: Architecture Evolution**
```json
{
  "question": "Order these architectures by introduction date:",
  "items": [
    "BERT",
    "Transformer",
    "T5",
    "Seq2Seq with Attention"
  ],
  "correct_order": [3, 1, 0, 2],
  "explanation": "Attention Seq2Seq (2014) → Transformer (2017) → BERT (2018) → T5 (2019). Each refined the previous approach."
}
```

### Matching (4 questions)

**Q9: Model to Innovation**
```json
{
  "question": "Match each model to its key innovation:",
  "left": ["GPT-1", "BERT", "GPT-3", "GPT-4"],
  "right": ["Multimodal (vision + text)", "Few-shot in-context learning", "Generative pre-training", "Bidirectional context"],
  "correct_pairs": [[0, 2], [1, 3], [2, 1], [3, 0]],
  "explanation": "GPT-1 introduced generative pre-training, BERT added bidirectionality, GPT-3 showed few-shot learning, GPT-4 added vision."
}
```

**Q10: Company to Model**
```json
{
  "question": "Match each company to their flagship LLM:",
  "left": ["OpenAI", "Anthropic", "Google", "Meta"],
  "right": ["LLaMA", "Gemini", "Claude", "GPT-4"],
  "correct_pairs": [[0, 3], [1, 2], [2, 1], [3, 0]],
  "explanation": "OpenAI makes GPT, Anthropic makes Claude, Google makes Gemini, Meta makes LLaMA."
}
```

**Q11: Paper to Author Team**
```json
{
  "question": "Match each paper to its research team/company:",
  "left": ["Attention Is All You Need", "BERT", "GPT-3", "Scaling Laws"],
  "right": ["OpenAI (Radford et al.)", "Google Brain", "Anthropic (Amodei et al.)", "Google Brain (Vaswani et al.)"],
  "correct_pairs": [[0, 3], [1, 1], [2, 0], [3, 2]],
  "explanation": "Transformer and BERT from Google, GPT-3 from OpenAI, Scaling Laws from what became Anthropic (while at OpenAI)."
}
```

**Q12: Parameter Count to Model**
```json
{
  "question": "Match each parameter count (approximate) to the model:",
  "left": ["117 million", "340 million", "175 billion", "1 trillion+"],
  "right": ["GPT-3", "GPT-4 (rumored)", "GPT-1", "BERT-Large"],
  "correct_pairs": [[0, 2], [1, 3], [2, 0], [3, 1]],
  "explanation": "GPT-1 (117M) → BERT-Large (340M) → GPT-3 (175B) → GPT-4 (rumored 1T+). Scale increased by 10,000x in 5 years."
}
```

### Fill-in-the-Blank (4 questions)

**Q13: Transformer Title**
```json
{
  "question": "The 2017 paper introducing the Transformer was titled 'Attention Is All You _____.'",
  "answer": "Need",
  "alternatives": ["need"],
  "explanation": "This title emphasized that attention mechanisms alone, without recurrence or convolution, were sufficient for state-of-the-art results."
}
```

**Q14: GPT-3 Scale**
```json
{
  "question": "GPT-3 has _____ billion parameters, a massive jump from GPT-2's 1.5 billion.",
  "answer": "175",
  "alternatives": ["one hundred seventy five", "one hundred and seventy five"],
  "explanation": "GPT-3's 175 billion parameters enabled emergent capabilities like few-shot learning that weren't present in smaller models."
}
```

**Q15: ChatGPT Milestone**
```json
{
  "question": "ChatGPT reached 100 million users in _____ months, the fastest growth in consumer tech history.",
  "answer": "2",
  "alternatives": ["two"],
  "explanation": "For comparison, TikTok took 9 months, Instagram took 2.5 years. ChatGPT's growth was unprecedented."
}
```

**Q16: Self-Attention**
```json
{
  "question": "In Transformers, _____-attention allows each token to attend to all other tokens in the sequence.",
  "answer": "self",
  "alternatives": [],
  "explanation": "Self-attention is the core mechanism that lets Transformers capture long-range dependencies without recurrence."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "attention-economy"
- [ ] Insert 12 LearningPathStep records
- [ ] Insert 16 LearningPathQuiz records
- [ ] Link to existing milestone records

### Content Validation
- [ ] Verify all 12 milestones exist
- [ ] Create missing milestones:
  - [ ] `E2014_SEQ2SEQ`
  - [ ] `E2014_ATTENTION_NMT`
  - [ ] `E2015_ADAM`
  - [ ] `E2020_SCALING_LAWS`
- [ ] Add key figure profiles:
  - [ ] Ashish Vaswani
  - [ ] Alec Radford
  - [ ] Ilya Sutskever

### Quiz Testing
- [ ] Test all 16 quizzes
- [ ] Verify parameter count quiz accepts variations
- [ ] Test timeline ordering logic

---

## Browser Validation (REQUIRED)

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/attention-economy`
- [ ] Screenshot path overview
- [ ] Verify 12 milestones display correctly
- [ ] Check timeline visualization spans 2014-2024

### Step Navigation
- [ ] Navigate all 12 steps
- [ ] Verify each milestone's content loads
- [ ] Test progress indicator

### Quiz Interactions
- [ ] Complete all quiz types
- [ ] Verify correct/incorrect feedback
- [ ] Test fill-in-blank input validation
- [ ] Screenshot completion state

### Error Checking
- [ ] Check console: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network: `mcp__claude-in-chrome__read_network_requests`
- [ ] Document any failures

---

## Notes for Future Developers

1. **The Transformer Story**: This is the core story of modern AI. The 2017 Transformer paper is the watershed moment. Make sure users understand why it mattered.

2. **Missing Milestones**: Need to create milestones for Seq2Seq, Attention NMT, Adam optimizer, and Scaling Laws - these are critical for the story.

3. **Key Figures Gap**: Ashish Vaswani (Transformer), Alec Radford (GPT series), Ilya Sutskever (co-inventor of seq2seq, GPT) need profiles.

4. **Living History**: This path includes very recent events (2022-2024). Keep it updated as new milestones occur.

5. **Commercial Sensitivity**: Be careful with claims about GPT-4's architecture (MoE, parameter count) - much is unconfirmed.
