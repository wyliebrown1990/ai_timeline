import { Minus, Plus } from 'lucide-react';

/** Available zoom levels for the timeline */
export type ZoomLevel = 'decade' | 'year' | 'month';

/** Zoom level configuration */
export const zoomConfig: Record<ZoomLevel, { label: string; yearsPerScreen: number }> = {
  decade: { label: 'Decade', yearsPerScreen: 50 },
  year: { label: 'Year', yearsPerScreen: 10 },
  month: { label: 'Month', yearsPerScreen: 2 },
};

/** Order of zoom levels from most zoomed out to most zoomed in */
export const zoomOrder: ZoomLevel[] = ['decade', 'year', 'month'];

interface ZoomControlsProps {
  /** Current zoom level */
  currentZoom: ZoomLevel;
  /** Callback when zoom level changes */
  onZoomChange: (level: ZoomLevel) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Zoom control component with buttons and dropdown
 * Allows zooming in/out and selecting specific zoom levels
 */
export function ZoomControls({ currentZoom, onZoomChange, className = '' }: ZoomControlsProps) {
  const currentIndex = zoomOrder.indexOf(currentZoom);
  const canZoomOut = currentIndex > 0;
  const canZoomIn = currentIndex < zoomOrder.length - 1;

  const handleZoomOut = () => {
    const prevLevel = zoomOrder[currentIndex - 1];
    if (canZoomOut && prevLevel) {
      onZoomChange(prevLevel);
    }
  };

  const handleZoomIn = () => {
    const nextLevel = zoomOrder[currentIndex + 1];
    if (canZoomIn && nextLevel) {
      onZoomChange(nextLevel);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onZoomChange(e.target.value as ZoomLevel);
  };

  return (
    <div
      data-testid="zoom-controls"
      className={`flex items-center gap-2 ${className}`}
    >
      {/* Zoom out button */}
      <button
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        data-testid="zoom-out-btn"
        className={`
          rounded-lg border p-2 transition-colors
          ${
            canZoomOut
              ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
        aria-label="Zoom out"
        title="Zoom out (show more time)"
      >
        <Minus className="h-4 w-4" />
      </button>

      {/* Zoom level selector */}
      <select
        value={currentZoom}
        onChange={handleSelectChange}
        data-testid="zoom-level-select"
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Zoom level"
      >
        {zoomOrder.map((level) => (
          <option key={level} value={level}>
            {zoomConfig[level].label}
          </option>
        ))}
      </select>

      {/* Zoom in button */}
      <button
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        data-testid="zoom-in-btn"
        className={`
          rounded-lg border p-2 transition-colors
          ${
            canZoomIn
              ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
        aria-label="Zoom in"
        title="Zoom in (show less time)"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default ZoomControls;
