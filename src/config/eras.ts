/**
 * Era Configuration for AI Timeline
 * Sprint SEO-3 Task 7 - Era/Decade Landing Pages
 *
 * Each era represents a significant period in AI history with its own
 * characteristics, key developments, and notable figures.
 */

export interface EraConfig {
  /** URL slug (e.g., "1950s") */
  slug: string;
  /** Display title */
  title: string;
  /** Short tagline for the era */
  tagline: string;
  /** Detailed description (2-3 paragraphs) */
  description: string;
  /** Start date (inclusive) */
  startDate: string;
  /** End date (inclusive) */
  endDate: string;
  /** Key themes/topics of this era */
  themes: string[];
  /** SEO meta description */
  metaDescription: string;
  /** Canonical path */
  path: string;
}

/**
 * AI History Eras Configuration
 * Organized chronologically from earliest to most recent
 */
export const ERAS: EraConfig[] = [
  {
    slug: '1950s',
    title: 'The 1950s: Foundations of AI',
    tagline: 'The Birth of Artificial Intelligence',
    description: `The 1950s marked the birth of artificial intelligence as a formal field of study. In 1950, Alan Turing published his seminal paper "Computing Machinery and Intelligence," introducing the famous Turing Test as a measure of machine intelligence. This decade saw the theoretical groundwork that would shape AI for generations.

The pivotal moment came in 1956 at the Dartmouth Conference, where John McCarthy, Marvin Minsky, Claude Shannon, and Nathaniel Rochester coined the term "artificial intelligence" and established it as an academic discipline. Early programs like the Logic Theorist (1956) demonstrated that machines could perform tasks previously thought to require human intelligence.

This era was characterized by unbridled optimism about AI's potential, with researchers predicting human-level AI within a generation. While these predictions proved premature, the foundational concepts established in the 1950s—symbolic reasoning, search algorithms, and the computational theory of mind—continue to influence AI research today.`,
    startDate: '1950-01-01',
    endDate: '1959-12-31',
    themes: ['Turing Test', 'Dartmouth Conference', 'Symbolic AI', 'Logic Theorist', 'Early Computing'],
    metaDescription: 'Explore the 1950s foundations of AI: the Turing Test, Dartmouth Conference, and the birth of artificial intelligence as a field.',
    path: '/timeline/1950s',
  },
  {
    slug: '1960s',
    title: 'The 1960s: Early AI & ELIZA',
    tagline: 'Natural Language and Expert Dreams',
    description: `The 1960s saw AI move from theoretical concepts to working programs that captured the public imagination. ELIZA (1966), created by Joseph Weizenbaum at MIT, became the first chatbot to simulate conversation, demonstrating natural language processing in a way that fascinated and concerned its creator when users formed emotional attachments to the program.

This decade witnessed significant advances in problem-solving and game-playing AI. Programs like SHRDLU showed AI could understand and manipulate a simulated world through natural language. The General Problem Solver attempted to create a universal reasoning system, while work on semantic networks laid groundwork for knowledge representation.

Government funding, particularly from DARPA, fueled ambitious projects. However, the decade also planted seeds of the first AI winter, as the gap between promises and deliverables began to widen. Machine translation, in particular, failed to meet expectations, leading to funding cuts that foreshadowed challenges ahead.`,
    startDate: '1960-01-01',
    endDate: '1969-12-31',
    themes: ['ELIZA', 'SHRDLU', 'Natural Language Processing', 'DARPA Funding', 'Semantic Networks'],
    metaDescription: 'Discover 1960s AI history: ELIZA chatbot, early NLP, SHRDLU, and the ambitious AI projects that shaped the field.',
    path: '/timeline/1960s',
  },
  {
    slug: '1970s',
    title: 'The 1970s: First AI Winter',
    tagline: 'Challenges and Course Corrections',
    description: `The 1970s brought the first "AI Winter"—a period of reduced funding and interest following the failure of early AI to meet its ambitious promises. The 1973 Lighthill Report in the UK was particularly devastating, criticizing AI research and leading to significant funding cuts across Europe.

Despite setbacks, important work continued. Expert systems began to emerge as a practical application of AI, with MYCIN (1972) demonstrating that AI could match human experts in medical diagnosis. Knowledge representation advanced with the development of frames and scripts for understanding context and common sense.

The decade also saw foundational work in machine learning and neural networks, though these approaches wouldn't flourish until decades later. Researchers like Geoffrey Hinton began exploring connectionist approaches that would eventually lead to the deep learning revolution.`,
    startDate: '1970-01-01',
    endDate: '1979-12-31',
    themes: ['AI Winter', 'Lighthill Report', 'MYCIN', 'Expert Systems', 'Knowledge Representation'],
    metaDescription: 'Learn about the 1970s AI Winter: the Lighthill Report, early expert systems like MYCIN, and how AI research adapted to challenges.',
    path: '/timeline/1970s',
  },
  {
    slug: '1980s',
    title: 'The 1980s: Expert Systems',
    tagline: 'Commercial AI and Knowledge Engineering',
    description: `The 1980s witnessed AI's first major commercial boom, driven by expert systems—programs that encoded human expertise into rule-based systems. Companies like Symbolics and Lisp Machines Inc. sold specialized AI hardware, while corporations invested billions in AI research and deployment.

Expert systems like R1/XCON at Digital Equipment Corporation demonstrated real business value, saving millions in computer configuration. Japan's Fifth Generation Computer Project and similar initiatives in the US and Europe sparked an international AI race, with governments pouring resources into ambitious research programs.

However, the decade ended with another AI winter. Expert systems proved brittle and expensive to maintain. The specialized hardware market collapsed as general-purpose computers became more powerful. By 1987, the AI industry was in retreat, with many startups failing and corporate AI labs closing. Yet this period advanced knowledge engineering and laid groundwork for future practical applications.`,
    startDate: '1980-01-01',
    endDate: '1989-12-31',
    themes: ['Expert Systems', 'Lisp Machines', 'Fifth Generation Project', 'Knowledge Engineering', 'Commercial AI'],
    metaDescription: 'Explore 1980s AI: the expert systems boom, Lisp machines, Fifth Generation Project, and the commercial AI revolution.',
    path: '/timeline/1980s',
  },
  {
    slug: '1990s',
    title: 'The 1990s: Machine Learning Rise',
    tagline: 'Data-Driven Intelligence Emerges',
    description: `The 1990s marked a fundamental shift in AI from knowledge-based to data-driven approaches. Machine learning moved from the margins to the mainstream, with statistical methods and neural networks gaining traction as computing power increased and data became more available.

This decade saw landmark achievements: IBM's Deep Blue defeated world chess champion Garry Kasparov in 1997, demonstrating AI could excel at complex strategic tasks. Support Vector Machines (SVMs) and other statistical learning methods provided powerful new tools. The backpropagation algorithm, refined since the 1980s, enabled deeper neural networks.

The rise of the internet created new opportunities and challenges for AI. Search engines like early Google used machine learning for ranking, while e-commerce sites pioneered recommendation systems. Natural language processing advanced with statistical approaches, moving away from the rule-based systems of earlier decades.`,
    startDate: '1990-01-01',
    endDate: '1999-12-31',
    themes: ['Deep Blue', 'Machine Learning', 'Statistical Methods', 'Internet Era', 'Neural Networks Revival'],
    metaDescription: 'Discover 1990s AI breakthroughs: Deep Blue vs Kasparov, machine learning rise, and the internet era of artificial intelligence.',
    path: '/timeline/1990s',
  },
  {
    slug: '2000s',
    title: 'The 2000s: Big Data Era',
    tagline: 'Scale, Data, and Practical AI',
    description: `The 2000s saw AI become increasingly integrated into everyday life through practical applications. Google's search engine, Netflix's recommendation system, and Amazon's product suggestions brought AI to billions of users. The focus shifted from achieving artificial general intelligence to solving specific, valuable problems.

Big data transformed machine learning. With internet-scale datasets, algorithms that had existed for decades suddenly became practical. The Netflix Prize competition (2006-2009) showcased how machine learning could dramatically improve recommendations, spurring industry investment in AI talent and research.

This decade also saw crucial advances in deep learning foundations. GPUs were first used for neural network training, and researchers like Geoffrey Hinton, Yann LeCun, and Yoshua Bengio continued developing techniques that would later revolutionize the field. The ImageNet dataset was created in 2009, setting the stage for the deep learning breakthroughs to come.`,
    startDate: '2000-01-01',
    endDate: '2009-12-31',
    themes: ['Big Data', 'Google Search', 'Netflix Prize', 'GPU Computing', 'ImageNet'],
    metaDescription: 'Explore 2000s AI: big data revolution, Google and Netflix AI, GPU computing, and the foundations of deep learning.',
    path: '/timeline/2000s',
  },
  {
    slug: '2010s',
    title: 'The 2010s: Deep Learning Revolution',
    tagline: 'Neural Networks Transform Everything',
    description: `The 2010s witnessed the deep learning revolution that transformed artificial intelligence. In 2012, AlexNet's dominant victory in the ImageNet competition proved that deep neural networks could dramatically outperform traditional computer vision methods, igniting a research explosion that continues today.

AI achieved superhuman performance in increasingly complex domains. DeepMind's AlphaGo defeated world Go champion Lee Sedol in 2016, a milestone many thought decades away. Natural language processing was revolutionized by transformer architectures (2017) and models like BERT (2018), enabling unprecedented language understanding.

This decade saw AI move from research labs to ubiquitous deployment. Voice assistants, autonomous vehicles, facial recognition, and medical AI became reality. Tech giants invested billions in AI research, while concerns about AI ethics, bias, and safety entered mainstream discourse. The groundwork was laid for the even more dramatic advances of the 2020s.`,
    startDate: '2010-01-01',
    endDate: '2019-12-31',
    themes: ['Deep Learning', 'AlexNet', 'AlphaGo', 'Transformers', 'AI Ethics', 'Computer Vision'],
    metaDescription: 'Discover the 2010s deep learning revolution: AlexNet, AlphaGo, transformers, and how neural networks transformed AI.',
    path: '/timeline/2010s',
  },
  {
    slug: '2020s',
    title: 'The 2020s: Large Language Models',
    tagline: 'Generative AI Changes Everything',
    description: `The 2020s have been defined by the emergence of large language models (LLMs) and generative AI that have captured global attention. GPT-3's release in 2020 demonstrated that scaling language models could produce remarkably capable systems, while ChatGPT's 2022 launch brought AI into mainstream consciousness like never before.

Generative AI has expanded beyond text to images (DALL-E, Midjourney, Stable Diffusion), code (GitHub Copilot), video, and more. These models have sparked both excitement about AI's potential and serious debates about job displacement, copyright, misinformation, and AI safety. The pace of advancement has exceeded most predictions.

This era has seen unprecedented investment in AI, with companies racing to develop more powerful models while researchers and policymakers grapple with governance challenges. The emergence of multimodal models, AI agents, and early signs of artificial general intelligence capabilities suggest we are at an inflection point in AI history.`,
    startDate: '2020-01-01',
    endDate: '2029-12-31',
    themes: ['Large Language Models', 'GPT', 'ChatGPT', 'Generative AI', 'AI Safety', 'Multimodal AI'],
    metaDescription: 'Explore the 2020s AI revolution: GPT, ChatGPT, generative AI, and how large language models are transforming technology and society.',
    path: '/timeline/2020s',
  },
];

/**
 * Get era configuration by slug
 */
export function getEraBySlug(slug: string): EraConfig | undefined {
  return ERAS.find((era) => era.slug === slug);
}

/**
 * Get all era slugs (for route generation and sitemap)
 */
export function getAllEraSlugs(): string[] {
  return ERAS.map((era) => era.slug);
}

/**
 * Get date range for an era
 */
export function getEraDateRange(slug: string): { start: Date; end: Date } | undefined {
  const era = getEraBySlug(slug);
  if (!era) return undefined;
  return {
    start: new Date(era.startDate),
    end: new Date(era.endDate),
  };
}
