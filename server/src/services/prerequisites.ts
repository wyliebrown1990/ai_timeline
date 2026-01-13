import { prisma } from '../db';
import type { GlossaryTerm, Milestone } from '@prisma/client';

/**
 * Concept type for adaptive sequencing
 */
export type ConceptType = 'foundational' | 'intermediate' | 'advanced';

/**
 * Prerequisite chain item
 */
export interface PrerequisiteNode {
  id: string;
  term: string;
  shortDefinition: string;
  difficulty: number;
  conceptType: string;
  depth: number; // 0 = direct prerequisite, 1 = prerequisite of prerequisite, etc.
}

/**
 * Learning path item with dependency info
 */
export interface LearningSequenceItem {
  id: string;
  term: string;
  shortDefinition: string;
  difficulty: number;
  conceptType: string;
  order: number;
  isPrerequisite: boolean; // true if this is a prerequisite for the target
}

/**
 * Get direct prerequisites for a glossary term
 */
export async function getPrerequisites(termId: string): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  const term = await prisma.glossaryTerm.findUnique({
    where: { id: termId },
    select: { prerequisiteIds: true },
  });

  if (!term) return [];

  const prerequisiteIds: string[] = JSON.parse(term.prerequisiteIds || '[]');
  if (prerequisiteIds.length === 0) return [];

  return prisma.glossaryTerm.findMany({
    where: { id: { in: prerequisiteIds } },
    orderBy: { difficulty: 'asc' },
  });
}

/**
 * Get all terms that depend on a given term (reverse lookup)
 */
export async function getDependents(termId: string): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  // Find all terms that have this termId in their prerequisiteIds
  const allTerms = await prisma.glossaryTerm.findMany({
    select: { id: true, term: true, shortDefinition: true, difficulty: true, conceptType: true, prerequisiteIds: true },
  });

  return allTerms.filter((t) => {
    const prereqs: string[] = JSON.parse(t.prerequisiteIds || '[]');
    return prereqs.includes(termId);
  }) as GlossaryTerm[];
}

/**
 * Get the full prerequisite chain (recursive) for a term
 * Returns prerequisites sorted by depth (deepest first, so learner starts there)
 */
export async function getPrerequisiteChain(
  termId: string,
  maxDepth = 5
): Promise<PrerequisiteNode[]> {
  if (!prisma) throw new Error('Database not available');

  const visited = new Set<string>();
  const chain: PrerequisiteNode[] = [];

  async function traverse(currentId: string, depth: number): Promise<void> {
    if (depth > maxDepth || visited.has(currentId)) return;
    visited.add(currentId);

    const term = await prisma.glossaryTerm.findUnique({
      where: { id: currentId },
    });

    if (!term) return;

    const prerequisiteIds: string[] = JSON.parse(term.prerequisiteIds || '[]');

    // First traverse deeper prerequisites
    for (const prereqId of prerequisiteIds) {
      await traverse(prereqId, depth + 1);
    }

    // Then add this term (if it's not the original target)
    if (depth > 0) {
      chain.push({
        id: term.id,
        term: term.term,
        shortDefinition: term.shortDefinition,
        difficulty: term.difficulty,
        conceptType: term.conceptType,
        depth: depth,
      });
    }
  }

  await traverse(termId, 0);

  // Sort by depth (deepest first) then difficulty
  return chain.sort((a, b) => {
    if (b.depth !== a.depth) return b.depth - a.depth;
    return a.difficulty - b.difficulty;
  });
}

/**
 * Build an optimal learning sequence for a target term
 * Includes all prerequisites in topological order
 */
export async function buildLearningSequence(termId: string): Promise<LearningSequenceItem[]> {
  if (!prisma) throw new Error('Database not available');

  const chain = await getPrerequisiteChain(termId);
  const target = await prisma.glossaryTerm.findUnique({ where: { id: termId } });

  if (!target) return [];

  // Prerequisites come first, sorted by depth and difficulty
  const sequence: LearningSequenceItem[] = chain.map((node, index) => ({
    id: node.id,
    term: node.term,
    shortDefinition: node.shortDefinition,
    difficulty: node.difficulty,
    conceptType: node.conceptType,
    order: index,
    isPrerequisite: true,
  }));

  // Target term comes last
  sequence.push({
    id: target.id,
    term: target.term,
    shortDefinition: target.shortDefinition,
    difficulty: target.difficulty,
    conceptType: target.conceptType,
    order: sequence.length,
    isPrerequisite: false,
  });

  return sequence;
}

/**
 * Get prerequisite concepts for a milestone
 */
export async function getMilestonePrerequisites(milestoneId: string): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { prerequisiteConceptIds: true },
  });

  if (!milestone) return [];

  const conceptIds: string[] = JSON.parse(milestone.prerequisiteConceptIds || '[]');
  if (conceptIds.length === 0) return [];

  return prisma.glossaryTerm.findMany({
    where: { id: { in: conceptIds } },
    orderBy: { difficulty: 'asc' },
  });
}

/**
 * Get all prerequisites needed to understand a milestone (including nested)
 */
