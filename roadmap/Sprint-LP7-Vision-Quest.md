# Sprint LP7: The Vision Quest

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-16 by Beans-bot (Planning)

## Overview

**Theme**: The evolution of computer vision from pattern recognition to image generation
**Duration**: ~45 minutes
**Milestones**: 13 | **Quizzes**: 16

This path traces computer vision from the Neocognitron through AlexNet's deep learning revolution to the generative explosion of DALL-E and Stable Diffusion. Seeing became creating.

---

## Milestones (Chronological Order)

| # | ID | Title | Year | Narrative Hook |
|---|-----|-------|------|----------------|
| 1 | `E1980_neocognitron` | Neocognitron Introduces Hierarchical Vision | 1980 | The ancestor of all CNNs |
| 2 | `E1998_LENET` | LeNet-5 Reads Handwritten Digits | 1998 | CNNs become practical |
| 3 | `E2009_IMAGENET` | ImageNet Database Created | 2009 | The dataset that changed everything |
| 4 | `E2012_ALEXNET` | AlexNet Wins ImageNet | 2012 | Deep learning's breakthrough moment |
| 5 | `E2014_GANS` | GANs Enable Image Generation | 2014 | Networks that create images |
| 6 | `E2015_RESNET` | ResNet Enables Ultra-Deep Networks | 2015 | Skip connections unlock depth |
| 7 | `E2021_CLIP` | CLIP Connects Text and Images | 2021 | Understanding images through language |
| 8 | `E2021_DALLE` | DALL-E Creates Images from Text | 2021 | Imagination as a service |
| 9 | `E2022_LATENT_DIFFUSION` | Latent Diffusion Models Introduced | 2022 | The math behind the magic |
| 10 | `E2022_STABLE_DIFFUSION_RELEASE` | Stable Diffusion Released Open Source | 2022 | AI art for everyone |
| 11 | `E2022_MIDJOURNEY` | Midjourney Launches | 2022 | AI becomes an artistic medium |
| 12 | `E2023_DALLE3` | DALL-E 3 Achieves Photorealism | 2023 | From artifacts to art |
| 13 | `E2025_GPT_IMAGE_1_5` | GPT Image 1.5 Unifies Generation | 2025 | Images integrated into LLMs |

---

## Key Figures

| ID | Name | Role in Path |
|----|------|--------------|
| `yann-lecun` | Yann LeCun | LeNet, CNNs, Turing Award |
| `fei-fei-li` | Fei-Fei Li | ImageNet creator |
| `geoffrey-hinton` | Geoffrey Hinton | AlexNet supervision |
| `ian-goodfellow` | Ian Goodfellow | Invented GANs |
| `robin-rombach` | Robin Rombach | Latent diffusion / Stable Diffusion |
| `david-holz` | David Holz | Midjourney founder |

---

## Glossary Terms

| Term | Context in Path |
|------|-----------------|
| CNN (Convolutional Neural Network) | Core vision architecture |
| Computer Vision | Making machines see |
| Deep Learning | Multi-layer neural networks |
| GAN | Adversarial image generation |
| Diffusion Model | Denoising-based generation |
| Latent Space | Compressed representation |
| DALL-E | OpenAI's text-to-image model |
| Benchmark (AI) | ImageNet as standard |
| Text-to-image | Current generation paradigm |

---

## Quizzes

### Multiple Choice (4 questions)

**Q1: CNN Innovation**
```json
{
  "question": "What is the key advantage of convolutional neural networks for images?",
  "options": [
    "They use more memory",
    "They share weights across spatial locations, detecting features regardless of position",
    "They only work with color images",
    "They don't require training"
  ],
  "correct": 1,
  "explanation": "CNNs use the same filters across the image, meaning a learned feature (like an edge) can be detected anywhere. This massively reduces parameters and captures translation invariance."
}
```

**Q2: ImageNet Importance**
```json
{
  "question": "Why was ImageNet so important for AI progress?",
  "options": [
    "It was the smallest dataset available",
    "It provided millions of labeled images and annual competition that drove research",
    "It only contained medical images",
    "It was created by Google"
  ],
  "correct": 1,
  "explanation": "ImageNet's 14 million labeled images and the annual challenge created a standardized benchmark that drove innovation. AlexNet's 2012 victory on ImageNet launched the deep learning era."
}
```

