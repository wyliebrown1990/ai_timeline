/**
 * Sprint TD-3: Link historical figures to their milestones
 *
 * Usage: ADMIN_PASSWORD='...' npx tsx scripts/linkHistoricalContributors.ts
 */

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod';

interface ContributorLink {
  milestoneId: string;
  personId: string;
  contributionType: 'lead' | 'co_author' | 'advisor' | 'founder' | 'mentioned';
}

const CONTRIBUTOR_LINKS: ContributorLink[] = [
  // Turing Test (1950) - Alan Turing
  { milestoneId: 'E1950_TURING_TEST', personId: 'alan-turing', contributionType: 'lead' },

  // SNARC (1951) - Marvin Minsky
  { milestoneId: 'E1951_FIRST_NEURAL_NETWORK', personId: 'marvin-minsky', contributionType: 'lead' },

  // Dartmouth Conference (1956) - McCarthy, Minsky, Shannon
  { milestoneId: 'E1956_DARTMOUTH', personId: 'john-mccarthy', contributionType: 'lead' },
  { milestoneId: 'E1956_DARTMOUTH', personId: 'marvin-minsky', contributionType: 'co_author' },
  { milestoneId: 'E1956_DARTMOUTH', personId: 'claude-shannon', contributionType: 'co_author' },

  // Perceptron (1957) - Frank Rosenblatt
  { milestoneId: 'E1957_PERCEPTRON', personId: 'frank-rosenblatt', contributionType: 'lead' },

  // LISP (1958) - John McCarthy
  { milestoneId: 'E1958_LISP', personId: 'john-mccarthy', contributionType: 'lead' },

  // ELIZA (1966) - Joseph Weizenbaum
  { milestoneId: 'E1966_ELIZA', personId: 'joseph-weizenbaum', contributionType: 'lead' },

  // Perceptrons Book (1969) - Minsky & Papert
  { milestoneId: 'E1969_PERCEPTRONS_BOOK', personId: 'marvin-minsky', contributionType: 'lead' },

  // Backpropagation (1974) - Paul Werbos
  { milestoneId: 'E1974_BACKPROPAGATION', personId: 'paul-werbos', contributionType: 'lead' },

  // Backprop Paper (1986) - Hinton, Rumelhart, Williams
  { milestoneId: 'E1986_BACKPROP_PAPER', personId: 'geoffrey-hinton', contributionType: 'co_author' },

  // Deep Belief Networks (2006) - Hinton
  { milestoneId: 'E2006_DEEP_BELIEF_NETS', personId: 'geoffrey-hinton', contributionType: 'lead' },

  // ImageNet (2009) - Fei-Fei Li
  { milestoneId: 'E2009_IMAGENET', personId: 'fei-fei-li', contributionType: 'lead' },

  // AlexNet (2012) - Krizhevsky, Sutskever, Hinton
  { milestoneId: 'E2012_ALEXNET', personId: 'alex-krizhevsky', contributionType: 'lead' },
  { milestoneId: 'E2012_ALEXNET', personId: 'ilya-sutskever', contributionType: 'co_author' },
  { milestoneId: 'E2012_ALEXNET', personId: 'geoffrey-hinton', contributionType: 'advisor' },

  // LeNet - Yann LeCun
  { milestoneId: 'E1998_LENET', personId: 'yann-lecun', contributionType: 'lead' },
  { milestoneId: 'E1998_LENET', personId: 'yoshua-bengio', contributionType: 'co_author' },
];

async function getAuthToken(username: string, password: string): Promise<string> {
  console.log('Authenticating...');
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
  return (await response.json()).token;
}

async function linkContributor(
  link: ContributorLink,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${API_BASE}/api/milestones/${link.milestoneId}/linked-persons`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          personId: link.personId,
          contributionType: link.contributionType,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      // Check if it's a duplicate
      if (error.includes('already linked') || error.includes('Unique constraint')) {
        console.log(`  [SKIP] ${link.milestoneId} <- ${link.personId}: Already linked`);
        return { success: true };
      }
      console.log(`  [ERROR] ${link.milestoneId} <- ${link.personId}: ${response.status}`);
      return { success: false, error };
    }

    console.log(`  [LINKED] ${link.milestoneId} <- ${link.personId} (${link.contributionType})`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  [ERROR] ${link.milestoneId} <- ${link.personId}: ${message}`);
    return { success: false, error: message };
  }
}

async function main() {
  console.log('Linking historical contributors to milestones...\n');

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('ERROR: ADMIN_PASSWORD required');
    process.exit(1);
  }

  const token = await getAuthToken('admin', password);

  let linked = 0;
  let skipped = 0;
  let errors = 0;

  for (const link of CONTRIBUTOR_LINKS) {
    const result = await linkContributor(link, token);
    if (result.success) {
      linked++;
    } else {
      errors++;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\n========================================');
  console.log('Contributor Links Complete');
  console.log('========================================');
  console.log(`Linked: ${linked}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${CONTRIBUTOR_LINKS.length}`);
}

main();
