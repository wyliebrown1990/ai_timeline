#!/usr/bin/env tsx
/**
 * Content Validation Script
 *
 * Validates all static JSON content against Zod schemas and checks
 * referential integrity (e.g., milestone IDs referenced in learning paths
 * must exist).
 *
 * Usage:
 *   npx tsx scripts/validate-content.ts
 *   npm run content:validate
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - One or more validations failed
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { z } from 'zod';

// Import schemas from types
import {
  LearningPathArraySchema,
  GlossaryEntryArraySchema,
  CheckpointArraySchema,
  FlashcardArraySchema,
  CurrentEventArraySchema,
  type LearningPath,
  type GlossaryEntry,
  type Checkpoint,
  type Flashcard,
  type CurrentEvent,
} from '../src/types';

// =============================================================================
// Configuration
// =============================================================================

const CONTENT_DIR = path.resolve(__dirname, '../src/content');
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// =============================================================================
// Utilities
// =============================================================================

function log(message: string, color: keyof typeof COLORS = 'reset'): void {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSuccess(message: string): void {
  log(`✓ ${message}`, 'green');
}

function logError(message: string): void {
  log(`✗ ${message}`, 'red');
}

function logWarning(message: string): void {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message: string): void {
  log(`ℹ ${message}`, 'cyan');
}

function readJsonFile(filePath: string): unknown {
  const fullPath = path.resolve(CONTENT_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

function readJsonDir(dirPath: string): unknown[] {
  const fullPath = path.resolve(CONTENT_DIR, dirPath);
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  const files = fs.readdirSync(fullPath).filter((f) => f.endsWith('.json'));
  return files.map((file) => {
    const content = fs.readFileSync(path.join(fullPath, file), 'utf-8');
    return JSON.parse(content);
  });
}

// =============================================================================
// Validation Results
// =============================================================================

interface ValidationResult {
  name: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

const results: ValidationResult[] = [];

function addResult(
  name: string,
  passed: boolean,
  errors: string[] = [],
  warnings: string[] = []
): void {
  results.push({ name, passed, errors, warnings });
}

// =============================================================================
// Schema Validation
// =============================================================================

function validateLearningPaths(): LearningPath[] {
  logInfo('Validating learning paths...');
  const paths = readJsonDir('learning-paths');

  if (paths.length === 0) {
    addResult('Learning Paths', true, [], ['No learning path files found']);
    return [];
  }

  try {
    const validated = LearningPathArraySchema.parse(paths);
    addResult('Learning Paths', true);
    logSuccess(`Validated ${validated.length} learning paths`);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      addResult('Learning Paths', false, errors);
      errors.forEach((e) => logError(e));
    }
    return [];
  }
}

function validateGlossary(): GlossaryEntry[] {
  logInfo('Validating glossary terms...');
  const terms = readJsonFile('glossary/terms.json');

  if (!terms) {
    addResult('Glossary', true, [], ['No glossary file found']);
    return [];
  }

  try {
    const validated = GlossaryEntryArraySchema.parse(terms);
    addResult('Glossary', true);
    logSuccess(`Validated ${validated.length} glossary terms`);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      addResult('Glossary', false, errors);
      errors.forEach((e) => logError(e));
    }
    return [];
  }
}

function validateCheckpoints(): Checkpoint[] {
  logInfo('Validating checkpoints...');
  const checkpoints = readJsonFile('checkpoints/questions.json');

  if (!checkpoints) {
    addResult('Checkpoints', true, [], ['No checkpoints file found']);
    return [];
  }

  try {
    const validated = CheckpointArraySchema.parse(checkpoints);
    addResult('Checkpoints', true);
    logSuccess(`Validated ${validated.length} checkpoints`);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      addResult('Checkpoints', false, errors);
      errors.forEach((e) => logError(e));
    }
    return [];
  }
}

function validateFlashcards(): Flashcard[] {
  logInfo('Validating flashcards...');
  const flashcards = readJsonFile('checkpoints/flashcards.json');

  if (!flashcards) {
    addResult('Flashcards', true, [], ['No flashcards file found']);
    return [];
  }

  try {
    const validated = FlashcardArraySchema.parse(flashcards);
    addResult('Flashcards', true);
    logSuccess(`Validated ${validated.length} flashcards`);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      addResult('Flashcards', false, errors);
      errors.forEach((e) => logError(e));
    }
    return [];
  }
}

function validateCurrentEvents(): CurrentEvent[] {
  logInfo('Validating current events...');
  const events = readJsonFile('current-events/events.json');

  if (!events) {
    addResult('Current Events', true, [], ['No current events file found']);
    return [];
  }

  try {
    const validated = CurrentEventArraySchema.parse(events);
    addResult('Current Events', true);
    logSuccess(`Validated ${validated.length} current events`);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      addResult('Current Events', false, errors);
      errors.forEach((e) => logError(e));
    }
    return [];
  }
}

// =============================================================================
// Referential Integrity Checks
// =============================================================================

interface ContentData {
  learningPaths: LearningPath[];
  glossaryTerms: GlossaryEntry[];
  checkpoints: Checkpoint[];
  flashcards: Flashcard[];
  currentEvents: CurrentEvent[];
}

function checkReferentialIntegrity(data: ContentData): void {
  logInfo('Checking referential integrity...');
  const errors: string[] = [];
  const warnings: string[] = [];

  // Collect all known IDs
  const glossaryIds = new Set(data.glossaryTerms.map((t) => t.id));
  const learningPathIds = new Set(data.learningPaths.map((p) => p.id));

  // Note: We can't check milestone IDs without querying the database
  // This would require additional setup to validate milestone references

  // Check glossary relatedTermIds
  for (const term of data.glossaryTerms) {
    for (const relatedId of term.relatedTermIds) {
      if (!glossaryIds.has(relatedId)) {
        warnings.push(
          `Glossary term "${term.term}" references unknown term ID: ${relatedId}`
        );
      }
    }
  }

  // Check learning path suggestedNextPathIds
  for (const path of data.learningPaths) {
    for (const nextId of path.suggestedNextPathIds) {
      if (!learningPathIds.has(nextId)) {
        warnings.push(
          `Learning path "${path.title}" references unknown path ID: ${nextId}`
        );
      }
    }
  }

  // Check checkpoint pathIds
  for (const checkpoint of data.checkpoints) {
    if (!learningPathIds.has(checkpoint.pathId)) {
      warnings.push(
        `Checkpoint "${checkpoint.title}" references unknown path ID: ${checkpoint.pathId}`
      );
    }
  }

  if (errors.length > 0 || warnings.length > 0) {
    addResult('Referential Integrity', errors.length === 0, errors, warnings);
    errors.forEach((e) => logError(e));
    warnings.forEach((w) => logWarning(w));
  } else {
    addResult('Referential Integrity', true);
    logSuccess('All referential integrity checks passed');
  }
}

// =============================================================================
// Duplicate ID Checks
// =============================================================================

function checkDuplicateIds(data: ContentData): void {
  logInfo('Checking for duplicate IDs...');
  const errors: string[] = [];

  // Check glossary terms
  const glossaryIds = data.glossaryTerms.map((t) => t.id);
  const duplicateGlossary = glossaryIds.filter(
    (id, index) => glossaryIds.indexOf(id) !== index
  );
  if (duplicateGlossary.length > 0) {
    errors.push(`Duplicate glossary IDs: ${duplicateGlossary.join(', ')}`);
  }

  // Check learning paths
  const pathIds = data.learningPaths.map((p) => p.id);
  const duplicatePaths = pathIds.filter(
    (id, index) => pathIds.indexOf(id) !== index
  );
  if (duplicatePaths.length > 0) {
    errors.push(`Duplicate learning path IDs: ${duplicatePaths.join(', ')}`);
  }

  // Check checkpoints
  const checkpointIds = data.checkpoints.map((c) => c.id);
  const duplicateCheckpoints = checkpointIds.filter(
    (id, index) => checkpointIds.indexOf(id) !== index
  );
  if (duplicateCheckpoints.length > 0) {
    errors.push(`Duplicate checkpoint IDs: ${duplicateCheckpoints.join(', ')}`);
  }

  // Check flashcards
  const flashcardIds = data.flashcards.map((f) => f.id);
  const duplicateFlashcards = flashcardIds.filter(
    (id, index) => flashcardIds.indexOf(id) !== index
  );
  if (duplicateFlashcards.length > 0) {
    errors.push(`Duplicate flashcard IDs: ${duplicateFlashcards.join(', ')}`);
  }

  // Check current events
  const eventIds = data.currentEvents.map((e) => e.id);
  const duplicateEvents = eventIds.filter(
    (id, index) => eventIds.indexOf(id) !== index
  );
  if (duplicateEvents.length > 0) {
    errors.push(`Duplicate current event IDs: ${duplicateEvents.join(', ')}`);
  }

  if (errors.length > 0) {
    addResult('Duplicate ID Check', false, errors);
    errors.forEach((e) => logError(e));
  } else {
    addResult('Duplicate ID Check', true);
    logSuccess('No duplicate IDs found');
  }
}

// =============================================================================
// Main Execution
// =============================================================================

function main(): void {
  console.log('\n' + '='.repeat(60));
  log('Content Validation', 'blue');
  console.log('='.repeat(60) + '\n');

  // Run schema validations
  const learningPaths = validateLearningPaths();
  const glossaryTerms = validateGlossary();
  const checkpoints = validateCheckpoints();
  const flashcards = validateFlashcards();
  const currentEvents = validateCurrentEvents();

  console.log('');

  // Run integrity checks
  const data: ContentData = {
    learningPaths,
    glossaryTerms,
    checkpoints,
    flashcards,
    currentEvents,
  };

  checkDuplicateIds(data);
  checkReferentialIntegrity(data);

  // Print summary
  console.log('\n' + '='.repeat(60));
  log('Summary', 'blue');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const warnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  for (const result of results) {
    if (result.passed) {
      logSuccess(result.name);
    } else {
      logError(`${result.name} (${result.errors.length} errors)`);
    }
  }

  console.log('');
  log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`,
    failed > 0 ? 'red' : 'green');
  console.log('');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main();