**Q3: GAN Architecture**
```json
{
  "question": "How do Generative Adversarial Networks (GANs) learn to create images?",
  "options": [
    "By copying existing images exactly",
    "Through two networks competing: a generator creates, a discriminator judges",
    "By random pixel generation",
    "Through manual image editing"
  ],
  "correct": 1,
  "explanation": "GANs pit a generator (creates fakes) against a discriminator (detects fakes). As the discriminator improves, the generator must create more convincing images, driving quality up."
}
```

**Q4: Diffusion vs GAN**
```json
{
  "question": "What advantage do diffusion models have over GANs for image generation?",
  "options": [
    "They're faster",
    "They're more stable to train and produce more diverse outputs",
    "They don't require GPUs",
    "They only work for text"
  ],
  "correct": 1,
  "explanation": "Diffusion models avoid GAN training instabilities (mode collapse) and naturally produce diverse samples. They learn to reverse a gradual noising process, which is more stable than adversarial training."
}
```

### Timeline Ordering (4 questions)

**Q5: Early Vision**
```json
{
  "question": "Order these early computer vision milestones:",
  "items": [
    "ImageNet database created",
    "LeNet-5 demonstrated",
    "AlexNet wins ImageNet",
    "Neocognitron introduced"
  ],
  "correct_order": [3, 1, 0, 2],
  "explanation": "Neocognitron (1980) → LeNet (1998) → ImageNet (2009) → AlexNet (2012). Each built on prior work."
}
```

**Q6: Deep Learning Era**
```json
{
  "question": "Order these deep learning vision breakthroughs:",
  "items": [
    "ResNet enables very deep networks",
    "AlexNet wins ImageNet",
    "VGGNet explores deeper architectures",
    "GANs introduced"
  ],
  "correct_order": [1, 2, 3, 0],
  "explanation": "AlexNet (2012) → VGGNet (2014) → GANs (2014) → ResNet (2015). Architectures got progressively deeper."
}
```

**Q7: Generative Revolution**
```json
{
  "question": "Order these generative AI milestones:",
  "items": [
    "Stable Diffusion released",
    "CLIP connects text and images",
    "DALL-E first version",
    "Latent Diffusion paper"
  ],
  "correct_order": [1, 2, 3, 0],
  "explanation": "CLIP (2021) → DALL-E (2021) → Latent Diffusion (2022) → Stable Diffusion (2022). CLIP enabled text-to-image, diffusion made it practical."
}
```

**Q8: 2022-2025 Explosion**
```json
{
  "question": "Order these recent text-to-image developments:",
  "items": [
    "GPT Image 1.5",
    "Midjourney launch",
    "DALL-E 3",
    "Stable Diffusion XL"
  ],
  "correct_order": [1, 3, 2, 0],
  "explanation": "Midjourney (mid-2022) → SDXL (2023) → DALL-E 3 (2023) → GPT Image 1.5 (2025). Quality improved rapidly."
}
```

### Matching (4 questions)

**Q9: Researcher to Contribution**
```json
{
  "question": "Match each researcher to their key contribution:",
  "left": ["Yann LeCun", "Fei-Fei Li", "Ian Goodfellow", "Robin Rombach"],
  "right": ["Stable Diffusion / Latent Diffusion", "ImageNet dataset", "Generative Adversarial Networks", "LeNet / Convolutional Networks"],
  "correct_pairs": [[0, 3], [1, 1], [2, 2], [3, 0]],
  "explanation": "LeCun developed CNNs (LeNet), Li created ImageNet, Goodfellow invented GANs, Rombach led Stable Diffusion."
}
```

**Q10: Architecture to Task**
```json
{
  "question": "Match each architecture to its primary use:",
  "left": ["CNN", "GAN", "Diffusion Model", "CLIP"],
  "right": ["Text-image alignment", "Image classification", "Adversarial generation", "High-quality generation"],
  "correct_pairs": [[0, 1], [1, 2], [2, 3], [3, 0]],
  "explanation": "CNNs classify, GANs generate adversarially, Diffusion models generate via denoising, CLIP connects modalities."
}
```

