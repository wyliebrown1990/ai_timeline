/**
 * Seed Current Events to Production
 *
 * Sprint 37 - Seeds current events via admin API (bypasses VPC restrictions)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api';

interface CurrentEventJson {
  id: string;
  headline: string;
  summary: string;
  sourceUrl?: string;
  sourcePublisher?: string;
  publishedDate: string;
  prerequisiteMilestoneIds: string[];
  connectionExplanation: string;
  featured: boolean;
  expiresAt?: string;
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

async function seedCurrentEvents(): Promise<void> {
  console.log('Seeding current events to production...');

  const token = await getAdminToken();
  const eventsPath = path.join(__dirname, '../src/content/current-events/events.json');
  const content = fs.readFileSync(eventsPath, 'utf-8');
  const events: CurrentEventJson[] = JSON.parse(content);

  console.log(`Found ${events.length} current events to seed`);

  // Seed via bulk endpoint
  const response = await fetch(`${API_BASE}/admin/current-events/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      events: events.map((event) => ({
        headline: event.headline,
        summary: event.summary,
        sourceUrl: event.sourceUrl || null,
        sourcePublisher: event.sourcePublisher || null,
        publishedDate: event.publishedDate,
        prerequisiteMilestoneIds: event.prerequisiteMilestoneIds,
        connectionExplanation: event.connectionExplanation,
        featured: event.featured,
        expiresAt: event.expiresAt || null,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to seed current events: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log('Current events seed result:', result);
}

seedCurrentEvents()
  .then(() => {
    console.log('Current events seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding current events:', error);
    process.exit(1);
  });
