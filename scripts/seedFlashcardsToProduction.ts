/**
 * Seed Flashcards to Production
 *
 * This script reads the static flashcard JSON and uploads it to the production
 * database via the admin API.
 *
 * Usage: npx tsx scripts/seedFlashcardsToProduction.ts
 */

import { execSync } from 'child_process';
import flashcardsData from '../src/content/checkpoints/flashcards.json';

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api';

interface Flashcard {
  id?: string;
  term: string;
  definition: string;
  category: string;
  relatedMilestoneIds?: string[];
}

async function getAdminToken(): Promise<string> {
  // Get password from SSM
  const password = execSync(
    'aws ssm get-parameter --name "/ai-timeline/prod/admin-password" --with-decryption --query "Parameter.Value" --output text',
    { encoding: 'utf-8' }
  ).trim();

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

// Map invalid categories to valid ones
function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    research_concept: 'technical_term', // Map research_concept to technical_term
  };
  return categoryMap[category] || category;
}

async function seedFlashcards(token: string): Promise<void> {
  // Transform flashcards to match the expected schema (remove id field, map categories)
  const flashcards = (flashcardsData as Flashcard[]).map((card) => ({
    term: card.term,
    definition: card.definition,
    category: mapCategory(card.category),
    relatedMilestoneIds: card.relatedMilestoneIds || [],
  }));

  console.log(`Preparing to seed ${flashcards.length} flashcards...`);

  // Seed in batches of 20
  const batchSize = 20;
  let totalCreated = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < flashcards.length; i += batchSize) {
    const batch = flashcards.slice(i, i + batchSize);
    console.log(
      `Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(flashcards.length / batchSize)} (${batch.length} flashcards)...`
    );

    try {
      const response = await fetch(`${API_BASE}/admin/flashcards/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cards: batch }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Batch failed: ${response.status} - ${error}`);
        allErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error}`);
        continue;
      }

      const result = await response.json();
      console.log(`  Created: ${result.created}, Skipped: ${result.skipped}`);
      totalCreated += result.created;
      totalSkipped += result.skipped;

      if (result.errors && result.errors.length > 0) {
        allErrors.push(...result.errors);
      }
    } catch (err) {
      console.error(`Batch failed with exception:`, err);
      allErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${String(err)}`);
    }
  }

  console.log('\n=== Seeding Complete ===');
  console.log(`Total Created: ${totalCreated}`);
  console.log(`Total Skipped: ${totalSkipped}`);

  if (allErrors.length > 0) {
    console.log(`\nErrors (${allErrors.length}):`);
    allErrors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (allErrors.length > 10) {
      console.log(`  ... and ${allErrors.length - 10} more`);
    }
  }
}

async function main() {
  console.log('Getting admin token...');
  const token = await getAdminToken();
  console.log('Token acquired.\n');

  await seedFlashcards(token);

  // Verify the result
  console.log('\nVerifying flashcard count...');
  const response = await fetch(`${API_BASE}/admin/flashcards/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const stats = await response.json();
  console.log('Flashcard Stats:', stats);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
