import { useState, useEffect } from 'react';
import {
  BookOpen,
  Briefcase,
  Code2,
  History,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import type { MilestoneLayeredContent } from '../../types/milestone';

/**
 * Tab identifiers for layered explanations
 */
export type ExplanationTab = 'simple' | 'business' | 'technical' | 'historical';

/**
 * Storage key for user's preferred explanation tab
 */
const PREFERRED_TAB_KEY = 'ai-timeline-preferred-explanation-tab';

interface LayeredExplanationTabsProps {
  /** The layered content to display */
  content: MilestoneLayeredContent;
  /** Optional initial tab (overrides localStorage preference) */
  initialTab?: ExplanationTab;
  /** Callback when tab changes */
  onTabChange?: (tab: ExplanationTab) => void;
}

/**
 * Tab configuration with icons and labels
 */
const TAB_CONFIG: Record<ExplanationTab, { label: string; icon: typeof BookOpen; description: string }> = {
  simple: {
    label: 'Simple',
    icon: BookOpen,
    description: 'Easy-to-understand explanation',
  },
  business: {
    label: 'Business Impact',
    icon: Briefcase,
    description: 'Use cases and industry effects',
  },
  technical: {
    label: 'Technical',
    icon: Code2,
    description: 'Architecture and implementation details',
  },
  historical: {
    label: 'Historical',
    icon: History,
    description: 'Research lineage and predecessors',
  },
};

/**
 * Get stored tab preference from localStorage
 */
function getStoredTabPreference(): ExplanationTab | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(PREFERRED_TAB_KEY);
  if (stored && stored in TAB_CONFIG) {
    return stored as ExplanationTab;
  }
  return null;
}

/**
 * Store tab preference in localStorage
 */
function setStoredTabPreference(tab: ExplanationTab): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERRED_TAB_KEY, tab);
}

/**
 * Layered Explanation Tabs Component
 *
 * Displays milestone content in multiple explanation layers:
 * - Simple: No jargon, everyday analogies
 * - Business Impact: Use cases, industry effects
 * - Technical: Architecture details
 * - Historical: Research lineage
 *
 * Also shows:
 * - TL;DR summary at the top
 * - "Why it matters today" section
 * - Collapsible "Common misconceptions" section
 */
export function LayeredExplanationTabs({
  content,
  initialTab,
  onTabChange,
}: LayeredExplanationTabsProps) {
  // Initialize with provided tab, stored preference, or default to 'simple'
  const [activeTab, setActiveTab] = useState<ExplanationTab>(() => {
    if (initialTab) return initialTab;
    return getStoredTabPreference() || 'simple';
  });

  const [isMisconceptionsOpen, setIsMisconceptionsOpen] = useState(false);

  // Handle tab change
  const handleTabChange = (tab: ExplanationTab) => {
    setActiveTab(tab);
    setStoredTabPreference(tab);
    onTabChange?.(tab);
  };

  // Sync with initialTab prop changes
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Get content for the active tab
  const getTabContent = (tab: ExplanationTab): string => {
    switch (tab) {
      case 'simple':
        return content.simpleExplanation;
      case 'business':
        return content.businessImpact;
      case 'technical':
        return content.technicalDepth;
      case 'historical':
        return content.historicalContext;
      default:
        return content.simpleExplanation;
    }
  };

  return (
    <div className="space-y-4" data-testid="layered-explanation-tabs">
      {/* TL;DR Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              TL;DR
            </span>
            <p className="text-gray-900 dark:text-white font-medium mt-1">
              {content.tldr}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Buttons */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Explanation depth levels"
      >
        {(Object.keys(TAB_CONFIG) as ExplanationTab[]).map((tab) => {
          const { label, icon: Icon } = TAB_CONFIG[tab];
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => handleTabChange(tab)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 ease-out
                ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="animate-fade-in"
        data-testid={`tabpanel-${activeTab}`}
      >
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {getTabContent(activeTab)}
          </div>
        </div>
      </div>

      {/* Why It Matters Today */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-800">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2">
          Why It Matters Today
        </h4>
        <p className="text-gray-700 dark:text-gray-300">
          {content.whyItMattersToday}
        </p>
      </div>

      {/* Common Misconceptions (Collapsible) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsMisconceptionsOpen(!isMisconceptionsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-expanded={isMisconceptionsOpen}
          aria-controls="misconceptions-content"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              Common Misconceptions
            </span>
          </div>
          {isMisconceptionsOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
        <div
          id="misconceptions-content"
          className={`
            overflow-hidden transition-all duration-300 ease-out
            ${isMisconceptionsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="px-4 py-3 bg-white dark:bg-gray-900">
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-sm">
              {content.commonMisconceptions}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayeredExplanationTabs;
