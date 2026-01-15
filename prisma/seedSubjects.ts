import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create Prisma client with PostgreSQL adapter
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Subject node in the taxonomy tree
 */
interface SubjectNode {
  slug: string;
  name: string;
  description?: string;
  level: number;
  color?: string;
  icon?: string;
  defaultDifficulty?: 'beginner' | 'intermediate' | 'advanced';
  children?: SubjectNode[];
}

/**
 * Synonym mapping
 */
interface SynonymMapping {
  term: string;
  subjectSlug: string;
}

/**
 * Full taxonomy tree definition
 */
const taxonomy: SubjectNode[] = [
  {
    slug: 'science',
    name: 'Science',
    description: 'Scientific disciplines and research areas underlying AI development',
    level: 0,
    color: '#3B82F6', // blue
    icon: '🔬',
    children: [
      {
        slug: 'science-biology',
        name: 'Biology',
        description: 'Biological sciences and their intersection with AI',
        level: 1,
        children: [
          { slug: 'science-biology-genetics', name: 'Genetics', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'science-biology-neurobiology', name: 'Neurobiology', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'science-biology-synthetic', name: 'Synthetic Biology', level: 2, defaultDifficulty: 'advanced' },
        ],
      },
      {
        slug: 'science-neuroscience',
        name: 'Neuroscience',
        description: 'Study of the brain and nervous system, inspiration for neural networks',
        level: 1,
        children: [
          { slug: 'science-neuroscience-cognitive', name: 'Cognitive Science', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'science-neuroscience-computational', name: 'Computational Neuroscience', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'science-neuroscience-bci', name: 'Brain-Computer Interfaces', level: 2, defaultDifficulty: 'advanced' },
        ],
      },
      {
        slug: 'science-cs',
        name: 'Computer Science',
        description: 'Core computer science disciplines powering AI',
        level: 1,
        children: [
          { slug: 'science-cs-ml', name: 'Machine Learning', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'science-cs-nlp', name: 'Natural Language Processing', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'science-cs-vision', name: 'Computer Vision', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'science-cs-robotics', name: 'Robotics', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'science-cs-reinforcement', name: 'Reinforcement Learning', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'science-cs-multimodal', name: 'Multimodal AI', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'science-physics',
        name: 'Physics',
        description: 'Physical sciences and quantum computing',
        level: 1,
        children: [
          { slug: 'science-physics-quantum', name: 'Quantum Computing', level: 2, defaultDifficulty: 'advanced' },
        ],
      },
      {
        slug: 'science-mathematics',
        name: 'Mathematics',
        description: 'Mathematical foundations of AI',
        level: 1,
        children: [
          { slug: 'science-mathematics-statistics', name: 'Statistics & Probability', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'science-mathematics-optimization', name: 'Optimization', level: 2, defaultDifficulty: 'advanced' },
        ],
      },
    ],
  },
  {
    slug: 'business',
    name: 'Business',
    description: 'Business applications and industry impacts of AI',
    level: 0,
    color: '#10B981', // green
    icon: '💼',
    children: [
      {
        slug: 'business-technology',
        name: 'Technology',
        description: 'Technology sector and infrastructure',
        level: 1,
        children: [
          { slug: 'business-technology-software', name: 'Software', level: 2, defaultDifficulty: 'beginner' },
          { slug: 'business-technology-semiconductors', name: 'Semiconductors', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'business-technology-cloud', name: 'Cloud Infrastructure', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'business-technology-hardware', name: 'Consumer Hardware', level: 2, defaultDifficulty: 'beginner' },
        ],
      },
      {
        slug: 'business-finance',
        name: 'Finance',
        description: 'Financial applications of AI',
        level: 1,
        children: [
          { slug: 'business-finance-fintech', name: 'Fintech', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'business-finance-trading', name: 'Algorithmic Trading', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'business-finance-risk', name: 'Risk & Compliance', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'business-operations',
        name: 'Operations',
        description: 'Business operations and automation',
        level: 1,
        children: [
          { slug: 'business-operations-supply-chain', name: 'Supply Chain', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'business-operations-automation', name: 'Enterprise Automation', level: 2, defaultDifficulty: 'beginner' },
        ],
      },
      {
        slug: 'business-marketing',
        name: 'Marketing',
        description: 'Marketing and customer engagement',
        level: 1,
        children: [
          { slug: 'business-marketing-personalization', name: 'Personalization', level: 2, defaultDifficulty: 'beginner' },
          { slug: 'business-marketing-analytics', name: 'Marketing Analytics', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
    ],
  },
  {
    slug: 'industry',
    name: 'Industry',
    description: 'Vertical industries transformed by AI',
    level: 0,
    color: '#F59E0B', // amber
    icon: '🏭',
    children: [
      {
        slug: 'industry-healthcare',
        name: 'Healthcare',
        description: 'Medical and healthcare applications',
        level: 1,
        children: [
          { slug: 'industry-healthcare-diagnostics', name: 'Diagnostics', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'industry-healthcare-drug-discovery', name: 'Drug Discovery', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'industry-healthcare-devices', name: 'Medical Devices', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'industry-healthcare-clinical', name: 'Clinical AI', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'industry-automotive',
        name: 'Automotive',
        description: 'Automotive and transportation',
        level: 1,
        children: [
          { slug: 'industry-automotive-av', name: 'Autonomous Vehicles', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'industry-automotive-manufacturing', name: 'Auto Manufacturing', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'industry-media',
        name: 'Media & Entertainment',
        description: 'Media, entertainment, and creative industries',
        level: 1,
        children: [
          { slug: 'industry-media-content-gen', name: 'Content Generation', level: 2, defaultDifficulty: 'beginner' },
          { slug: 'industry-media-gaming', name: 'Gaming', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'industry-media-music', name: 'Music & Audio', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'industry-media-video', name: 'Video & Film', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'industry-education',
        name: 'Education',
        description: 'Educational technology and learning',
        level: 1,
        children: [
          { slug: 'industry-education-edtech', name: 'EdTech', level: 2, defaultDifficulty: 'beginner' },
          { slug: 'industry-education-research-tools', name: 'Research Tools', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'industry-legal',
        name: 'Legal',
        description: 'Legal industry applications',
        level: 1,
        children: [
          { slug: 'industry-legal-contracts', name: 'Contract Analysis', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'industry-legal-research', name: 'Legal Research', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'industry-defense',
        name: 'Defense & Security',
        description: 'Defense and national security applications',
        level: 1,
        children: [
          { slug: 'industry-defense-military', name: 'Military AI', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'industry-defense-cybersecurity', name: 'Cybersecurity', level: 2, defaultDifficulty: 'advanced' },
        ],
      },
    ],
  },
  {
    slug: 'policy',
    name: 'Policy & Governance',
    description: 'AI policy, regulation, ethics, and governance',
    level: 0,
    color: '#EF4444', // red
    icon: '⚖️',
    children: [
      {
        slug: 'policy-regulation',
        name: 'Regulation',
        description: 'Laws and regulatory frameworks',
        level: 1,
        children: [
          { slug: 'policy-regulation-ai-safety', name: 'AI Safety Laws', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'policy-regulation-privacy', name: 'Data Privacy', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'policy-regulation-liability', name: 'Liability & Accountability', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'policy-ethics',
        name: 'Ethics',
        description: 'Ethical considerations and alignment',
        level: 1,
        children: [
          { slug: 'policy-ethics-alignment', name: 'AI Alignment', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'policy-ethics-bias', name: 'Bias & Fairness', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'policy-ethics-transparency', name: 'Transparency & Explainability', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'policy-geopolitics',
        name: 'Geopolitics',
        description: 'International AI competition and cooperation',
        level: 1,
        children: [
          { slug: 'policy-geopolitics-competition', name: 'US-China AI Race', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'policy-geopolitics-export', name: 'Export Controls', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'policy-geopolitics-treaties', name: 'International Treaties', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'policy-safety',
        name: 'AI Safety',
        description: 'Technical and organizational AI safety',
        level: 1,
        children: [
          { slug: 'policy-safety-technical', name: 'Technical Safety', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'policy-safety-existential', name: 'Existential Risk', level: 2, defaultDifficulty: 'advanced' },
        ],
      },
    ],
  },
  {
    slug: 'research',
    name: 'Research',
    description: 'AI research ecosystem and publications',
    level: 0,
    color: '#8B5CF6', // purple
    icon: '📚',
    children: [
      {
        slug: 'research-academic',
        name: 'Academic',
        description: 'Academic research and publications',
        level: 1,
        children: [
          { slug: 'research-academic-papers', name: 'Papers & Preprints', level: 2, defaultDifficulty: 'advanced' },
          { slug: 'research-academic-conferences', name: 'Conferences', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'research-academic-benchmarks', name: 'Benchmarks & Datasets', level: 2, defaultDifficulty: 'intermediate' },
        ],
      },
      {
        slug: 'research-corporate',
        name: 'Corporate R&D',
        description: 'Corporate research and development',
        level: 1,
        children: [
          { slug: 'research-corporate-labs', name: 'Research Labs', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'research-corporate-partnerships', name: 'Industry Partnerships', level: 2, defaultDifficulty: 'beginner' },
        ],
      },
      {
        slug: 'research-opensource',
        name: 'Open Source',
        description: 'Open source AI development',
        level: 1,
        children: [
          { slug: 'research-opensource-models', name: 'Open Models', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'research-opensource-frameworks', name: 'Frameworks & Tools', level: 2, defaultDifficulty: 'intermediate' },
          { slug: 'research-opensource-datasets', name: 'Open Datasets', level: 2, defaultDifficulty: 'beginner' },
        ],
      },
    ],
  },
];

/**
 * Common synonyms and alternative terms
 */
const synonyms: SynonymMapping[] = [
  // NLP
  { term: 'LLMs', subjectSlug: 'science-cs-nlp' },
  { term: 'LLM', subjectSlug: 'science-cs-nlp' },
  { term: 'Large Language Models', subjectSlug: 'science-cs-nlp' },
  { term: 'GPT', subjectSlug: 'science-cs-nlp' },
  { term: 'ChatGPT', subjectSlug: 'science-cs-nlp' },
  { term: 'language model', subjectSlug: 'science-cs-nlp' },
  { term: 'text generation', subjectSlug: 'science-cs-nlp' },
  { term: 'transformers', subjectSlug: 'science-cs-nlp' },
  { term: 'BERT', subjectSlug: 'science-cs-nlp' },
  { term: 'attention mechanism', subjectSlug: 'science-cs-nlp' },

  // Machine Learning
  { term: 'neural networks', subjectSlug: 'science-cs-ml' },
  { term: 'deep learning', subjectSlug: 'science-cs-ml' },
  { term: 'neural network', subjectSlug: 'science-cs-ml' },
  { term: 'AI model', subjectSlug: 'science-cs-ml' },
  { term: 'training', subjectSlug: 'science-cs-ml' },
  { term: 'fine-tuning', subjectSlug: 'science-cs-ml' },
  { term: 'generative AI', subjectSlug: 'science-cs-ml' },
  { term: 'gen AI', subjectSlug: 'science-cs-ml' },
  { term: 'foundation models', subjectSlug: 'science-cs-ml' },
  { term: 'diffusion models', subjectSlug: 'science-cs-ml' },

  // Computer Vision
  { term: 'image recognition', subjectSlug: 'science-cs-vision' },
  { term: 'object detection', subjectSlug: 'science-cs-vision' },
  { term: 'image generation', subjectSlug: 'science-cs-vision' },
  { term: 'DALL-E', subjectSlug: 'science-cs-vision' },
  { term: 'Midjourney', subjectSlug: 'science-cs-vision' },
  { term: 'Stable Diffusion', subjectSlug: 'science-cs-vision' },

  // Robotics
  { term: 'robots', subjectSlug: 'science-cs-robotics' },
  { term: 'humanoid', subjectSlug: 'science-cs-robotics' },
  { term: 'automation', subjectSlug: 'science-cs-robotics' },

  // Semiconductors
  { term: 'chips', subjectSlug: 'business-technology-semiconductors' },
  { term: 'GPU', subjectSlug: 'business-technology-semiconductors' },
  { term: 'GPUs', subjectSlug: 'business-technology-semiconductors' },
  { term: 'NVIDIA', subjectSlug: 'business-technology-semiconductors' },
  { term: 'TPU', subjectSlug: 'business-technology-semiconductors' },
  { term: 'AI accelerator', subjectSlug: 'business-technology-semiconductors' },
  { term: 'H100', subjectSlug: 'business-technology-semiconductors' },

  // Autonomous Vehicles
  { term: 'self-driving', subjectSlug: 'industry-automotive-av' },
  { term: 'autonomous driving', subjectSlug: 'industry-automotive-av' },
  { term: 'Tesla FSD', subjectSlug: 'industry-automotive-av' },
  { term: 'Waymo', subjectSlug: 'industry-automotive-av' },

  // Healthcare
  { term: 'medical AI', subjectSlug: 'industry-healthcare-diagnostics' },
  { term: 'radiology AI', subjectSlug: 'industry-healthcare-diagnostics' },
  { term: 'AlphaFold', subjectSlug: 'industry-healthcare-drug-discovery' },
  { term: 'protein folding', subjectSlug: 'industry-healthcare-drug-discovery' },

  // Ethics & Safety
  { term: 'AGI', subjectSlug: 'policy-ethics-alignment' },
  { term: 'artificial general intelligence', subjectSlug: 'policy-ethics-alignment' },
  { term: 'superintelligence', subjectSlug: 'policy-safety-existential' },
  { term: 'AI doom', subjectSlug: 'policy-safety-existential' },
  { term: 'x-risk', subjectSlug: 'policy-safety-existential' },
  { term: 'AI bias', subjectSlug: 'policy-ethics-bias' },
  { term: 'algorithmic bias', subjectSlug: 'policy-ethics-bias' },

  // Geopolitics
  { term: 'chip war', subjectSlug: 'policy-geopolitics-export' },
  { term: 'AI race', subjectSlug: 'policy-geopolitics-competition' },

  // Content Generation
  { term: 'AI art', subjectSlug: 'industry-media-content-gen' },
  { term: 'AI writing', subjectSlug: 'industry-media-content-gen' },
  { term: 'AI video', subjectSlug: 'industry-media-video' },
  { term: 'Sora', subjectSlug: 'industry-media-video' },

  // Research
  { term: 'arXiv', subjectSlug: 'research-academic-papers' },
  { term: 'NeurIPS', subjectSlug: 'research-academic-conferences' },
  { term: 'ICML', subjectSlug: 'research-academic-conferences' },
  { term: 'open weights', subjectSlug: 'research-opensource-models' },
  { term: 'Llama', subjectSlug: 'research-opensource-models' },
  { term: 'Mistral', subjectSlug: 'research-opensource-models' },
  { term: 'PyTorch', subjectSlug: 'research-opensource-frameworks' },
  { term: 'TensorFlow', subjectSlug: 'research-opensource-frameworks' },
  { term: 'Hugging Face', subjectSlug: 'research-opensource-frameworks' },
];

/**
 * Flatten taxonomy tree into array of subject records
 */
function flattenTaxonomy(
  nodes: SubjectNode[],
  parentId: string | null = null,
  domainSlug: string | null = null,
  pathParts: string[] = []
): Array<{
  slug: string;
  name: string;
  description: string | null;
  level: number;
  parentId: string | null;
  path: string;
  domainSlug: string;
  defaultDifficulty: string | null;
  color: string | null;
  icon: string | null;
}> {
  const result: Array<{
    slug: string;
    name: string;
    description: string | null;
    level: number;
    parentId: string | null;
    path: string;
    domainSlug: string;
    defaultDifficulty: string | null;
    color: string | null;
    icon: string | null;
  }> = [];

  for (const node of nodes) {
    const currentPath = [...pathParts, node.name];
    const currentDomainSlug = domainSlug || node.slug;

    result.push({
      slug: node.slug,
      name: node.name,
      description: node.description || null,
      level: node.level,
      parentId,
      path: currentPath.join(' > '),
      domainSlug: currentDomainSlug,
      defaultDifficulty: node.defaultDifficulty || null,
      color: node.color || null,
      icon: node.icon || null,
    });

    if (node.children) {
      // We'll need to use the cuid from the created record, but for now we use slug as ID
      // Prisma will generate the actual IDs
      result.push(
        ...flattenTaxonomy(node.children, node.slug, currentDomainSlug, currentPath)
      );
    }
  }

  return result;
}

/**
 * Seed subjects and synonyms
 */
async function seedSubjects() {
  console.log('Starting subject taxonomy seed...');

  // Clear existing data
  console.log('Clearing existing subjects and synonyms...');
  await prisma.subjectSynonym.deleteMany();
  await prisma.contentSubject.deleteMany();
  await prisma.subject.deleteMany();

  // Flatten taxonomy
  const flatSubjects = flattenTaxonomy(taxonomy);
  console.log(`Prepared ${flatSubjects.length} subjects for insertion`);

  // Create a map of slug -> id for parent references
  const slugToId = new Map<string, string>();

  // Insert subjects in order (parents first)
  // Sort by level to ensure parents are created before children
  const sortedSubjects = flatSubjects.sort((a, b) => a.level - b.level);

  for (const subject of sortedSubjects) {
    const created = await prisma.subject.create({
      data: {
        slug: subject.slug,
        name: subject.name,
        description: subject.description,
        level: subject.level,
        parentId: subject.parentId ? slugToId.get(subject.parentId) : null,
        path: subject.path,
        domainSlug: subject.domainSlug,
        defaultDifficulty: subject.defaultDifficulty,
        color: subject.color,
        icon: subject.icon,
        learningObjectives: '[]',
      },
    });
    slugToId.set(subject.slug, created.id);
  }

  console.log(`Created ${slugToId.size} subjects`);

  // Insert synonyms
  let synonymCount = 0;
  for (const syn of synonyms) {
    const subjectId = slugToId.get(syn.subjectSlug);
    if (subjectId) {
      try {
        await prisma.subjectSynonym.create({
          data: {
            term: syn.term,
            subjectId,
          },
        });
        synonymCount++;
      } catch (error) {
        // Skip duplicate synonyms
        console.warn(`Skipping duplicate synonym: ${syn.term}`);
      }
    } else {
      console.warn(`Subject not found for synonym: ${syn.term} -> ${syn.subjectSlug}`);
    }
  }

  console.log(`Created ${synonymCount} synonyms`);

  // Verify
  const subjectCount = await prisma.subject.count();
  const synCount = await prisma.subjectSynonym.count();
  console.log(`Database now contains ${subjectCount} subjects and ${synCount} synonyms`);

  // Print summary by domain
  const domains = await prisma.subject.findMany({
    where: { level: 0 },
    include: {
      children: {
        include: {
          children: true,
        },
      },
    },
  });

  console.log('\nTaxonomy summary:');
  for (const domain of domains) {
    const categoryCount = domain.children.length;
    const subcategoryCount = domain.children.reduce((sum, cat) => sum + cat.children.length, 0);
    console.log(`  ${domain.icon} ${domain.name}: ${categoryCount} categories, ${subcategoryCount} subcategories`);
  }
}

seedSubjects()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
