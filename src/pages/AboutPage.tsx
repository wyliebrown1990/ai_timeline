/**
 * AboutPage Component
 * Sprint SEO-5 - E-E-A-T Signals
 *
 * Establishes expertise, authoritativeness, and trustworthiness
 * with editorial process, content methodology, and organization info.
 */

import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import {
  BookOpen,
  CheckCircle,
  Shield,
  Users,
  Mail,
  ExternalLink,
  Clock,
  Brain,
  Target,
  RefreshCw,
} from 'lucide-react';

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
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/**
 * AboutPage - E-E-A-T focused about page
 */
export default function AboutPage() {
  // Organization schema for SEO
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Let AI Explain AI',
    url: 'https://letaiexplainai.com',
    description: 'Educational platform providing comprehensive, accessible explanations of artificial intelligence history, concepts, and key figures.',
    foundingDate: '2024',
    sameAs: [
      // Add social media links when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://letaiexplainai.com/contact',
    },
    publishingPrinciples: 'https://letaiexplainai.com/about#editorial-process',
  };

  return (
    <>
      <SEO
        title="About Us - Our Mission & Editorial Process"
        description="Learn about Let AI Explain AI's mission, editorial process, and commitment to accurate, accessible AI education. Discover how we research, verify, and present AI information."
        canonical="https://letaiexplainai.com/about"
        jsonLd={organizationJsonLd}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            About Let AI Explain AI
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Making artificial intelligence accessible through accurate, comprehensive, and engaging educational content.
          </p>
        </div>

        {/* Mission Section */}
        <div className="space-y-8">
          <SectionCard icon={Target} title="Our Mission">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              We believe everyone should be able to understand artificial intelligence &mdash; from its
              rich history to its cutting-edge developments. Our mission is to demystify AI by providing
              clear, accurate, and engaging explanations that serve learners of all backgrounds.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Whether you're a business leader wanting to understand AI's impact, a student exploring
              a career in technology, or simply curious about how AI works, we're here to help you
              learn at your own pace.
            </p>
          </SectionCard>

          <SectionCard icon={BookOpen} title="What We Offer">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Interactive Timeline</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Explore AI history from the 1940s to today with milestones, key figures, and breakthrough moments.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Comprehensive Glossary</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Over 150 AI terms explained at multiple levels &mdash; from simple definitions to technical deep-dives.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Key People Profiles</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Detailed profiles of researchers, executives, and pioneers shaping the AI industry.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Organization Directory</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Information about leading AI companies, research labs, and institutions.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Editorial Process - Important for E-E-A-T */}
          <div id="editorial-process">
            <SectionCard icon={Shield} title="Editorial Process">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                We're committed to accuracy and transparency. Here's how we create and maintain our content:
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Research & Sourcing</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      We gather information from authoritative primary sources including academic papers,
                      official company announcements, peer-reviewed publications, and verified news outlets.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Content Creation</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Content is written by our team with AI assistance for initial drafts. Complex technical
                      topics are explained at multiple levels to serve different audiences.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Verification & Review</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Facts are verified against multiple sources. Technical content is reviewed for accuracy.
                      Dates, attributions, and claims are double-checked before publication.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Ongoing Updates</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      AI moves fast. We continuously update our content to reflect new developments,
                      correct any errors, and improve clarity based on user feedback.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Freshness Commitment */}
          <SectionCard icon={RefreshCw} title="Content Freshness">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              AI is a rapidly evolving field. We're committed to keeping our content current:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                <span>High-traffic pages are reviewed and updated monthly</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                <span>Person and organization profiles are updated when significant news breaks</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                <span>New milestones are added within days of major AI announcements</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                <span>All pages display "Last updated" dates for transparency</span>
              </li>
            </ul>
          </SectionCard>

          {/* AI Transparency */}
          <SectionCard icon={Brain} title="AI Transparency">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              We use AI tools in our content creation process and believe in being transparent about it:
            </p>
            <ul className="space-y-3 text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span>AI assists with initial content drafts, research synthesis, and explanation generation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span>All AI-generated content is reviewed and verified by our editorial team</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span>Facts, dates, and attributions are always verified against primary sources</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span>We believe AI-assisted content can be high-quality when properly verified</span>
              </li>
            </ul>
          </SectionCard>

          {/* Contact */}
          <SectionCard icon={Users} title="Contact Us">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              We value feedback from our community. If you notice an error, have a suggestion,
              or want to contribute, we'd love to hear from you.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Contact Us
              </Link>
              <a
                href="https://github.com/letaiexplainai/ai-timeline"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Contribute on GitHub
              </a>
            </div>
          </SectionCard>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-12">
          Let AI Explain AI is dedicated to making artificial intelligence education accessible to everyone.
        </p>
      </div>
    </>
  );
}
