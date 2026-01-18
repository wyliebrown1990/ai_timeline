/**
 * Subject Taxonomy Seed Data
 * Sprint Subj-1: Data Model & Seed Taxonomy
 *
 * 3-level hierarchy: Domain (L0) > Category (L1) > Subcategory (L2)
 */

import { PrismaClient } from '@prisma/client';

interface SubjectSeed {
  slug: string;
  name: string;
  description?: string;
  level: number;
  parentSlug?: string;
  color?: string;
  icon?: string;
  synonyms?: string[];
}

// Domain colors for UI
const DOMAIN_COLORS = {
  science: '#3B82F6',    // blue
  business: '#10B981',   // emerald
  industry: '#8B5CF6',   // violet
  policy: '#F59E0B',     // amber
  research: '#EC4899',   // pink
};

// Full taxonomy structure
const TAXONOMY: SubjectSeed[] = [
  // ============================================
  // SCIENCE DOMAIN
  // ============================================
  {
    slug: 'science',
    name: 'Science',
    description: 'Scientific foundations of AI including biology, neuroscience, and computer science',
    level: 0,
    color: DOMAIN_COLORS.science,
    icon: '🔬',
  },
  // Science > Biology
  {
    slug: 'science-biology',
    name: 'Biology',
    description: 'Biological sciences relevant to AI and intelligence',
    level: 1,
    parentSlug: 'science',
  },
  {
    slug: 'science-biology-genetics',
    name: 'Genetics',
    description: 'Genetic algorithms, DNA computing, and evolutionary computation',
    level: 2,
    parentSlug: 'science-biology',
    synonyms: ['genetic algorithms', 'evolutionary computation', 'DNA computing'],
  },
  {
    slug: 'science-biology-neurobiology',
    name: 'Neurobiology',
    description: 'Neural mechanisms and brain-inspired computing',
    level: 2,
    parentSlug: 'science-biology',
    synonyms: ['neural biology', 'brain science'],
  },
  // Science > Neuroscience
  {
    slug: 'science-neuroscience',
    name: 'Neuroscience',
    description: 'Study of the brain and neural systems',
    level: 1,
    parentSlug: 'science',
  },
  {
    slug: 'science-neuroscience-cognitive',
    name: 'Cognitive Science',
    description: 'Study of mind and intelligence',
    level: 2,
    parentSlug: 'science-neuroscience',
    synonyms: ['cognitive science', 'cognition', 'cognitive computing'],
  },
  {
    slug: 'science-neuroscience-bci',
    name: 'Brain-Computer Interfaces',
    description: 'Direct communication between brain and computers',
    level: 2,
    parentSlug: 'science-neuroscience',
    synonyms: ['BCI', 'brain-machine interface', 'neural interface', 'Neuralink'],
  },
  // Science > Computer Science
  {
    slug: 'science-cs',
    name: 'Computer Science',
    description: 'Computing foundations of artificial intelligence',
    level: 1,
    parentSlug: 'science',
    synonyms: ['CS', 'computing'],
  },
  {
    slug: 'science-cs-ml',
    name: 'Machine Learning',
    description: 'Algorithms that learn from data',
    level: 2,
    parentSlug: 'science-cs',
    synonyms: ['ML', 'statistical learning', 'deep learning', 'neural networks'],
  },
  {
    slug: 'science-cs-nlp',
    name: 'Natural Language Processing',
    description: 'Processing and understanding human language',
    level: 2,
    parentSlug: 'science-cs',
    synonyms: ['NLP', 'language models', 'LLMs', 'text processing', 'chatbots'],
  },
  {
    slug: 'science-cs-vision',
    name: 'Computer Vision',
    description: 'Visual perception and image understanding',
    level: 2,
    parentSlug: 'science-cs',
    synonyms: ['CV', 'image recognition', 'object detection', 'visual AI'],
  },
  {
    slug: 'science-cs-robotics',
    name: 'Robotics',
    description: 'Autonomous machines and robotic systems',
    level: 2,
    parentSlug: 'science-cs',
    synonyms: ['robots', 'autonomous systems', 'robotic AI'],
  },
  {
    slug: 'science-cs-rl',
    name: 'Reinforcement Learning',
    description: 'Learning through interaction and rewards',
    level: 2,
    parentSlug: 'science-cs',
    synonyms: ['RL', 'reward learning', 'policy learning'],
  },

  // ============================================
  // BUSINESS DOMAIN
  // ============================================
  {
    slug: 'business',
    name: 'Business',
    description: 'Commercial applications and business impact of AI',
    level: 0,
    color: DOMAIN_COLORS.business,
    icon: '💼',
  },
  // Business > Technology
  {
    slug: 'business-tech',
    name: 'Technology',
    description: 'Technology industry and software development',
    level: 1,
    parentSlug: 'business',
  },
  {
    slug: 'business-tech-software',
    name: 'Software',
    description: 'Software products and development',
    level: 2,
    parentSlug: 'business-tech',
    synonyms: ['SaaS', 'applications', 'software development'],
  },
  {
    slug: 'business-tech-semiconductors',
    name: 'Semiconductors',
    description: 'Chips, GPUs, and AI hardware',
    level: 2,
    parentSlug: 'business-tech',
    synonyms: ['chips', 'GPUs', 'AI chips', 'TPUs', 'hardware', 'NVIDIA'],
  },
  {
    slug: 'business-tech-cloud',
    name: 'Cloud Computing',
    description: 'Cloud infrastructure and services',
    level: 2,
    parentSlug: 'business-tech',
    synonyms: ['cloud', 'AWS', 'Azure', 'GCP', 'cloud AI'],
  },
  // Business > Finance
  {
    slug: 'business-finance',
    name: 'Finance',
    description: 'Financial services and fintech',
    level: 1,
    parentSlug: 'business',
  },
  {
    slug: 'business-finance-fintech',
    name: 'Fintech',
    description: 'Financial technology and AI in banking',
    level: 2,
    parentSlug: 'business-finance',
    synonyms: ['financial technology', 'banking AI', 'payments'],
  },
  {
    slug: 'business-finance-trading',
    name: 'Trading',
    description: 'Algorithmic and AI-powered trading',
    level: 2,
    parentSlug: 'business-finance',
    synonyms: ['algo trading', 'quantitative trading', 'HFT'],
  },
  {
    slug: 'business-finance-investment',
    name: 'Investment',
    description: 'AI investment and venture capital',
    level: 2,
    parentSlug: 'business-finance',
    synonyms: ['VC', 'venture capital', 'AI funding', 'startup funding'],
  },
  // Business > Operations
  {
    slug: 'business-ops',
    name: 'Operations',
    description: 'Business operations and automation',
    level: 1,
    parentSlug: 'business',
  },
  {
    slug: 'business-ops-supply-chain',
    name: 'Supply Chain',
    description: 'Supply chain optimization and logistics',
    level: 2,
    parentSlug: 'business-ops',
    synonyms: ['logistics', 'supply chain management', 'SCM'],
  },
  {
    slug: 'business-ops-automation',
    name: 'Automation',
    description: 'Process automation and RPA',
    level: 2,
    parentSlug: 'business-ops',
    synonyms: ['RPA', 'process automation', 'workflow automation'],
  },

  // ============================================
  // INDUSTRY DOMAIN
  // ============================================
  {
    slug: 'industry',
    name: 'Industry',
    description: 'AI applications across industry verticals',
    level: 0,
    color: DOMAIN_COLORS.industry,
    icon: '🏭',
  },
  // Industry > Healthcare
  {
    slug: 'industry-healthcare',
    name: 'Healthcare',
    description: 'AI in medicine and healthcare',
    level: 1,
    parentSlug: 'industry',
    synonyms: ['medical AI', 'health AI'],
  },
  {
    slug: 'industry-healthcare-diagnostics',
    name: 'Diagnostics',
    description: 'AI-powered medical diagnosis',
    level: 2,
    parentSlug: 'industry-healthcare',
    synonyms: ['medical imaging', 'disease detection', 'pathology AI'],
  },
  {
    slug: 'industry-healthcare-drug-discovery',
    name: 'Drug Discovery',
    description: 'AI in pharmaceutical research',
    level: 2,
    parentSlug: 'industry-healthcare',
    synonyms: ['pharma AI', 'drug development', 'AlphaFold'],
  },
  // Industry > Automotive
  {
    slug: 'industry-automotive',
    name: 'Automotive',
    description: 'AI in vehicles and transportation',
    level: 1,
    parentSlug: 'industry',
  },
  {
    slug: 'industry-automotive-av',
    name: 'Autonomous Vehicles',
    description: 'Self-driving cars and autonomous transportation',
    level: 2,
    parentSlug: 'industry-automotive',
    synonyms: ['self-driving', 'AV', 'autonomous driving', 'Tesla FSD', 'Waymo'],
  },
  {
    slug: 'industry-automotive-adas',
    name: 'ADAS',
    description: 'Advanced driver assistance systems',
    level: 2,
    parentSlug: 'industry-automotive',
    synonyms: ['driver assistance', 'autopilot'],
  },
  // Industry > Media & Entertainment
  {
    slug: 'industry-media',
    name: 'Media & Entertainment',
    description: 'AI in content creation and media',
    level: 1,
    parentSlug: 'industry',
    synonyms: ['entertainment', 'content'],
  },
  {
    slug: 'industry-media-content-gen',
    name: 'Content Generation',
    description: 'AI-generated images, video, and audio',
    level: 2,
    parentSlug: 'industry-media',
    synonyms: ['generative AI', 'AI art', 'DALL-E', 'Midjourney', 'Stable Diffusion', 'Sora'],
  },
  {
    slug: 'industry-media-gaming',
    name: 'Gaming',
    description: 'AI in video games and interactive entertainment',
    level: 2,
    parentSlug: 'industry-media',
    synonyms: ['game AI', 'NPCs', 'procedural generation'],
  },
  // Industry > Education
  {
    slug: 'industry-education',
    name: 'Education',
    description: 'AI in learning and education',
    level: 1,
    parentSlug: 'industry',
  },
  {
    slug: 'industry-education-tutoring',
    name: 'AI Tutoring',
    description: 'Personalized AI tutoring and learning',
    level: 2,
    parentSlug: 'industry-education',
    synonyms: ['edtech', 'personalized learning', 'AI teacher'],
  },

  // ============================================
  // POLICY DOMAIN
  // ============================================
  {
    slug: 'policy',
    name: 'Policy',
    description: 'AI governance, regulation, and ethics',
    level: 0,
    color: DOMAIN_COLORS.policy,
    icon: '⚖️',
  },
  // Policy > Regulation
  {
    slug: 'policy-regulation',
    name: 'Regulation',
    description: 'Government regulation of AI',
    level: 1,
    parentSlug: 'policy',
  },
  {
    slug: 'policy-regulation-safety',
    name: 'AI Safety Laws',
    description: 'Legislation for AI safety and oversight',
    level: 2,
    parentSlug: 'policy-regulation',
    synonyms: ['AI Act', 'AI legislation', 'AI oversight'],
  },
  {
    slug: 'policy-regulation-privacy',
    name: 'Privacy',
    description: 'Data privacy and AI regulations',
    level: 2,
    parentSlug: 'policy-regulation',
    synonyms: ['GDPR', 'data protection', 'privacy laws'],
  },
  // Policy > Ethics
  {
    slug: 'policy-ethics',
    name: 'Ethics',
    description: 'Ethical considerations in AI',
    level: 1,
    parentSlug: 'policy',
  },
  {
    slug: 'policy-ethics-alignment',
    name: 'Alignment',
    description: 'AI alignment and value alignment',
    level: 2,
    parentSlug: 'policy-ethics',
    synonyms: ['AI alignment', 'value alignment', 'AI safety', 'alignment problem'],
  },
  {
    slug: 'policy-ethics-bias',
    name: 'Bias & Fairness',
    description: 'AI bias, fairness, and discrimination',
    level: 2,
    parentSlug: 'policy-ethics',
    synonyms: ['AI bias', 'algorithmic fairness', 'discrimination'],
  },
  // Policy > Geopolitics
  {
    slug: 'policy-geopolitics',
    name: 'Geopolitics',
    description: 'International AI competition and policy',
    level: 1,
    parentSlug: 'policy',
  },
  {
    slug: 'policy-geopolitics-us-china',
    name: 'US-China Competition',
    description: 'AI competition between US and China',
    level: 2,
    parentSlug: 'policy-geopolitics',
    synonyms: ['AI race', 'tech war', 'chip war'],
  },
  {
    slug: 'policy-geopolitics-export',
    name: 'Export Controls',
    description: 'Export restrictions on AI technology',
    level: 2,
    parentSlug: 'policy-geopolitics',
    synonyms: ['chip export', 'technology controls', 'sanctions'],
  },

  // ============================================
  // RESEARCH DOMAIN
  // ============================================
  {
    slug: 'research',
    name: 'Research',
    description: 'AI research ecosystem',
    level: 0,
    color: DOMAIN_COLORS.research,
    icon: '📚',
  },
  // Research > Academic
  {
    slug: 'research-academic',
    name: 'Academic',
    description: 'Academic AI research',
    level: 1,
    parentSlug: 'research',
  },
  {
    slug: 'research-academic-papers',
    name: 'Papers',
    description: 'Research papers and publications',
    level: 2,
    parentSlug: 'research-academic',
    synonyms: ['arXiv', 'publications', 'preprints'],
  },
  {
    slug: 'research-academic-conferences',
    name: 'Conferences',
    description: 'AI conferences and events',
    level: 2,
    parentSlug: 'research-academic',
    synonyms: ['NeurIPS', 'ICML', 'ICLR', 'CVPR', 'ACL'],
  },
  // Research > Corporate R&D
  {
    slug: 'research-corporate',
    name: 'Corporate R&D',
    description: 'Industry research and development',
    level: 1,
    parentSlug: 'research',
  },
  {
    slug: 'research-corporate-labs',
    name: 'Labs',
    description: 'Corporate AI research labs',
    level: 2,
    parentSlug: 'research-corporate',
    synonyms: ['OpenAI', 'DeepMind', 'Anthropic', 'Google Research', 'Meta AI', 'Microsoft Research'],
  },
  {
    slug: 'research-corporate-partnerships',
    name: 'Partnerships',
    description: 'Research partnerships and collaborations',
    level: 2,
    parentSlug: 'research-corporate',
    synonyms: ['collaborations', 'joint research'],
  },
  // Research > Open Source
  {
    slug: 'research-opensource',
    name: 'Open Source',
    description: 'Open source AI and community',
    level: 1,
    parentSlug: 'research',
    synonyms: ['OSS', 'open source AI'],
  },
  {
    slug: 'research-opensource-models',
    name: 'Open Models',
    description: 'Open source AI models',
    level: 2,
    parentSlug: 'research-opensource',
    synonyms: ['Llama', 'Mistral', 'open weights', 'Hugging Face'],
  },
  {
    slug: 'research-opensource-frameworks',
    name: 'Frameworks',
    description: 'Open source AI frameworks and tools',
    level: 2,
    parentSlug: 'research-opensource',
    synonyms: ['PyTorch', 'TensorFlow', 'JAX', 'LangChain'],
  },
];

