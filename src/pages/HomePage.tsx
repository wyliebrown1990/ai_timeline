import { Link } from 'react-router-dom';
import { ArrowRight, Clock, BookOpen, Users, Sparkles } from 'lucide-react';
import { useOnboarding } from '../components/Onboarding';
import { InTheNewsSection } from '../components/CurrentEvents';

/**
 * Feature card data for the home page
 * Highlights the main capabilities of AI Timeline
 */
const features = [
  {
    icon: Clock,
    title: 'Interactive Timeline',
    description:
      'Explore AI history from the 1940s to today with semantic zoom from decades to months.',
  },
  {
    icon: BookOpen,
    title: 'Primary Sources',
    description:
      'Every event is backed by citations to original papers, announcements, and documents.',
  },
  {
    icon: Users,
    title: 'Key Figures',
    description:
      'Learn about the researchers, engineers, and visionaries who shaped artificial intelligence.',
  },
] as const;

/**
 * Home page component
 * Landing page with hero section, feature highlights, and CTA
 * Anthropic Warm theme - elegant, minimal design
 */
function HomePage() {
  const { openOnboarding } = useOnboarding();

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-warm-100 to-warm-50 py-16 dark:from-warm-800 dark:to-warm-900 sm:py-24">
        <div className="container-main text-center">
          <h1 className="text-4xl font-bold tracking-tight text-warmGray-800 dark:text-warm-50 sm:text-5xl lg:text-6xl">
            The History of{' '}
            <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent dark:from-primary-400 dark:to-primary-600">
              Artificial Intelligence
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-warmGray-600 dark:text-warm-300">
            An interactive atlas and guided journey through the milestones that shaped AI—from
            Turing's foundations to GPT-4 and beyond.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/timeline"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white shadow-warm transition-all hover:bg-primary-600 hover:shadow-warm-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-400 dark:text-warmGray-900 dark:hover:bg-primary-500 dark:focus:ring-offset-warm-900"
            >
              <span>Explore Timeline</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={openOnboarding}
              className="inline-flex items-center gap-2 rounded-lg border border-warm-300 bg-white px-6 py-3 font-medium text-warmGray-700 shadow-warm-sm transition-all hover:bg-warm-50 hover:border-warm-400 hover:shadow-warm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-warm-600 dark:bg-warm-800 dark:text-warm-200 dark:hover:bg-warm-700 dark:focus:ring-offset-warm-900"
            >
              <Sparkles className="h-4 w-4" />
              <span>Personalize Your Journey</span>
            </button>
          </div>
        </div>
      </section>

      {/* In The News Section - Current events with historical context */}
      <InTheNewsSection maxEvents={3} />

      {/* Features Section */}
      <section className="py-16 bg-warm-50 dark:bg-warm-900 sm:py-24">
        <div className="container-main">
          <h2 className="text-center text-3xl font-bold text-warmGray-800 dark:text-warm-50">
            Discover AI's Evolution
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-warmGray-600 dark:text-warm-300">
            Navigate through eras, explore concepts, and dive deep into the primary sources that
            document AI's remarkable journey.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-warm-200 bg-white p-6 shadow-warm-sm transition-shadow hover:shadow-warm dark:border-warm-700 dark:bg-warm-800"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                  <Icon className="h-6 w-6 text-primary-500 dark:text-primary-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-warmGray-800 dark:text-warm-50">{title}</h3>
                <p className="mt-2 text-warmGray-600 dark:text-warm-300">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guided Path Preview */}
      <section className="bg-warm-100 py-16 dark:bg-warm-800 sm:py-24">
        <div className="container-main">
          <h2 className="text-center text-3xl font-bold text-warmGray-800 dark:text-warm-50">Start Your Journey</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-warmGray-600 dark:text-warm-300">
            Begin with our guided path through four pivotal moments that defined the modern AI era.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-2">
            {['Transformer', 'GPT-3', 'ChatGPT', 'GPT-4'].map((milestone, index) => (
              <div key={milestone} className="flex items-center">
                <div className="rounded-lg bg-white px-4 py-2 font-medium text-warmGray-800 shadow-warm-sm dark:bg-warm-700 dark:text-warm-100">
                  {milestone}
                </div>
                {index < 3 && (
                  <ArrowRight className="mx-2 hidden h-4 w-4 text-warmGray-400 dark:text-warm-500 sm:block" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/timeline"
              className="text-primary-600 hover:text-primary-700 hover:underline dark:text-primary-400 dark:hover:text-primary-300"
            >
              View the full timeline →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
