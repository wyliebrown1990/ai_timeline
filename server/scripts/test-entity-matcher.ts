/**
 * Test script for entity matching
 * Run with: npx tsx server/scripts/test-entity-matcher.ts
 */

import { prisma } from '../src/db';
import { matchPerson, matchOrganization } from '../src/services/entityMatcher';

const TEST_NAMES = [
  'Sam Altman',
  'Dario Amodei',
  'Geoffrey Hinton',
  'Ilya Sutskever',
  'Satya Nadella',
  'John Smith',  // Should not match
];

const TEST_ORGS = [
  'OpenAI',
  'Anthropic',
  'Google DeepMind',
  'Microsoft',
  'Acme Corp',  // Should not match
];

async function main() {
  console.log('=== Entity Matcher Test ===\n');

  // Check existing persons
  const personCount = await prisma.person.count({ where: { status: 'published' } });
  console.log(`Published Person records in database: ${personCount}\n`);

  if (personCount > 0) {
    const samplePersons = await prisma.person.findMany({
      take: 5,
      where: { status: 'published' },
      select: { canonicalName: true }
    });
    console.log('Sample persons:', samplePersons.map(p => p.canonicalName).join(', '));
  }

  // Check existing organizations
  const orgCount = await prisma.organization.count({ where: { status: 'published' } });
  console.log(`Published Organization records in database: ${orgCount}\n`);

  if (orgCount > 0) {
    const sampleOrgs = await prisma.organization.findMany({
      take: 5,
      where: { status: 'published' },
      select: { name: true }
    });
    console.log('Sample orgs:', sampleOrgs.map(o => o.name).join(', '));
  }

  console.log('\n--- Person Matching ---\n');

  for (const name of TEST_NAMES) {
    const result = await matchPerson(name);
    console.log(`"${name}":`);
    console.log(`  Matched: ${result.matched}`);
    console.log(`  Match type: ${result.matchType}`);
    console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`  Suggested action: ${result.suggestedAction}`);
    if (result.person) {
      console.log(`  Matched to: ${result.person.canonicalName}`);
    }
    if (result.candidates && result.candidates.length > 0) {
      console.log(`  Candidates: ${result.candidates.map(c => `${c.person.canonicalName} (${c.confidence.toFixed(2)})`).join(', ')}`);
    }
    console.log('');
  }

  console.log('\n--- Organization Matching ---\n');

  for (const name of TEST_ORGS) {
    const result = await matchOrganization(name);
    console.log(`"${name}":`);
    console.log(`  Matched: ${result.matched}`);
    console.log(`  Match type: ${result.matchType}`);
    console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`  Suggested action: ${result.suggestedAction}`);
    if (result.organization) {
      console.log(`  Matched to: ${result.organization.name}`);
    }
    if (result.candidates && result.candidates.length > 0) {
      console.log(`  Candidates: ${result.candidates.map(c => `${c.organization.name} (${c.confidence.toFixed(2)})`).join(', ')}`);
    }
    console.log('');
  }

  console.log('=== TEST COMPLETE ===');
  await prisma.$disconnect();
}

main();
