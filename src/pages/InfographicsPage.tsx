import { useState, useRef } from 'react';
import { Download, Share2, Twitter, Linkedin, Check, Loader2 } from 'lucide-react';
import { SEO } from '../components/SEO';
import { useMilestones } from '../hooks';
import { MilestoneCategory, type MilestoneWithLayeredContent } from '../types/milestone';

// Infographic types
type InfographicType = 'timeline-glance' | 'top-breakthroughs' | 'gpt-evolution' | 'company-timelines';

interface InfographicData {
  id: InfographicType;
  title: string;
  description: string;
  width: number;
  height: number;
}

const INFOGRAPHICS: InfographicData[] = [
  {
    id: 'timeline-glance',
    title: 'AI Timeline at a Glance',
    description: 'Visual overview of major AI milestones from 1950s to today',
    width: 1200,
    height: 675,
  },
  {
    id: 'top-breakthroughs',
    title: 'Top 10 AI Breakthroughs',
    description: 'The most significant AI milestones of the modern era',
    width: 1200,
    height: 675,
  },
  {
    id: 'gpt-evolution',
    title: 'Evolution of GPT Models',
    description: 'From GPT-1 to GPT-4 and beyond',
    width: 1200,
    height: 675,
  },
  {
    id: 'company-timelines',
    title: 'AI Company Timelines',
    description: 'Major milestones from OpenAI, Anthropic, Google, and Meta',
    width: 1200,
    height: 675,
  },
];

