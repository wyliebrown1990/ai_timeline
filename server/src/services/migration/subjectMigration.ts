/**
 * Subject Migration Service
 * Sprint Subj-3 - Content Backfill
 *
 * Maps existing categories, tags, and focus areas to the new subject taxonomy.
 * Used for rule-based backfill of historical content.
 */

/**
 * Milestone category to subject slug mapping
 * Each category maps to one or more subject slugs
 */
export const categoryToSubject: Record<string, string[]> = {
  // Core milestone categories
  RESEARCH: ['research-academic-papers'],
  MODEL_RELEASE: ['science-cs-ml'],
  BREAKTHROUGH: ['science-cs-ml', 'research-academic-papers'],
  PRODUCT: ['business-technology-software'],
  REGULATION: ['policy-regulation-ai-safety'],
  INDUSTRY: ['business-technology-software'],
  POLICY: ['policy-regulation-ai-safety'],
  COMPANY: ['business-technology-software'],
  HARDWARE: ['business-technology-semiconductors'],
  INFRASTRUCTURE: ['business-technology-cloud'],
  SAFETY: ['policy-safety-technical'],
  ETHICS: ['policy-ethics-alignment'],
  BENCHMARK: ['research-academic-benchmarks'],
  DATASET: ['research-opensource-datasets'],
  TOOL: ['research-opensource-frameworks'],
  PAPER: ['research-academic-papers'],
  CONFERENCE: ['research-academic-conferences'],
};

/**
 * Normalize a tag/term for consistent mapping
 * Converts to lowercase, replaces spaces with hyphens
 */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Tag to subject slug mapping
 * Comprehensive mapping based on existing tags in the database
 */
