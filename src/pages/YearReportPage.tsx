import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  TrendingUp,
  Building2,
  Users,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Download,
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { milestonesApi } from '../services/api';
import type { MilestoneResponse } from '../types/milestone';

// Category display config
const CATEGORY_LABELS: Record<string, string> = {
  MODEL_RELEASE: 'Model Releases',
  RESEARCH: 'Research Breakthroughs',
  BREAKTHROUGH: 'Major Breakthroughs',
  PRODUCT: 'Product Launches',
  REGULATION: 'Regulation & Policy',
  INDUSTRY: 'Industry News',
};

const CATEGORY_COLORS: Record<string, string> = {
  MODEL_RELEASE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  RESEARCH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  BREAKTHROUGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PRODUCT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  REGULATION: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  INDUSTRY: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

// Available years for navigation
const AVAILABLE_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019];

function MilestoneCard({ milestone }: { milestone: MilestoneResponse }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="border-l-4 border-indigo-500 pl-4 py-2">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>{formatDate(milestone.date)}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${CATEGORY_COLORS[milestone.category] || 'bg-gray-100 text-gray-700'}`}>
          {CATEGORY_LABELS[milestone.category] || milestone.category}
        </span>
        {milestone.organization && (
          <span className="text-gray-400">• {milestone.organization}</span>
        )}
      </div>
      <h4 className="font-medium text-gray-900 dark:text-white mt-1">{milestone.title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
        {milestone.description}
      </p>
    </div>
  );
}

/**
 * YearReportPage - Individual annual AI progress report
 * Sprint TD-4: Linkable Assets
 */
function YearReportPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = parseInt(yearParam || '2025', 10);
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation
  const yearIndex = AVAILABLE_YEARS.indexOf(year);
  const prevYear = yearIndex < AVAILABLE_YEARS.length - 1 ? AVAILABLE_YEARS[yearIndex + 1] : null;
  const nextYear = yearIndex > 0 ? AVAILABLE_YEARS[yearIndex - 1] : null;

  useEffect(() => {
    async function fetchMilestones() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await milestonesApi.getFiltered({
          dateStart: `${year}-01-01`,
          dateEnd: `${year}-12-31`,
          limit: 200,
        });
        setMilestones(response.data);
      } catch (err) {
        setError('Failed to load milestones for this year');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    if (year >= 2019 && year <= 2025) {
      fetchMilestones();
    } else {
      setError('Report not available for this year');
      setIsLoading(false);
    }
  }, [year]);

  // Organize milestones by category
  const byCategory = useMemo(() => {
    const grouped: Record<string, MilestoneResponse[]> = {};
    milestones.forEach((m) => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category]!.push(m);
    });
    return grouped;
  }, [milestones]);

  // Get top organizations
  const topOrgs = useMemo(() => {
    const orgCounts: Record<string, number> = {};
    milestones.forEach((m) => {
      if (m.organization) {
        orgCounts[m.organization] = (orgCounts[m.organization] || 0) + 1;
      }
    });
    return Object.entries(orgCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [milestones]);

  // Get highest significance milestones
  const topMilestones = useMemo(() => {
    return [...milestones]
      .sort((a, b) => (b.significance || 0) - (a.significance || 0))
      .slice(0, 10);
  }, [milestones]);

  // Schema.org markup
  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: `AI Progress Report ${year}`,
    description: `Comprehensive review of artificial intelligence breakthroughs and developments in ${year}`,
    datePublished: `${year + 1}-01-15`,
    about: {
      '@type': 'Thing',
      name: 'Artificial Intelligence',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
    },
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error}
          </h1>
          <Link
            to="/reports"
            className="text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`AI Progress Report ${year}: Year in Review | LAEA`}
        description={`Comprehensive review of AI breakthroughs in ${year}. Major model releases, research advances, industry developments, and emerging trends.`}
        canonical={`https://letaiexplainai.com/reports/${year}`}
        jsonLd={schemaMarkup}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-16">
          <div className="container-main">
            <Link
              to="/reports"
              className="inline-flex items-center gap-2 text-indigo-200 hover:text-white mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              All Reports
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-8 w-8" />
              <span className="text-indigo-200 text-sm font-medium uppercase tracking-wide">
                Annual Report
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-4">AI Progress Report {year}</h1>
            <p className="text-xl text-indigo-100 max-w-2xl">
              A comprehensive review of artificial intelligence breakthroughs,
              industry developments, and emerging trends throughout {year}.
            </p>

            {!isLoading && (
              <div className="flex items-center gap-6 mt-8">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-300" />
                  <span className="text-indigo-100">
                    {milestones.length} milestones tracked
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-300" />
                  <span className="text-indigo-100">
                    {topOrgs.length}+ organizations
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {isLoading ? (
          <div className="container-main py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
            <p className="text-gray-500 mt-4">Loading report...</p>
          </div>
        ) : (
          <>
            {/* Executive Summary */}
            <section className="py-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="container-main">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <Lightbulb className="h-6 w-6 text-amber-500" />
                  Executive Summary
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    {year} was a transformative year for artificial intelligence, with{' '}
                    <strong>{milestones.length} significant milestones</strong> tracked across
                    the industry. The year saw major advances in{' '}
                    {Object.keys(byCategory)
                      .slice(0, 3)
                      .map((c) => CATEGORY_LABELS[c] || c)
                      .join(', ')
                      .toLowerCase()}
                    , with leading contributions from{' '}
                    {topOrgs.slice(0, 3).map((o) => o[0]).join(', ')}.
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  {Object.entries(byCategory)
                    .slice(0, 4)
                    .map(([cat, items]) => (
                      <div
                        key={cat}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
                      >
                        <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                          {items.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {CATEGORY_LABELS[cat] || cat}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>

            {/* Top 10 Milestones */}
            <section className="py-12">
              <div className="container-main">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  Top 10 Milestones of {year}
                </h2>
                <div className="space-y-4">
                  {topMilestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <MilestoneCard milestone={milestone} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Company Highlights */}
            <section className="py-12 bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
              <div className="container-main">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-blue-500" />
                  Company Highlights
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topOrgs.map(([org, count]) => {
                    const orgMilestones = milestones.filter((m) => m.organization === org);
                    return (
                      <div
                        key={org}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {org}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {count} milestones
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {orgMilestones.slice(0, 3).map((m) => (
                            <li
                              key={m.id}
                              className="text-sm text-gray-600 dark:text-gray-300 truncate"
                            >
                              • {m.title}
                            </li>
                          ))}
                        </ul>
                        <Link
                          to={`/organizations/${org.toLowerCase().replace(/\s+/g, '-')}`}
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 mt-3 hover:underline"
                        >
                          View profile
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Category Breakdown */}
            <section className="py-12">
              <div className="container-main">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 text-purple-500" />
                  By Category
                </h2>
                <div className="space-y-8">
                  {Object.entries(byCategory).map(([cat, items]) => (
                    <div key={cat}>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${CATEGORY_COLORS[cat] || 'bg-gray-100'}`}>
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                        <span className="text-gray-500 text-sm">({items.length})</span>
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {items.slice(0, 4).map((m) => (
                          <div
                            key={m.id}
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                          >
                            <MilestoneCard milestone={m} />
                          </div>
                        ))}
                      </div>
                      {items.length > 4 && (
                        <Link
                          to={`/timeline?year=${year}&category=${cat}`}
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 mt-3 hover:underline"
                        >
                          View all {items.length} {CATEGORY_LABELS[cat]?.toLowerCase() || cat.toLowerCase()}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Year Navigation */}
            <section className="py-8 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="container-main">
                <div className="flex items-center justify-between">
                  {prevYear ? (
                    <Link
                      to={`/reports/${prevYear}`}
                      className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {prevYear} Report
                    </Link>
                  ) : (
                    <div />
                  )}
                  <Link
                    to={`/timeline?startYear=${year}&endYear=${year}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Calendar className="h-4 w-4" />
                    View {year} Timeline
                  </Link>
                  {nextYear ? (
                    <Link
                      to={`/reports/${nextYear}`}
                      className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {nextYear} Report
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="py-12 bg-white dark:bg-gray-900">
              <div className="container-main text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Want the Data?
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Download the complete {year} milestone data for your own analysis.
                </p>
                <Link
                  to="/timeline/data"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  <Download className="h-5 w-5" />
                  Download Data Export
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

export default YearReportPage;
