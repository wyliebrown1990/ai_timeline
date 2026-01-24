/**
 * Timeline Filter Configuration for SEO Landing Pages
 * Sprint TD-2 - Dedicated Landing Pages for Target Keywords
 *
 * Defines filters for company-specific and category-specific timeline views.
 * Each filter creates a dedicated URL that targets specific search queries.
 */

export type FilterType = 'company' | 'category' | 'dateRange';

export interface TimelineFilterConfig {
  /** URL slug (e.g., "openai") */
  slug: string;
  /** Filter type for API queries */
  type: FilterType;
  /** Display title for the page */
  title: string;
  /** Subtitle/tagline */
  tagline: string;
  /** Description for the page content */
  description: string;
  /** SEO meta description */
  metaDescription: string;
  /** Filter value to pass to API (organization slug, category, or date range) */
  filterValue: string;
  /** Optional additional filter params */
  additionalFilters?: Record<string, string>;
  /** Canonical path */
  path: string;
  /** Related keywords for internal linking */
  relatedKeywords: string[];
  /** Primary color theme (tailwind color name) */
  themeColor: 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'cyan';
}

/**
 * Company-specific timeline filters
 * Target queries like "openai timeline", "anthropic history"
 */
export const COMPANY_FILTERS: TimelineFilterConfig[] = [
  {
    slug: 'openai',
    type: 'company',
    title: 'OpenAI Timeline: Complete History',
    tagline: 'From GPT to o1: Every OpenAI Milestone',
    description: `Explore the complete history of OpenAI, from its founding in 2015 to becoming the leader in generative AI. Track every major release including GPT-2, GPT-3, ChatGPT, GPT-4, and beyond.`,
    metaDescription: 'Complete OpenAI timeline from 2015 to 2026. Every GPT release, ChatGPT launch, and major milestone in OpenAI history. Interactive and updated weekly.',
    filterValue: 'openai',
    path: '/timeline/openai',
    relatedKeywords: ['gpt timeline', 'chatgpt history', 'openai models', 'sam altman'],
    themeColor: 'green',
  },
  {
    slug: 'anthropic',
    type: 'company',
    title: 'Anthropic Timeline: Claude AI History',
    tagline: 'Constitutional AI and the Rise of Claude',
    description: `Follow Anthropic's journey from its founding by former OpenAI researchers to creating Claude, one of the most capable AI assistants. Explore their pioneering work on AI safety and constitutional AI.`,
    metaDescription: 'Anthropic timeline: Claude AI releases, Constitutional AI research, and company milestones from 2021 to present. Interactive history updated weekly.',
    filterValue: 'anthropic',
    path: '/timeline/anthropic',
    relatedKeywords: ['claude ai history', 'anthropic founding', 'constitutional ai', 'dario amodei'],
    themeColor: 'orange',
  },
  {
    slug: 'google',
    type: 'company',
    title: 'Google AI Timeline: From DeepMind to Gemini',
    tagline: 'Search Giant to AI Powerhouse',
    description: `Discover Google's AI evolution from early machine learning in search to acquiring DeepMind, launching Bard, and unveiling Gemini. Track their research breakthroughs and product launches.`,
    metaDescription: 'Google AI timeline: DeepMind acquisition, AlphaGo, Bard, Gemini, and all major AI milestones. Complete history from 2000s to 2026.',
    filterValue: 'google',
    path: '/timeline/google',
    relatedKeywords: ['google ai history', 'deepmind timeline', 'gemini ai', 'bard history'],
    themeColor: 'blue',
  },
  {
    slug: 'meta',
    type: 'company',
    title: 'Meta AI Timeline: LLaMA and Open Source AI',
    tagline: 'Facebook to Meta: Leading Open Source AI',
    description: `Explore Meta's AI journey from Facebook AI Research (FAIR) to becoming a leader in open-source AI with LLaMA models. See how they're democratizing access to powerful language models.`,
    metaDescription: 'Meta AI timeline: LLaMA releases, FAIR research, and Facebook/Meta AI history. Complete timeline of open-source AI contributions.',
    filterValue: 'meta',
    path: '/timeline/meta',
    relatedKeywords: ['llama ai history', 'meta ai models', 'fair research', 'yann lecun'],
    themeColor: 'blue',
  },
];

/**
 * Category-specific timeline filters
 * Target queries like "generative ai timeline", "llm history"
 */
