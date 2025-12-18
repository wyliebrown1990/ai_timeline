/**
 * Content Layer Context (Sprint 19)
 *
 * Provides app-wide access to the user's preferred content layer.
 * Integrates with audience type to auto-suggest appropriate defaults.
 * Persists preference to localStorage for returning users.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { AudienceType } from '../types/userProfile';
import { AUDIENCE_TYPE_OPTIONS } from '../types/userProfile';

// =============================================================================
// Types
// =============================================================================

/**
 * Available content layer options
 * - simple: Easy-to-understand, no jargon
 * - business: Business impact and use cases
 * - technical: Technical depth and implementation details
 * - full: Show all layers (no filtering)
 */
export type ContentLayer = 'simple' | 'business' | 'technical' | 'full';

/**
 * Content layer options with metadata for UI display
 */
export const CONTENT_LAYER_OPTIONS: Record<
  ContentLayer,
  { label: string; description: string; icon: string }
> = {
  simple: {
    label: 'Simple',
    description: 'Easy-to-understand explanations without jargon',
    icon: 'BookOpen',
  },
  business: {
    label: 'Business',
    description: 'Business impact, use cases, and strategic implications',
    icon: 'Briefcase',
  },
  technical: {
    label: 'Technical',
    description: 'Architecture details and implementation depth',
    icon: 'Code2',
  },
  full: {
    label: 'Full',
    description: 'All perspectives and maximum detail',
    icon: 'Layers',
  },
};

/**
 * All content layers as a readonly array
 */
export const CONTENT_LAYERS: readonly ContentLayer[] = [
  'simple',
  'business',
  'technical',
  'full',
] as const;

// =============================================================================
// Context
// =============================================================================

/**
 * Storage key for content layer preference
 */
const STORAGE_KEY = 'ai-timeline-content-layer';

/**
 * Context value type
 */
interface ContentLayerContextValue {
  /** Current content layer preference */
  contentLayer: ContentLayer;
  /** Update the content layer preference */
  setContentLayer: (layer: ContentLayer) => void;
  /** Reset to audience-suggested default */
  resetToDefault: () => void;
  /** Whether the current layer differs from the audience-suggested default */
  isCustomized: boolean;
  /** The audience-suggested default layer */
  suggestedLayer: ContentLayer;
}

/**
 * Context for content layer state
 */
const ContentLayerContext = createContext<ContentLayerContextValue | null>(null);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map audience type to suggested content layer
 * Based on AUDIENCE_TYPE_OPTIONS.defaultContentLayer mapping
 */
function getDefaultLayerForAudience(audienceType: AudienceType | undefined): ContentLayer {
  if (!audienceType) return 'simple';

  const defaultContentLayer = AUDIENCE_TYPE_OPTIONS[audienceType]?.defaultContentLayer;

  // Map audience defaultContentLayer to our ContentLayer type
  switch (defaultContentLayer) {
    case 'plain-english':
      return 'simple';
    case 'executive':
      return 'business';
    case 'technical':
      return 'technical';
    case 'simple':
    default:
      return 'simple';
  }
}

/**
 * Load content layer preference from localStorage
 */
function loadStoredLayer(): ContentLayer | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && CONTENT_LAYERS.includes(stored as ContentLayer)) {
      return stored as ContentLayer;
    }
  } catch (error) {
    console.error('Failed to load content layer preference:', error);
  }

  return null;
}

/**
 * Save content layer preference to localStorage
 */
function saveStoredLayer(layer: ContentLayer): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, layer);
  } catch (error) {
    console.error('Failed to save content layer preference:', error);
  }
}

// =============================================================================
// Provider Component
// =============================================================================

interface ContentLayerProviderProps {
  children: ReactNode;
  /** User's audience type for auto-suggesting default layer */
  audienceType?: AudienceType;
}

/**
 * Provider component for content layer preference
 *
 * @example
 * ```tsx
 * // In your App or layout component
 * import { ContentLayerProvider } from '@/contexts/ContentLayerContext';
 *
 * function App() {
 *   const { profile } = useUserProfileContext();
 *   return (
 *     <ContentLayerProvider audienceType={profile?.audienceType}>
 *       <YourAppContent />
 *     </ContentLayerProvider>
 *   );
 * }
 * ```
 */
export function ContentLayerProvider({
  children,
  audienceType,
}: ContentLayerProviderProps) {
  // Calculate the suggested layer based on audience type
  const suggestedLayer = useMemo(
    () => getDefaultLayerForAudience(audienceType),
    [audienceType]
  );

  // Initialize state: use stored preference, or fall back to suggested layer
  const [contentLayer, setContentLayerState] = useState<ContentLayer>(() => {
    const stored = loadStoredLayer();
    return stored || suggestedLayer;
  });

  // Track if the user has customized their preference
  const isCustomized = contentLayer !== suggestedLayer;

  // Update content layer and persist to localStorage
  const setContentLayer = useCallback((layer: ContentLayer) => {
    setContentLayerState(layer);
    saveStoredLayer(layer);
  }, []);

  // Reset to the audience-suggested default
  const resetToDefault = useCallback(() => {
    setContentLayerState(suggestedLayer);
    saveStoredLayer(suggestedLayer);
  }, [suggestedLayer]);

  // When audience type changes and user hasn't customized, update to new suggested
  useEffect(() => {
    const stored = loadStoredLayer();
    // Only auto-update if user hasn't explicitly set a preference
    if (!stored) {
      setContentLayerState(suggestedLayer);
    }
  }, [suggestedLayer]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      contentLayer,
      setContentLayer,
      resetToDefault,
      isCustomized,
      suggestedLayer,
    }),
    [contentLayer, setContentLayer, resetToDefault, isCustomized, suggestedLayer]
  );

  return (
    <ContentLayerContext.Provider value={contextValue}>
      {children}
    </ContentLayerContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access content layer context
 *
 * @throws Error if used outside of ContentLayerProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { contentLayer, setContentLayer, isCustomized } = useContentLayerContext();
 *
 *   return (
 *     <div>
 *       <p>Current layer: {contentLayer}</p>
 *       {isCustomized && <span>(customized)</span>}
 *       <ContentLayerSwitcher />
 *     </div>
 *   );
 * }
 * ```
 */
export function useContentLayerContext(): ContentLayerContextValue {
  const context = useContext(ContentLayerContext);

  if (context === null) {
    throw new Error(
      'useContentLayerContext must be used within a ContentLayerProvider'
    );
  }

  return context;
}

export default ContentLayerContext;
