import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

/**
 * Main layout component that wraps all pages
 * Provides consistent header, footer, and main content area
 */
function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        data-testid="skip-nav"
      >
        Skip to main content
      </a>

      <Header />
      <main id="main-content" className="flex-1" role="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
