import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

/**
 * Application entry point
 * Renders the root App component with React StrictMode enabled
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Check index.html for <div id="root"></div>');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
