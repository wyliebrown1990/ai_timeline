/**
 * Session Context
 *
 * Provides app-wide access to user session state for database-backed
 * user data management. Handles device ID generation, session creation,
 * and localStorage to database migration.
 *
 * Sprint 38 - User Data Migration
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getDeviceId } from '../lib/deviceId';
import {
  userSessionApi,
  type LocalStorageMigrationData,
} from '../services/api';

// =============================================================================
// Types
// =============================================================================

/**
 * Session context value type
 */
export interface SessionContextType {
  /** Current session ID (null until session is established) */
  sessionId: string | null;
  /** True while session is being initialized */
  isLoading: boolean;
  /** Error if session initialization failed */
  error: Error | null;
  /** Whether the session is ready for use */
  isReady: boolean;
  /** Retry session initialization after an error */
  retry: () => void;
}

/**
 * Props for the provider component
 */
interface SessionProviderProps {
  children: ReactNode;
}

// =============================================================================
// Context
// =============================================================================

/**
 * Context for session state
 */
const SessionContext = createContext<SessionContextType | null>(null);

// =============================================================================
// localStorage Keys
// =============================================================================

/** Key for tracking migration status */
const MIGRATION_FLAG_KEY = 'ai-timeline-data-migrated';

/** Keys for localStorage data to migrate */
const LOCALSTORAGE_KEYS = {
  flashcards: 'ai-timeline-flashcards',
  packs: 'ai-timeline-flashcard-packs',
  stats: 'ai-timeline-flashcard-stats',
  streakHistory: 'ai-timeline-flashcard-streak',
  profile: 'ai-timeline-user-profile',
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely parse JSON from localStorage
 */
function safeJsonParse<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Collect localStorage data for migration
 */
function collectLocalStorageData(): LocalStorageMigrationData {
  return {
    flashcards: safeJsonParse(LOCALSTORAGE_KEYS.flashcards, []),
    packs: safeJsonParse(LOCALSTORAGE_KEYS.packs, []),
    stats: safeJsonParse(LOCALSTORAGE_KEYS.stats, {}),
    streakHistory: safeJsonParse(LOCALSTORAGE_KEYS.streakHistory, {}),
    profile: safeJsonParse(LOCALSTORAGE_KEYS.profile, {}),
  };
}

/**
 * Check if there's any data to migrate
 */
function hasDataToMigrate(data: LocalStorageMigrationData): boolean {
  const hasFlashcards = (data.flashcards?.length ?? 0) > 0;
  const hasPacks = (data.packs?.length ?? 0) > 0;
  const hasStats = Object.keys(data.stats ?? {}).length > 0;
  const hasProfile = Object.keys(data.profile ?? {}).length > 0;

  return hasFlashcards || hasPacks || hasStats || hasProfile;
}

/**
 * Check if migration has already been completed
 */
function hasMigrationCompleted(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as completed
 */
function markMigrationComplete(): void {
  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Provider component that wraps the application to provide session access.
 * Automatically initializes session on mount and handles localStorage migration.
 *
 * @example
 * ```tsx
 * // In your App or layout component
 * import { SessionProvider } from '@/contexts/SessionContext';
 *
 * function App() {
 *   return (
 *     <SessionProvider>
 *       <YourAppContent />
 *     </SessionProvider>
 *   );
 * }
 * ```
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initialize session and handle migration
   */
  const initSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get or generate device ID
      const deviceId = getDeviceId();

      // Create or retrieve session from server
      const session = await userSessionApi.getOrCreateSession(deviceId);
      setSessionId(session.sessionId);

      // Check if we need to migrate localStorage data
      if (!hasMigrationCompleted()) {
        const data = collectLocalStorageData();

        if (hasDataToMigrate(data)) {
          // Migrate data to database
          await userSessionApi.migrateLocalStorageData(deviceId, data);
        }

        // Mark migration as complete (even if no data to migrate)
        markMigrationComplete();
      }
    } catch (err) {
      console.error('[SessionContext] Failed to initialize session:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize session'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Retry session initialization
   */
  const retry = useCallback(() => {
    initSession();
  }, [initSession]);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Compute derived state
  const isReady = sessionId !== null && !isLoading && error === null;

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        isLoading,
        error,
        isReady,
        retry,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access session context.
 *
 * @throws Error if used outside of SessionProvider
 *
 * @example
 * ```tsx
 * function FlashcardList() {
 *   const { sessionId, isReady, error } = useSession();
 *
 *   if (!isReady) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (error) {
 *     return <ErrorMessage error={error} />;
 *   }
 *
 *   // Use sessionId for API calls
 *   const flashcards = useFlashcards(sessionId);
 *   return <FlashcardGrid cards={flashcards} />;
 * }
 * ```
 */
export function useSession(): SessionContextType {
  const context = useContext(SessionContext);

  if (context === null) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
}

export default SessionContext;
