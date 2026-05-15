import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Let AI Explain AI';
const SITE_URL = 'https://letaiexplainai.com';
const DEFAULT_IMAGE = 'https://letaiexplainai.com/og-image.png';
const DEFAULT_DESCRIPTION = 'Explore the history of artificial intelligence from the 1940s to today. Interactive timeline, key figures, and educational content.';

export interface SEOProps {
  /** Page title (will be appended with site name) */
  title?: string;
  /** Meta description */
  description?: string;
  /** Full canonical URL (e.g., https://letaiexplainai.com/people/sam-altman) */
  canonical?: string;
  /** Open Graph type (website, article, profile) */
  type?: 'website' | 'article' | 'profile';
  /** Open Graph image URL */
  image?: string;
  /** JSON-LD structured data object (single or array for multiple schemas) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Don't index this page */
  noIndex?: boolean;
}

/** FAQ item for generating FAQ schema */
export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * SEO Component
 *
 * Manages dynamic meta tags for SEO using react-helmet-async.
 * Use on each page to set unique title, description, and canonical URL.
 *
 * @example
 * // Basic usage
 * <SEO
 *   title="Sam Altman"
 *   description="CEO of OpenAI..."
 *   canonical="https://letaiexplainai.com/people/sam-altman"
 * />
 *
 * @example
 * // With JSON-LD structured data
 * <SEO
 *   title="OpenAI"
 *   description="AI research company..."
 *   canonical="https://letaiexplainai.com/organizations/openai"
 *   jsonLd={{
 *     "@context": "https://schema.org",
 *     "@type": "Organization",
 *     name: "OpenAI",
 *     ...
 *   }}
 * />
 */
export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  type = 'website',
  image = DEFAULT_IMAGE,
  jsonLd,
  noIndex = false,
}: SEOProps) {
  // Format title with site name
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

  // Ensure canonical is absolute URL
  const canonicalUrl = canonical || SITE_URL;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        Array.isArray(jsonLd) ? (
          jsonLd.map((schema, index) => (
            <script key={index} type="application/ld+json">
              {JSON.stringify(schema)}
            </script>
          ))
        ) : (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )
      )}
    </Helmet>
  );
}

/**
 * Helper: Generate Person JSON-LD schema
 */
export function generatePersonJsonLd(person: {
  name: string;
  description: string;
  jobTitle?: string;
  worksFor?: string;
  url: string;
  image?: string;
  sameAs?: string[];
  dateModified?: string; // Sprint SEO-5: E-E-A-T freshness signal
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: person.description,
    url: person.url,
  };

  // Sprint SEO-5: Add dateModified for E-E-A-T signals
  if (person.dateModified) {
    schema.dateModified = person.dateModified;
  }

  if (person.jobTitle) {
    schema.jobTitle = person.jobTitle;
  }

  if (person.worksFor) {
    schema.worksFor = {
      '@type': 'Organization',
      name: person.worksFor,
    };
  }

  if (person.image) {
    schema.image = person.image;
  }

  if (person.sameAs && person.sameAs.length > 0) {
    schema.sameAs = person.sameAs;
  }

  return schema;
}

/**
 * Helper: Generate Organization JSON-LD schema
 */
export function generateOrganizationJsonLd(org: {
  name: string;
  description: string;
  url: string;
  logo?: string;
  foundingDate?: string;
  location?: string;
  sameAs?: string[];
  dateModified?: string; // Sprint SEO-5: E-E-A-T freshness signal
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    description: org.description,
    url: org.url,
  };

  // Sprint SEO-5: Add dateModified for E-E-A-T signals
  if (org.dateModified) {
    schema.dateModified = org.dateModified;
  }

  if (org.logo) {
    schema.logo = org.logo;
  }

  if (org.foundingDate) {
    schema.foundingDate = org.foundingDate;
  }

  if (org.location) {
    schema.location = {
      '@type': 'Place',
      address: org.location,
    };
  }

  if (org.sameAs && org.sameAs.length > 0) {
    schema.sameAs = org.sameAs;
  }

  return schema;
}