**Q11: Year to Model**
```json
{
  "question": "Match each year to its breakthrough model:",
  "left": ["2012", "2014", "2021", "2022"],
  "right": ["Stable Diffusion", "DALL-E", "AlexNet", "GANs"],
  "correct_pairs": [[0, 2], [1, 3], [2, 1], [3, 0]],
  "explanation": "AlexNet (2012) → GANs (2014) → DALL-E (2021) → Stable Diffusion (2022)."
}
```

**Q12: Model to Company**
```json
{
  "question": "Match each model to its creator:",
  "left": ["DALL-E", "Stable Diffusion", "Midjourney", "CLIP"],
  "right": ["Midjourney Inc.", "OpenAI", "Stability AI", "OpenAI"],
  "correct_pairs": [[0, 1], [1, 2], [2, 0], [3, 3]],
  "explanation": "OpenAI made DALL-E and CLIP, Stability AI made Stable Diffusion, Midjourney Inc. made Midjourney."
}
```

### Fill-in-the-Blank (4 questions)

**Q13: AlexNet Error**
```json
{
  "question": "AlexNet reduced ImageNet top-5 error from 26% to about _____%, a dramatic improvement.",
  "answer": "15",
  "alternatives": ["15.3", "16", "fifteen"],
  "explanation": "This 10+ percentage point improvement over traditional methods proved deep learning's superiority and launched the AI revolution."
}
```

**Q14: ImageNet Scale**
```json
{
  "question": "ImageNet contains approximately _____ million labeled images across 1000+ categories.",
  "answer": "14",
  "alternatives": ["14 million", "fourteen", "14M"],
  "explanation": "This massive scale, assembled through crowdsourcing, enabled deep learning to learn rich visual representations."
}
```

**Q15: GAN Components**
```json
{
  "question": "A GAN has two competing networks: the _____ creates fake images, and the discriminator detects them.",
  "answer": "generator",
  "alternatives": [],
  "explanation": "This adversarial setup drives both networks to improve, with the generator eventually producing convincing images."
}
```

**Q16: Diffusion Process**
```json
{
  "question": "Diffusion models work by learning to reverse a gradual _____ process applied to training images.",
  "answer": "noising",
  "alternatives": ["noise", "noise-adding"],
  "explanation": "Images are progressively corrupted with noise, and the model learns to reverse each step. Generation starts from pure noise and denoises to an image."
}
```

---

## Implementation Tasks

### Database & API
- [ ] Create LearningPath record for "vision-quest"
- [ ] Insert 13 LearningPathStep records
- [ ] Insert 16 LearningPathQuiz records

### Content Validation
- [ ] Verify all 13 milestones exist
- [ ] Create missing milestones if needed:
  - [ ] `E2022_LATENT_DIFFUSION`
  - [ ] `E2022_STABLE_DIFFUSION_RELEASE`
- [ ] Add key figure profiles:
  - [ ] Fei-Fei Li
  - [ ] Robin Rombach
  - [ ] David Holz

### Quiz Testing
- [ ] Test all quiz types
- [ ] Verify technical accuracy of GAN/Diffusion explanations
- [ ] Test timeline ordering

---

## Browser Validation (REQUIRED)

### Learning Path Display
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/learn/vision-quest`
- [ ] Screenshot path overview
- [ ] Verify 13 milestones display correctly
- [ ] Check 45 min duration shown

### Step Navigation
- [ ] Navigate all 13 steps
- [ ] Verify image-heavy content loads
- [ ] Test progress tracking

### Quiz Interactions
- [ ] Complete all 16 quizzes
- [ ] Verify technical explanations render correctly
- [ ] Test numeric answers

### Performance
- [ ] Check page load times (image-heavy path)
- [ ] Check console: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network: `mcp__claude-in-chrome__read_network_requests`

---

## Notes for Future Developers

1. **Visual Path**: This path is inherently visual. Consider including example images at each step - from LeNet digit recognition to DALL-E generations.

2. **Technical Balance**: Users range from artists interested in AI art to ML practitioners. Balance accessibility with technical depth.

3. **Key Figures Gap**: Fei-Fei Li is essential (ImageNet creator). Robin Rombach (Stable Diffusion) and David Holz (Midjourney) represent the generative era.

4. **Living History**: AI art is evolving rapidly. This path will need updates as new models release. Consider a versioning strategy.

5. **Copyright Note**: When discussing AI-generated images, be mindful of ongoing legal/ethical debates about training data and artist rights.