// Timeline at a Glance SVG Component
function TimelineGlanceInfographic({ milestones }: { milestones: MilestoneWithLayeredContent[] }) {
  // Get key milestones per decade
  const decades = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
  const decadeMilestones = decades.map((decade) => {
    const startYear = parseInt(decade);
    const filtered = milestones.filter((m) => {
      const year = new Date(m.date).getFullYear();
      return year >= startYear && year < startYear + 10;
    });
    const top = filtered.sort((a, b) => (b.significance || 0) - (a.significance || 0))[0];
    return { decade, milestone: top };
  });

  return (
    <svg viewBox="0 0 1200 675" className="w-full h-auto">
      {/* Background */}
      <rect width="1200" height="675" fill="#1a1a2e" />

      {/* Header */}
      <text x="600" y="50" textAnchor="middle" fill="#f97316" fontSize="32" fontWeight="bold">
        AI Timeline at a Glance
      </text>
      <text x="600" y="80" textAnchor="middle" fill="#94a3b8" fontSize="14">
        Key milestones in artificial intelligence history
      </text>

      {/* Timeline line */}
      <line x1="100" y1="350" x2="1100" y2="350" stroke="#f97316" strokeWidth="4" />

      {/* Decade markers */}
      {decadeMilestones.map((item, i) => {
        const x = 100 + i * 140;
        const isTop = i % 2 === 0;
        const y = isTop ? 280 : 420;

        return (
          <g key={item.decade}>
            {/* Dot on timeline */}
            <circle cx={x} cy={350} r="8" fill="#f97316" />

            {/* Decade label */}
            <text x={x} y={380} textAnchor="middle" fill="#94a3b8" fontSize="12">
              {item.decade}
            </text>

            {/* Milestone card */}
            {item.milestone && (
              <g>
                <line
                  x1={x}
                  y1={350}
                  x2={x}
                  y2={isTop ? 300 : 400}
                  stroke="#4a5568"
                  strokeWidth="1"
                  strokeDasharray="4,2"
                />
                <rect
                  x={x - 60}
                  y={y - 30}
                  width="120"
                  height="60"
                  rx="8"
                  fill="#2d3748"
                  stroke="#4a5568"
                  strokeWidth="1"
                />
                <text x={x} y={y - 5} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                  {item.milestone.title.length > 18
                    ? item.milestone.title.substring(0, 15) + '...'
                    : item.milestone.title}
                </text>
                <text x={x} y={y + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">
                  {new Date(item.milestone.date).getFullYear()}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Footer */}
      <text x="600" y="620" textAnchor="middle" fill="#64748b" fontSize="12">
        letaiexplainai.com
      </text>
      <text x="600" y="640" textAnchor="middle" fill="#475569" fontSize="10">
        CC BY 4.0 - Share with attribution
      </text>
    </svg>
  );
}

// Top Breakthroughs SVG Component
function TopBreakthroughsInfographic({ milestones }: { milestones: MilestoneWithLayeredContent[] }) {
  // Get top 10 by significance
  const top10 = [...milestones]
    .filter((m) => m.significance && m.significance >= 3)
    .sort((a, b) => {
      const sigDiff = (b.significance || 0) - (a.significance || 0);
      if (sigDiff !== 0) return sigDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 10);

  return (
    <svg viewBox="0 0 1200 675" className="w-full h-auto">
      {/* Background */}
      <rect width="1200" height="675" fill="#0f172a" />

      {/* Header */}
      <text x="600" y="50" textAnchor="middle" fill="#f97316" fontSize="32" fontWeight="bold">
        Top 10 AI Breakthroughs
      </text>
      <text x="600" y="80" textAnchor="middle" fill="#94a3b8" fontSize="14">
        The most significant milestones in AI history
      </text>

      {/* List items */}
      {top10.map((milestone, i) => {
        const y = 120 + i * 50;
        const year = new Date(milestone.date).getFullYear();

        return (
          <g key={milestone.id}>
            {/* Rank badge */}
            <circle cx="80" cy={y + 10} r="18" fill="#f97316" />
            <text x="80" y={y + 16} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
              {i + 1}
            </text>

            {/* Year */}
            <text x="130" y={y + 15} fill="#64748b" fontSize="14">
              {year}
            </text>

            {/* Title */}
            <text x="200" y={y + 15} fill="#fff" fontSize="16" fontWeight="bold">
              {milestone.title.length > 45 ? milestone.title.substring(0, 42) + '...' : milestone.title}
            </text>

            {/* Organization */}
            {milestone.organization && (
              <text x="900" y={y + 15} fill="#94a3b8" fontSize="12">
                {milestone.organization}
              </text>
            )}

            {/* Significance stars */}
            <text x="1100" y={y + 15} fill="#fbbf24" fontSize="12">
              {'★'.repeat(milestone.significance || 0)}
            </text>
          </g>
        );
      })}

      {/* Footer */}
      <text x="600" y="640" textAnchor="middle" fill="#64748b" fontSize="12">
        letaiexplainai.com | CC BY 4.0
      </text>
    </svg>
  );
}

// GPT Evolution SVG Component
function GPTEvolutionInfographic({ milestones }: { milestones: MilestoneWithLayeredContent[] }) {
  // Filter GPT-related milestones
  const gptMilestones = milestones
    .filter(
      (m) =>
        m.title.toLowerCase().includes('gpt') ||
        m.title.toLowerCase().includes('chatgpt') ||
        (m.organization?.toLowerCase() === 'openai' && m.category === MilestoneCategory.MODEL_RELEASE)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  return (
    <svg viewBox="0 0 1200 675" className="w-full h-auto">
      {/* Background gradient */}
      <defs>
        <linearGradient id="gptGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#gptGradient)" />

      {/* Header */}
      <text x="600" y="50" textAnchor="middle" fill="#10b981" fontSize="32" fontWeight="bold">
        Evolution of GPT Models
      </text>
      <text x="600" y="80" textAnchor="middle" fill="#94a3b8" fontSize="14">
        OpenAI's journey from GPT-1 to cutting-edge language models
      </text>

      {/* Timeline with cards */}
      <line x1="100" y1="350" x2="1100" y2="350" stroke="#10b981" strokeWidth="3" />

      {gptMilestones.map((milestone, i) => {
        const x = 140 + i * 130;
        const isTop = i % 2 === 0;
        const cardY = isTop ? 150 : 420;
        const year = new Date(milestone.date).getFullYear();
        const month = new Date(milestone.date).toLocaleDateString('en-US', { month: 'short' });

        return (
          <g key={milestone.id}>
            {/* Connection line */}
            <line
              x1={x}
              y1={350}
              x2={x}
              y2={isTop ? 280 : 400}
              stroke="#10b981"
              strokeWidth="2"
            />

            {/* Dot on timeline */}
            <circle cx={x} cy={350} r="10" fill="#10b981" />

            {/* Card */}
            <rect
              x={x - 55}
              y={cardY}
              width="110"
              height="100"
              rx="8"
              fill="#1e293b"
              stroke="#10b981"
              strokeWidth="1"
            />

            {/* Card content */}
            <text x={x} y={cardY + 25} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">
              {month} {year}
            </text>
            <text x={x} y={cardY + 50} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
              {milestone.title.length > 14 ? milestone.title.substring(0, 11) + '...' : milestone.title}
            </text>
            {milestone.significance && (
              <text x={x} y={cardY + 75} textAnchor="middle" fill="#fbbf24" fontSize="10">
                {'★'.repeat(milestone.significance)}
              </text>
            )}
          </g>
        );
      })}

      {/* Footer */}
      <text x="600" y="640" textAnchor="middle" fill="#64748b" fontSize="12">
        letaiexplainai.com | CC BY 4.0
      </text>
    </svg>
  );
}

// Company Timelines SVG Component
function CompanyTimelinesInfographic({ milestones }: { milestones: MilestoneWithLayeredContent[] }) {
  const companies = ['OpenAI', 'Google', 'Anthropic', 'Meta'];
  const colors = ['#10b981', '#4285f4', '#d97706', '#1877f2'];

  const companyData = companies.map((company, i) => ({
    name: company,
    color: colors[i],
    milestones: milestones
      .filter((m) => m.organization?.toLowerCase() === company.toLowerCase())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5),
  }));

  return (
    <svg viewBox="0 0 1200 675" className="w-full h-auto">
      {/* Background */}
      <rect width="1200" height="675" fill="#0f172a" />

      {/* Header */}
      <text x="600" y="45" textAnchor="middle" fill="#f97316" fontSize="28" fontWeight="bold">
        AI Company Timelines
      </text>
      <text x="600" y="70" textAnchor="middle" fill="#94a3b8" fontSize="13">
        Key milestones from leading AI companies
      </text>

      {/* Company rows */}
      {companyData.map((company, rowIndex) => {
        const rowY = 110 + rowIndex * 140;

        return (
          <g key={company.name}>
            {/* Company name */}
            <rect x="20" y={rowY} width="100" height="30" rx="4" fill={company.color} />
            <text x="70" y={rowY + 20} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
              {company.name}
            </text>

            {/* Timeline line */}
            <line x1="140" y1={rowY + 15} x2="1150" y2={rowY + 15} stroke="#334155" strokeWidth="2" />

            {/* Milestones */}
            {company.milestones.map((milestone, i) => {
              const x = 200 + i * 190;
              const year = new Date(milestone.date).getFullYear();

              return (
                <g key={milestone.id}>
                  <circle cx={x} cy={rowY + 15} r="8" fill={company.color} />
                  <text x={x} y={rowY + 45} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
                    {milestone.title.length > 20 ? milestone.title.substring(0, 17) + '...' : milestone.title}
                  </text>
                  <text x={x} y={rowY + 60} textAnchor="middle" fill="#64748b" fontSize="9">
                    {year}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Footer */}
      <text x="600" y="640" textAnchor="middle" fill="#64748b" fontSize="12">
        letaiexplainai.com | CC BY 4.0
      </text>
    </svg>
  );
}

// Infographic Card Component
function InfographicCard({
  data,
  milestones,
}: {
  data: InfographicData;
  milestones: MilestoneWithLayeredContent[];
}) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    if (!svgRef.current) return;

    setDownloading(true);
    try {
      const svgElement = svgRef.current.querySelector('svg');
      if (!svgElement) return;

      // Clone SVG and add proper dimensions
      const clone = svgElement.cloneNode(true) as SVGElement;
      clone.setAttribute('width', data.width.toString());
      clone.setAttribute('height', data.height.toString());

      // Convert to data URL
      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Create canvas and draw
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = data.width;
        canvas.height = data.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        // Download as PNG
        canvas.toBlob((blob) => {
          if (!blob) return;
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${data.id}-laea.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);

          setDownloaded(true);
          setTimeout(() => setDownloaded(false), 3000);
        }, 'image/png');

        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = (platform: 'twitter' | 'linkedin') => {
    const text = `Check out this ${data.title} infographic from Let AI Explain AI!`;
    const url = 'https://letaiexplainai.com/timeline/infographics';

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    }
  };

  const renderInfographic = () => {
    switch (data.id) {
      case 'timeline-glance':
        return <TimelineGlanceInfographic milestones={milestones} />;
      case 'top-breakthroughs':
        return <TopBreakthroughsInfographic milestones={milestones} />;
      case 'gpt-evolution':
        return <GPTEvolutionInfographic milestones={milestones} />;
      case 'company-timelines':
        return <CompanyTimelinesInfographic milestones={milestones} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Preview */}
      <div ref={svgRef} className="aspect-video bg-gray-900">
        {renderInfographic()}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 dark:text-white">{data.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {data.width} x {data.height} px
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all ${
              downloaded
                ? 'bg-green-500'
                : downloading
                  ? 'bg-gray-400'
                  : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {downloaded ? (
              <>
                <Check className="h-4 w-4" />
                Downloaded
              </>
            ) : downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PNG
              </>
            )}
          </button>

          <button
            onClick={() => handleShare('twitter')}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Share on Twitter"
          >
            <Twitter className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>

          <button
            onClick={() => handleShare('linkedin')}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Share on LinkedIn"
          >
            <Linkedin className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * InfographicsPage - Gallery of shareable AI timeline infographics
 * Sprint TD-4: Linkable Assets
 */
function InfographicsPage() {
  const { data: milestones, isLoading } = useMilestones();

  // Schema for SEO
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AI Timeline Infographics',
    description: 'Free downloadable infographics about AI history and milestones. Perfect for social media, presentations, and educational content.',
    url: 'https://letaiexplainai.com/timeline/infographics',
    creator: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: 'https://letaiexplainai.com',
    },
  };

  return (
    <>
      <SEO
        title="AI Timeline Infographics - Free Visual Resources | LAEA"
        description="Download free AI timeline infographics. Visual summaries of AI history, top breakthroughs, GPT evolution, and company timelines. Perfect for social sharing."
        canonical="https://letaiexplainai.com/timeline/infographics"
        jsonLd={collectionSchema}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white py-16">
          <div className="container-main">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold mb-4">AI Timeline Infographics</h1>
              <p className="text-xl text-purple-100">
                Free visual resources for social media, presentations, and educational content.
                Download and share with attribution.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container-main">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-3 text-gray-500">Loading infographics...</span>
              </div>
            ) : milestones && milestones.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-8">
                {INFOGRAPHICS.map((info) => (
                  <InfographicCard key={info.id} data={info} milestones={milestones} />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">No data available</p>
            )}

            {/* Usage Guidelines */}
            <div className="mt-12 max-w-3xl mx-auto">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-900 dark:text-purple-300">
                    Usage Guidelines
                  </h3>
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                  All infographics are licensed under CC BY 4.0. You are free to:
                </p>
                <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                  <li>• Share on social media (Twitter, LinkedIn, Facebook)</li>
                  <li>• Include in presentations and reports</li>
                  <li>• Use in blog posts and articles</li>
                  <li>• Print for educational purposes</li>
                </ul>
                <p className="mt-3 text-sm text-purple-800 dark:text-purple-200">
                  <strong>Attribution required:</strong> Please include "Source: letaiexplainai.com" when sharing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default InfographicsPage;
