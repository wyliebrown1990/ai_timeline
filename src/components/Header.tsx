import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Newspaper,
  Settings,
  Menu,
  X,
  Clock,
  GraduationCap,
  Search,
  Layers,
  ChevronDown,
  Sparkles,
  MoreHorizontal,
  FolderOpen,
  PenLine,
  Users,
} from 'lucide-react';
import { ThemeToggleSimple } from './ThemeToggle';
import { ProfileIndicator } from './Onboarding';
import { useFlashcardContext } from '../contexts/FlashcardContext';
import { GlobalSearch, useGlobalSearch } from './GlobalSearch';

/**
 * Navigation link type
 */
interface NavLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact: boolean;
  isFeatured?: boolean;
  showDueBadge?: boolean;
}

/**
 * Primary navigation links - always visible on desktop
 */
const primaryLinks: NavLink[] = [
  { to: '/feed', label: 'Feed', icon: Sparkles, exact: true, isFeatured: true },
  { to: '/timeline', label: 'Timeline', icon: Clock, exact: true },
  { to: '/blog', label: 'Blog', icon: PenLine, exact: false },
  { to: '/learn', label: 'Learn', icon: BookOpen, exact: false },
];

/**
 * Secondary navigation links - in "More" dropdown on desktop
 */
const secondaryLinks: NavLink[] = [
  { to: '/news', label: 'News', icon: Newspaper, exact: true },
  { to: '/people', label: 'People', icon: Users, exact: false },
  { to: '/subjects', label: 'Subjects', icon: Layers, exact: false },
  { to: '/study', label: 'Study', icon: GraduationCap, exact: false, showDueBadge: true },
  { to: '/glossary', label: 'Glossary', icon: FileText, exact: true },
  { to: '/resources', label: 'Resources', icon: FolderOpen, exact: true },
];

/**
 * All links for mobile menu
 */
const allLinks: NavLink[] = [...primaryLinks, ...secondaryLinks];

/**
 * More dropdown for secondary navigation
 */
function MoreDropdown({ dueToday }: { dueToday: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if any secondary link is active
  const hasActiveSecondary = secondaryLinks.some((link) =>
    link.exact ? location.pathname === link.to : location.pathname.startsWith(link.to)
  );

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          hasActiveSecondary
            ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
        }`}
        aria-label="More pages"
      >
        <MoreHorizontal className="h-4 w-4" />
        <span>More</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {secondaryLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);
            const showBadge = link.showDueBadge && dueToday > 0;

            // Special case for Subjects - show inline dropdown trigger or link
            if (link.to === '/subjects') {
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
                {showBadge && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {dueToday > 99 ? '99+' : dueToday}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Header component with redesigned navigation
 * - Logo links to home (no separate Home button)
 * - Primary nav: Feed, Timeline, Learn
 * - More dropdown: News, Subjects, Study, Glossary, Resources
 * - Right side: Search, Profile, Settings, Theme
 */
function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { dueToday } = useFlashcardContext();
  const { isOpen: isSearchOpen, openSearch, closeSearch } = useGlobalSearch();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-700 dark:bg-gray-900/95 dark:supports-[backdrop-filter]:bg-gray-900/80"
      role="banner"
    >
      <div className="container-main">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo / Brand - links to home */}
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 transition-colors hover:text-orange-600 dark:text-white dark:hover:text-orange-400 shrink-0"
            onClick={closeMobileMenu}
          >
            <img src="/ai-logo-animated.svg" alt="" className="h-7 w-7" />
            <span className="hidden sm:inline">LAEA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <nav aria-label="Main navigation" role="navigation">
              <ul className="flex items-center gap-1">
                {primaryLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = link.exact
                    ? location.pathname === link.to
                    : location.pathname.startsWith(link.to);

                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          link.isFeatured
                            ? isActive
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                              : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-200 dark:border-purple-800'
                            : isActive
                              ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className={`h-4 w-4 ${link.isFeatured && !isActive ? 'text-purple-500' : ''}`} />
                        <span>{link.label}</span>
                        {link.isFeatured && !isActive && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                            New
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}

                {/* More dropdown */}
                <li>
                  <MoreDropdown dueToday={dueToday} />
                </li>
              </ul>
            </nav>
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Search Button */}
            <button
              onClick={openSearch}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              aria-label="Search (Cmd+K)"
              title="Search (Cmd+K)"
            >
              <Search className="h-4 w-4" />
              <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
              </kbd>
            </button>

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
            {/* Search Button - Mobile */}
            <button
              onClick={openSearch}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Theme Toggle - Mobile */}
            <ThemeToggleSimple />

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <nav aria-label="Mobile navigation" className="container-main py-3">
            <ul className="space-y-1">
              {/* Home link in mobile */}
              <li>
                <Link
                  to="/"
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    location.pathname === '/'
                      ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                  aria-current={location.pathname === '/' ? 'page' : undefined}
                >
                  <img src="/ai-logo-animated.svg" alt="" className="h-5 w-5" />
                  <span>Home</span>
                </Link>
              </li>

              {allLinks.map((link) => {
                const Icon = link.icon;
                const isActive = link.exact
                  ? location.pathname === link.to
                  : location.pathname.startsWith(link.to);
                const isFeatured = 'isFeatured' in link && link.isFeatured;
                const showBadge = 'showDueBadge' in link && link.showDueBadge && dueToday > 0;

                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        isFeatured
                          ? isActive
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                          : isActive
                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className={`h-5 w-5 ${isFeatured && !isActive ? 'text-purple-500' : ''}`} />
                      <span>{link.label}</span>
                      {isFeatured && !isActive && (
                        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                          New
                        </span>
                      )}
                      {showBadge && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                          {dueToday > 99 ? '99+' : dueToday}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Settings and Profile in Mobile Menu */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/settings"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                  location.pathname === '/settings'
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
              <div className="px-4 py-3">
                <ProfileIndicator />
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearch isOpen={isSearchOpen} onClose={closeSearch} />
    </header>
  );
}

export default Header;