export async function seedSubjectTaxonomy(prisma: PrismaClient): Promise<void> {
  console.log('🌱 Seeding subject taxonomy...');

  // Build a map of slugs to IDs as we create subjects
  const slugToId: Map<string, string> = new Map();

  // First pass: Create all subjects without parent relationships
  for (const subject of TAXONOMY) {
    const created = await prisma.subject.upsert({
      where: { slug: subject.slug },
      update: {
        name: subject.name,
        description: subject.description,
        level: subject.level,
        color: subject.color,
        icon: subject.icon,
        domainSlug: subject.slug.split('-')[0], // First segment is domain
        path: '', // Will update in second pass
      },
      create: {
        slug: subject.slug,
        name: subject.name,
        description: subject.description,
        level: subject.level,
        color: subject.color,
        icon: subject.icon,
        domainSlug: subject.slug.split('-')[0],
        path: '', // Will update in second pass
      },
    });
    slugToId.set(subject.slug, created.id);
    console.log(`  ✓ Created subject: ${subject.name} (${subject.slug})`);
  }

  // Second pass: Update parent relationships and paths
  for (const subject of TAXONOMY) {
    if (subject.parentSlug) {
      const parentId = slugToId.get(subject.parentSlug);
      if (parentId) {
        // Build the path by traversing up the hierarchy
        const pathParts: string[] = [];
        let currentSlug: string | undefined = subject.slug;
        while (currentSlug) {
          const current = TAXONOMY.find((s) => s.slug === currentSlug);
          if (current) {
            pathParts.unshift(current.name);
            currentSlug = current.parentSlug;
          } else {
            break;
          }
        }

        await prisma.subject.update({
          where: { slug: subject.slug },
          data: {
            parentId,
            path: pathParts.join(' > '),
          },
        });
      }
    } else {
      // Domain level - path is just the name
      await prisma.subject.update({
        where: { slug: subject.slug },
        data: {
          path: subject.name,
        },
      });
    }
  }

  // Third pass: Create synonyms
  let synonymCount = 0;
  for (const subject of TAXONOMY) {
    if (subject.synonyms && subject.synonyms.length > 0) {
      const subjectId = slugToId.get(subject.slug);
      if (subjectId) {
        for (const term of subject.synonyms) {
          try {
            await prisma.subjectSynonym.upsert({
              where: { term },
              update: { subjectId },
              create: { subjectId, term },
            });
            synonymCount++;
          } catch (e) {
            // Ignore duplicate synonyms
            console.log(`  ⚠ Duplicate synonym skipped: ${term}`);
          }
        }
      }
    }
  }

  const totalSubjects = TAXONOMY.length;
  const domains = TAXONOMY.filter((s) => s.level === 0).length;
  const categories = TAXONOMY.filter((s) => s.level === 1).length;
  const subcategories = TAXONOMY.filter((s) => s.level === 2).length;

  console.log(`\n✅ Subject taxonomy seeded successfully!`);
  console.log(`   Total subjects: ${totalSubjects}`);
  console.log(`   - Domains (L0): ${domains}`);
  console.log(`   - Categories (L1): ${categories}`);
  console.log(`   - Subcategories (L2): ${subcategories}`);
  console.log(`   Synonyms created: ${synonymCount}`);
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Dynamic import to avoid issues
  import('../seed').then(({ prisma }) => {
    seedSubjectTaxonomy(prisma)
      .then(() => prisma.$disconnect())
      .catch((e) => {
        console.error(e);
        prisma.$disconnect();
        process.exit(1);
      });
  });
}
