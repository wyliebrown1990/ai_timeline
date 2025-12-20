/**
 * Seed Checkpoints to Production
 *
 * Sprint 37 - Seeds checkpoints via admin API (bypasses VPC restrictions)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api';

interface CheckpointJson {
  id: string;
  title: string;
  pathId: string;
  afterMilestoneId: string;
  questions: unknown[];
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

async function seedCheckpoints(): Promise<void> {
  console.log('Seeding checkpoints to production...');

  const token = await getAdminToken();
  const checkpointsPath = path.join(__dirname, '../src/content/checkpoints/questions.json');
  const content = fs.readFileSync(checkpointsPath, 'utf-8');
  const checkpoints: CheckpointJson[] = JSON.parse(content);

  console.log(`Found ${checkpoints.length} checkpoints to seed`);

  // Seed via bulk endpoint
  const response = await fetch(`${API_BASE}/admin/checkpoints/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      checkpoints: checkpoints.map((cp, i) => ({
        title: cp.title,
        pathSlug: cp.pathId, // The API expects 'pathSlug' not 'pathId'
        afterMilestoneId: cp.afterMilestoneId,
        questions: cp.questions,
        sortOrder: i,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to seed checkpoints: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log('Checkpoints seed result:', result);
}

seedCheckpoints()
  .then(() => {
    console.log('Checkpoints seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding checkpoints:', error);
    process.exit(1);
  });
