import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Script to update news sources:
 * - Removes all existing news sources
 * - Adds The Neuron RSS feed as the only active source
 *
 * Run with: npx tsx prisma/updateNewsSources.ts
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use Pool with SSL for RDS connections
const isRDS = connectionString.includes('rds.amazonaws.com');
const pool = new Pool({
  connectionString,
  ssl: isRDS ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Updating news sources...\n');

  // Step 1: Get existing sources
  const existingSources = await prisma.newsSource.findMany();
  console.log(`Found ${existingSources.length} existing news source(s):`);
  existingSources.forEach((source) => {
    console.log(`  - ${source.name} (${source.feedUrl}) [active: ${source.isActive}]`);
  });

  // Step 2: Deactivate all existing sources (preserve data, just disable)
  if (existingSources.length > 0) {
    const deactivated = await prisma.newsSource.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    console.log(`\nDeactivated ${deactivated.count} source(s)`);
  }

  // Step 3: Check if The Neuron already exists
  const theNeuronFeedUrl = 'https://rss.beehiiv.com/feeds/N4eCstxvgX.xml';
  const existingNeuron = await prisma.newsSource.findFirst({
    where: { feedUrl: theNeuronFeedUrl },
  });

  if (existingNeuron) {
    // Reactivate if it exists
    await prisma.newsSource.update({
      where: { id: existingNeuron.id },
      data: { isActive: true },
    });
    console.log(`\nReactivated existing source: The Neuron (${existingNeuron.id})`);
  } else {
    // Create new source
    const newSource = await prisma.newsSource.create({
      data: {
        name: 'The Neuron',
        url: 'https://www.theneurondaily.com',
        feedUrl: theNeuronFeedUrl,
        isActive: true,
        checkFrequency: 1440, // 24 hours in minutes (daily check)
      },
    });
    console.log(`\nCreated new source: The Neuron (${newSource.id})`);
  }

  // Step 4: Verify final state
  const activeSources = await prisma.newsSource.findMany({
    where: { isActive: true },
  });
  console.log(`\nActive news sources (${activeSources.length}):`);
  activeSources.forEach((source) => {
    console.log(`  - ${source.name}`);
    console.log(`    URL: ${source.url}`);
    console.log(`    Feed: ${source.feedUrl}`);
    console.log(`    Check frequency: ${source.checkFrequency} minutes`);
  });

  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
