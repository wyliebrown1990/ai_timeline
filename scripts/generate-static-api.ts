/**
 * Generate Static API Responses
 *
 * Creates JSON files that simulate API responses for static hosting.
 * This allows the frontend to work without a backend server.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create Prisma adapter
const dbPath = resolve(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

/**
 * Transform database milestone to API response format
 */
function transformMilestone(milestone: {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: string;
  significance: number;
  era: string | null;
  organization: string | null;
  contributors: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  tags: string;
  sources: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    date: milestone.date.toISOString().split('T')[0],
    category: milestone.category,
    significance: milestone.significance,
    era: milestone.era,
    organization: milestone.organization,
    contributors: JSON.parse(milestone.contributors || '[]'),
    sourceUrl: milestone.sourceUrl,
    imageUrl: milestone.imageUrl,
    tags: JSON.parse(milestone.tags || '[]'),
    sources: JSON.parse(milestone.sources || '[]'),
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };
}

async function generateStaticApi() {
  console.log('Generating static API responses...\n');

  // Create output directory
  const apiDir = resolve(__dirname, '../dist/api');
  mkdirSync(apiDir, { recursive: true });

  // Fetch all milestones
  const milestones = await prisma.milestone.findMany({
    orderBy: { date: 'asc' },
  });

  console.log(`Found ${milestones.length} milestones`);

  // Transform milestones
  const transformedMilestones = milestones.map(transformMilestone);

  // Generate /api/milestones response (paginated format)
  const milestonesResponse = {
    data: transformedMilestones,
    pagination: {
      page: 1,
      limit: transformedMilestones.length,
      total: transformedMilestones.length,
      totalPages: 1,
    },
  };

  // Create milestones directory for sub-paths
  const milestonesDir = resolve(apiDir, 'milestones');
  mkdirSync(milestonesDir, { recursive: true });

  // For S3 static hosting, create index files that will be served
  // S3 serves /api/milestones as /api/milestones/index.html or we use explicit file
  // Since the frontend fetches /api/milestones, we write to that exact path
  // But S3 treats it as a directory, so we create milestones as a file WITHOUT the trailing dir

  // Remove the directory we just created and write as file
  const { rmSync } = await import('fs');
  rmSync(milestonesDir, { recursive: true, force: true });

  writeFileSync(
    resolve(apiDir, 'milestones'),
    JSON.stringify(milestonesResponse, null, 2)
  );
  console.log('Created /api/milestones');

  // Generate /api/milestones/tags response - needs milestones to be a directory
  // So we need a different approach: use milestones-tags as a path
  // Actually, let's recreate the directory structure properly

  // Generate /api/tags response instead (simpler path)
  const tagCounts: Record<string, number> = {};
  for (const milestone of transformedMilestones) {
    for (const tag of milestone.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const tagsResponse = {
    data: Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  };

  writeFileSync(
    resolve(apiDir, 'tags'),
    JSON.stringify(tagsResponse, null, 2)
  );
  console.log('Created /api/tags');

  // Generate /api/health response
  const healthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };

  writeFileSync(
    resolve(apiDir, 'health'),
    JSON.stringify(healthResponse, null, 2)
  );
  console.log('Created /api/health');

  console.log('\nStatic API files generated successfully!');
  console.log(`Output directory: ${apiDir}`);
}

generateStaticApi()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
