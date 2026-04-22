import { useState, useMemo } from 'react';
import { Check, Copy, Code, Eye } from 'lucide-react';
import { SEO } from '../components/SEO';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'MODEL_RELEASE', label: 'Model Releases' },
  { value: 'RESEARCH', label: 'Research' },
  { value: 'BREAKTHROUGH', label: 'Breakthroughs' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'REGULATION', label: 'Regulation' },
  { value: 'INDUSTRY', label: 'Industry' },
];

const ORGANIZATIONS = [
  { value: '', label: 'All Organizations' },
  { value: 'OpenAI', label: 'OpenAI' },
  { value: 'Anthropic', label: 'Anthropic' },
  { value: 'Google', label: 'Google' },
  { value: 'Meta', label: 'Meta' },
  { value: 'Microsoft', label: 'Microsoft' },
];

/**
 * EmbedConfigPage - Configure and copy embed code
 * Sprint TD-4: Linkable Assets
 */
function EmbedConfigPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [limit, setLimit] = useState(10);
  const [category, setCategory] = useState('');
  const [org, setOrg] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('400');
  const [copied, setCopied] = useState(false);

  // Build embed URL with UTM tracking
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (theme !== 'light') params.set('theme', theme);
    if (limit !== 10) params.set('limit', limit.toString());
    if (category) params.set('category', category);
    if (org) params.set('org', org);
    if (startYear) params.set('startYear', startYear);
    if (endYear) params.set('endYear', endYear);
    // UTM tracking for embed attribution
    params.set('utm_source', 'embed');
    params.set('utm_medium', 'widget');
    params.set('utm_campaign', 'timeline_embed');

    const queryString = params.toString();
    return `https://letaiexplainai.com/embed/timeline${queryString ? `?${queryString}` : ''}`;
  }, [theme, limit, category, org, startYear, endYear]);

  // Generate embed code
  const embedCode = useMemo(() => {
    return `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}; border-radius: 8px;"
  title="AI Timeline - Let AI Explain AI"
></iframe>`;
  }, [embedUrl, width, height, theme]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <>
      <SEO
        title="Embed AI Timeline Widget - Free Interactive Timeline"
        description="Add an interactive AI timeline to your website for free. Customizable, lightweight, and always up-to-date. Perfect for AI blogs, educational sites, and news platforms."
        canonical="https://letaiexplainai.com/timeline/embed"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero */}
        <section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-12">
          <div className="container-main">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold mb-3">Embed AI Timeline</h1>
              <p className="text-lg text-indigo-100">
                Add an interactive AI timeline to your website. Customize the appearance,
                filter by category, and copy the embed code.
              </p>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="container-main">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Configuration Panel */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Code className="h-5 w-5 text-indigo-500" />
                  Configuration
                </h2>

                <div className="space-y-5">
                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Theme
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          theme === 'light'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Light
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          theme === 'dark'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>

                  {/* Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Milestones: {limit}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category Filter
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Organization Filter
                    </label>
                    <select
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    >
                      {ORGANIZATIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Year
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 2020"
                        value={startYear}
                        onChange={(e) => setStartYear(e.target.value)}
                        min="1940"
                        max="2030"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Year
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 2025"
                        value={endYear}
                        onChange={(e) => setEndYear(e.target.value)}
                        min="1940"
                        max="2030"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Width
                      </label>
                      <input
                        type="text"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="100% or 600px"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        min="200"
                        max="1000"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Embed Code */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Embed Code
                  </label>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                      <code>{embedCode}</code>
                    </pre>
                    <button
                      onClick={handleCopy}
                      className={`absolute top-2 right-2 p-2 rounded-lg transition-all ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-500" />
                  Live Preview
                </h2>

                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  }}
                >
                  <iframe
                    src={embedUrl}
                    width="100%"
                    height={height}
                    frameBorder="0"
                    title="AI Timeline Preview"
                  />
                </div>

                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  This is how the embedded timeline will appear on your website.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default EmbedConfigPage;
