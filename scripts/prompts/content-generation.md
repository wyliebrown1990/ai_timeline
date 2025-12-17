# AI Fluency Platform Content Generation Prompts

This document contains prompts and guidelines for generating educational content
for the AI Fluency Platform. Content should be accessible to business professionals
while maintaining technical accuracy.

---

## Learning Path Generation Prompt

Create a learning path that guides users through a coherent narrative of AI history.
Each path should:

- Have a clear target audience (business professionals, technical learners, etc.)
- Include 5-8 milestone IDs from the timeline in logical progression
- Provide 3-5 key takeaways that users will understand after completion
- Estimate time in minutes (typically 20-60 minutes)
- Suggest related paths for continued learning

**JSON Schema:**
```json
{
  "id": "kebab-case-id",
  "title": "Human-Readable Title",
  "description": "2-3 sentences explaining what users will learn",
  "targetAudience": "Who this path is for",
  "milestoneIds": ["E2017_TRANSFORMER", ...],
  "estimatedMinutes": 30,
  "difficulty": "beginner|intermediate|advanced",
  "suggestedNextPathIds": ["other-path-id"],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "conceptsCovered": ["concept-id", "concept-id"],
  "icon": "emoji"
}
```

---

## Glossary Entry Generation Prompt

Create glossary entries that help business professionals understand AI terminology.
Each entry should:

- Provide a short definition (< 200 chars) for quick scanning
- Provide a full definition (100-300 words) for deep understanding
- Include business context explaining why this matters professionally
- Include an "in meeting" example showing how to use the term correctly
- Link to related terms and milestones

**Categories:**
- `core_concept` - Fundamental AI ideas (neural network, machine learning)
- `model_architecture` - Technical architectures (transformer, CNN)
- `technical_term` - Implementation details (attention, backpropagation)
- `business_term` - Business-focused terms (prompt, fine-tuning)
- `research_concept` - Research-specific (benchmark, emergent behavior)

**JSON Schema:**
```json
{
  "id": "kebab-case-id",
  "term": "Display Term",
  "shortDefinition": "Brief definition under 200 characters",
  "fullDefinition": "Comprehensive explanation in 2-4 sentences",
  "businessContext": "Why this matters for business professionals",
  "inMeetingExample": "Example of using this term in a meeting",
  "example": "Real-world example",
  "relatedTermIds": ["other-term-id"],
  "relatedMilestoneIds": ["E2017_TRANSFORMER"],
  "category": "core_concept|model_architecture|technical_term|business_term|research_concept"
}
```

---

## Flashcard Generation Prompt

Create flashcards for quick knowledge reinforcement. Each flashcard should:

- Have a clear, memorable term
- Provide a concise definition (1-2 sentences max)
- Be categorized appropriately
- Link to relevant milestones

**JSON Schema:**
```json
{
  "id": "fc-term-name",
  "term": "Display Term",
  "definition": "1-2 sentence definition",
  "category": "core_concept|model_architecture|technical_term|business_term|research_concept",
  "relatedMilestoneIds": ["E2017_TRANSFORMER"]
}
```

---

## Checkpoint Question Generation Prompt

Create checkpoint questions to test understanding after key milestones.
Question types:

1. **Multiple Choice** - 4 options, one correct
2. **Ordering** - Put items in chronological order
3. **Matching** - Match pairs (e.g., models to dates)
4. **Explain Back** - Open-ended explanation prompts

Each checkpoint should:
- Test understanding, not memorization
- Provide helpful explanations for answers
- Connect to the learning path's key concepts

**JSON Schema:**
```json
{
  "id": "cp-path-number",
  "title": "Checkpoint Title",
  "pathId": "learning-path-id",
  "afterMilestoneId": "E2017_TRANSFORMER",
  "questions": [
    {
      "type": "multiple_choice",
      "id": "q-unique-id",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why A is correct"
    }
  ]
}
```

---

## Current Event Generation Prompt

Create current event entries that connect recent AI news to historical milestones.
Each event should:

- Have a compelling headline
- Summarize the news in 2-3 sentences
- Explain how it connects to milestones in the timeline
- Include expiration date (typically 6-12 months from publication)

**JSON Schema:**
```json
{
  "id": "ce-kebab-case",
  "headline": "News Headline",
  "summary": "2-3 sentence summary",
  "sourceUrl": "https://...",
  "sourcePublisher": "Publisher Name",
  "publishedDate": "2024-01-15",
  "prerequisiteMilestoneIds": ["E2017_TRANSFORMER"],
  "connectionExplanation": "How this connects to historical milestones",
  "featured": true|false,
  "expiresAt": "2025-06-01"
}
```

---

## Milestone IDs Reference

Available milestone IDs for content linking:

**1940s-1960s (Foundations & Birth):**
- E1943_MCCULLOCH_PITTS, E1948_SHANNON_INFORMATION_THEORY, E1950_TURING_TEST
- E1955_DARTMOUTH_PROPOSAL, E1958_PERCEPTRON, E1966_ELIZA, E1969_PERCEPTRONS_BOOK

**1970s-1990s (Symbolic AI & ML):**
- E1972_PROLOG, E1980_EXPERT_SYSTEMS_RISE, E1986_BACKPROP
- E1995_SVM, E1997_LSTM, E1997_DEEP_BLUE, E1998_LENET

**2000s-2010s (Deep Learning Rise):**
- E2006_DEEP_BELIEF_NETS, E2009_IMAGENET, E2012_ALEXNET
- E2013_WORD2VEC, E2014_SEQ2SEQ, E2014_ATTENTION_NMT, E2014_ADAM
- E2014_GANS, E2014_DROPOUT, E2015_BATCHNORM, E2015_RESNET

**2016-2019 (Transformers Era):**
- E2016_ALPHAGO, E2017_PPO, E2017_TRANSFORMER
- E2018_GPT1, E2018_BERT, E2018_OPENAI_CHARTER
- E2019_GPT2, E2019_T5, E2019_ROBERTA, E2019_OECD_AI_PRINCIPLES

**2020-Present (LLM Era):**
- E2020_SCALING_LAWS, E2020_GPT3, E2020_RAG
- E2021_SWITCH_TRANSFORMERS, E2021_CLIP, E2021_DALLE, E2021_CODEX, E2021_ALPHAFOLD2
- E2022_PALM, E2022_CHINCHILLA, E2022_INSTRUCTGPT, E2022_FLAN, E2022_BLOOM
- E2022_LATENT_DIFFUSION, E2022_STABLE_DIFFUSION_RELEASE, E2022_CHATGPT, E2022_CONSTITUTIONAL_AI
- E2023_DPO, E2023_LLAMA, E2023_GPT4, E2023_NIST_AIRMF, E2023_US_EO_14110
- E2024_EU_AI_ACT
