import { Link } from 'react-router-dom';
import {
  FileJson,
  FileSpreadsheet,
  FileText,
  Code,
  BookOpen,
  GraduationCap,
  Newspaper,
  Users,
  ExternalLink,
} from 'lucide-react';
import { SEO } from '../components/SEO';

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkTo?: string;
  externalLink?: string;
  comingSoon?: boolean;
  tags?: string[];
}

function ResourceCard({
  icon,
  title,
  description,
  linkTo,
  externalLink,
  comingSoon,
  tags,
}: ResourceCardProps) {
  const content = (
    <div
      className={`h-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-all ${
        comingSoon
          ? 'opacity-60'
          : 'hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {comingSoon && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            )}
            {externalLink && <ExternalLink className="h-4 w-4 text-gray-400" />}
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">{description}</p>
          {tags && (
            <div className="mt-3 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (comingSoon) {
    return <div className="cursor-not-allowed">{content}</div>;
  }

  if (externalLink) {
    return (
      <a href={externalLink} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  if (linkTo) {
    return (
      <Link to={linkTo} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * ResourcesPage - Hub for all linkable assets
 * Sprint TD-4: Linkable Assets
 */
function ResourcesPage() {
  return (
    <>
      <SEO
        title="AI Timeline Resources - Free Tools for Educators & Researchers"
        description="Free AI timeline resources for educators, researchers, and content creators. Download data, embed widgets, access reports, and more. All free with attribution."
        canonical="https://letaiexplainai.com/resources"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-orange-500 to-amber-600 text-white py-16">
          <div className="container-main">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold mb-4">AI Timeline Resources</h1>
              <p className="text-xl text-orange-100">
                Free resources for educators, researchers, and AI enthusiasts.
                Use our data, embed our timeline, and cite our reports.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container-main">
            {/* For Educators */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <GraduationCap className="h-6 w-6 text-orange-500" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">For Educators</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <ResourceCard
                  icon={<FileText className="h-6 w-6 text-orange-600" />}
                  title="Downloadable PDF Timeline"
                  description="Print-ready PDF of the complete AI timeline. Perfect for classroom handouts, lectures, and study materials."
                  comingSoon
                  tags={['PDF', 'Printable', 'Free']}
                />
                <ResourceCard
                  icon={<Code className="h-6 w-6 text-orange-600" />}
                  title="Embeddable Widget"
                  description="Add an interactive AI timeline to your course website or LMS. Customizable, lightweight, and always up-to-date."
                  linkTo="/timeline/embed"
                  tags={['iframe', 'Interactive', 'Free']}
                />
              </div>
            </div>

            {/* For Researchers */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="h-6 w-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">For Researchers</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <ResourceCard
                  icon={<FileJson className="h-6 w-6 text-blue-600" />}
                  title="JSON Data Export"
                  description="Download the complete AI timeline dataset in JSON format. Includes metadata, licensing info, and all milestone fields."
                  linkTo="/timeline/data"
                  tags={['JSON', 'API', 'CC BY 4.0']}
                />
                <ResourceCard
                  icon={<FileSpreadsheet className="h-6 w-6 text-green-600" />}
                  title="CSV Data Export"
                  description="Spreadsheet-compatible format for Excel, Google Sheets, or statistical analysis. All milestones with full metadata."
                  linkTo="/timeline/data"
                  tags={['CSV', 'Excel', 'CC BY 4.0']}
                />
              </div>
            </div>

            {/* For Content Creators */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-6 w-6 text-purple-500" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">For Content Creators</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <ResourceCard
                  icon={<Newspaper className="h-6 w-6 text-purple-600" />}
                  title="Annual AI Reports"
                  description="Yearly summaries of AI progress with key highlights, trends, and analysis. Perfect for articles and presentations."
                  comingSoon
                  tags={['Reports', 'Analysis', 'Free']}
                />
                <ResourceCard
                  icon={<FileText className="h-6 w-6 text-purple-600" />}
                  title="Infographics"
                  description="Social-ready graphics summarizing AI milestones. Share on Twitter, LinkedIn, or embed in your content."
                  comingSoon
                  tags={['Images', 'Social', 'Free']}
                />
              </div>
            </div>

            {/* Attribution Section */}
            <div className="max-w-3xl mx-auto mt-16">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-8 border border-amber-200 dark:border-amber-800">
                <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-300 mb-4">
                  Attribution & License
                </h2>
                <p className="text-amber-800 dark:text-amber-200 mb-4">
                  All resources are licensed under{' '}
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1 hover:text-amber-600"
                  >
                    Creative Commons Attribution 4.0 (CC BY 4.0)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-300 dark:border-amber-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Suggested citation:
                  </p>
                  <code className="block text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded text-gray-800 dark:text-gray-200">
                    Data from Let AI Explain AI (letaiexplainai.com)
                  </code>
                </div>

                <p className="mt-4 text-amber-700 dark:text-amber-300 text-sm">
                  <strong>You are free to:</strong> Share, copy, adapt, and use these resources for any purpose,
                  including commercial use, as long as you provide attribution.
                </p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="max-w-3xl mx-auto mt-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Need custom data or have questions?{' '}
                <Link to="/contact" className="text-orange-600 hover:text-orange-700 underline">
                  Contact us
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default ResourcesPage;
