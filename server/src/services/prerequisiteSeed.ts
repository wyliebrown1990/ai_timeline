/**
 * Service to seed prerequisite data via admin API
 */

import { prisma } from '../db';

/**
 * Prerequisite mappings by term name
 * Format: { 'term_name': ['prerequisite_1', 'prerequisite_2', ...] }
 */
const PREREQUISITE_MAPPINGS: Record<string, string[]> = {
  // Advanced concepts that need foundational knowledge
  'Transformer': ['Neural Network', 'Attention Mechanism', 'Embedding'],
  'GPT': ['Transformer', 'Language Model', 'Deep Learning'],
  'BERT': ['Transformer', 'Language Model', 'Pre-training'],
  'Fine-tuning': ['Pre-training', 'Transfer Learning', 'Neural Network'],
  'RLHF': ['Reinforcement Learning', 'Fine-tuning', 'Reward Model'],
  'Constitutional AI': ['RLHF', 'AI Safety', 'Large Language Model'],
  'RAG': ['Large Language Model', 'Embedding', 'Vector Database'],
  'Chain of Thought': ['Large Language Model', 'Prompt Engineering'],
  'Mixture of Experts': ['Neural Network', 'Deep Learning', 'Scaling Law'],
  'Attention Mechanism': ['Neural Network', 'Deep Learning'],
  'Embedding': ['Neural Network', 'Vector', 'Machine Learning'],
  'Vector Database': ['Embedding', 'Database'],
  'Prompt Engineering': ['Large Language Model', 'Natural Language Processing'],
  'AI Agent': ['Large Language Model', 'Tool Use', 'Planning'],
  'Multi-modal': ['Neural Network', 'Computer Vision', 'Natural Language Processing'],
  'Diffusion Model': ['Neural Network', 'Generative AI', 'Deep Learning'],
  'LoRA': ['Fine-tuning', 'Large Language Model', 'Parameter Efficient'],
  'Quantization': ['Neural Network', 'Model Compression', 'Inference'],
  'Context Window': ['Transformer', 'Attention Mechanism', 'Token'],
  'Hallucination': ['Large Language Model', 'Neural Network'],
  'Reasoning': ['Large Language Model', 'Chain of Thought'],
};

/**
 * Difficulty level mappings (1-5 scale)
 * 1 = Beginner, 2 = Intermediate, 3 = Advanced, 4 = Expert, 5 = Specialist
 */
const DIFFICULTY_MAPPINGS: Record<string, number> = {
  // Beginner (1) - Foundational concepts
  'Artificial Intelligence': 1,
  'Machine Learning': 1,
  'Neural Network': 1,
  'Deep Learning': 1,
  'Training Data': 1,
  'Model': 1,
  'Algorithm': 1,
  'Dataset': 1,
  'Token': 1,
  'Inference': 1,
  'AI': 1,
  'Parameter': 1,
  'Training': 1,

  // Intermediate (2)
  'Transformer': 2,
  'Attention Mechanism': 2,
  'Embedding': 2,
  'Pre-training': 2,
  'Fine-tuning': 2,
  'Transfer Learning': 2,
  'Language Model': 2,
  'Natural Language Processing': 2,
  'Computer Vision': 2,
  'Generative AI': 2,
  'Prompt Engineering': 2,
  'Large Language Model': 2,
  'Hallucination': 2,
  'Context Window': 2,
  'Benchmark': 2,
  'Supervised Learning': 2,
  'Unsupervised Learning': 2,

  // Advanced (3)
  'GPT': 3,
  'BERT': 3,
  'RAG': 3,
  'Vector Database': 3,
  'Chain of Thought': 3,
  'AI Agent': 3,
  'Multi-modal': 3,
  'Diffusion Model': 3,
  'Reinforcement Learning': 3,
  'AI Safety': 3,
  'Reasoning': 3,
  'Foundation Model': 3,
  'Emergent Behavior': 3,
  'AGI': 3,

  // Expert (4)
  'RLHF': 4,
  'Constitutional AI': 4,
  'Mixture of Experts': 4,
  'LoRA': 4,
  'Quantization': 4,
  'Scaling Law': 4,
  'Sparse Attention': 4,

  // Specialist (5)
  'Mechanistic Interpretability': 5,
  'Sparse Autoencoder': 5,
};

