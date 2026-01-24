/**
 * GlossaryTermPage Component
 * Sprint SEO-3 - Dedicated glossary term pages for better SEO
 *
 * Features:
 * - Dedicated URL for each term (/glossary/:slug)
 * - Full SEO with structured data
 * - FAQ schema for AI Overviews
 * - Related terms cross-linking
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { SEO, generateFAQJsonLd } from '../components/SEO';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  MessageSquare,
  Lightbulb,
  Link2,
  ArrowRight,
  Clock,
  Users,
} from 'lucide-react';
import { glossaryApi, type GlossaryTerm, type GlossaryKeyFigure, type GlossaryLinkedMilestone } from '../services/api';
import { GLOSSARY_CATEGORY_LABELS } from '../types/glossary';
import { PrerequisitesSection, DifficultyBadge } from '../components/Learning';
import { CommentThread } from '../components/Comments';
import { RelatedBySubject } from '../components/RelatedBySubject';
import { useGlossary, useConceptProgress } from '../hooks';

/**
 * Loading skeleton for term page
 */
function TermSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-10 w-96 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Error state component
 */
function TermNotFound({ slug }: { slug: string }) {
  return (
    <div className="text-center py-16">
      <BookOpen className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Term Not Found
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We couldn't find a glossary term with the slug "{slug}".
      </p>
      <Link
        to="/glossary"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Glossary
      </Link>
    </div>
  );
}

/**
 * Generate FAQ data for a glossary term
 */
function generateTermFAQs(term: GlossaryTerm) {
  const faqs = [
    {
      question: `What is ${term.term}?`,
      answer: term.quickAnswer || term.shortDefinition,
    },
  ];

  if (term.businessContext) {
    faqs.push({
      question: `Why is ${term.term} important for business?`,
      answer: term.businessContext.slice(0, 300),
    });
  }

  if (term.example) {
    faqs.push({
      question: `What is an example of ${term.term}?`,
      answer: term.example.slice(0, 300),
    });
  }

  return faqs;
}

/**
 * GlossaryTermPage - Dedicated page for a single glossary term
 */
