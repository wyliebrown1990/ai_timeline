/**
 * Script: Process All Draft Key Figures
 *
 * This script:
 * 1. Fetches all key figures with status 'draft'
 * 2. For each one, generates an AI profile using Claude
 * 3. Updates the key figure with the generated profile
 * 4. Sets status to 'published'
 *
 * Run with: npx tsx server/src/scripts/processAllDraftKeyFigures.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env
config({ path: resolve(__dirname, '../../.env') });

import { prisma } from '../db';
import * as keyFiguresService from '../services/keyFigures';

interface ProcessResult {
  id: string;
  name: string;
  success: boolean;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processAllDraftKeyFigures(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Processing All Draft Key Figures');
  console.log('='.repeat(60));
  console.log('');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set in environment');
    process.exit(1);
  }

  // Fetch all draft key figures
  console.log('Fetching draft key figures...');
  const { keyFigures: drafts, total } = await keyFiguresService.getAll({
    status: 'draft',
    limit: 100, // Get all drafts
  });

  console.log(`Found ${total} draft key figures to process\n`);

  if (drafts.length === 0) {
    console.log('No draft key figures found. Exiting.');
    return;
  }

  const results: ProcessResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i];
    const progress = `[${i + 1}/${drafts.length}]`;

    console.log(`${progress} Processing: ${draft.canonicalName}`);
    console.log(`${'─'.repeat(50)}`);

    try {
      // Generate AI profile
      console.log(`  Generating AI profile...`);
      const profile = await keyFiguresService.generateProfileWithAI(draft.canonicalName);

      console.log(`  Entity type: ${profile.entityType}`);
      console.log(`  Role: ${profile.role}`);
      console.log(`  Primary org: ${profile.primaryOrg || 'N/A'}`);
      console.log(`  Short bio: ${profile.shortBio.slice(0, 60)}...`);

      // Update the key figure with generated profile
      console.log(`  Updating key figure...`);
      const updateData: keyFiguresService.UpdateKeyFigureDto = {
        role: profile.role,
        shortBio: profile.shortBio,
        fullBio: profile.fullBio,
        notableFor: profile.notableFor,
        status: 'published',
      };

      // Only update primaryOrg if we got one and current is empty
      if (profile.primaryOrg && !draft.primaryOrg) {
        updateData.primaryOrg = profile.primaryOrg;
      }

      // Merge previous orgs
      const currentPrevOrgs: string[] = draft.previousOrgs ? JSON.parse(draft.previousOrgs) : [];
      const newPrevOrgs = [...new Set([...currentPrevOrgs, ...profile.previousOrgs])];
      if (newPrevOrgs.length > currentPrevOrgs.length) {
        updateData.previousOrgs = newPrevOrgs;
      }

      // Update URLs if missing and we have new ones
      if (profile.wikipediaUrl && !draft.wikipediaUrl) {
        updateData.wikipediaUrl = profile.wikipediaUrl;
      }
      if (profile.twitterHandle && !draft.twitterHandle) {
        updateData.twitterHandle = profile.twitterHandle;
      }

      await keyFiguresService.update(draft.id, updateData);

      console.log(`  ✓ Published: ${draft.canonicalName}`);
      results.push({ id: draft.id, name: draft.canonicalName, success: true });
      successCount++;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ Error: ${errorMessage}`);
      results.push({ id: draft.id, name: draft.canonicalName, success: false, error: errorMessage });
      errorCount++;
    }

    console.log('');

    // Rate limiting - wait between API calls to avoid hitting limits
    if (i < drafts.length - 1) {
      console.log('  Waiting 2s before next request...\n');
      await sleep(2000);
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${drafts.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('');

  if (errorCount > 0) {
    console.log('Failed items:');
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
  }

  console.log('\nDone!');
}

// Run the script
processAllDraftKeyFigures()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
