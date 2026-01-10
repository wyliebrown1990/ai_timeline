import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Key Figures Seed Script
 * Sprint 44 - Key Figures Data Foundation
 *
 * Seeds foundational AI key figures into the database.
 * Run with: npx tsx prisma/seedKeyFigures.ts
 */

// Create Prisma client with PostgreSQL adapter
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface KeyFigureSeed {
  id: string;
  canonicalName: string;
  aliases: string[];
  shortBio: string;
  fullBio?: string;
  primaryOrg?: string;
  previousOrgs: string[];
  role: string;
  notableFor: string;
  wikipediaUrl?: string;
}

/**
 * Foundational AI Key Figures
 * A curated list of influential figures in AI history
 */
const KEY_FIGURES: KeyFigureSeed[] = [
  // Pioneers
  {
    id: 'alan-turing',
    canonicalName: 'Alan Turing',
    aliases: ['A. Turing', 'A.M. Turing'],
    shortBio: 'British mathematician and computer scientist, considered the father of theoretical computer science and artificial intelligence.',
    primaryOrg: 'University of Manchester',
    previousOrgs: ['Bletchley Park', 'National Physical Laboratory'],
    role: 'researcher',
    notableFor: 'Turing machine, Turing test, breaking the Enigma code',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Alan_Turing',
  },
  {
    id: 'claude-shannon',
    canonicalName: 'Claude Shannon',
    aliases: ['Claude E. Shannon', 'C. Shannon'],
    shortBio: 'American mathematician known as the "father of information theory" and a pioneer in digital circuit design.',
    primaryOrg: 'Bell Labs',
    previousOrgs: ['MIT'],
    role: 'researcher',
    notableFor: 'Information theory, Boolean logic for circuits, chess-playing computer',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Claude_Shannon',
  },
  {
    id: 'john-mccarthy',
    canonicalName: 'John McCarthy',
    aliases: ['J. McCarthy'],
    shortBio: 'American computer scientist who coined the term "artificial intelligence" and invented Lisp.',
    primaryOrg: 'Stanford University',
    previousOrgs: ['MIT', 'Dartmouth College'],
    role: 'researcher',
    notableFor: 'Coining "artificial intelligence", Lisp programming language, time-sharing systems',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/John_McCarthy_(computer_scientist)',
  },
  {
    id: 'marvin-minsky',
    canonicalName: 'Marvin Minsky',
    aliases: ['Marvin Lee Minsky', 'M. Minsky'],
    shortBio: 'American cognitive scientist and co-founder of the MIT AI Lab, a pioneer in artificial intelligence.',
    primaryOrg: 'MIT',
    previousOrgs: ['Harvard University'],
    role: 'researcher',
    notableFor: 'Co-founding MIT AI Lab, neural networks research, "Society of Mind" theory',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Marvin_Minsky',
  },

  // Deep Learning Pioneers ("Godfathers of AI")
  {
    id: 'geoffrey-hinton',
    canonicalName: 'Geoffrey Hinton',
    aliases: ['Geoff Hinton', 'G. Hinton', 'Geoffrey E. Hinton'],
    shortBio: 'British-Canadian cognitive psychologist and computer scientist, known as a "Godfather of AI" for deep learning work.',
    primaryOrg: 'University of Toronto',
    previousOrgs: ['Google Brain', 'Carnegie Mellon University'],
    role: 'researcher',
    notableFor: 'Backpropagation, Boltzmann machines, deep learning, capsule networks',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Geoffrey_Hinton',
  },
  {
    id: 'yann-lecun',
    canonicalName: 'Yann LeCun',
    aliases: ['Y. LeCun'],
    shortBio: 'French-American computer scientist, VP and Chief AI Scientist at Meta, pioneer of convolutional neural networks.',
    primaryOrg: 'Meta AI',
    previousOrgs: ['Bell Labs', 'NYU'],
    role: 'researcher',
    notableFor: 'Convolutional neural networks (CNNs), LeNet, self-supervised learning',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Yann_LeCun',
  },
  {
    id: 'yoshua-bengio',
    canonicalName: 'Yoshua Bengio',
    aliases: ['Y. Bengio'],
    shortBio: 'Canadian computer scientist known for work on deep learning and neural networks, co-recipient of 2018 Turing Award.',
    primaryOrg: 'Mila - Quebec AI Institute',
    previousOrgs: ['Université de Montréal'],
    role: 'researcher',
    notableFor: 'Deep learning, attention mechanisms, generative adversarial networks research',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Yoshua_Bengio',
  },

  // Modern AI Researchers
  {
    id: 'fei-fei-li',
    canonicalName: 'Fei-Fei Li',
    aliases: ['Feifei Li', 'F. Li'],
    shortBio: 'Chinese-American computer scientist known for creating ImageNet, pioneering work in computer vision.',
    primaryOrg: 'Stanford University',
    previousOrgs: ['Google Cloud AI'],
    role: 'researcher',
    notableFor: 'ImageNet dataset, computer vision research, AI ethics advocacy',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Fei-Fei_Li',
  },
  {
    id: 'andrej-karpathy',
    canonicalName: 'Andrej Karpathy',
    aliases: ['A. Karpathy'],
    shortBio: 'Slovak-Canadian AI researcher, former Director of AI at Tesla, known for AI education and research.',
    primaryOrg: 'Independent',
    previousOrgs: ['Tesla', 'OpenAI', 'Stanford University'],
    role: 'researcher',
    notableFor: 'Tesla Autopilot, neural network tutorials, ImageNet research',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Andrej_Karpathy',
  },
  {
    id: 'ilya-sutskever',
    canonicalName: 'Ilya Sutskever',
    aliases: ['I. Sutskever'],
    shortBio: 'Israeli-Canadian computer scientist, co-founder of OpenAI, pioneer in deep learning and sequence-to-sequence models.',
    primaryOrg: 'Safe Superintelligence Inc.',
    previousOrgs: ['OpenAI', 'Google Brain'],
    role: 'researcher',
    notableFor: 'AlexNet, sequence-to-sequence learning, GPT models co-creation',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ilya_Sutskever',
  },
  {
    id: 'andrew-ng',
    canonicalName: 'Andrew Ng',
    aliases: ['A. Ng', 'Andrew Y. Ng'],
    shortBio: 'British-American computer scientist, co-founder of Coursera, known for democratizing AI education.',
    primaryOrg: 'Stanford University',
    previousOrgs: ['Google Brain', 'Baidu'],
    role: 'researcher',
    notableFor: 'Google Brain, Coursera, DeepLearning.AI, AI education',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Andrew_Ng',
  },

  // Industry Leaders - OpenAI
  {
    id: 'sam-altman',
    canonicalName: 'Sam Altman',
    aliases: ['Samuel Altman', 'S. Altman'],
    shortBio: 'American entrepreneur, CEO of OpenAI, leading the development and deployment of GPT models.',
    primaryOrg: 'OpenAI',
    previousOrgs: ['Y Combinator', 'Loopt'],
    role: 'executive',
    notableFor: 'Leading OpenAI, ChatGPT launch, AGI development advocacy',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Sam_Altman',
  },
  {
    id: 'greg-brockman',
    canonicalName: 'Greg Brockman',
    aliases: ['Gregory Brockman', 'G. Brockman'],
    shortBio: 'American entrepreneur, President of OpenAI, co-founder who helped build the organization from the ground up.',
    primaryOrg: 'OpenAI',
    previousOrgs: ['Stripe'],
    role: 'founder',
    notableFor: 'Co-founding OpenAI, building OpenAI engineering team',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Greg_Brockman',
  },

  // Industry Leaders - Anthropic
  {
    id: 'dario-amodei',
    canonicalName: 'Dario Amodei',
    aliases: ['D. Amodei'],
    shortBio: 'American AI researcher, CEO and co-founder of Anthropic, focused on AI safety research.',
    primaryOrg: 'Anthropic',
    previousOrgs: ['OpenAI'],
    role: 'founder',
    notableFor: 'Founding Anthropic, Claude AI, constitutional AI, AI safety research',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Dario_Amodei',
  },
  {
    id: 'daniela-amodei',
    canonicalName: 'Daniela Amodei',
    aliases: ['D. Amodei'],
    shortBio: 'American businesswoman, President and co-founder of Anthropic, leading business operations.',
    primaryOrg: 'Anthropic',
    previousOrgs: ['OpenAI', 'Stripe'],
    role: 'founder',
    notableFor: 'Co-founding Anthropic, scaling AI safety company',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Daniela_Amodei',
  },

  // Industry Leaders - DeepMind
  {
    id: 'demis-hassabis',
    canonicalName: 'Demis Hassabis',
    aliases: ['D. Hassabis'],
    shortBio: 'British AI researcher and entrepreneur, CEO of Google DeepMind, creator of AlphaGo and AlphaFold.',
    primaryOrg: 'Google DeepMind',
    previousOrgs: ['Elixir Studios'],
    role: 'founder',
    notableFor: 'Founding DeepMind, AlphaGo, AlphaFold, Nobel Prize 2024',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Demis_Hassabis',
  },
  {
    id: 'shane-legg',
    canonicalName: 'Shane Legg',
    aliases: ['S. Legg'],
    shortBio: 'New Zealand AI researcher, co-founder of DeepMind, focused on artificial general intelligence.',
    primaryOrg: 'Google DeepMind',
    previousOrgs: ['IDSIA'],
    role: 'founder',
    notableFor: 'Co-founding DeepMind, AGI research',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Shane_Legg',
  },

  // Tech Industry Leaders
  {
    id: 'jensen-huang',
    canonicalName: 'Jensen Huang',
    aliases: ['Jen-Hsun Huang'],
    shortBio: 'Taiwanese-American businessman, CEO of NVIDIA, driving GPU computing for AI.',
    primaryOrg: 'NVIDIA',
    previousOrgs: ['LSI Logic', 'AMD'],
    role: 'executive',
    notableFor: 'Building NVIDIA into AI computing leader, CUDA platform',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Jensen_Huang',
  },
  {
    id: 'satya-nadella',
    canonicalName: 'Satya Nadella',
    aliases: ['S. Nadella'],
    shortBio: 'Indian-American business executive, CEO of Microsoft, leading enterprise AI adoption.',
    primaryOrg: 'Microsoft',
    previousOrgs: ['Sun Microsystems'],
    role: 'executive',
    notableFor: 'Microsoft-OpenAI partnership, Azure AI, Copilot products',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Satya_Nadella',
  },
  {
    id: 'sundar-pichai',
    canonicalName: 'Sundar Pichai',
    aliases: ['Pichai Sundararajan', 'S. Pichai'],
    shortBio: 'Indian-American business executive, CEO of Google and Alphabet, overseeing Google AI.',
    primaryOrg: 'Alphabet/Google',
    previousOrgs: ['McKinsey', 'Applied Materials'],
    role: 'executive',
    notableFor: 'Leading Google AI initiatives, Gemini, Google DeepMind merger',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Sundar_Pichai',
  },

  // Transformer Architecture
  {
    id: 'ashish-vaswani',
    canonicalName: 'Ashish Vaswani',
    aliases: ['A. Vaswani'],
    shortBio: 'Indian-American AI researcher, lead author of the Transformer paper that revolutionized NLP.',
    primaryOrg: 'Essential AI',
    previousOrgs: ['Google Brain'],
    role: 'researcher',
    notableFor: '"Attention Is All You Need" paper, Transformer architecture',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ashish_Vaswani',
  },

  // Open Source AI
  {
    id: 'mark-zuckerberg',
    canonicalName: 'Mark Zuckerberg',
    aliases: ['Mark E. Zuckerberg', 'Zuck'],
    shortBio: 'American technology entrepreneur, CEO of Meta, driving open-source AI with Llama models.',
    primaryOrg: 'Meta',
    previousOrgs: [],
    role: 'founder',
    notableFor: 'Meta AI, Llama open-source models, metaverse vision',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Mark_Zuckerberg',
  },
];