/**
 * Helper: Generate FAQ JSON-LD schema
 *
 * Creates a FAQPage schema for Google rich results.
 * FAQ schema can help pages get cited in AI Overviews.
 *
 * @example
 * const faqSchema = generateFAQJsonLd([
 *   { question: "Who is Sam Altman?", answer: "Sam Altman is the CEO of OpenAI..." },
 *   { question: "What is Sam Altman known for?", answer: "He is known for leading OpenAI..." }
 * ]);
 */
export function generateFAQJsonLd(faqs: FAQItem[]): Record<string, unknown> | null {
  // Filter out empty questions/answers
  const validFaqs = faqs.filter(
    (faq) => faq.question?.trim() && faq.answer?.trim()
  );

  if (validFaqs.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Helper: Generate FAQ items for a Person
 *
 * Creates common FAQ questions from person data.
 */
export function generatePersonFAQs(person: {
  canonicalName: string;
  shortBio: string;
  contributions?: string | null;
  currentRole?: string | null;
  currentOrgName?: string | null;
  background?: string | null;
}): FAQItem[] {
  const faqs: FAQItem[] = [];

  // Who is X?
  if (person.shortBio) {
    faqs.push({
      question: `Who is ${person.canonicalName}?`,
      answer: person.shortBio.slice(0, 300) + (person.shortBio.length > 300 ? '...' : ''),
    });
  }

  // What is X known for?
  if (person.contributions) {
    faqs.push({
      question: `What is ${person.canonicalName} known for?`,
      answer: person.contributions.slice(0, 300) + (person.contributions.length > 300 ? '...' : ''),
    });
  }

  // Where does X work?
  if (person.currentRole && person.currentOrgName) {
    faqs.push({
      question: `Where does ${person.canonicalName} work?`,
      answer: `${person.canonicalName} is currently ${person.currentRole} at ${person.currentOrgName}.`,
    });
  }

  // What is X's background?
  if (person.background) {
    faqs.push({
      question: `What is ${person.canonicalName}'s background?`,
      answer: person.background.slice(0, 300) + (person.background.length > 300 ? '...' : ''),
    });
  }

  return faqs;
}

/**
 * Helper: Generate FAQ items for an Organization
 *
 * Creates common FAQ questions from organization data.
 */
export function generateOrganizationFAQs(org: {
  name: string;
  shortDescription: string;
  mission?: string | null;
  foundedYear?: number | null;
  headquarters?: string | null;
  products?: string[] | null;
}): FAQItem[] {
  const faqs: FAQItem[] = [];

  // What is X?
  if (org.shortDescription) {
    faqs.push({
      question: `What is ${org.name}?`,
      answer: org.shortDescription.slice(0, 300) + (org.shortDescription.length > 300 ? '...' : ''),
    });
  }

  // When was X founded?
  if (org.foundedYear) {
    faqs.push({
      question: `When was ${org.name} founded?`,
      answer: `${org.name} was founded in ${org.foundedYear}.`,
    });
  }

  // Where is X headquartered?
  if (org.headquarters) {
    faqs.push({
      question: `Where is ${org.name} headquartered?`,
      answer: `${org.name} is headquartered in ${org.headquarters}.`,
    });
  }

  // What is X's mission?
  if (org.mission) {
    faqs.push({
      question: `What is ${org.name}'s mission?`,
      answer: org.mission.slice(0, 300) + (org.mission.length > 300 ? '...' : ''),
    });
  }

  // What products does X make?
  if (org.products && org.products.length > 0) {
    faqs.push({
      question: `What products does ${org.name} make?`,
      answer: `${org.name}'s key products include ${org.products.slice(0, 5).join(', ')}.`,
    });
  }

  return faqs;
}

/**
 * Helper: Generate FAQ items for Glossary page
 *
 * Creates FAQ questions from glossary terms data.
 */
export function generateGlossaryFAQs(terms: {
  term: string;
  shortDefinition: string;
}[]): FAQItem[] {
  // Take up to 5 key terms for FAQ schema
  return terms.slice(0, 5).map((t) => ({
    question: `What is ${t.term}?`,
    answer: t.shortDefinition.slice(0, 300) + (t.shortDefinition.length > 300 ? '...' : ''),
  }));
}

/**
 * Timeline milestone for ItemList schema
 */
export interface TimelineMilestoneForSchema {
  id: string;
  title: string;
  date: string | Date;
  description?: string;
  organization?: string | null;
}

/**
 * Helper: Generate ItemList JSON-LD schema for Timeline pages
 *
 * Each list item is a `CreativeWork`, not an `Event`. Historical AI
 * milestones (papers, model launches, product announcements) do not satisfy
 * schema.org/Event semantics — Event requires `location`, `endDate`,
 * `offers`, etc., and Google Search Console flags every page that omits
 * them. CreativeWork is the correct umbrella for research outputs and
 * announcements.
 *
 * Limits to 100 items to avoid schema bloat.
 */
export function generateTimelineItemListJsonLd(
  milestones: TimelineMilestoneForSchema[],
  listName: string,
  listDescription?: string
): Record<string, unknown> {
  const limitedMilestones = milestones.slice(0, 100);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    description: listDescription || `Interactive timeline of ${milestones.length}+ AI milestones`,
    numberOfItems: milestones.length,
    itemListElement: limitedMilestones.map((milestone, index) => {
      const date = milestone.date instanceof Date
        ? milestone.date.toISOString().split('T')[0]
        : new Date(milestone.date).toISOString().split('T')[0];

      const work: Record<string, unknown> = {
        '@type': 'CreativeWork',
        name: milestone.title,
        dateCreated: date,
        url: `${SITE_URL}/events/${milestone.id}`,
        description: milestone.description?.slice(0, 200) || undefined,
      };

      if (milestone.organization) {
        work.creator = {
          '@type': 'Organization',
          name: milestone.organization,
        };
      }

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: work,
      };
    }),
  };
}

