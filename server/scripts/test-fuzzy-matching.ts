/**
 * Test fuzzy and alias matching
 * Run with: npx tsx server/scripts/test-fuzzy-matching.ts
 */

import { prisma } from '../src/db';
import { matchPerson, matchOrganization } from '../src/services/entityMatcher';

const FUZZY_TESTS = [
  // Alias matches
  { name: 'Geoff Hinton', expected: 'Geoffrey Hinton', type: 'alias' },
  { name: 'Samuel Altman', expected: 'Sam Altman', type: 'alias' },
  { name: 'G. Hinton', expected: 'Geoffrey Hinton', type: 'alias' },

  // Fuzzy matches
  { name: 'Geoffrey Hinton PhD', expected: 'Geoffrey Hinton', type: 'fuzzy' },
  { name: 'Dr. Sam Altman', expected: 'Sam Altman', type: 'fuzzy' },

  // Org variations
  { name: 'OpenAI Inc.', expected: 'OpenAI', type: 'org' },
  { name: 'Microsoft Corp', expected: 'Microsoft', type: 'org' },
];

async function main() {
  console.log('=== Fuzzy & Alias Matching Test ===\n');

  for (const test of FUZZY_TESTS) {
    if (test.type === 'org') {
      const result = await matchOrganization(test.name);
      console.log(`"${test.name}":`);
      console.log(`  Expected: ${test.expected}`);
      console.log(`  Matched: ${result.matched}`);
      console.log(`  Match type: ${result.matchType}`);
      console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
      if (result.organization) {
        console.log(`  Matched to: ${result.organization.name}`);
        console.log(`  ✅ ${result.organization.name === test.expected ? 'PASS' : 'FAIL'}`);
      } else if (result.candidates && result.candidates.length > 0) {
        console.log(`  Best candidate: ${result.candidates[0].organization.name} (${result.candidates[0].confidence.toFixed(2)})`);
      }
    } else {
      const result = await matchPerson(test.name);
      console.log(`"${test.name}":`);
      console.log(`  Expected: ${test.expected}`);
      console.log(`  Matched: ${result.matched}`);
      console.log(`  Match type: ${result.matchType}`);
      console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
      if (result.person) {
        console.log(`  Matched to: ${result.person.canonicalName}`);
        console.log(`  ✅ ${result.person.canonicalName === test.expected ? 'PASS' : 'FAIL'}`);
      } else if (result.candidates && result.candidates.length > 0) {
        console.log(`  Best candidate: ${result.candidates[0].person.canonicalName} (${result.candidates[0].confidence.toFixed(2)})`);
      }
    }
    console.log('');
  }

  await prisma.$disconnect();
}

main();
