import { Link } from 'react-router-dom';
import { ArrowRight, Clock, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { useOnboarding } from '../components/Onboarding';
import { InTheNewsSection } from '../components/CurrentEvents';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { AnimatedTitle } from '../components/AnimatedTitle';

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
          <AnimatedLogo className="mx-auto mb-8" size={128} />
          <AnimatedTitle
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            startDelay={1200}
            typeSpeed={45}
          />
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
              className="group inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Sparkles className="h-4 w-4 transition-colors group-hover:fill-orange-400 group-hover:text-orange-500" />
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

      {/* Start Your Journey */}
      <section className="bg-orange-50 py-16 dark:bg-gray-800 sm:py-24">
        <div className="container-main">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">Start Your Journey</h2>

          <div className="mx-auto mt-8 max-w-3xl space-y-4 text-center text-gray-600 dark:text-gray-300">
            <p className="text-lg">
              When people talk about AI today, they're almost always referring to Large Language Models
              and AI assistants like ChatGPT. The release of ChatGPT in November 2022 sparked a global
              conversation about artificial intelligence that continues to accelerate.
            </p>
            <p className="text-lg">
              But AI isn't new—it's been powering consumer products and business applications for decades,
              from recommendation engines to voice assistants to fraud detection. The foundations were
              laid in the 1940s and 50s by pioneers like Alan Turing and John McCarthy.
            </p>
            <p className="text-lg">
              <span className="font-semibold text-gray-900 dark:text-white">Let AI Explain AI</span> is
              a platform that helps anyone—whether you're just curious, a student, or a professional—explore
              AI's fascinating history, understand how we got here, and dive deeper into the concepts
              that matter most to you.
            </p>
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/timeline"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all hover:bg-orange-600 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <span>Begin on the Timeline</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
