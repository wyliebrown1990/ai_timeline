/**
 * ExplainedPage Component
 * Sprint SEO-4 Task 3 - "X Explained" Deep-Dive Pages
 *
 * Deep-dive explanation pages for AI concepts with:
 * - Quick answer for featured snippets
 * - Full definition and explanation
 * - Real-world examples
 * - Key figures who contributed
 * - Related concepts and timeline events
 * - FAQ schema for SEO
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SEO, generateFAQJsonLd } from '../components/SEO';
import {
  ArrowLeft,
  BookOpen,
  User,
  Calendar,
  Tag,
  TrendingUp,
  Lightbulb,
  MessageCircle,
  ChevronRight,
  History,
  Settings,
} from 'lucide-react';
import {
  explainedApi,
  type ExplainedPageData,
  type ExplainedKeyFigure,
  type ExplainedRelatedTerm,
  type ExplainedMilestone,
  type ExplainedFAQ,
} from '../services/api';

/**
 * Loading skeleton
 */
function ExplainedSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-6 w-full max-w-xl bg-gray-200 dark:bg-gray-700 rounded mb-8" />
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="space-y-6">
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Not found state
 */
function ExplainedNotFound({ slug }: { slug: string }) {
  return (
    <div className="text-center py-16">
      <BookOpen className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Term Not Found
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We couldn't find an explanation for "{slug}".
      </p>
      <Link
        to="/glossary"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse Glossary
      </Link>
    </div>
  );
}

/**
 * Quick answer card (for featured snippets)
 */
function QuickAnswerCard({ answer }: { answer: string }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Quick Answer
        </span>
      </div>
      <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
        {answer}
      </p>
    </div>
  );
}

/**
 * Section card component
 */
function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/**
 * Difficulty badge
 */