export const tagToSubject: Record<string, string> = {
  // ===== NLP / Language Models =====
  nlp: 'science-cs-nlp',
  'language-models': 'science-cs-nlp',
  llms: 'science-cs-nlp',
  'large-language-models': 'science-cs-nlp',
  transformers: 'science-cs-nlp',
  transformer: 'science-cs-nlp',
  'autoregressive-lms': 'science-cs-nlp',
  'masked-language-modeling': 'science-cs-nlp',
  'neural-machine-translation': 'science-cs-nlp',
  seq2seq: 'science-cs-nlp',
  'encoder-decoder': 'science-cs-nlp',
  chatbots: 'science-cs-nlp',
  embeddings: 'science-cs-nlp',
  'distributional-semantics': 'science-cs-nlp',
  attention: 'science-cs-nlp',
  'self-attention': 'science-cs-nlp',
  'text-to-text': 'science-cs-nlp',
  'large-context-windows': 'science-cs-nlp',
  pretraining: 'science-cs-nlp',

  // ===== Machine Learning General =====
  'neural-networks': 'science-cs-ml',
  'neural-network': 'science-cs-ml',
  'deep-learning': 'science-cs-ml',
  'artificial-neuron': 'science-cs-ml',
  perceptron: 'science-cs-ml',
  perceptrons: 'science-cs-ml',
  'linear-classifier': 'science-cs-ml',
  backpropagation: 'science-cs-ml',
  'gradient-descent': 'science-cs-ml',
  svm: 'science-cs-ml',
  'margin-maximization': 'science-cs-ml',
  lstm: 'science-cs-ml',
  'recurrent-neural-networks': 'science-cs-ml',
  regularization: 'science-cs-ml',
  dropout: 'science-cs-ml',
  normalization: 'science-cs-ml',
  'training-stability': 'science-cs-ml',
  'residual-connections': 'science-cs-ml',
  optimization: 'science-cs-ml',
  adam: 'science-cs-ml',
  'scaling-laws': 'science-cs-ml',
  scaling: 'science-cs-ml',
  'compute-optimal-training': 'science-cs-ml',
  'efficient-training': 'science-cs-ml',
  'fine-tuning': 'science-cs-ml',
  'transfer-learning': 'science-cs-ml',
  'foundation-models': 'science-cs-ml',
  'frontier-models': 'science-cs-ml',
  'pretraining-recipes': 'science-cs-ml',
  'supervised-learning': 'science-cs-ml',
  'few-shot-learning': 'science-cs-ml',
  'contrastive-learning': 'science-cs-ml',
  moe: 'science-cs-ml',
  'mixture-of-experts': 'science-cs-ml',
  'sparse-routing': 'science-cs-ml',

  // ===== Generative Models =====
  'generative-models': 'science-cs-ml',
  'generative-modeling': 'science-cs-ml',
  gans: 'science-cs-ml',
  'diffusion-models': 'science-cs-ml',
  'latent-diffusion': 'science-cs-ml',

  // ===== Computer Vision =====
  'computer-vision': 'science-cs-vision',
  cnn: 'science-cs-vision',
  'image-generation': 'science-cs-vision',
  'text-to-image': 'science-cs-vision',
  'representation-learning': 'science-cs-vision',

  // ===== Multimodal =====
  'multimodal-ai': 'science-cs-multimodal',
  'multimodal-llms': 'science-cs-multimodal',
  'vision-language-models': 'science-cs-multimodal',

  // ===== Reinforcement Learning =====
  'deep-reinforcement-learning': 'science-cs-reinforcement',
  'monte-carlo-tree-search': 'science-cs-reinforcement',
  ppo: 'science-cs-reinforcement',
  'policy-gradients': 'science-cs-reinforcement',
  rlhf: 'science-cs-reinforcement',
  'preference-optimization': 'science-cs-reinforcement',
  'instruction-tuning': 'science-cs-reinforcement',

  // ===== AI Agents & Reasoning =====
  'ai-agents': 'science-cs-ml',
  agents: 'science-cs-ml',
  'reasoning-models': 'science-cs-ml',
  'extended-thinking': 'science-cs-ml',
  'chain-of-thought': 'science-cs-ml',
  'computer-use': 'science-cs-ml',
  'autonomous-ai': 'science-cs-ml',
  'web-automation': 'science-cs-ml',

  // ===== Gaming & Search =====
  'game-playing-ai': 'science-cs-reinforcement',
  search: 'science-cs-ml',

  // ===== Code Generation =====
  'code-generation': 'science-cs-nlp',
  'coding-ai': 'science-cs-nlp',

  // ===== Scientific ML =====
  'protein-folding': 'industry-healthcare-drug-discovery',
  'scientific-ml': 'research-academic-papers',

  // ===== Hardware & Infrastructure =====
  compute: 'business-technology-cloud',
  'gpu-training': 'business-technology-semiconductors',
  'gpu-compute': 'business-technology-semiconductors',
  'ai-infrastructure': 'business-technology-cloud',
  'orbital-data-centers': 'business-technology-cloud',
  'space-computing': 'business-technology-cloud',

  // ===== Policy & Ethics =====
  alignment: 'policy-ethics-alignment',
  safety: 'policy-safety-technical',
  'ai-safety': 'policy-safety-technical',
  'trustworthy-ai': 'policy-ethics-alignment',
  'ai-policy': 'policy-regulation-ai-safety',
  'ai-governance': 'policy-regulation-ai-safety',
  'ai-regulation': 'policy-regulation-ai-safety',
  'risk-based-governance': 'policy-regulation-ai-safety',
  'risk-management': 'policy-safety-technical',
  'regulatory-shifts': 'policy-regulation-ai-safety',
  'model-release-strategy': 'policy-safety-technical',
  'model-limitations': 'policy-ethics-transparency',

  // ===== Research & Open Source =====
  'open-models': 'research-opensource-models',
  'open-weights': 'research-opensource-models',
  datasets: 'research-opensource-datasets',
  rag: 'science-cs-nlp',
  retrieval: 'science-cs-nlp',

  // ===== Competition & Business =====
  'ai-competition': 'policy-geopolitics-competition',

  // ===== Historical / Theoretical =====
  'turing-test': 'science-cs-ml',
  'machine-intelligence': 'science-cs-ml',
  'artificial-intelligence': 'science-cs-ml',
  entropy: 'science-mathematics-statistics',
  'information-theory': 'science-mathematics-statistics',
  'logic-programming': 'science-cs-ml',
  prolog: 'science-cs-ml',
  'expert-systems': 'science-cs-ml',
  'knowledge-engineering': 'science-cs-ml',

  // ===== Industry =====
  'modern-ai-practice': 'business-technology-software',
  'future-scenarios': 'policy-safety-existential',
  predictions: 'policy-safety-existential',
  'industry-perspectives': 'business-technology-software',

  // ===== Media & Content =====
  'multilingual-lms': 'science-cs-nlp',
};

/**
 * Glossary term category to subject mapping
 */
export const glossaryCategoryToSubject: Record<string, string[]> = {
  core_concept: ['science-cs-ml'],
  technical_term: ['science-cs-ml'],
  business_term: ['business-technology-software'],
  model_architecture: ['science-cs-ml'],
  company_product: ['business-technology-software'],
  technique: ['science-cs-ml'],
  metric: ['research-academic-benchmarks'],
  application: ['business-technology-software'],
  hardware: ['business-technology-semiconductors'],
  framework: ['research-opensource-frameworks'],
  dataset: ['research-opensource-datasets'],
  benchmark: ['research-academic-benchmarks'],
};

/**
 * Person role to subject mapping
 */
export const roleToSubject: Record<string, string[]> = {
  researcher: ['research-academic-papers'],
  executive: ['business-technology-software'],
  founder: ['business-technology-software'],
  engineer: ['science-cs-ml'],
  scientist: ['research-academic-papers'],
  professor: ['research-academic-papers'],
  policy: ['policy-regulation-ai-safety'],
};

/**
 * Common focus areas to subject mapping
 */
