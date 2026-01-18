# Sprint LP3: From Neurons to Networks

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: The evolution of neural network architectures from single neurons to deep learning
**Duration**: ~50 minutes
**Milestones**: 14 | **Quizzes**: 16

This path traces the complete history of neural networks - from McCulloch-Pitts' logical neurons through the perceptron controversy, the backpropagation revival, and the deep learning revolution that gave us modern AI.

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E1943_MCCULLOCH_PITTS` | McCulloch-Pitts Neuron Model | 1943 | The first artificial neuron |
| 2 | `E1949_HEBBIAN_LEARNING` | Hebb's Learning Rule | 1949 | How do neurons learn? |
| 3 | `E1958_PERCEPTRON` | Rosenblatt's Perceptron | 1958 | The first learning machine |
| 4 | `E1969_PERCEPTRONS_BOOK` | Minsky & Papert's "Perceptrons" | 1969 | The book that killed neural networks |
| 5 | `E1980_neocognitron` | Neocognitron Introduces Convolutional Architecture | 1980 | The seed of modern computer vision |
| 6 | `E1986_BACKPROP` | Backpropagation Popularized | 1986 | The algorithm that changed everything |
| 7 | `E1997_LSTM` | Long Short-Term Memory (LSTM) | 1997 | Neural networks that remember |
| 8 | `E1998_LENET` | LeNet-5 for Handwritten Digits | 1998 | CNNs prove practical for real tasks |
| 9 | `E2006_DEEP_BELIEF_NETS` | Hinton's Deep Belief Networks | 2006 | Breaking the deep learning barrier |
| 10 | `E2012_ALEXNET` | AlexNet Wins ImageNet | 2012 | The deep learning moment |
| 11 | `E2014_GANS` | Generative Adversarial Networks | 2014 | Networks that create |
| 12 | `E2015_BATCHNORM` | Batch Normalization Introduced | 2015 | Training very deep networks |
| 13 | `E2015_RESNET` | ResNet Solves Vanishing Gradients | 2015 | Skip connections enable 1000+ layers |
| 14 | `E2017_TRANSFORMER` | Attention Is All You Need | 2017 | The architecture behind modern AI |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `donald-hebb` | Donald Hebb | Neural plasticity theory |
| `frank-rosenblatt` | Frank Rosenblatt | Invented the perceptron |
| `marvin-minsky` | Marvin Minsky | Perceptrons critique (controversial) |
| `geoffrey-hinton` | Geoffrey Hinton | Backprop, deep belief nets, Turing Award |
| `yann-lecun` | Yann LeCun | Convolutional networks, LeNet |
| `sepp-hochreiter` | Sepp Hochreiter | LSTM co-inventor |
| `ian-goodfellow` | Ian Goodfellow | Invented GANs |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| Neural Networks | The core concept |
| Perceptron | First learnable artificial neuron |
| Backpropagation | Key training algorithm |
| CNN (Convolutional Neural Network) | Vision architecture |
| Deep Learning | Multi-layer networks |
| LSTM | Memory-enabled networks |
| Transformer | Modern dominant architecture |
| Latent Space | Learned representations |
| GAN | Generative architecture |

---

## Quizzes

### Multiple Choice (4 questions)

**Q1: Historical Understanding**
```json
{
  "question": "Why did the Minsky-Papert 'Perceptrons' book cause an 'AI Winter' for neural networks?",
  "options": [
    "It proved neural networks were mathematically impossible",
    "It showed single-layer perceptrons couldn't learn XOR, and people generalized this to all neural networks",
    "It was too expensive to publish",
    "It contained errors that misled researchers"
  ],
  "correct": 1,
  "explanation": "The book proved real limitations of single-layer perceptrons, but the field incorrectly assumed these applied to multi-layer networks. This misunderstanding froze neural network research for over a decade."
}
```

**Q2: Backpropagation**
```json
{
  "question": "What does backpropagation actually compute?",
  "options": [
    "The final output of the network",
    "The gradient of the loss with respect to each weight",
    "The optimal network architecture",
    "The probability of correct classification"
  ],
  "correct": 1,
  "explanation": "Backpropagation efficiently computes gradients using the chain rule, enabling gradient descent optimization of all weights in a deep network."
}
```

**Q3: ResNet Innovation**
```json
{
  "question": "What key innovation did ResNet introduce?",
  "options": [
    "More training data",
    "Skip connections that let gradients flow directly through layers",
    "Smaller filter sizes",
    "Faster GPUs"
  ],
  "correct": 1,
  "explanation": "Skip connections (residual connections) allow gradients to bypass layers, solving the vanishing gradient problem and enabling networks with 100+ layers."
}
```

**Q4: Transformer Architecture**
```json
{
  "question": "What makes the Transformer architecture fundamentally different from RNNs?",
  "options": [
    "It uses more memory",
    "It processes all positions in parallel using attention, not sequentially",
    "It only works for images",
    "It doesn't need training data"
  ],
  "correct": 1,
  "explanation": "Unlike RNNs that process sequences step-by-step, Transformers use self-attention to process all positions simultaneously, enabling massive parallelization and better long-range dependencies."
}
```

### Timeline Ordering (4 questions)

**Q5: Early History**
```json
{
  "question": "Order these foundational neural network developments:",
  "items": [
    "Hebb's Learning Rule",
    "McCulloch-Pitts Neuron",
    "Rosenblatt's Perceptron",
    "Minsky's Perceptrons critique"
  ],
  "correct_order": [1, 0, 2, 3],
  "explanation": "McCulloch-Pitts (1943) → Hebb (1949) → Perceptron (1958) → Perceptrons book (1969). The field built up, then crashed."
}
```

**Q6: Deep Learning Revival**
```json
{
  "question": "Order these key deep learning milestones:",
  "items": [
    "AlexNet wins ImageNet",
    "Backpropagation popularized",
    "Deep Belief Networks",
    "LeNet-5 demonstrated"
  ],
  "correct_order": [1, 3, 2, 0],
  "explanation": "Backprop (1986) → LeNet (1998) → Deep Belief Nets (2006) → AlexNet (2012). Each built on prior work to eventually achieve the deep learning breakthrough."
}
```

**Q7: Modern Architectures**
```json
{
  "question": "Order these architecture innovations:",
  "items": [
    "Transformer",
    "GAN",
    "ResNet",
    "LSTM"
  ],
  "correct_order": [3, 1, 2, 0],
  "explanation": "LSTM (1997) → GAN (2014) → ResNet (2015) → Transformer (2017). Different architectures for different problems."
}
```

**Q8: Training Innovations**
```json
{
  "question": "Order these training technique developments:",
  "items": [
    "Batch Normalization",
    "Dropout regularization",
    "Adam optimizer",
    "Layer Normalization"
  ],
  "correct_order": [1, 2, 0, 3],
  "explanation": "Dropout (2012) → Adam (2014) → BatchNorm (2015) → LayerNorm (2016). Each addressed different training challenges."
}
```

### Matching (4 questions)

**Q9: Researcher to Architecture**
```json
{
  "question": "Match each researcher to their key architectural contribution:",
  "left": ["Yann LeCun", "Geoffrey Hinton", "Ian Goodfellow", "Vaswani et al."],
  "right": ["Transformer", "Convolutional Neural Networks", "Generative Adversarial Networks", "Deep Belief Networks"],
  "correct_pairs": [[0, 1], [1, 3], [2, 2], [3, 0]],
  "explanation": "LeCun developed CNNs (LeNet), Hinton pioneered deep belief nets, Goodfellow invented GANs, Vaswani led the Transformer paper."
}
```

**Q10: Problem to Architecture**
```json
{
  "question": "Match each problem type to the architecture best suited for it (historically):",
  "left": ["Image classification", "Sequence generation", "Image generation", "Machine translation (modern)"],
  "right": ["Transformer", "CNN", "GAN", "LSTM/RNN"],
  "correct_pairs": [[0, 1], [1, 3], [2, 2], [3, 0]],
  "explanation": "CNNs excel at images, LSTMs at sequences, GANs at generation, and Transformers now dominate translation (and most NLP)."
}
```

**Q11: Year to Breakthrough**
```json
{
  "question": "Match each year to its major neural network breakthrough:",
  "left": ["1986", "2012", "2014", "2017"],
  "right": ["Transformer paper", "AlexNet wins ImageNet", "Backpropagation revival", "GANs introduced"],
  "correct_pairs": [[0, 2], [1, 1], [2, 3], [3, 0]],
  "explanation": "Backprop (1986) → AlexNet (2012) → GANs (2014) → Transformer (2017)."
}
```

**Q12: Limitation to Solution**
```json
{
  "question": "Match each training problem to its solution:",
  "left": ["Vanishing gradients", "Overfitting", "Internal covariate shift", "Long-range dependencies"],
  "right": ["Attention mechanism", "Skip connections", "Dropout", "Batch normalization"],
  "correct_pairs": [[0, 1], [1, 2], [2, 3], [3, 0]],
  "explanation": "ResNet's skip connections fix vanishing gradients, dropout prevents overfitting, batch norm addresses covariate shift, attention handles long-range dependencies."
}
```

### Fill-in-the-Blank (4 questions)

**Q13: Hebb's Rule**
```json
{
  "question": "Hebb's learning rule is summarized as: 'Neurons that _____ together, wire together.'",
  "answer": "fire",
  "alternatives": [],
  "explanation": "This captures synaptic plasticity - simultaneous activation strengthens connections."
}
```

**Q14: Perceptron Limitation**
```json
{
  "question": "Minsky and Papert proved that a single-layer perceptron cannot learn the _____ function.",
  "answer": "XOR",
  "alternatives": ["xor", "exclusive or", "exclusive-or"],
  "explanation": "XOR is not linearly separable, which single-layer perceptrons require. Multi-layer networks can learn XOR easily."
}
```

**Q15: ImageNet Moment**
```json
{
  "question": "AlexNet reduced the ImageNet top-5 error rate from 26% to _____%, shocking the computer vision community.",
  "answer": "15",
  "alternatives": ["15.3", "16", "fifteen"],
  "explanation": "This dramatic 10+ percentage point improvement proved deep learning's superiority and launched the modern AI era."
}
```

**Q16: Attention Paper**
```json
{
  "question": "The landmark 2017 paper introducing the Transformer was titled 'Attention Is All You _____.'",
  "answer": "Need",
  "alternatives": ["need"],
  "explanation": "This paper showed that attention mechanisms alone, without recurrence, could achieve state-of-the-art translation, leading to GPT, BERT, and all modern LLMs."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "neurons-networks"
- [ ] Insert 14 LearningPathStep records
- [ ] Insert 16 LearningPathQuiz records
- [ ] Verify chronological ordering

### Content Validation
- [ ] Verify all 14 milestones exist
- [ ] Create missing milestones if needed:
  - [ ] `E1986_BACKPROP`
  - [ ] `E1997_LSTM`
  - [ ] `E2015_BATCHNORM`
- [ ] Verify key figure profiles exist
- [ ] Add missing key figures (Rosenblatt, Hochreiter, Goodfellow)

### Quiz Testing
- [ ] Test all quiz types
- [ ] Verify drag-drop for timeline ordering
- [ ] Verify matching pair logic

---

## Browser Validation (REQUIRED)

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/neurons-networks`
- [ ] Screenshot path overview showing all 14 milestones
- [ ] Verify "50 min" duration displayed

### Step Navigation
- [ ] Navigate through all 14 steps
- [ ] Verify milestone content loads
- [ ] Test progress indicator updates
- [ ] Screenshot key milestone pages

### Quiz Interactions
- [ ] Complete all 16 quizzes
- [ ] Verify correct/incorrect feedback
- [ ] Test timeline drag-drop UX
- [ ] Screenshot final completion state

### Performance Check
- [ ] Check page load times
- [ ] Verify no API errors: `mcp__claude-in-chrome__read_network_requests`
- [ ] Check console for JS errors: `mcp__claude-in-chrome__read_console_messages`

---

## Notes for Future Developers

1. **The AI Winter Story**: This path tells the crucial story of how the field nearly died (Perceptrons book) and was revived (backprop, deep belief nets). Emphasize the human drama.

2. **Missing Milestones**: Several key milestones may need creation - especially the training innovations (Dropout, BatchNorm, Adam optimizer).

3. **Key Figures Gap**: Frank Rosenblatt doesn't have a profile yet - he's essential for this path. Also need Sepp Hochreiter (LSTM) and Ian Goodfellow (GANs).

4. **Visual Opportunity**: Architecture diagrams would greatly enhance this path - perceptron, MLP, CNN, ResNet skip connections, Transformer attention.

5. **Length Warning**: At 14 milestones and 16 quizzes, this is the longest path. Consider if users might want to save progress mid-path.
