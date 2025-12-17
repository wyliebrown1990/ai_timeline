import { Github, ExternalLink } from 'lucide-react';

/**
 * Footer component with links and copyright
 * Stays at the bottom of the page via flex layout in Layout.tsx
 */
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
      role="contentinfo"
    >
      <div className="container-main py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Copyright */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {currentYear} AI Timeline. Built to explore the history of artificial intelligence.
          </p>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/wyliebrown1990/ai_timeline"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
