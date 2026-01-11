/**
 * Test script for entity extraction
 * Run with: npx tsx server/scripts/test-entity-extraction.ts
 */

import { prisma } from '../src/db';
import { extractEntities } from '../src/services/ingestion/entityExtraction';

const SAMPLE_ARTICLE = {
  title: "Sam Altman returns as OpenAI CEO after brief ouster",
  content: `
    Sam Altman has returned as CEO of OpenAI, just days after being ousted by the company's board.
    The dramatic reversal came after more than 700 OpenAI employees threatened to quit and join
    Microsoft if Altman wasn't reinstated. Microsoft CEO Satya Nadella had initially offered
    to hire Altman and other departing OpenAI staff to lead a new AI research unit.

    The new board will include Bret Taylor, former co-CEO of Salesforce, as chairman, along with
    Larry Summers, the former Treasury Secretary. Adam D'Angelo, CEO of Quora, will remain on the
    board from the previous configuration.

    OpenAI President Greg Brockman, who resigned after Altman's firing, is also expected to return.
    The company's Chief Scientist Ilya Sutskever, who initially supported the board's decision,
    later signed the employee letter calling for the board to resign.

    The move comes as OpenAI faces increased competition from Anthropic, Google DeepMind, and other
    AI labs. Dario Amodei, CEO of Anthropic and a former OpenAI researcher, declined to comment.
  `
};

async function main() {
  console.log('=== Entity Extraction Test ===\n');

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable not set');
    console.log('Set it with: export ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  // Try to find an article in the database first
  console.log('Checking for articles in database...');
  const dbArticle = await prisma.ingestedArticle.findFirst({
    orderBy: { ingestedAt: 'desc' },
    select: { id: true, title: true, content: true }
  });

  // Use db article only if it has meaningful content
  const testArticle = (dbArticle && dbArticle.content.length > 100) ? dbArticle : SAMPLE_ARTICLE;

  if (dbArticle && dbArticle.content.length > 100) {
    console.log(`Using database article: ${dbArticle.title}\n`);
  } else {
    console.log('No suitable articles in database. Using sample article.\n');
  }

  console.log(`Title: ${testArticle.title}`);
  console.log(`Content length: ${testArticle.content.length} chars\n`);

  // Run entity extraction
  console.log('Running entity extraction...\n');

  try {
    const result = await extractEntities(
      { title: testArticle.title, content: testArticle.content },
      apiKey
    );

    console.log('=== RESULTS ===\n');

    console.log(`Persons extracted: ${result.persons.length}`);
    console.log('-'.repeat(40));
    for (const person of result.persons) {
      console.log(`  Name: ${person.name}`);
      console.log(`  Role: ${person.role || 'N/A'}`);
      console.log(`  Organization: ${person.organization || 'N/A'}`);
      console.log(`  Mention type: ${person.mentionType}`);
      console.log(`  Career change: ${person.isCareerChange}`);
      console.log(`  Context: ${person.context.substring(0, 100)}...`);
      console.log('');
    }

    console.log(`\nOrganizations extracted: ${result.organizations.length}`);
    console.log('-'.repeat(40));
    for (const org of result.organizations) {
      console.log(`  Name: ${org.name}`);
      console.log(`  Type: ${org.type}`);
      console.log(`  Mention type: ${org.mentionType}`);
      console.log(`  New development: ${org.isNewDevelopment}`);
      console.log(`  Context: ${org.context.substring(0, 100)}...`);
      console.log('');
    }

    console.log('=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Entity extraction failed:', error);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
