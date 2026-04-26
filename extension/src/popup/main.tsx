import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from popup HTML');

createRoot(container).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-center"
      toastOptions={{
        className:
          'text-sm rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200 dark:border-gray-800',
      }}
    />
  </StrictMode>,
);
