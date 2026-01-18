/**
 * ComparePage Component
 * Sprint SEO-4 Task 1 - Comparison Pages Infrastructure
 *
 * Programmatic SEO page for comparing two entities:
 * - Organizations (e.g., OpenAI vs Anthropic)
 * - People (e.g., Geoffrey Hinton vs Yann LeCun)
 * - Terms (e.g., Transformer vs RNN)
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SEO } from '../components/SEO';
import {
  ArrowLeft,
  Building2,
  User,
  BookOpen,
  ExternalLink,
  MapPin,
  Calendar,
  Briefcase,
  Tag,
  Users,
  TrendingUp,
  Award,
} from 'lucide-react';
import {
  comparisonApi,
  type ComparisonEntityType,
  type ComparisonResponse,
  type OrganizationComparisonData,
  type PersonComparisonData,
  type TermComparisonData,
} from '../services/api';

/**
 * Parse comparison slug (e.g., "openai-vs-anthropic" -> ["openai", "anthropic"])
 */
function parseComparisonSlug(slug: string): [string, string] | null {
  const match = slug.match(/^(.+)-vs-(.+)$/);
  if (!match || !match[1] || !match[2]) return null;
  return [match[1], match[2]];
}

/**
 * Get entity type label
 */
function getTypeLabel(type: ComparisonEntityType): string {
  switch (type) {
    case 'organization':
      return 'Organizations';
    case 'person':
      return 'People';
    case 'term':
      return 'Concepts';
    default:
      return 'Entities';
  }
}

/**
 * Get entity type icon
 */
function getTypeIcon(type: ComparisonEntityType) {
  switch (type) {
    case 'organization':
      return Building2;
    case 'person':
      return User;
    case 'term':
      return BookOpen;
    default:
      return Tag;
  }
}

/**
 * Loading skeleton for comparison page
 */
function ComparisonSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-12 w-full max-w-xl bg-gray-200 dark:bg-gray-700 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="mt-8 h-48 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

/**
 * Error state component
 */
function ComparisonNotFound({ type, slugs }: { type: string; slugs: string }) {
  return (
    <div className="text-center py-16">
      <Tag className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Comparison Not Found
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We couldn't find a comparison for "{slugs}" ({type}).
      </p>
      <Link
        to="/compare"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse Comparisons
      </Link>
    </div>
  );
}

/**
 * Comparison card for a single entity
 */
