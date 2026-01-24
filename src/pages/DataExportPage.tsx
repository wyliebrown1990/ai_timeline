import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, ExternalLink, Check } from 'lucide-react';
import { SEO } from '../components/SEO';

const API_BASE = import.meta.env.VITE_API_URL || 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod';

/**
 * DataExportPage - Download AI timeline data as JSON or CSV
 * Sprint TD-4: Linkable Assets
 */
function DataExportPage() {
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadedJson, setDownloadedJson] = useState(false);
  const [downloadedCsv, setDownloadedCsv] = useState(false);

  const handleDownload = async (format: 'json' | 'csv') => {
    const setDownloading = format === 'json' ? setDownloadingJson : setDownloadingCsv;
    const setDownloaded = format === 'json' ? setDownloadedJson : setDownloadedCsv;

    setDownloading(true);
    try {
      const response = await fetch(`${API_BASE}/api/milestones/export?format=${format}`);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-timeline-data.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Dataset schema for SEO
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'AI Timeline Dataset',
    description: 'Comprehensive dataset of artificial intelligence milestones from 1943 to present, including model releases, research breakthroughs, and industry developments.',
    url: 'https://letaiexplainai.com/timeline/data',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
    },
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${API_BASE}/api/milestones/export?format=json`,
      },
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/csv',
        contentUrl: `${API_BASE}/api/milestones/export?format=csv`,
      },
    ],
    temporalCoverage: '1943/2026',
    keywords: ['artificial intelligence', 'AI history', 'machine learning', 'AI timeline', 'AI milestones'],
  };

  return (
    <>
      <SEO
        title="AI Timeline Data - Free JSON/CSV Download"
        description="Download the complete AI timeline dataset for free. JSON and CSV formats available. Perfect for researchers, developers, and data scientists. CC BY 4.0 licensed."
        canonical="https://letaiexplainai.com/timeline/data"
        jsonLd={datasetSchema}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16">
          <div className="container-main">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold mb-4">AI Timeline Data</h1>
              <p className="text-xl text-blue-100">
                Download the complete AI timeline dataset for free. Use it for research,
                analysis, or building your own applications.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container-main">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* JSON Download Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileJson className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">JSON Format</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Structured data for developers</p>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Machine-readable format with full metadata. Ideal for programmatic access,
                  data analysis, and application integration.
                </p>

                <button
                  onClick={() => handleDownload('json')}
                  disabled={downloadingJson}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all ${
                    downloadedJson
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {downloadingJson ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : downloadedJson ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  {downloadedJson ? 'Downloaded!' : 'Download JSON'}
                </button>
              </div>

              {/* CSV Download Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">CSV Format</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Spreadsheet-compatible</p>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Open in Excel, Google Sheets, or any spreadsheet application.
                  Perfect for quick analysis and data exploration.
                </p>

                <button
                  onClick={() => handleDownload('csv')}
                  disabled={downloadingCsv}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all ${
                    downloadedCsv
                      ? 'bg-green-500 text-white'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {downloadingCsv ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : downloadedCsv ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  {downloadedCsv ? 'Downloaded!' : 'Download CSV'}
                </button>
              </div>
            </div>

            {/* Data Fields Section */}
            <div className="max-w-4xl mx-auto mt-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Data Fields</h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Field</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Type</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">id</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">string</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">Unique identifier (e.g., E2024_GPT4)</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">title</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">string</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">Milestone title</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">date</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">ISO date</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">Date of the milestone</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">category</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">enum</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">MODEL_RELEASE, RESEARCH, BREAKTHROUGH, PRODUCT, REGULATION, INDUSTRY</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">significance</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">1-4</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">Impact level (4 = highest)</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">description</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">string</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">Detailed description</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">organization</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">string</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">Organization responsible</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">tags</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">array</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">Related tags/keywords</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400">sourceUrl</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">URL</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">Original source link</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* License Section */}
            <div className="max-w-4xl mx-auto mt-12">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
                <h2 className="text-xl font-bold text-amber-900 dark:text-amber-300 mb-3">License & Attribution</h2>
                <p className="text-amber-800 dark:text-amber-200 mb-4">
                  This dataset is licensed under{' '}
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
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>You are free to:</strong> Share, copy, adapt, and use this data for any purpose, including commercial use.
                </p>
                <p className="text-amber-700 dark:text-amber-300 text-sm mt-2">
                  <strong>Required attribution:</strong> "Data from Let AI Explain AI (letaiexplainai.com)"
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default DataExportPage;
