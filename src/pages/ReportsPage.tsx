import { Link } from 'react-router-dom';
import { FileText, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { SEO } from '../components/SEO';

// Available report years (most recent first)
const AVAILABLE_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019];

interface YearCardProps {
  year: number;
  highlights: string[];
  milestoneCount: number;
}

function YearCard({ year, highlights, milestoneCount }: YearCardProps) {
  return (
    <Link
      to={`/reports/${year}`}
      className="block bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{year}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {milestoneCount} milestones tracked
          </p>
        </div>
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Highlights:</h3>
        <ul className="space-y-1">
          {highlights.slice(0, 3).map((highlight, i) => (
            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium">
        Read Full Report
        <ArrowRight className="h-4 w-4 ml-1" />
      </div>
    </Link>
  );
}

// Static highlights data for each year (could be fetched from API in future)
const YEAR_DATA: Record<number, { highlights: string[]; milestoneCount: number }> = {
  2025: {
    highlights: [
      'GPT-5 and Claude 4 released',
      'AI agents become mainstream',
      'Major regulatory frameworks enacted',
    ],
    milestoneCount: 45,
  },
  2024: {
    highlights: [
      'GPT-4o multimodal capabilities',
      'Claude 3 Opus released',
      'Gemini 1.5 Pro with 1M context',
    ],
    milestoneCount: 52,
  },
  2023: {
    highlights: [
      'GPT-4 transforms AI landscape',
      'LLaMA democratizes open-source AI',
      'ChatGPT reaches 100M users',
    ],
    milestoneCount: 48,
  },
  2022: {
    highlights: [
      'ChatGPT launches, goes viral',
      'Stable Diffusion open-sourced',
      'DALL-E 2 public release',
    ],
    milestoneCount: 38,
  },
  2021: {
    highlights: [
      'GitHub Copilot preview',
      'DALL-E announced',
      'Anthropic founded',
    ],
    milestoneCount: 32,
  },
  2020: {
    highlights: [
      'GPT-3 released',
      'AlphaFold 2 solves protein folding',
      'AI research accelerates during pandemic',
    ],
    milestoneCount: 28,
  },
  2019: {
    highlights: [
      'GPT-2 "too dangerous to release"',
      'OpenAI transitions to capped-profit',
      'BERT transforms NLP',
    ],
    milestoneCount: 24,
  },
};

/**
 * ReportsPage - Index of annual AI progress reports
 * Sprint TD-4: Linkable Assets
 */
function ReportsPage() {
  // Schema.org markup for reports collection
  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AI Progress Reports',
    description: 'Annual reports on artificial intelligence progress and breakthroughs',
    publisher: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
    },
    hasPart: AVAILABLE_YEARS.map((year) => ({
      '@type': 'Report',
      name: `AI Progress Report ${year}`,
      url: `https://letaiexplainai.com/reports/${year}`,
    })),
  };

  return (
    <>
      <SEO
        title="AI Progress Reports - Annual Year in Review | LAEA"
        description="Explore annual AI progress reports with major breakthroughs, company highlights, emerging trends, and predictions. Free resources for researchers and journalists."
        canonical="https://letaiexplainai.com/reports"
        jsonLd={schemaMarkup}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-16">
          <div className="container-main">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-8 w-8" />
                <span className="text-indigo-200 text-sm font-medium uppercase tracking-wide">
                  Annual Reports
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-4">AI Progress Reports</h1>
              <p className="text-xl text-indigo-100">
                Comprehensive yearly summaries of AI breakthroughs, industry developments,
                and emerging trends. Perfect for researchers, journalists, and anyone tracking
                the AI revolution.
              </p>
            </div>
          </div>
        </section>

        {/* Reports Grid */}
        <section className="py-12">
          <div className="container-main">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AVAILABLE_YEARS.map((year) => (
                <YearCard
                  key={year}
                  year={year}
                  highlights={YEAR_DATA[year]?.highlights || []}
                  milestoneCount={YEAR_DATA[year]?.milestoneCount || 0}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="container-main text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Want the Raw Data?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              Download our complete AI timeline dataset in JSON or CSV format for your own analysis and research.
            </p>
            <Link
              to="/timeline/data"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <FileText className="h-5 w-5" />
              Access Data Export
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

export default ReportsPage;