export default function GlossaryTermPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [keyFigures, setKeyFigures] = useState<GlossaryKeyFigure[]>([]);
  const [linkedMilestones, setLinkedMilestones] = useState<GlossaryLinkedMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: allTerms } = useGlossary();
  const { markConceptSeen, seenConceptIds } = useConceptProgress();

  // Fetch term by slug
  useEffect(() => {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    glossaryApi.getBySlug(slug)
      .then((data) => {
        setTerm(data);
        // Mark term as seen when viewed
        if (data?.id) {
          markConceptSeen(data.id);
          // Fetch key figures for this term
          glossaryApi.getKeyFigures(data.id)
            .then(setKeyFigures)
            .catch((err) => console.error('Failed to fetch key figures:', err));
          // Fetch linked milestones for this term (Sprint SEO-3)
          glossaryApi.getLinkedMilestones(data.id)
            .then(setLinkedMilestones)
            .catch((err) => console.error('Failed to fetch linked milestones:', err));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch glossary term:', err);
        setError(err.message || 'Failed to load term');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug, markConceptSeen]);

  // Get related terms - combine manually linked + same category, limit to 8
  const relatedTerms = useMemo(() => {
    if (!term || !allTerms) return [];

    // Start with manually linked terms
    const manuallyLinked = allTerms.filter((t) =>
      term.relatedTermIds?.includes(t.id)
    );

    // If we have fewer than 8, add terms from the same category
    const MAX_RELATED = 8;
    if (manuallyLinked.length >= MAX_RELATED) {
      return manuallyLinked.slice(0, MAX_RELATED);
    }

    // Get additional terms from same category
    const linkedIds = new Set(manuallyLinked.map((t) => t.id));
    const sameCategoryTerms = allTerms.filter(
      (t) =>
        t.category === term.category &&
        t.id !== term.id &&
        !linkedIds.has(t.id)
    );

    // Combine and limit
    return [...manuallyLinked, ...sameCategoryTerms].slice(0, MAX_RELATED);
  }, [term, allTerms]);

  // Navigate to another term
  const handleSelectTerm = (termId: string) => {
    const targetTerm = allTerms?.find((t) => t.id === termId);
    if (targetTerm?.slug) {
      navigate(`/glossary/${targetTerm.slug}`);
    } else {
      navigate(`/glossary?term=${termId}`);
    }
  };

  // Navigate to milestone
  const handleMilestoneClick = (milestoneId: string) => {
    navigate(`/timeline?milestone=${milestoneId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TermSkeleton />
        </div>
      </div>
    );
  }

  // Error/Not found state
  if (error || !term) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TermNotFound slug={slug || ''} />
        </div>
      </div>
    );
  }

  // Generate FAQ data for SEO
  const faqData = generateTermFAQs(term);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* SEO */}
      <SEO
        title={`${term.term} - AI Glossary | Let AI Explain AI`}
        description={term.quickAnswer || term.shortDefinition}
        canonical={`https://letaiexplainai.com/glossary/${term.slug || slug}`}
        type="article"
        jsonLd={[
          // DefinedTerm schema with relatedLink
          {
            '@context': 'https://schema.org',
            '@type': 'DefinedTerm',
            name: term.term,
            description: term.fullDefinition,
            inDefinedTermSet: {
              '@type': 'DefinedTermSet',
              name: 'AI Glossary',
              url: 'https://letaiexplainai.com/glossary',
            },
            // Related terms as relatedLink
            ...(relatedTerms.length > 0 && {
              relatedLink: relatedTerms
                .filter((t) => t.slug)
                .map((t) => `https://letaiexplainai.com/glossary/${t.slug}`),
            }),
            // Sprint SEO-5: E-E-A-T freshness signal
            dateModified: new Date(term.updatedAt).toISOString(),
          },
          // FAQ schema (filter out null)
          generateFAQJsonLd(faqData),
        ].filter((schema): schema is Record<string, unknown> => schema !== null)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          to="/glossary"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Glossary
        </Link>

        {/* Category and difficulty badges */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300">
            {GLOSSARY_CATEGORY_LABELS[term.category]}
          </span>
          {term.difficulty && (
            <DifficultyBadge difficulty={term.difficulty} size="sm" />
          )}
        </div>

        {/* Term title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
          {term.term}
        </h1>

        {/* Short definition - highlighted */}
        <div className="mb-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-blue-800 dark:text-blue-200 font-medium text-lg">
            {term.shortDefinition}
          </p>
        </div>

        {/* Quick Answer - for SEO featured snippets */}
        {term.quickAnswer && (
          <div className="mb-8 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                Quick Answer
              </span>
            </div>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {term.quickAnswer}
            </p>
          </div>
        )}

        {/* Prerequisites section */}
        {term.prerequisiteIds && term.prerequisiteIds.length > 0 && allTerms && (
          <PrerequisitesSection
            term={term as unknown as import('../types/glossary').GlossaryEntry}
            allTerms={allTerms}
            learnedTermIds={seenConceptIds}
            onSelectTerm={handleSelectTerm}
            onMarkSeen={markConceptSeen}
            showFullChain
          />
        )}

        {/* Full definition */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
            <BookOpen className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h2 className="font-semibold text-lg">Full Definition</h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7">
            {term.fullDefinition}
          </p>
        </section>

        {/* Business context */}
        {term.businessContext && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
              <Briefcase className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h2 className="font-semibold text-lg">Business Context</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7">
              {term.businessContext}
            </p>
          </section>
        )}

        {/* In meeting example */}
        {term.inMeetingExample && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
              <MessageSquare className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h2 className="font-semibold text-lg">In a Meeting</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7 italic">
              "{term.inMeetingExample}"
            </p>
          </section>
        )}

        {/* Real-world example */}
        {term.example && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
              <Lightbulb className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h2 className="font-semibold text-lg">Example</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7">
              {term.example}
            </p>
          </section>
        )}

        {/* Related terms */}
        {relatedTerms.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
              <Link2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h2 className="font-semibold text-lg">Related Concepts</h2>
            </div>
            <div className="flex flex-wrap gap-2 pl-7">
              {relatedTerms.map((relatedTerm) => (
                <Link
                  key={relatedTerm.id}
                  to={relatedTerm.slug ? `/glossary/${relatedTerm.slug}` : `/glossary?term=${relatedTerm.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {relatedTerm.term}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Key Figures */}
        {keyFigures.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
              <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h2 className="font-semibold text-lg">Key Figures</h2>
            </div>
            <div className="space-y-2 pl-7">
              {keyFigures.map(({ person, contributionNote }) => (
                <Link
                  key={person.id}
                  to={`/people/${person.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  {person.imageUrl ? (
                    <img
                      src={person.imageUrl}
                      alt={person.canonicalName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {person.canonicalName}
                    </div>
                    {contributionNote && (
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        {contributionNote}
                      </div>
                    )}
                    {person.currentRole && !contributionNote && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {person.currentRole}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related by Subject (Sprint Subj-5) */}
        <RelatedBySubject
          contentType="glossary_term"
          contentId={term.id}
          limit={5}
          excludeTypes={['glossary_term']}
          className="mb-8"
        />

        {/* Related milestones (Sprint SEO-3: using linked milestones with full data) */}
        {(linkedMilestones.length > 0 || (term.relatedMilestoneIds && term.relatedMilestoneIds.length > 0)) && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
              <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h2 className="font-semibold text-lg">Related Timeline Events</h2>
            </div>
            <div className="space-y-2 pl-7">
              {/* Show linked milestones with full data */}
              {linkedMilestones.map(({ milestone, relevanceNote }) => (
                <button
                  key={milestone.id}
                  onClick={() => handleMilestoneClick(milestone.id)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {milestone.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(milestone.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                      <span className="capitalize">{milestone.category.toLowerCase().replace(/_/g, ' ')}</span>
                      {relevanceNote && (
                        <span className="text-blue-600 dark:text-blue-400">• {relevanceNote}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
              {/* Fallback: Legacy milestone IDs if no linked milestones */}
              {linkedMilestones.length === 0 && term.relatedMilestoneIds?.map((milestoneId) => (
                <button
                  key={milestoneId}
                  onClick={() => handleMilestoneClick(milestoneId)}
                  className="flex items-center gap-2 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {milestoneId.replace(/_/g, ' ').replace(/^E\d{4}\s/, '')}
                  </span>
                  <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Last Updated Metadata (Sprint SEO-5: E-E-A-T signals) */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <p>
            Term added: {new Date(term.createdAt).toLocaleDateString()}
            {term.updatedAt !== term.createdAt && (
              <> · Last updated: {new Date(term.updatedAt).toLocaleDateString()}</>
            )}
          </p>
          <p className="mt-1">
            Content verified by{' '}
            <Link to="/about" className="text-blue-600 dark:text-blue-400 hover:underline">
              Let AI Explain AI editorial team
            </Link>
          </p>
        </div>

        {/* Comment Thread */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <CommentThread targetType="glossary_term" targetId={term.id} />
        </div>
      </div>
    </div>
  );
}
