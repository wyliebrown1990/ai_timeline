/**
 * Seed Prebuilt Decks to Production
 *
 * This script reads the prebuilt decks from the static TypeScript file
 * and uploads them to the production database via the admin API.
 *
 * Usage: npx tsx scripts/seedDecksToProduction.ts
 */

import { execSync } from 'child_process';
import { PREBUILT_DECKS } from '../src/content/prebuiltDecks';

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api';

async function getAdminToken(): Promise<string> {
  // Get password from SSM
  const password = execSync(
    'aws ssm get-parameter --name "/ai-timeline/prod/admin-password" --with-decryption --query "Parameter.Value" --output text',
    { encoding: 'utf-8' }
  ).trim();

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

async function seedDecks(token: string): Promise<void> {
  console.log(`Found ${PREBUILT_DECKS.length} prebuilt decks to seed\n`);

  let decksCreated = 0;
  let decksSkipped = 0;
  let cardsAdded = 0;
  const errors: string[] = [];

  for (const deck of PREBUILT_DECKS) {
    console.log(`Processing deck: ${deck.name}...`);

    // Step 1: Create the deck
    try {
      const deckPayload = {
        name: deck.name,
        description: deck.description,
        difficulty: deck.difficulty,
        cardCount: deck.cardCount,
        estimatedMinutes: deck.estimatedMinutes,
        previewCardIds: deck.previewCardIds,
      };

      const createDeckRes = await fetch(`${API_BASE}/admin/decks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deckPayload),
      });

      if (!createDeckRes.ok) {
        const error = await createDeckRes.text();
        if (error.includes('already exists')) {
          console.log(`  Deck "${deck.name}" already exists, skipping...`);
          decksSkipped++;
          continue;
        }
        throw new Error(`Failed to create deck: ${error}`);
      }

      const createdDeck = await createDeckRes.json();
      const deckId = createdDeck.id;
      decksCreated++;
      console.log(`  Created deck with ID: ${deckId}`);

      // Step 2: Add cards to the deck
      for (let i = 0; i < deck.cards.length; i++) {
        const card = deck.cards[i];

        const cardPayload = {
          cardId: card.id,
          sourceType: card.sourceType,
          sourceId: card.sourceId || card.id, // Use card.id as sourceId for custom cards
          customTerm: card.term,
          customDefinition: card.definition,
          sortOrder: i,
        };

        const addCardRes = await fetch(`${API_BASE}/admin/decks/${deckId}/cards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(cardPayload),
        });

        if (!addCardRes.ok) {
          const error = await addCardRes.text();
          errors.push(`Failed to add card ${card.id} to deck ${deck.name}: ${error}`);
        } else {
          cardsAdded++;
        }
      }

      console.log(`  Added ${deck.cards.length} cards to deck`);
    } catch (err) {
      errors.push(`Error processing deck "${deck.name}": ${String(err)}`);
      console.error(`  Error: ${err}`);
    }
  }

  console.log('\n=== Seeding Complete ===');
  console.log(`Decks Created: ${decksCreated}`);
  console.log(`Decks Skipped: ${decksSkipped}`);
  console.log(`Cards Added: ${cardsAdded}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }
}

async function main() {
  console.log('Getting admin token...');
  const token = await getAdminToken();
  console.log('Token acquired.\n');

  await seedDecks(token);

  // Verify the result
  console.log('\nVerifying deck count...');
  const response = await fetch(`${API_BASE}/decks`);
  const decks = await response.json();
  console.log(`Total Decks in Database: ${decks.data?.length || 0}`);

  if (decks.data?.length > 0) {
    console.log('\nDeck Summary:');
    for (const deck of decks.data) {
      console.log(`  - ${deck.name} (${deck.difficulty}, ${deck.cardCount} cards)`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
