/**
 * PersonProfilePage Component
 * Sprint KPC-2 - Key People & Companies
 *
 * Dedicated profile page for AI leaders and researchers.
 * Features:
 * - Structured biography sections
 * - Career history timeline
 * - Related milestones and news
 * - External links
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  GraduationCap,
  Linkedin,
  Twitter,
  BookOpen,
  Newspaper,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';
import { personsApi, type PersonWithRelations } from '../services/api';
import type { Affiliation, Organization } from '../types';
import { CommentThread } from '../components/Comments';

/**
 * Role badge colors
 */
const ROLE_COLORS: Record<string, string> = {
  researcher: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  executive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  founder: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  policy_maker: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  engineer: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const ROLE_LABELS: Record<string, string> = {
  researcher: 'Researcher',
  executive: 'Executive',
  founder: 'Founder',
  policy_maker: 'Policy Maker',
  engineer: 'Engineer',
  other: 'Other',
};

/**
 * Format date for display
 */
function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return 'Present';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Loading skeleton for profile page
 */
function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
      {/* Content skeleton */}
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
 * Section component with optional collapse
 */
function ProfileSection({
  title,
  children,
  icon,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="mb-8">
      <button
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 mb-4 w-full text-left ${
          collapsible ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
        }`}
        disabled={!collapsible}
      >
        {icon}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {collapsible && (
          <span className="ml-auto">
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
      )}
    </section>
  );
}

/**
 * External links row
 */
function ExternalLinksRow({
  wikipediaUrl,
  linkedInUrl,
  twitterHandle,
  personalWebsite,
  googleScholarUrl,
}: {
  wikipediaUrl?: string | null;
  linkedInUrl?: string | null;
  twitterHandle?: string | null;
  personalWebsite?: string | null;
  googleScholarUrl?: string | null;
}) {
  const links = [
    { url: wikipediaUrl, icon: BookOpen, label: 'Wikipedia' },
    { url: linkedInUrl, icon: Linkedin, label: 'LinkedIn' },
    {
      url: twitterHandle ? `https://twitter.com/${twitterHandle}` : null,
      icon: Twitter,
      label: 'Twitter',
    },
    { url: personalWebsite, icon: Globe, label: 'Website' },
    { url: googleScholarUrl, icon: GraduationCap, label: 'Google Scholar' },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className="flex gap-2 mt-3">
      {links.map(({ url, icon: Icon, label }) => (
        <a
          key={label}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title={label}
        >
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </a>
      ))}
    </div>
  );
}

/**
 * Career timeline component
 */