export const focusAreaToSubject: Record<string, string> = {
  // NLP
  'natural language processing': 'science-cs-nlp',
  nlp: 'science-cs-nlp',
  'language models': 'science-cs-nlp',
  'large language models': 'science-cs-nlp',
  llms: 'science-cs-nlp',
  transformers: 'science-cs-nlp',

  // ML
  'machine learning': 'science-cs-ml',
  'deep learning': 'science-cs-ml',
  'neural networks': 'science-cs-ml',
  ai: 'science-cs-ml',
  'artificial intelligence': 'science-cs-ml',
  'generative ai': 'science-cs-ml',

  // Computer Vision
  'computer vision': 'science-cs-vision',
  'image recognition': 'science-cs-vision',
  'image generation': 'science-cs-vision',

  // Robotics
  robotics: 'science-cs-robotics',
  'autonomous systems': 'science-cs-robotics',

  // Reinforcement Learning
  'reinforcement learning': 'science-cs-reinforcement',
  'game ai': 'science-cs-reinforcement',

  // Safety & Ethics
  'ai safety': 'policy-safety-technical',
  'ai alignment': 'policy-ethics-alignment',
  alignment: 'policy-ethics-alignment',
  safety: 'policy-safety-technical',
  ethics: 'policy-ethics-alignment',
  'ai ethics': 'policy-ethics-alignment',
  'existential risk': 'policy-safety-existential',

  // Policy
  'ai policy': 'policy-regulation-ai-safety',
  'ai governance': 'policy-regulation-ai-safety',
  regulation: 'policy-regulation-ai-safety',

  // Healthcare
  healthcare: 'industry-healthcare-diagnostics',
  'medical ai': 'industry-healthcare-diagnostics',
  'drug discovery': 'industry-healthcare-drug-discovery',
  biotech: 'industry-healthcare-drug-discovery',

  // Autonomous Vehicles
  'autonomous vehicles': 'industry-automotive-av',
  'self-driving': 'industry-automotive-av',

  // Infrastructure
  'cloud computing': 'business-technology-cloud',
  infrastructure: 'business-technology-cloud',
  semiconductors: 'business-technology-semiconductors',
  chips: 'business-technology-semiconductors',
  hardware: 'business-technology-hardware',

  // Research
  research: 'research-academic-papers',
  'open source': 'research-opensource-models',
};

/**
 * Get subjects from a list of tags
 */
export function getSubjectsFromTags(tags: string[]): string[] {
  const subjects = new Set<string>();

  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (tagToSubject[normalized]) {
      subjects.add(tagToSubject[normalized]);
    }
  }

  return Array.from(subjects);
}

/**
 * Get subjects from a category
 */
export function getSubjectsFromCategory(category: string): string[] {
  const normalized = category.toUpperCase();
  return categoryToSubject[normalized] || [];
}

/**
 * Get subjects from focus areas
 */
export function getSubjectsFromFocusAreas(focusAreas: string[]): string[] {
  const subjects = new Set<string>();

  for (const area of focusAreas) {
    const normalized = area.toLowerCase().trim();
    if (focusAreaToSubject[normalized]) {
      subjects.add(focusAreaToSubject[normalized]);
    }
  }

  return Array.from(subjects);
}

/**
 * Infer subjects for a milestone based on all available data
 */
export function inferMilestoneSubjects(milestone: {
  category: string;
  tags: string[];
  title?: string;
  description?: string;
}): string[] {
  const subjects = new Set<string>();

  // From category
  const categorySubjects = getSubjectsFromCategory(milestone.category);
  categorySubjects.forEach((s) => subjects.add(s));

  // From tags
  const tagSubjects = getSubjectsFromTags(milestone.tags);
  tagSubjects.forEach((s) => subjects.add(s));

  return Array.from(subjects);
}

/**
 * Infer subjects for a person based on role and focus areas
 */
export function inferPersonSubjects(person: {
  role?: string;
  focusAreas: string[];
}): string[] {
  const subjects = new Set<string>();

  // From role
  if (person.role && roleToSubject[person.role.toLowerCase()]) {
    roleToSubject[person.role.toLowerCase()].forEach((s) => subjects.add(s));
  }

  // From focus areas
  const focusSubjects = getSubjectsFromFocusAreas(person.focusAreas);
  focusSubjects.forEach((s) => subjects.add(s));

  return Array.from(subjects);
}

/**
 * Infer subjects for an organization based on type and focus areas
 */
export function inferOrganizationSubjects(org: {
  type?: string;
  focusAreas: string[];
}): string[] {
  const subjects = new Set<string>();

  // From focus areas
  const focusSubjects = getSubjectsFromFocusAreas(org.focusAreas);
  focusSubjects.forEach((s) => subjects.add(s));

  // Default for companies
  if (org.type === 'company' && subjects.size === 0) {
    subjects.add('business-technology-software');
  }

  // Default for research labs
  if (org.type === 'research_lab' && subjects.size === 0) {
    subjects.add('research-corporate-labs');
  }

  // Default for universities
  if (org.type === 'university' && subjects.size === 0) {
    subjects.add('research-academic-papers');
  }

  return Array.from(subjects);
}