/**
 * Concept type mappings
 */
const CONCEPT_TYPE_MAPPINGS: Record<string, string> = {
  // Foundational
  'Artificial Intelligence': 'foundational',
  'Machine Learning': 'foundational',
  'Neural Network': 'foundational',
  'Deep Learning': 'foundational',
  'Training Data': 'foundational',
  'Model': 'foundational',
  'Algorithm': 'foundational',
  'Dataset': 'foundational',
  'Token': 'foundational',
  'AI': 'foundational',
  'Parameter': 'foundational',
  'Training': 'foundational',

  // Intermediate
  'Transformer': 'intermediate',
  'Attention Mechanism': 'intermediate',
  'Embedding': 'intermediate',
  'Pre-training': 'intermediate',
  'Fine-tuning': 'intermediate',
  'Language Model': 'intermediate',
  'Natural Language Processing': 'intermediate',
  'Prompt Engineering': 'intermediate',
  'Large Language Model': 'intermediate',
  'Generative AI': 'intermediate',
  'Computer Vision': 'intermediate',
  'Hallucination': 'intermediate',
  'Context Window': 'intermediate',

  // Advanced
  'GPT': 'advanced',
  'BERT': 'advanced',
  'RAG': 'advanced',
  'RLHF': 'advanced',
  'Constitutional AI': 'advanced',
  'Mixture of Experts': 'advanced',
  'LoRA': 'advanced',
  'Quantization': 'advanced',
  'AI Agent': 'advanced',
  'Diffusion Model': 'advanced',
  'AGI': 'advanced',
  'Foundation Model': 'advanced',
};

interface SeedResult {
  prerequisitesUpdated: number;
  difficultiesUpdated: number;
  skipped: number;
  errors: string[];
}

/**
 * Seed prerequisite relationships and difficulty levels
 */
export async function seedPrerequisites(): Promise<SeedResult> {
  if (!prisma) throw new Error('Database not available');

  const result: SeedResult = {
    prerequisitesUpdated: 0,
    difficultiesUpdated: 0,
    skipped: 0,
    errors: [],
  };

  // Get all glossary terms
  const terms = await prisma.glossaryTerm.findMany({
    select: { id: true, term: true },
  });

  // Create lookup map: term name (lowercase) -> term ID
  const termIdMap = new Map<string, string>();
  for (const term of terms) {
    termIdMap.set(term.term.toLowerCase(), term.id);
  }

  // Update prerequisites
  for (const [termName, prerequisites] of Object.entries(PREREQUISITE_MAPPINGS)) {
    const termId = termIdMap.get(termName.toLowerCase());
    if (!termId) {
      result.errors.push(`Term not found: "${termName}"`);
      result.skipped++;
      continue;
    }

    // Resolve prerequisite IDs
    const prerequisiteIds: string[] = [];
    for (const prereqName of prerequisites) {
      const prereqId = termIdMap.get(prereqName.toLowerCase());
      if (prereqId) {
        prerequisiteIds.push(prereqId);
      } else {
        result.errors.push(`Prerequisite not found: "${prereqName}" for term "${termName}"`);
      }
    }

    if (prerequisiteIds.length > 0) {
      await prisma.glossaryTerm.update({
        where: { id: termId },
        data: { prerequisiteIds: JSON.stringify(prerequisiteIds) },
      });
      result.prerequisitesUpdated++;
    }
  }

  // Update difficulty levels and concept types
  for (const [termName, difficulty] of Object.entries(DIFFICULTY_MAPPINGS)) {
    const termId = termIdMap.get(termName.toLowerCase());
    if (!termId) {
      continue; // Skip silently for difficulty - not all terms need explicit difficulty
    }

    const conceptType = CONCEPT_TYPE_MAPPINGS[termName] ||
      (difficulty <= 1 ? 'foundational' : difficulty <= 2 ? 'intermediate' : 'advanced');

    await prisma.glossaryTerm.update({
      where: { id: termId },
      data: {
        difficulty,
        conceptType,
      },
    });
    result.difficultiesUpdated++;
  }

  return result;
}
