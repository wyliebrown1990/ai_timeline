import { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className = '' }: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    const nextIndex = (index + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) {
      return;
    }

    onChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      className={`flex items-center gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700 ${className}`}
      role="tablist"
      aria-label="SEO insight buckets"
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeId;

        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-testid={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                focusTab(index + 1);
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                focusTab(index - 1);
              }
              if (event.key === 'Home') {
                event.preventDefault();
                focusTab(0);
              }
              if (event.key === 'End') {
                event.preventDefault();
                focusTab(tabs.length - 1);
              }
            }}
            className={
              active
                ? 'inline-flex items-center gap-2 rounded-t-xl border border-b-0 border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                : 'inline-flex items-center gap-2 rounded-t-xl border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={
                  active
                    ? 'rounded-full bg-white/80 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-200'
                    : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
