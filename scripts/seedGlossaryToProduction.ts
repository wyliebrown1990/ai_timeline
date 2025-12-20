/**
 * Seed Glossary Terms to Production
 *
 * This script reads the static glossary JSON and uploads it to the production
 * database via the admin API.
 *
 * Usage: npx tsx scripts/seedGlossaryToProduction.ts
 */

import { execSync } from 'child_process';
import glossaryTerms from '../src/content/glossary/terms.json';

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api';

interface GlossaryTerm {
  id?: string;
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  businessContext?: string;
  example?: string;
  inMeetingExample?: string;
  category: string;
  relatedTermIds?: string[];
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

async function seedGlossary(token: string): Promise<void> {
  // Transform terms to match the expected schema (remove id field)
  const terms = (glossaryTerms as GlossaryTerm[]).map((term) => ({
    term: term.term,
    shortDefinition: term.shortDefinition,
    fullDefinition: term.fullDefinition,
    businessContext: term.businessContext,
    example: term.example,
    inMeetingExample: term.inMeetingExample,
    category: term.category,
    relatedTermIds: term.relatedTermIds || [],
    relatedMilestoneIds: term.relatedMilestoneIds || [],
  }));

  console.log(`Preparing to seed ${terms.length} glossary terms...`);

  // Seed in batches of 20 to avoid large payload issues
  const batchSize = 20;
  let totalCreated = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < terms.length; i += batchSize) {
    const batch = terms.slice(i, i + batchSize);
    console.log(
      `Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(terms.length / batchSize)} (${batch.length} terms)...`
    );

    try {
      const response = await fetch(`${API_BASE}/admin/glossary/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ terms: batch }),
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

  await seedGlossary(token);

  // Verify the result
  console.log('\nVerifying glossary count...');
  const response = await fetch(`${API_BASE}/admin/glossary/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const stats = await response.json();
  console.log('Glossary Stats:', stats);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
