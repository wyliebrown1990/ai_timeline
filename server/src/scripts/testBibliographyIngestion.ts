/**
 * Test script for Bibliography Ingestion
 * Run with: npx tsx server/src/scripts/testBibliographyIngestion.ts
 */

import { ingestBibliography, generateMarkdownReport } from '../services/ingestion/bibliographyIngestion';

async function main() {
  console.log('Starting Bibliography Ingestion Test...\n');

  const maxEntries = parseInt(process.argv[2] || '5', 10);
  const dryRun = process.argv[3] !== 'live';

  console.log(`Configuration:`);
  console.log(`  Max entries: ${maxEntries}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  try {
    const report = await ingestBibliography({
      sourceUrl: 'https://www.abriefhistoryofintelligence.com/bibliography',
      maxEntries,
      dryRun,
      onProgress: (progress) => {
        console.log(`[${progress.phase}] ${progress.message}`);
      },
    });

    console.log('\n' + '='.repeat(60));
    console.log(generateMarkdownReport(report));
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();
