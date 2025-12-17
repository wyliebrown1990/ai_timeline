/**
 * DateRangeFilter component for filtering milestones by date range
 */

import { DATE_PRESETS, type DatePreset } from '../../types/filters';

interface DateRangeFilterProps {
  start: Date | null;
  end: Date | null;
  onStartChange: (date: Date | null) => void;
  onEndChange: (date: Date | null) => void;
  onPresetSelect: (preset: DatePreset) => void;
}

/**
 * Format date to YYYY-MM-DD for input value
 */
function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  const isoString = date.toISOString().split('T')[0];
  return isoString ?? '';
}

/**
 * Parse date string from input
 */
function parseDateFromInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if current range matches a preset
 */
function matchesPreset(start: Date | null, end: Date | null, preset: DatePreset): boolean {
  const config = DATE_PRESETS.find((p) => p.key === preset);
  if (!config || !start || !end) return false;

  const presetRange = config.getRange();
  const startMatches = start.toDateString() === presetRange.start.toDateString();
  const endMatches = end.toDateString() === presetRange.end.toDateString();

  return startMatches && endMatches;
}

export function DateRangeFilter({
  start,
  end,
  onStartChange,
  onEndChange,
  onPresetSelect,
}: DateRangeFilterProps) {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStartChange(parseDateFromInput(e.target.value));
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEndChange(parseDateFromInput(e.target.value));
  };

  const handleClear = () => {
    onStartChange(null);
    onEndChange(null);
  };

  // Determine active preset
  const activePreset = DATE_PRESETS.find((p) => matchesPreset(start, end, p.key))?.key ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Date Range</h3>
        {(start || end) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onPresetSelect(preset.key)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              activePreset === preset.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
            data-testid={`date-preset-${preset.key}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="date-start"
            className="mb-1 block text-xs text-gray-500 dark:text-gray-400"
          >
            From
          </label>
          <input
            type="date"
            id="date-start"
            value={formatDateForInput(start)}
            onChange={handleStartChange}
            max={formatDateForInput(end) || undefined}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            data-testid="date-start"
          />
        </div>
        <div>
          <label
            htmlFor="date-end"
            className="mb-1 block text-xs text-gray-500 dark:text-gray-400"
          >
            To
          </label>
          <input
            type="date"
            id="date-end"
            value={formatDateForInput(end)}
            onChange={handleEndChange}
            min={formatDateForInput(start) || undefined}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            data-testid="date-end"
          />
        </div>
      </div>

      {/* Date validation message */}
      {start && end && start > end && (
        <p className="text-xs text-red-500">Start date must be before end date</p>
      )}
    </div>
  );
}
