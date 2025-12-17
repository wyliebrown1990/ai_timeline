import { Link } from 'react-router-dom';
import { ArrowRight, Clock, BookOpen, Users, Sparkles } from 'lucide-react';
import { useOnboarding } from '../components/Onboarding';

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
 */
function HomePage() {
  const { openOnboarding } = useOnboarding();

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 dark:from-gray-800 dark:to-gray-900 sm:py-24">
        <div className="container-main text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-6xl">
            The History of{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
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
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-900"
            >
              <span>Explore Timeline</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={openOnboarding}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-6 py-3 font-medium text-purple-700 shadow-sm transition-all hover:bg-purple-50 hover:border-purple-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:border-purple-600 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30 dark:hover:border-purple-500 dark:focus:ring-offset-gray-900"
            >
              <Sparkles className="h-4 w-4" />
              <span>Personalize Your Journey</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 dark:bg-gray-900 sm:py-24">
        <div className="container-main">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            Discover AI's Evolution
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600 dark:text-gray-300">
            Navigate through eras, explore concepts, and dive deep into the primary sources that
            document AI's remarkable journey.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guided Path Preview */}
      <section className="bg-gray-50 py-16 dark:bg-gray-800 sm:py-24">
        <div className="container-main">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100">Start Your Journey</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600 dark:text-gray-300">
            Begin with our guided path through four pivotal moments that defined the modern AI era.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-2">
            {['Transformer', 'GPT-3', 'ChatGPT', 'GPT-4'].map((milestone, index) => (
              <div key={milestone} className="flex items-center">
                <div className="rounded-lg bg-white px-4 py-2 font-medium text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100">
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
              className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
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