function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const labels = ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert'];
  const colors = [
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  ];

  const index = Math.min(Math.max(difficulty - 1, 0), 4);

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[index]}`}>
      {labels[index]}
    </span>
  );
}

/**
 * Category badge
 */
function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    model_architecture: 'Model Architecture',
    technical_term: 'Technical Term',
    core_concept: 'Core Concept',
    business_term: 'Business Term',
  };

  return (
    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
      {labels[category] || category}
    </span>
  );
}

/**
 * Key figures section
 */
function KeyFiguresSection({ figures }: { figures: ExplainedKeyFigure[] }) {
  if (figures.length === 0) return null;

  return (
    <SectionCard icon={User} title="Key Figures">
      <div className="space-y-4">
        {figures.map((figure) => (
          <Link
            key={figure.id}
            to={`/people/${figure.slug}`}
            className="flex items-start gap-4 p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            {figure.imageUrl ? (
              <img
                src={figure.imageUrl}
                alt={figure.canonicalName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white">
                {figure.canonicalName}
              </div>
              {figure.contributionNote && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  {figure.contributionNote}
                </div>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {figure.shortBio}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/**
 * Related terms section
 */
function RelatedTermsSection({ terms }: { terms: ExplainedRelatedTerm[] }) {
  if (terms.length === 0) return null;

  return (
    <SectionCard icon={Tag} title="Related Concepts">
      <div className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <Link
            key={term.id}
            to={term.slug ? `/explained/${term.slug}` : `/glossary?term=${term.id}`}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
            title={term.shortDefinition}
          >
            {term.term}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/**
 * Related milestones section
 */
function RelatedMilestonesSection({ milestones }: { milestones: ExplainedMilestone[] }) {
  if (milestones.length === 0) return null;

  return (
    <SectionCard icon={Calendar} title="Timeline Events">
      <div className="space-y-3">
        {milestones.map((milestone) => (
          <Link
            key={milestone.id}
            to={`/timeline?highlight=${milestone.id}`}
            className="block p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                  {milestone.title}
                </div>
                {milestone.relevanceNote && (
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    {milestone.relevanceNote}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {new Date(milestone.date).getFullYear()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/**
 * FAQ section
 */
function FAQSection({ faqs }: { faqs: ExplainedFAQ[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (faqs.length === 0) return null;

  return (
    <SectionCard icon={MessageCircle} title="Frequently Asked Questions">
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white pr-4">
                {faq.question}
              </span>
              <ChevronRight
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  expandedIndex === index ? 'rotate-90' : ''
                }`}
              />
            </button>
            {expandedIndex === index && (
              <div className="px-4 pb-4 text-gray-600 dark:text-gray-300">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/**
 * Generate JSON-LD for explained page
 */
function generateExplainedJsonLd(data: ExplainedPageData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${data.term} Explained`,
    description: data.shortDefinition,
    url: data.canonicalUrl,
    dateModified: new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
    },
    mainEntity: {
      '@type': 'DefinedTerm',
      name: data.term,
      description: data.fullDefinition,
    },
    about: {
      '@type': 'Thing',
      name: data.term,
      description: data.shortDefinition,
    },
  };
}

/**
 * ExplainedPage - Main component
 */
export default function ExplainedPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ExplainedPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!slug) {
        setError('No term specified');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const pageData = await explainedApi.getBySlug(slug);
        setData(pageData);
      } catch (err) {
        console.error('[ExplainedPage] Error fetching data:', err);
        setError('Failed to load explanation');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ExplainedSkeleton />
      </div>
    );
  }

  // Error/not found state
  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ExplainedNotFound slug={slug || ''} />
      </div>
    );
  }

  const title = `${data.term} Explained`;
  const description = data.quickAnswer || data.shortDefinition;

  // Generate JSON-LD
  const articleJsonLd = generateExplainedJsonLd(data);
  const faqJsonLd = data.faqs.length > 0 ? generateFAQJsonLd(data.faqs) : null;

  // Combine JSON-LD schemas
  const combinedJsonLd = faqJsonLd
    ? [articleJsonLd, faqJsonLd]
    : articleJsonLd;

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical={data.canonicalUrl}
        jsonLd={combinedJsonLd}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">
            Home
          </Link>
          <span>/</span>
          <Link
            to="/glossary"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Glossary
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{data.term}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="flex items-center gap-2">
              <CategoryBadge category={data.category} />
              <DifficultyBadge difficulty={data.difficulty} />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {data.term}{' '}
            <span className="text-gray-400 dark:text-gray-600">Explained</span>
          </h1>
        </div>

        {/* Quick Answer */}
        {data.quickAnswer && (
          <div className="mb-8">
            <QuickAnswerCard answer={data.quickAnswer} />
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* What is X? */}
            <SectionCard icon={BookOpen} title={`What is ${data.term}?`}>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {data.fullDefinition}
              </p>
            </SectionCard>

            {/* History Section (AI-generated) */}
            {data.historySection && (
              <SectionCard icon={History} title={`History of ${data.term}`}>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
                  {data.historySection.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* How It Works Section (AI-generated) */}
            {data.howItWorksSection && (
              <SectionCard icon={Settings} title={`How ${data.term} Works`}>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
                  {data.howItWorksSection.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Example */}
            {data.example && (
              <SectionCard icon={Lightbulb} title="Real-World Example">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.example}
                </p>
              </SectionCard>
            )}

            {/* Business Context */}
            {data.businessContext && (
              <SectionCard icon={TrendingUp} title="Why It Matters">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.businessContext}
                </p>
              </SectionCard>
            )}

            {/* In Meeting Example */}
            {data.inMeetingExample && (
              <SectionCard icon={MessageCircle} title="How to Use in Conversation">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                  "{data.inMeetingExample}"
                </p>
              </SectionCard>
            )}

            {/* FAQ Section */}
            <FAQSection faqs={data.faqs} />
          </div>

          {/* Right column - sidebar */}
          <div className="space-y-6">
            {/* Stats card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                At a Glance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Difficulty</span>
                  <DifficultyBadge difficulty={data.difficulty} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Category</span>
                  <CategoryBadge category={data.category} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Key Figures</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.keyFigureCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Related Terms</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.relatedTermCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Timeline Events</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {data.stats.milestoneCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Figures */}
            <KeyFiguresSection figures={data.keyFigures} />

            {/* Related Terms */}
            <RelatedTermsSection terms={data.relatedTerms} />

            {/* Related Milestones */}
            <RelatedMilestonesSection milestones={data.relatedMilestones} />

            {/* View in glossary link */}
            <Link
              to={data.slug ? `/glossary/${data.slug}` : `/glossary?term=${data.id}`}
              className="block text-center py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
            >
              View in Glossary
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
