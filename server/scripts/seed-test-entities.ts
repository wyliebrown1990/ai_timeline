/**
 * Seed test Person and Organization records for matcher testing
 * Run with: npx tsx server/scripts/seed-test-entities.ts
 */

import { prisma } from '../src/db';

const SAMPLE_PERSONS = [
  {
    id: 'sam-altman',
    canonicalName: 'Sam Altman',
    slug: 'sam-altman',
    aliases: JSON.stringify(['Samuel Altman', 'S. Altman']),
    shortBio: 'CEO of OpenAI, previously president of Y Combinator.',
    role: 'executive',
    currentOrgId: 'openai',
    currentRole: 'CEO',
    status: 'published',
  },
  {
    id: 'dario-amodei',
    canonicalName: 'Dario Amodei',
    slug: 'dario-amodei',
    aliases: JSON.stringify(['D. Amodei']),
    shortBio: 'CEO and co-founder of Anthropic.',
    role: 'executive',
    currentOrgId: 'anthropic',
    currentRole: 'CEO',
    status: 'published',
  },
  {
    id: 'geoffrey-hinton',
    canonicalName: 'Geoffrey Hinton',
    slug: 'geoffrey-hinton',
    aliases: JSON.stringify(['Geoff Hinton', 'G. Hinton', 'Geoffrey E. Hinton']),
    shortBio: 'Pioneer of deep learning, known as the "godfather of AI".',
    role: 'researcher',
    status: 'published',
  },
  {
    id: 'ilya-sutskever',
    canonicalName: 'Ilya Sutskever',
    slug: 'ilya-sutskever',
    aliases: JSON.stringify(['I. Sutskever']),
    shortBio: 'Co-founder and former Chief Scientist at OpenAI.',
    role: 'researcher',
    status: 'published',
  },
];

const SAMPLE_ORGS = [
  {
    id: 'openai',
    name: 'OpenAI',
    slug: 'openai',
    type: 'research_lab' as const,
    shortDescription: 'AI research laboratory focused on developing safe AGI.',
    status: 'published',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    slug: 'anthropic',
    type: 'research_lab' as const,
    shortDescription: 'AI safety company, creator of Claude.',
    status: 'published',
  },
  {
    id: 'google-deepmind',
    name: 'Google DeepMind',
    slug: 'google-deepmind',
    type: 'research_lab' as const,
    shortDescription: 'AI research lab owned by Alphabet.',
    status: 'published',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    slug: 'microsoft',
    type: 'company' as const,
    shortDescription: 'Technology company and major OpenAI investor.',
    status: 'published',
  },
];

async function main() {
  console.log('Seeding test entities...\n');

  // Create organizations first (for person references)
  for (const org of SAMPLE_ORGS) {
    try {
      await prisma.organization.upsert({
        where: { id: org.id },
        update: org,
        create: org,
      });
      console.log(`✓ Organization: ${org.name}`);
    } catch (error) {
      console.error(`✗ Organization ${org.name}:`, error);
    }
  }

  // Create persons
  for (const person of SAMPLE_PERSONS) {
    try {
      await prisma.person.upsert({
        where: { id: person.id },
        update: person,
        create: person,
      });
      console.log(`✓ Person: ${person.canonicalName}`);
    } catch (error) {
      console.error(`✗ Person ${person.canonicalName}:`, error);
    }
  }

  console.log('\nSeeding complete!');
  await prisma.$disconnect();
}

main();