async function seedKeyFigures() {
  console.log('Starting Key Figures seed...');

  // Check if table exists (migration may not have run yet)
  try {
    await prisma.$queryRaw`SELECT 1 FROM "KeyFigure" LIMIT 1`;
    console.log('KeyFigure table exists, proceeding with seed...');
  } catch (error) {
    console.error('Error checking KeyFigure table:', error);
    console.log('If this is a connection error, check DATABASE_URL.');
    console.log('If table does not exist, run migration 0006_key_figures first.');
    return;
  }

  // Upsert each key figure
  let created = 0;
  let updated = 0;

  for (const figure of KEY_FIGURES) {
    const existing = await prisma.keyFigure.findUnique({
      where: { id: figure.id },
    });

    if (existing) {
      await prisma.keyFigure.update({
        where: { id: figure.id },
        data: {
          canonicalName: figure.canonicalName,
          aliases: JSON.stringify(figure.aliases),
          shortBio: figure.shortBio,
          fullBio: figure.fullBio,
          primaryOrg: figure.primaryOrg,
          previousOrgs: JSON.stringify(figure.previousOrgs),
          role: figure.role,
          notableFor: figure.notableFor,
          wikipediaUrl: figure.wikipediaUrl,
          status: 'published',
        },
      });
      updated++;
    } else {
      await prisma.keyFigure.create({
        data: {
          id: figure.id,
          canonicalName: figure.canonicalName,
          aliases: JSON.stringify(figure.aliases),
          shortBio: figure.shortBio,
          fullBio: figure.fullBio,
          primaryOrg: figure.primaryOrg,
          previousOrgs: JSON.stringify(figure.previousOrgs),
          role: figure.role,
          notableFor: figure.notableFor,
          wikipediaUrl: figure.wikipediaUrl,
          status: 'published',
        },
      });
      created++;
    }
  }

  console.log(`Key Figures seed complete: ${created} created, ${updated} updated`);

  // Verify
  const count = await prisma.keyFigure.count();
  console.log(`Database now contains ${count} key figures`);
}

seedKeyFigures()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
