/**
 * API Key Context
 *
 * Provides global access to API key state and management functions.
 * Wrap your app with ApiKeyProvider to enable API key features.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useApiKey, type UseApiKeyReturn } from '../../hooks/useApiKey';

// Create context with undefined default (must be used within provider)
const ApiKeyContext = createContext<UseApiKeyReturn | undefined>(undefined);

/**
 * Props for ApiKeyProvider
 */
interface ApiKeyProviderProps {
  children: ReactNode;
}

/**
 * Provider component for API key state
 * Wrap your app with this to enable useApiKeyContext hook
 */
export function ApiKeyProvider({ children }: ApiKeyProviderProps) {
  const apiKeyState = useApiKey();

  return (
    <ApiKeyContext.Provider value={apiKeyState}>
      {children}
    </ApiKeyContext.Provider>
  );
}

/**
 * Hook to access API key context
 * Must be used within an ApiKeyProvider
 */
export function useApiKeyContext(): UseApiKeyReturn {
  const context = useContext(ApiKeyContext);

  if (context === undefined) {
    throw new Error('useApiKeyContext must be used within an ApiKeyProvider');
  }

  return context;
}

export default ApiKeyContext;