function CareerTimeline({
  affiliations,
}: {
  affiliations: Array<Affiliation & { organization: Organization }>;
}) {
  if (affiliations.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 italic">
        No career history recorded yet.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-4">
        {affiliations.map((aff) => (
          <div key={aff.id} className="relative flex items-start gap-4 pl-10">
            {/* Timeline dot */}
            <div
              className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                aff.isCurrent
                  ? 'bg-green-500 border-green-500'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
              }`}
            />

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/organizations/${aff.organization.slug}`}
                  className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {aff.organization.name}
                </Link>
                {aff.isCurrent && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">{aff.role}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {formatDate(aff.startDate)} — {formatDate(aff.endDate)}
              </p>
              {aff.notes && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{aff.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main PersonProfilePage component
 */
export default function PersonProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPerson() {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await personsApi.getBySlug(slug);
        setPerson(data);
      } catch (err) {
        console.error('Failed to fetch person:', err);
        setError('Person not found');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPerson();
  }, [slug]);

  // Update document title
  useEffect(() => {
    if (person) {
      document.title = `${person.canonicalName} - AI Timeline`;
    }
    return () => {
      document.title = 'AI Timeline';
    };
  }, [person]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/timeline"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Timeline
        </Link>
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Person Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The person you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const roleColor = ROLE_COLORS[person.role] || ROLE_COLORS.other;
  const roleLabel = ROLE_LABELS[person.role] || 'Other';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <header className="flex items-start gap-6 mb-8">
        {/* Avatar */}
        {person.imageUrl ? (
          <img
            src={person.imageUrl}
            alt={person.canonicalName}
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
            {person.canonicalName.charAt(0)}
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {person.canonicalName}
          </h1>

          <div className="flex items-center gap-3 flex-wrap mb-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${roleColor}`}>
              {roleLabel}
            </span>

            {person.currentOrg && (
              <Link
                to={`/organizations/${person.currentOrg.slug}`}
                className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Building2 className="w-4 h-4" />
                {person.currentRole && `${person.currentRole} at `}
                {person.currentOrg.name}
              </Link>
            )}
          </div>

          {person.aliases && person.aliases.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Also known as: {person.aliases.join(', ')}
            </p>
          )}

          <ExternalLinksRow
            wikipediaUrl={person.wikipediaUrl}
            linkedInUrl={person.linkedInUrl}
            twitterHandle={person.twitterHandle}
            personalWebsite={person.personalWebsite}
            googleScholarUrl={person.googleScholarUrl}
          />
        </div>
      </header>

      {/* Currently Doing - highlighted section */}
      {person.currentlyDoing && (
        <section className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Currently Working On
            </h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300">{person.currentlyDoing}</p>
          {person.currentlyDoingUpdatedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Last updated: {formatDate(person.currentlyDoingUpdatedAt)}
            </p>
          )}
        </section>
      )}

      {/* About */}
      <ProfileSection title="About">
        <p>{person.shortBio}</p>
      </ProfileSection>

      {/* Background */}
      {person.background && (
        <ProfileSection title="Background" icon={<GraduationCap className="w-5 h-5 text-gray-500" />}>
          <p className="whitespace-pre-wrap">{person.background}</p>
        </ProfileSection>
      )}

      {/* Major Contributions */}
      {person.contributions && (
        <ProfileSection title="Major Contributions" collapsible defaultOpen>
          <p className="whitespace-pre-wrap">{person.contributions}</p>
        </ProfileSection>
      )}

      {/* Philosophy & Approach */}
      {person.philosophy && (
        <ProfileSection title="Philosophy & Approach" collapsible defaultOpen={false}>
          <p className="whitespace-pre-wrap">{person.philosophy}</p>
        </ProfileSection>
      )}

      {/* Two-column layout for Career and Milestones */}
      <div className="grid md:grid-cols-2 gap-8 mt-8">
        {/* Career History */}
        <ProfileSection
          title="Career History"
          icon={<Building2 className="w-5 h-5 text-gray-500" />}
        >
          <CareerTimeline affiliations={person.affiliations} />
        </ProfileSection>

        {/* Related Milestones */}
        <ProfileSection
          title="Related Milestones"
          icon={<Calendar className="w-5 h-5 text-gray-500" />}
        >
          {person.milestones.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic">
              No linked milestones yet.
            </p>
          ) : (
            <div className="space-y-3">
              {person.milestones.slice(0, 10).map((m) => (
                <Link
                  key={m.id}
                  to={`/timeline?highlight=${m.id}`}
                  className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{m.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <span>{formatDate(m.date)}</span>
                    {m.contributionType && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{m.contributionType}</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
              {person.milestones.length > 10 && (
                <Link
                  to={`/timeline?person=${person.id}`}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all {person.milestones.length} milestones
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </ProfileSection>
      </div>

      {/* Recent News */}
      {person.newsEvents.length > 0 && (
        <ProfileSection
          title="Recent News"
          icon={<Newspaper className="w-5 h-5 text-gray-500" />}
        >
          <div className="space-y-3">
            {person.newsEvents.slice(0, 5).map((ne) => (
              <Link
                key={ne.id}
                to={`/news?event=${ne.id}`}
                className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="font-medium text-gray-900 dark:text-white">{ne.title}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>{formatDate(ne.date)}</span>
                  <span>•</span>
                  <span className="capitalize">{ne.mentionType}</span>
                </div>
              </Link>
            ))}
            {person.newsEvents.length > 5 && (
              <Link
                to={`/news?person=${person.id}`}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all {person.newsEvents.length} news mentions
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>
        </ProfileSection>
      )}

      {/* Focus Areas */}
      {person.focusAreas && person.focusAreas.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Focus Areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {person.focusAreas.map((area) => (
              <span
                key={area}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
              >
                {area}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Comment Thread (Sprint LEarn-4) */}
      <div className="mt-12">
        <CommentThread targetType="person" targetId={person.id} />
      </div>
    </div>
  );
}
