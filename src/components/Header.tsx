import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, FileText, Newspaper, Settings, Menu, X, Clock, GraduationCap } from 'lucide-react';
import { ThemeToggleSimple } from './ThemeToggle';
import { ProfileIndicator } from './Onboarding';
import { useFlashcardContext } from '../contexts/FlashcardContext';

/**
 * Navigation link configuration
 * Defines all main navigation items
 */
const navLinks = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/timeline', label: 'Timeline', icon: Clock, exact: true },
  { to: '/news', label: 'News', icon: Newspaper, exact: true },
  { to: '/learn', label: 'Learn', icon: BookOpen, exact: false },
  { to: '/study', label: 'Study', icon: GraduationCap, exact: false },
  { to: '/glossary', label: 'Glossary', icon: FileText, exact: true },
] as const;

/**
 * Header component with main navigation
 * Warm orange accent theme
 * Responsive: hamburger menu on mobile, horizontal nav on desktop
 */
function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { dueToday } = useFlashcardContext();

  const closeMobileMenu = () => setMobileMenuOpen(false);

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
            className="flex items-center gap-2 text-xl font-bold text-gray-900 transition-colors hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
            onClick={closeMobileMenu}
          >
            <img src="/logo.png" alt="AI Timeline" className="h-8 w-8 rounded-lg" />
            <span className="hidden sm:inline">AI Timeline</span>
            <span className="sm:hidden">AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <nav aria-label="Main navigation" role="navigation">
              <ul className="flex items-center gap-1">
                {navLinks.map(({ to, label, icon: Icon, exact }) => {
                  const isActive = exact
                    ? location.pathname === to
                    : location.pathname.startsWith(to);
                  // Show badge for Study link when there are cards due
                  const showBadge = to === '/study' && dueToday > 0;
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        {/* Due cards badge */}
                        {showBadge && (
                          <span
                            className="ml-1 inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white"
                            aria-label={`${dueToday} cards due for review`}
                          >
                            {dueToday > 99 ? '99+' : dueToday}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Profile Indicator */}
            <ProfileIndicator />

            {/* Settings Link */}
            <Link
              to="/settings"
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
              }`}
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* Theme Toggle */}
            <ThemeToggleSimple />
          </div>

          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-1">
            {/* Settings Link - Mobile */}
            <Link
              to="/settings"
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
              }`}
              aria-label="Settings"
              onClick={closeMobileMenu}
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* Theme Toggle - Mobile */}
            <ThemeToggleSimple />

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <nav aria-label="Mobile navigation" className="container-main py-3">
            <ul className="space-y-1">
              {navLinks.map(({ to, label, icon: Icon, exact }) => {
                const isActive = exact
                  ? location.pathname === to
                  : location.pathname.startsWith(to);
                // Show badge for Study link when there are cards due
                const showBadge = to === '/study' && dueToday > 0;
                return (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{label}</span>
                      {/* Due cards badge */}
                      {showBadge && (
                        <span
                          className="ml-auto inline-flex items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white"
                          aria-label={`${dueToday} cards due for review`}
                        >
                          {dueToday > 99 ? '99+' : dueToday}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Profile Indicator in Mobile Menu */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 px-4">
              <ProfileIndicator />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
