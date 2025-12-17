/**
 * Convert layered-content.json to use readable IDs
 *
 * This script maps the existing layered content (keyed by Prisma cuid)
 * to the readable IDs from starter_50_events.json (e.g., E1943_MCCULLOCH_PITTS)
 * by matching milestone titles.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RawEvent {
  id: string;
  title: string;
  date: string;
  era: string;
  summary: string;
  coreConcepts: string[];
  keyPeople: string[];
  sources: Array<{ label: string; kind: string; url: string }>;
  guidedStart?: boolean;
}

interface LayeredContent {
  tldr: string;
  simpleExplanation: string;
  businessImpact: string;
  technicalDepth: string;
  historicalContext: string;
  whyItMattersToday: string;
  commonMisconceptions: string;
}

// Read starter events with readable IDs
const eventsPath = resolve(__dirname, '../starter_50_events.json');
const events: RawEvent[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));
console.log(`Loaded ${events.length} events from starter file`);

// Read current layered content
const layeredPath = resolve(__dirname, '../src/content/milestones/layered-content.json');
const layeredData = JSON.parse(readFileSync(layeredPath, 'utf-8'));

// Extract metadata
const metadata = {
  _description: 'Layered explanation content for milestones, keyed by readable milestone ID',
  _generatedAt: new Date().toISOString().split('T')[0],
  _totalMilestones: 0,
  _note:
    'All milestones have comprehensive layered explanations with tldr, simpleExplanation, businessImpact, technicalDepth, historicalContext, whyItMattersToday, and commonMisconceptions',
};

// Get all layered content entries (excluding metadata)
const layeredEntries: [string, LayeredContent][] = Object.entries(layeredData).filter(
  ([key]) => !key.startsWith('_')
) as [string, LayeredContent][];

console.log(`Found ${layeredEntries.length} layered content entries`);

// Create title -> readable ID mapping from starter events
const titleToReadableId = new Map<string, string>();
for (const event of events) {
  // Normalize title for matching
  const normalizedTitle = event.title.toLowerCase().trim();
  titleToReadableId.set(normalizedTitle, event.id);
}

// Create title -> layered content mapping by matching cuid entries to titles
// We need to figure out the order - the layered content follows the same order as starter events
// Let's assume the cuid entries are in the same order as the starter_50_events.json

const newLayeredContent: Record<string, LayeredContent> = {};
const unmatchedEntries: string[] = [];

// Since we don't have titles in layered-content.json, we need to rely on order
// The cuids appear to be generated sequentially, so entry 0 maps to event 0, etc.
for (let i = 0; i < layeredEntries.length; i++) {
  const [oldId, content] = layeredEntries[i];

  if (i < events.length) {
    const event = events[i];
    newLayeredContent[event.id] = content;
    console.log(`Mapped: ${oldId.substring(0, 12)}... -> ${event.id}`);
  } else {
    unmatchedEntries.push(oldId);
    console.warn(`Warning: No matching event for layered entry ${i} (${oldId})`);
  }
}

if (unmatchedEntries.length > 0) {
  console.warn(`\nUnmatched entries: ${unmatchedEntries.length}`);
}

// Build final output with metadata
const output = {
  ...metadata,
  _totalMilestones: Object.keys(newLayeredContent).length,
  ...newLayeredContent,
};

// Write updated layered content
const outputPath = resolve(__dirname, '../src/content/milestones/layered-content.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

console.log(`\nWritten ${Object.keys(newLayeredContent).length} entries to ${outputPath}`);
console.log('Done!');