export async function getFullMilestonePrerequisites(milestoneId: string): Promise<PrerequisiteNode[]> {
  if (!prisma) throw new Error('Database not available');

  const directPrereqs = await getMilestonePrerequisites(milestoneId);
  const allNodes: PrerequisiteNode[] = [];
  const visited = new Set<string>();

  for (const prereq of directPrereqs) {
    if (!visited.has(prereq.id)) {
      visited.add(prereq.id);

      // Get chain for each direct prerequisite
      const chain = await getPrerequisiteChain(prereq.id);

      // Add chain items
      for (const node of chain) {
        if (!visited.has(node.id)) {
          visited.add(node.id);
          allNodes.push(node);
        }
      }

      // Add the direct prerequisite itself
      allNodes.push({
        id: prereq.id,
        term: prereq.term,
        shortDefinition: prereq.shortDefinition,
        difficulty: prereq.difficulty,
        conceptType: prereq.conceptType,
        depth: 0,
      });
    }
  }

  // Sort by difficulty for optimal learning order
  return allNodes.sort((a, b) => a.difficulty - b.difficulty);
}

/**
 * Find missing prerequisites given a list of known/learned concepts
 */
export async function findMissingPrerequisites(
  targetTermId: string,
  knownTermIds: string[]
): Promise<PrerequisiteNode[]> {
  const chain = await getPrerequisiteChain(targetTermId);
  const knownSet = new Set(knownTermIds);

  return chain.filter((node) => !knownSet.has(node.id));
}

/**
 * Check if a user is ready to learn a concept (has all prerequisites)
 */
export async function isReadyToLearn(
  termId: string,
  knownTermIds: string[]
): Promise<{ ready: boolean; missing: PrerequisiteNode[] }> {
  const missing = await findMissingPrerequisites(termId, knownTermIds);
  return {
    ready: missing.length === 0,
    missing,
  };
}

/**
 * Get suggested next concepts to learn based on current knowledge
 */
export async function getSuggestedNextConcepts(
  knownTermIds: string[],
  limit = 5
): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  const knownSet = new Set(knownTermIds);

  // Get all terms
  const allTerms = await prisma.glossaryTerm.findMany({
    orderBy: { difficulty: 'asc' },
  });

  const suggestions: GlossaryTerm[] = [];

  for (const term of allTerms) {
    // Skip already known terms
    if (knownSet.has(term.id)) continue;

    // Check if all prerequisites are known
    const prereqIds: string[] = JSON.parse(term.prerequisiteIds || '[]');
    const allPrereqsKnown = prereqIds.every((id) => knownSet.has(id));

    if (allPrereqsKnown) {
      suggestions.push(term);
      if (suggestions.length >= limit) break;
    }
  }

  return suggestions;
}

/**
 * Update prerequisites for a glossary term
 */
export async function updatePrerequisites(
  termId: string,
  prerequisiteIds: string[]
): Promise<GlossaryTerm | null> {
  if (!prisma) throw new Error('Database not available');

  // Validate that all prerequisite IDs exist
  const existingTerms = await prisma.glossaryTerm.findMany({
    where: { id: { in: prerequisiteIds } },
    select: { id: true },
  });

  const validIds = existingTerms.map((t) => t.id);

  // Check for circular dependencies
  for (const prereqId of validIds) {
    const chain = await getPrerequisiteChain(prereqId);
    if (chain.some((node) => node.id === termId)) {
      throw new Error(`Circular dependency detected: ${prereqId} depends on ${termId}`);
    }
  }

  return prisma.glossaryTerm.update({
    where: { id: termId },
    data: { prerequisiteIds: JSON.stringify(validIds) },
  });
}

/**
 * Update difficulty and concept type for a term
 */
export async function updateDifficulty(
  termId: string,
  difficulty: number,
  conceptType: ConceptType
): Promise<GlossaryTerm | null> {
  if (!prisma) throw new Error('Database not available');

  if (difficulty < 1 || difficulty > 5) {
    throw new Error('Difficulty must be between 1 and 5');
  }

  return prisma.glossaryTerm.update({
    where: { id: termId },
    data: { difficulty, conceptType },
  });
}

/**
 * Update prerequisite concepts for a milestone
 */
export async function updateMilestonePrerequisites(
  milestoneId: string,
  conceptIds: string[]
): Promise<Milestone | null> {
  if (!prisma) throw new Error('Database not available');

  // Validate that all concept IDs exist
  const existingTerms = await prisma.glossaryTerm.findMany({
    where: { id: { in: conceptIds } },
    select: { id: true },
  });

  const validIds = existingTerms.map((t) => t.id);

  return prisma.milestone.update({
    where: { id: milestoneId },
    data: { prerequisiteConceptIds: JSON.stringify(validIds) },
  });
}

/**
 * Get terms by difficulty level
 */
export async function getByDifficulty(difficulty: number): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.glossaryTerm.findMany({
    where: { difficulty },
    orderBy: { term: 'asc' },
  });
}

/**
 * Get terms by concept type
 */
export async function getByConceptType(conceptType: ConceptType): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.glossaryTerm.findMany({
    where: { conceptType },
    orderBy: { difficulty: 'asc' },
  });
}

/**
 * Get foundational terms (no prerequisites, good starting points)
 */
export async function getFoundationalTerms(limit = 20): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  const allTerms = await prisma.glossaryTerm.findMany({
    where: { conceptType: 'foundational' },
    orderBy: { difficulty: 'asc' },
  });

  // Filter to only terms with no prerequisites
  return allTerms
    .filter((t) => {
      const prereqs: string[] = JSON.parse(t.prerequisiteIds || '[]');
      return prereqs.length === 0;
    })
    .slice(0, limit);
}