// =============================================================================
// Sprint Blog-5 — Article + BreadcrumbList schemas
// =============================================================================

/**
 * Article JSON-LD for blog posts.
 *
 * Uses schema.org `Article`. Google's rich-results guidelines require
 * headline ≤110 chars, dateModified (even if ~= datePublished) so freshness
 * can be signalled, and a publisher with a logo. `timeRequired` takes ISO
 * 8601 duration format (PT{minutes}M).
 */
export function generateArticleJsonLd(input: {
  url: string;
  title: string;
  description: string;
  image?: string;
  datePublished?: string | Date | null;
  dateModified?: string | Date | null;
  author: { name: string; url?: string };
  tags?: string[];
  wordCount?: number;
  readingMinutes?: number;
}): Record<string, unknown> {
  const toIso = (d: string | Date | null | undefined): string | undefined => {
    if (!d) return undefined;
    const date = d instanceof Date ? d : new Date(d);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title.slice(0, 110),
    description: input.description,
    mainEntityOfPage: input.url,
    author: {
      '@type': 'Person',
      name: input.author.name,
      ...(input.author.url ? { url: input.author.url } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
  };

  const published = toIso(input.datePublished);
  const modified = toIso(input.dateModified);
  if (published) schema.datePublished = published;
  if (modified) schema.dateModified = modified;
  if (input.image) schema.image = input.image;
  if (input.tags && input.tags.length > 0) schema.keywords = input.tags.join(', ');
  if (typeof input.wordCount === 'number' && input.wordCount > 0) schema.wordCount = input.wordCount;
  if (typeof input.readingMinutes === 'number' && input.readingMinutes > 0) {
    schema.timeRequired = `PT${input.readingMinutes}M`;
  }

  return schema;
}

/**
 * BreadcrumbList JSON-LD. Crumbs render in the order provided; each gets
 * a 1-indexed position per schema.org requirements.
 *
 * The visible breadcrumb component (BlogBreadcrumbs) MUST emit the same
 * labels and URL order — Google penalises schema/visible-content mismatch.
 */
export function generateBreadcrumbListJsonLd(
  crumbs: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export default SEO;
