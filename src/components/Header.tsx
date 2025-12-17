import { Link, useLocation } from 'react-router-dom';
import { Clock, Home, BookOpen, FileText } from 'lucide-react';
import { ThemeToggleSimple } from './ThemeToggle';
import { ProfileIndicator } from './Onboarding';

/**
 * Navigation link configuration
 * Defines all main navigation items
 */
const navLinks = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/timeline', label: 'Timeline', icon: Clock, exact: true },
  { to: '/learn', label: 'Learn', icon: BookOpen, exact: false },
  { to: '/glossary', label: 'Glossary', icon: FileText, exact: true },
] as const;

/**
 * Header component with main navigation
 * Responsive design: hamburger menu on mobile, horizontal nav on desktop
 */
function Header() {
  const location = useLocation();

  return (
    <header
      className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-700 dark:bg-gray-900/95 dark:supports-[backdrop-filter]:bg-gray-900/80"
      role="banner"
    >
      <div className="container-main">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 transition-colors hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
          >
            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>AI Timeline</span>
          </Link>

          {/* Navigation and Controls */}
          <div className="flex items-center gap-2">
            <nav aria-label="Main navigation" role="navigation">
              <ul className="flex items-center gap-1">
                {navLinks.map(({ to, label, icon: Icon, exact }) => {
                  const isActive = exact
                    ? location.pathname === to
                    : location.pathname.startsWith(to);
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Profile Indicator */}
            <ProfileIndicator />

            {/* Theme Toggle */}
            <ThemeToggleSimple />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
