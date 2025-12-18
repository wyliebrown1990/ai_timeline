import { Link } from 'react-router-dom';
import { ArrowRight, Clock, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
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
    to: '/timeline',
  },
  {
    icon: BookOpen,
    title: 'Learning Paths',
    description:
      'Guided journeys through AI topics—from fundamentals to cutting-edge developments.',
    to: '/learn',
  },
  {
    icon: GraduationCap,
    title: 'Study Cards',
    description:
      'Reinforce your learning with spaced repetition flashcards and knowledge checkpoints.',
    to: '/study',
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
      <section className="bg-gradient-to-b from-orange-50 to-white py-16 dark:from-gray-800 dark:to-gray-900 sm:py-24">
        <div className="container-main text-center">
          <img
            src="/logo.png"
            alt="AI Timeline"
            className="mx-auto mb-8 h-24 w-24 rounded-2xl shadow-lg sm:h-32 sm:w-32"
          />
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
            The History of{' '}
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Artificial Intelligence
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            An interactive atlas and guided journey through the milestones that shaped AI—from
            Turing's foundations to GPT-4 and beyond.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/timeline"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-medium text-white shadow-lg transition-all hover:bg-orange-600 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <span>Explore Timeline</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={openOnboarding}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
      <section className="py-16 bg-white dark:bg-gray-900 sm:py-24">
        <div className="container-main">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            Discover AI's Evolution
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600 dark:text-gray-400">
            Navigate through eras, explore concepts, and dive deep into the primary sources that
            document AI's remarkable journey.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description, to }) => (
              <Link
                key={title}
                to={to}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-orange-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-600"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 transition-colors group-hover:bg-orange-200 dark:bg-orange-900/30 dark:group-hover:bg-orange-900/50">
                  <Icon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-orange-600 dark:text-orange-400">
                  Get started
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Guided Path Preview */}
      <section className="bg-orange-50 py-16 dark:bg-gray-800 sm:py-24">
        <div className="container-main">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">Start Your Journey</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600 dark:text-gray-400">
            Begin with our guided path through four pivotal moments that defined the modern AI era.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-2">
            {['Transformer', 'GPT-3', 'ChatGPT', 'GPT-4'].map((milestone, index) => (
              <div key={milestone} className="flex items-center">
                <div className="rounded-lg bg-white px-4 py-2 font-medium text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white">
                  {milestone}
                </div>
                {index < 3 && (
                  <ArrowRight className="mx-2 hidden h-4 w-4 text-gray-400 dark:text-gray-500 sm:block" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/timeline"
              className="text-orange-600 hover:text-orange-700 hover:underline dark:text-orange-400 dark:hover:text-orange-300"
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