export const CATEGORY_FILTERS: TimelineFilterConfig[] = [
  {
    slug: 'generative-ai',
    type: 'category',
    title: 'Generative AI Timeline: Text, Image & Video',
    tagline: 'The Creative AI Revolution',
    description: `Explore the explosive growth of generative AI from early GANs to ChatGPT, DALL-E, Midjourney, and Sora. See how AI learned to create text, images, code, music, and video.`,
    metaDescription: 'Generative AI timeline: ChatGPT, DALL-E, Midjourney, Stable Diffusion, and all major generative AI milestones from 2014 to 2026.',
    filterValue: 'GENERATIVE_AI',
    path: '/timeline/generative-ai',
    relatedKeywords: ['ai art history', 'text to image ai', 'ai content generation', 'creative ai'],
    themeColor: 'purple',
  },
  {
    slug: 'llm',
    type: 'category',
    title: 'Large Language Models Timeline: From GPT to Today',
    tagline: 'The Rise of Conversational AI',
    description: `Track the evolution of large language models from early transformer architectures to GPT-4, Claude, Gemini, and beyond. Understand how LLMs became the foundation of modern AI.`,
    metaDescription: 'LLM timeline: GPT, BERT, Claude, Gemini, LLaMA, and all major large language model releases. Complete history of language AI.',
    filterValue: 'MODEL_RELEASE',
    path: '/timeline/llm',
    relatedKeywords: ['language model history', 'transformer timeline', 'chatbot evolution', 'nlp breakthroughs'],
    themeColor: 'cyan',
  },
  {
    slug: 'models',
    type: 'category',
    title: 'AI Models Timeline: Every Major Release',
    tagline: 'The Complete Model Release History',
    description: `A comprehensive timeline of every significant AI model release. From academic papers to commercial products, track the models that shaped the AI industry.`,
    metaDescription: 'AI models timeline: Every major model release from research labs and companies. GPT, Claude, Gemini, LLaMA, Stable Diffusion, and more.',
    filterValue: 'MODEL_RELEASE',
    path: '/timeline/models',
    relatedKeywords: ['ai model releases', 'foundation models', 'open source ai models', 'commercial ai'],
    themeColor: 'orange',
  },
  {
    slug: 'complete-history',
    type: 'category',
    title: 'Complete AI Timeline: 1950 to Present',
    tagline: 'The Full History of Artificial Intelligence',
    description: `The definitive timeline of artificial intelligence from Alan Turing's foundational work to today's most advanced AI systems. Every era, every breakthrough, every milestone.`,
    metaDescription: 'Complete AI timeline from 1950 to 2026. From Turing to GPT-5, every major milestone in artificial intelligence history. Interactive and comprehensive.',
    filterValue: 'all',
    path: '/timeline/complete-history',
    relatedKeywords: ['ai history', 'artificial intelligence timeline', 'ai evolution', 'history of ai'],
    themeColor: 'orange',
  },
];

/**
 * Date range filters for specific periods
 * Target queries like "ai breakthroughs 2019-2024"
 */
export const DATE_RANGE_FILTERS: TimelineFilterConfig[] = [
  {
    slug: '2019-2024',
    type: 'dateRange',
    title: 'Major AI Breakthroughs Timeline 2019-2024',
    tagline: 'The Years That Changed Everything',
    description: `The most transformative period in AI history. From GPT-2's emergence to ChatGPT's mainstream breakthrough and beyond. Explore the milestones that reshaped technology and society.`,
    metaDescription: 'AI breakthroughs 2019-2024: GPT-3, ChatGPT, DALL-E, Claude, Gemini, and every major AI milestone of the modern AI era.',
    filterValue: '2019-01-01,2024-12-31',
    path: '/timeline/2019-2024',
    relatedKeywords: ['recent ai breakthroughs', 'ai progress 2020s', 'chatgpt era', 'modern ai'],
    themeColor: 'red',
  },
];

/**
 * All filter configurations combined
 */
export const ALL_FILTERS: TimelineFilterConfig[] = [
  ...COMPANY_FILTERS,
  ...CATEGORY_FILTERS,
  ...DATE_RANGE_FILTERS,
];

/**
 * Get filter configuration by slug
 */
export function getFilterBySlug(slug: string): TimelineFilterConfig | undefined {
  return ALL_FILTERS.find((filter) => filter.slug === slug);
}

/**
 * Get all filter slugs (for route generation and sitemap)
 */
export function getAllFilterSlugs(): string[] {
  return ALL_FILTERS.map((filter) => filter.slug);
}

/**
 * Check if a slug is a filter (not an era)
 */
export function isFilterSlug(slug: string): boolean {
  return ALL_FILTERS.some((filter) => filter.slug === slug);
}
