import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './styles/index.css';

/**
 * Application entry point
 * Renders the root App component with React StrictMode enabled
 * HelmetProvider enables dynamic meta tags per route for SEO
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Check index.html for <div id="root"></div>');
}

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