function EntityCard({
  type,
  data,
  position,
}: {
  type: ComparisonEntityType;
  data: OrganizationComparisonData | PersonComparisonData | TermComparisonData;
  position: 'A' | 'B';
}) {
  const Icon = getTypeIcon(type);
  const bgColor = position === 'A' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-purple-50 dark:bg-purple-900/20';
  const borderColor = position === 'A' ? 'border-blue-200 dark:border-blue-800' : 'border-purple-200 dark:border-purple-800';
  const accentColor = position === 'A' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400';

  // Get entity-specific details
  const getName = () => {
    if (type === 'organization') return (data as OrganizationComparisonData).name;
    if (type === 'person') return (data as PersonComparisonData).canonicalName;
    if (type === 'term') return (data as TermComparisonData).term;
    return 'Unknown';
  };

  const getSlug = () => {
    return (data as { slug: string }).slug;
  };

  const getDescription = () => {
    if (type === 'organization') return (data as OrganizationComparisonData).shortDescription;
    if (type === 'person') return (data as PersonComparisonData).shortBio;
    if (type === 'term') return (data as TermComparisonData).shortDefinition;
    return '';
  };

  const getLink = () => {
    if (type === 'organization') return `/organizations/${getSlug()}`;
    if (type === 'person') return `/people/${getSlug()}`;
    if (type === 'term') return `/glossary/${getSlug()}`;
    return '#';
  };

  const getImage = () => {
    if (type === 'organization') return (data as OrganizationComparisonData).logoUrl;
    if (type === 'person') return (data as PersonComparisonData).imageUrl;
    return null;
  };

  return (
    <div className={`p-6 rounded-xl border ${borderColor} ${bgColor}`}>
      {/* Header with image/icon and name */}
      <div className="flex items-start gap-4 mb-4">
        {getImage() ? (
          <img
            src={getImage() || ''}
            alt={getName()}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className={`p-3 rounded-lg bg-white dark:bg-gray-800 ${accentColor}`}>
            <Icon className="h-10 w-10" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link
            to={getLink()}
            className={`text-xl font-bold hover:underline ${accentColor}`}
          >
            {getName()}
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {getDescription()}
          </p>
        </div>
      </div>

      {/* Entity-specific details */}
      {type === 'organization' && (
        <OrganizationDetails data={data as OrganizationComparisonData} />
      )}
      {type === 'person' && (
        <PersonDetails data={data as PersonComparisonData} />
      )}
      {type === 'term' && <TermDetails data={data as TermComparisonData} />}

      {/* Link to full profile */}
      <Link
        to={getLink()}
        className={`mt-4 inline-flex items-center gap-2 text-sm ${accentColor} hover:underline`}
      >
        View full profile
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}

/**
 * Organization-specific details
 */
function OrganizationDetails({ data }: { data: OrganizationComparisonData }) {
  return (
    <div className="space-y-3 mt-4">
      {data.foundedYear && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>Founded: {data.foundedYear}</span>
        </div>
      )}
      {data.headquarters && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="h-4 w-4" />
          <span>{data.headquarters}</span>
        </div>
      )}
      {data.type && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Building2 className="h-4 w-4" />
          <span className="capitalize">{data.type.replace('_', ' ')}</span>
        </div>
      )}
      {data.focusAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.focusAreas.slice(0, 4).map((area) => (
            <span
              key={area}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
            >
              {area}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <TrendingUp className="h-4 w-4" />
          <span>{data.milestoneCount} milestones</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Users className="h-4 w-4" />
          <span>{data.employeeCount} employees</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Person-specific details
 */
function PersonDetails({ data }: { data: PersonComparisonData }) {
  return (
    <div className="space-y-3 mt-4">
      {data.currentOrg && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Building2 className="h-4 w-4" />
          <Link
            to={`/organizations/${data.currentOrg.slug}`}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {data.currentOrg.name}
          </Link>
          {data.currentRole && (
            <span className="text-gray-400">({data.currentRole})</span>
          )}
        </div>
      )}
      {data.role && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Briefcase className="h-4 w-4" />
          <span className="capitalize">{data.role.replace('_', ' ')}</span>
        </div>
      )}
      {data.focusAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.focusAreas.slice(0, 4).map((area) => (
            <span
              key={area}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
            >
              {area}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Award className="h-4 w-4" />
          <span>{data.milestoneCount} contributions</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Building2 className="h-4 w-4" />
          <span>{data.affiliationCount} affiliations</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Term-specific details
 */
function TermDetails({ data }: { data: TermComparisonData }) {
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Tag className="h-4 w-4" />
        <span className="capitalize">{data.category.replace('_', ' ')}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <BookOpen className="h-4 w-4" />
        <span>Difficulty: {data.difficulty}/5</span>
      </div>
      {data.example && (
        <p className="text-sm text-gray-600 dark:text-gray-400 italic line-clamp-2">
          Example: {data.example}
        </p>
      )}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <TrendingUp className="h-4 w-4" />
          <span>{data.milestoneCount} milestones</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Users className="h-4 w-4" />
          <span>{data.keyFigureCount} key figures</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Comparison table showing side-by-side differences
 */
function ComparisonTable({
  type,
  entityA,
  entityB,
}: {
  type: ComparisonEntityType;
  entityA: OrganizationComparisonData | PersonComparisonData | TermComparisonData;
  entityB: OrganizationComparisonData | PersonComparisonData | TermComparisonData;
}) {
  const getRows = () => {
    if (type === 'organization') {
      const a = entityA as OrganizationComparisonData;
      const b = entityB as OrganizationComparisonData;
      return [
        { label: 'Type', valueA: a.type?.replace('_', ' '), valueB: b.type?.replace('_', ' ') },
        { label: 'Founded', valueA: a.foundedYear?.toString() || 'Unknown', valueB: b.foundedYear?.toString() || 'Unknown' },
        { label: 'Headquarters', valueA: a.headquarters || 'Unknown', valueB: b.headquarters || 'Unknown' },
        { label: 'Focus Areas', valueA: a.focusAreas.join(', ') || 'N/A', valueB: b.focusAreas.join(', ') || 'N/A' },
        { label: 'Products', valueA: a.products.join(', ') || 'N/A', valueB: b.products.join(', ') || 'N/A' },
        { label: 'Milestones', valueA: a.milestoneCount.toString(), valueB: b.milestoneCount.toString() },
        { label: 'Employees', valueA: a.employeeCount.toString(), valueB: b.employeeCount.toString() },
      ];
    }
    if (type === 'person') {
      const a = entityA as PersonComparisonData;
      const b = entityB as PersonComparisonData;
      return [
        { label: 'Role', valueA: a.role?.replace('_', ' '), valueB: b.role?.replace('_', ' ') },
        { label: 'Current Organization', valueA: a.currentOrg?.name || 'N/A', valueB: b.currentOrg?.name || 'N/A' },
        { label: 'Current Title', valueA: a.currentRole || 'N/A', valueB: b.currentRole || 'N/A' },
        { label: 'Focus Areas', valueA: a.focusAreas.join(', ') || 'N/A', valueB: b.focusAreas.join(', ') || 'N/A' },
        { label: 'Contributions', valueA: a.milestoneCount.toString(), valueB: b.milestoneCount.toString() },
        { label: 'Affiliations', valueA: a.affiliationCount.toString(), valueB: b.affiliationCount.toString() },
      ];
    }
    if (type === 'term') {
      const a = entityA as TermComparisonData;
      const b = entityB as TermComparisonData;
      return [
        { label: 'Category', valueA: a.category?.replace('_', ' '), valueB: b.category?.replace('_', ' ') },
        { label: 'Difficulty', valueA: `${a.difficulty}/5`, valueB: `${b.difficulty}/5` },
        { label: 'Concept Type', valueA: a.conceptType, valueB: b.conceptType },
        { label: 'Related Terms', valueA: a.relatedTermCount.toString(), valueB: b.relatedTermCount.toString() },
        { label: 'Key Figures', valueA: a.keyFigureCount.toString(), valueB: b.keyFigureCount.toString() },
        { label: 'Milestones', valueA: a.milestoneCount.toString(), valueB: b.milestoneCount.toString() },
      ];
    }
    return [];
  };

  const nameA = type === 'person'
    ? (entityA as PersonComparisonData).canonicalName
    : type === 'organization'
    ? (entityA as OrganizationComparisonData).name
    : (entityA as TermComparisonData).term;

  const nameB = type === 'person'
    ? (entityB as PersonComparisonData).canonicalName
    : type === 'organization'
    ? (entityB as OrganizationComparisonData).name
    : (entityB as TermComparisonData).term;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              Attribute
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700">
              {nameA}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-purple-600 dark:text-purple-400 border-b border-gray-200 dark:border-gray-700">
              {nameB}
            </th>
          </tr>
        </thead>
        <tbody>
          {getRows().map((row, index) => (
            <tr
              key={row.label}
              className={
                index % 2 === 0
                  ? 'bg-white dark:bg-gray-900'
                  : 'bg-gray-50 dark:bg-gray-800/50'
              }
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                {row.label}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 capitalize">
                {row.valueA}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 capitalize">
                {row.valueB}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Generate SEO JSON-LD for comparison pages
 */
function generateComparisonJsonLd(
  type: ComparisonEntityType,
  entityA: OrganizationComparisonData | PersonComparisonData | TermComparisonData,
  entityB: OrganizationComparisonData | PersonComparisonData | TermComparisonData,
  canonicalUrl: string
) {
  const nameA = type === 'person'
    ? (entityA as PersonComparisonData).canonicalName
    : type === 'organization'
    ? (entityA as OrganizationComparisonData).name
    : (entityA as TermComparisonData).term;

  const nameB = type === 'person'
    ? (entityB as PersonComparisonData).canonicalName
    : type === 'organization'
    ? (entityB as OrganizationComparisonData).name
    : (entityB as TermComparisonData).term;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${nameA} vs ${nameB} - Comparison`,
    description: `Compare ${nameA} and ${nameB}: key differences, similarities, and analysis.`,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: nameA,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: nameB,
        },
      ],
    },
  };
}

/**
 * ComparePage - Main comparison page component
 */
export default function ComparePage() {
  const { type, slugs } = useParams<{ type: string; slugs: string }>();
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse slugs to get entityA and entityB
  const parsedSlugs = slugs ? parseComparisonSlug(slugs) : null;
  const slugA = parsedSlugs?.[0];
  const slugB = parsedSlugs?.[1];

  useEffect(() => {
    async function fetchComparison() {
      if (!type || !slugA || !slugB) {
        setError('Invalid comparison URL');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const data = await comparisonApi.getComparison(
          type as ComparisonEntityType,
          slugA,
          slugB
        );
        setComparison(data);
      } catch (err) {
        console.error('[ComparePage] Error fetching comparison:', err);
        setError('Failed to load comparison');
      } finally {
        setIsLoading(false);
      }
    }

    fetchComparison();
  }, [type, slugA, slugB]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ComparisonSkeleton />
      </div>
    );
  }

  // Error state
  if (error || !comparison) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ComparisonNotFound type={type || 'unknown'} slugs={slugs || ''} />
      </div>
    );
  }

  const entityType = comparison.type as ComparisonEntityType;
  const TypeIcon = getTypeIcon(entityType);

  const nameA =
    entityType === 'person'
      ? (comparison.entityA as PersonComparisonData).canonicalName
      : entityType === 'organization'
      ? (comparison.entityA as OrganizationComparisonData).name
      : (comparison.entityA as TermComparisonData).term;

  const nameB =
    entityType === 'person'
      ? (comparison.entityB as PersonComparisonData).canonicalName
      : entityType === 'organization'
      ? (comparison.entityB as OrganizationComparisonData).name
      : (comparison.entityB as TermComparisonData).term;

  const title = `${nameA} vs ${nameB}`;
  const description = `Compare ${nameA} and ${nameB}: ${getTypeLabel(entityType).toLowerCase()} comparison including key differences, similarities, and detailed analysis.`;

  const jsonLd = generateComparisonJsonLd(
    entityType,
    comparison.entityA as OrganizationComparisonData | PersonComparisonData | TermComparisonData,
    comparison.entityB as OrganizationComparisonData | PersonComparisonData | TermComparisonData,
    comparison.canonicalUrl
  );

  return (
    <>
      <SEO
        title={`${title} - Comparison`}
        description={description}
        canonical={comparison.canonicalUrl}
        jsonLd={jsonLd}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">
            Home
          </Link>
          <span>/</span>
          <Link
            to="/compare"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Compare
          </Link>
          <span>/</span>
          <Link
            to={`/compare/${entityType}`}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {getTypeLabel(entityType)}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TypeIcon className="h-8 w-8 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {getTypeLabel(entityType)} Comparison
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {nameA}{' '}
            <span className="text-gray-400 dark:text-gray-600">vs</span> {nameB}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            A detailed comparison of these two {getTypeLabel(entityType).toLowerCase()}.
          </p>
        </div>

        {/* Entity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <EntityCard
            type={entityType}
            data={comparison.entityA as OrganizationComparisonData | PersonComparisonData | TermComparisonData}
            position="A"
          />
          <EntityCard
            type={entityType}
            data={comparison.entityB as OrganizationComparisonData | PersonComparisonData | TermComparisonData}
            position="B"
          />
        </div>

        {/* Comparison Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Side-by-Side Comparison
            </h2>
          </div>
          <ComparisonTable
            type={entityType}
            entityA={comparison.entityA as OrganizationComparisonData | PersonComparisonData | TermComparisonData}
            entityB={comparison.entityB as OrganizationComparisonData | PersonComparisonData | TermComparisonData}
          />
        </div>

        {/* Related Comparisons */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Related Comparisons
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/compare/${entityType}`}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              More {getTypeLabel(entityType)} Comparisons
            </Link>
            <Link
              to="/compare"
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              All Comparisons
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
