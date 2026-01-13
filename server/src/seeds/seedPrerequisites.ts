/**
 * Seed script for prerequisite relationships between glossary terms
 *
 * Run with: npx ts-node server/src/seeds/seedPrerequisites.ts
 * Or: npm run seed:prerequisites
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // Expert (4)
  'RLHF': 4,
  'Constitutional AI': 4,
  'Mixture of Experts': 4,
  'LoRA': 4,
  'Quantization': 4,
  'Scaling Law': 4,

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
};

async function seedPrerequisites() {
  console.log('Starting prerequisite seeding...\n');

  // Get all glossary terms
  const terms = await prisma.glossaryTerm.findMany({
    select: { id: true, term: true },
  });

  console.log(`Found ${terms.length} glossary terms\n`);

  // Create lookup map: term name (lowercase) -> term ID
  const termIdMap = new Map<string, string>();
  for (const term of terms) {
    termIdMap.set(term.term.toLowerCase(), term.id);
  }

  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  // Update prerequisites
  for (const [termName, prerequisites] of Object.entries(PREREQUISITE_MAPPINGS)) {
    const termId = termIdMap.get(termName.toLowerCase());
    if (!termId) {
      errors.push(`Term not found: "${termName}"`);
      skippedCount++;
      continue;
    }

    // Resolve prerequisite IDs
    const prerequisiteIds: string[] = [];
    for (const prereqName of prerequisites) {
      const prereqId = termIdMap.get(prereqName.toLowerCase());
      if (prereqId) {
        prerequisiteIds.push(prereqId);
      } else {
        errors.push(`Prerequisite not found: "${prereqName}" for term "${termName}"`);
      }
    }

    if (prerequisiteIds.length > 0) {
      await prisma.glossaryTerm.update({
        where: { id: termId },
        data: { prerequisiteIds: JSON.stringify(prerequisiteIds) },
      });
      console.log(`  Updated prerequisites for "${termName}" (${prerequisiteIds.length} prereqs)`);
      updatedCount++;
    }
  }

  // Update difficulty levels
  console.log('\nUpdating difficulty levels...');
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
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('Seeding complete!');
  console.log(`  Prerequisites updated: ${updatedCount}`);
  console.log(`  Skipped: ${skippedCount}`);

  if (errors.length > 0) {
    console.log(`\nWarnings (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }
}

// Run the seed
seedPrerequisites()
  .catch((e) => {
    console.error('Error seeding prerequisites:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
