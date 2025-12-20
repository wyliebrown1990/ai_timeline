/**
 * Seed Learning Paths to Production
 *
 * Sprint 37 - Seeds learning paths via admin API (bypasses VPC restrictions)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api';

interface LearningPathJson {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  milestoneIds: string[];
  estimatedMinutes: number;
  difficulty: string;
  suggestedNextPathIds: string[];
  keyTakeaways: string[];
  conceptsCovered: string[];
  icon?: string;
}

async function getAdminToken(): Promise<string> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables required');
  }

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Failed to login: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

async function seedLearningPaths(): Promise<void> {
  console.log('Seeding learning paths to production...');

  const token = await getAdminToken();
  const learningPathsDir = path.join(__dirname, '../src/content/learning-paths');
  const files = fs.readdirSync(learningPathsDir).filter((f) => f.endsWith('.json'));

  const paths: LearningPathJson[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(learningPathsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: LearningPathJson = JSON.parse(content);

    paths.push({
      ...data,
      // Use 'id' as 'slug' for the API
      id: data.id,
    });
  }

  // Seed via bulk endpoint
  const response = await fetch(`${API_BASE}/admin/learning-paths/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      paths: paths.map((p, i) => ({
        slug: p.id,
        title: p.title,
        description: p.description,
        targetAudience: p.targetAudience,
        milestoneIds: p.milestoneIds,
        estimatedMinutes: p.estimatedMinutes,
        difficulty: p.difficulty,
        suggestedNextPathIds: p.suggestedNextPathIds || [],
        keyTakeaways: p.keyTakeaways,
        conceptsCovered: p.conceptsCovered,
        icon: p.icon || null,
        sortOrder: i,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to seed learning paths: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log('Learning paths seed result:', result);
}

seedLearningPaths()
  .then(() => {
    console.log('Learning paths seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding learning paths:', error);
    process.exit(1);
  });
