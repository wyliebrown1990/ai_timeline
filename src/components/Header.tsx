import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Home, BookOpen, FileText, Newspaper, Settings, Menu, X } from 'lucide-react';
import { ThemeToggleSimple } from './ThemeToggle';
import { ProfileIndicator } from './Onboarding';

/**
 * Navigation link configuration
 * Defines all main navigation items
 */
const navLinks = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/timeline', label: 'Timeline', icon: Clock, exact: true },
  { to: '/news', label: 'News', icon: Newspaper, exact: true },
  { to: '/learn', label: 'Learn', icon: BookOpen, exact: false },
  { to: '/glossary', label: 'Glossary', icon: FileText, exact: true },
] as const;

/**
 * Header component with main navigation
 * Anthropic Warm theme - elegant, minimal design
 * Responsive: hamburger menu on mobile, horizontal nav on desktop
 */
function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-warm-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-warm-700 dark:bg-warm-900/95 dark:supports-[backdrop-filter]:bg-warm-900/80"
      role="banner"
    >
      <div className="container-main">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-warmGray-800 transition-colors hover:text-primary-600 dark:text-warm-100 dark:hover:text-primary-400"
            onClick={closeMobileMenu}
          >
            <Clock className="h-6 w-6 text-primary-500 dark:text-primary-400" />
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
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'text-warmGray-600 hover:bg-warm-100 hover:text-warmGray-800 dark:text-warm-400 dark:hover:bg-warm-800 dark:hover:text-warm-100'
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

            {/* Settings Link */}
            <Link
              to="/settings"
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-warmGray-500 hover:bg-warm-100 hover:text-warmGray-700 dark:text-warm-400 dark:hover:bg-warm-800 dark:hover:text-warm-200'
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
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-warmGray-500 hover:bg-warm-100 hover:text-warmGray-700 dark:text-warm-400 dark:hover:bg-warm-800 dark:hover:text-warm-200'
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
              className="p-2 rounded-lg text-warmGray-500 hover:bg-warm-100 hover:text-warmGray-700 dark:text-warm-400 dark:hover:bg-warm-800 dark:hover:text-warm-200 transition-colors"
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
        <div className="md:hidden border-t border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-900">
          <nav aria-label="Mobile navigation" className="container-main py-3">
            <ul className="space-y-1">
              {navLinks.map(({ to, label, icon: Icon, exact }) => {
                const isActive = exact
                  ? location.pathname === to
                  : location.pathname.startsWith(to);
                return (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                          : 'text-warmGray-700 hover:bg-warm-100 dark:text-warm-300 dark:hover:bg-warm-800'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Profile Indicator in Mobile Menu */}
            <div className="mt-3 pt-3 border-t border-warm-200 dark:border-warm-700 px-4">
              <ProfileIndicator />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
