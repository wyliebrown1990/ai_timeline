import { useMemo } from 'react';
import type { MilestoneResponse } from '../types/milestone';

export type DensityLevel = 'sparse' | 'moderate' | 'dense' | 'very-dense';
export type DisplayMode = 'card' | 'compact' | 'pill' | 'dot' | 'cluster';

interface DensitySegment {
  year: number;
  count: number;
  density: DensityLevel;
  displayMode: DisplayMode;
}

interface DensityConfig {
  /** Milestones per year threshold for sparse (show full cards) */
  sparseThreshold: number;
  /** Milestones per year threshold for moderate (show pills) */
  moderateThreshold: number;
  /** Milestones per year threshold for dense (show dots) */
  denseThreshold: number;
}

const DEFAULT_DESKTOP_CONFIG: DensityConfig = {
  sparseThreshold: 1,  // Only 1 milestone/year shows as card
  moderateThreshold: 3, // 2-3 milestones/year shows as pill
  denseThreshold: 6,    // 4-6 milestones/year shows as dot
};

const DEFAULT_MOBILE_CONFIG: DensityConfig = {
  sparseThreshold: 1,
  moderateThreshold: 2,
  denseThreshold: 4,
};

/**
 * Calculate density level based on count and thresholds
 */
function getDensityLevel(count: number, config: DensityConfig): DensityLevel {
  if (count <= config.sparseThreshold) return 'sparse';
  if (count <= config.moderateThreshold) return 'moderate';
  if (count <= config.denseThreshold) return 'dense';
  return 'very-dense';
}

/**
 * Get display mode based on density level
 */
function getDisplayModeForDensity(density: DensityLevel): DisplayMode {
  switch (density) {
    case 'sparse':
      return 'card';
    case 'moderate':
      return 'pill';
    case 'dense':
      return 'dot';
    case 'very-dense':
      return 'cluster';
  }
}

/**
 * Hook to calculate timeline density and determine display modes
 */
export function useTimelineDensity(
  milestones: MilestoneResponse[],
  options?: {
    isMobile?: boolean;
    customConfig?: Partial<DensityConfig>;
  }
) {
  const { isMobile = false, customConfig } = options || {};

  // Select config based on device
  const config: DensityConfig = useMemo(() => {
    const baseConfig = isMobile ? DEFAULT_MOBILE_CONFIG : DEFAULT_DESKTOP_CONFIG;
    return { ...baseConfig, ...customConfig };
  }, [isMobile, customConfig]);

  // Group milestones by year and calculate density using a sliding window
  const densityByYear = useMemo(() => {
    const yearCounts = new Map<number, number>();

    milestones.forEach((milestone) => {
      const year = new Date(milestone.date).getFullYear();
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    });

    // Get all years sorted
    const years = Array.from(yearCounts.keys()).sort((a, b) => a - b);

    // Calculate density using a 3-year sliding window for smoother transitions
    const windowSize = 3;
    const segments: DensitySegment[] = [];

    years.forEach((year) => {
      // Sum milestones in a window around this year
      let windowCount = 0;
      for (let y = year - Math.floor(windowSize / 2); y <= year + Math.floor(windowSize / 2); y++) {
        windowCount += yearCounts.get(y) || 0;
      }

      // Average per year in window
      const avgCount = windowCount / windowSize;
      const density = getDensityLevel(avgCount, config);

      segments.push({
        year,
        count: yearCounts.get(year) || 0,
        density,
        displayMode: getDisplayModeForDensity(density),
      });
    });

    // Sort by year
    segments.sort((a, b) => a.year - b.year);

    return segments;
  }, [milestones, config]);

  // Create a map for quick lookup
  const densityMap = useMemo(() => {
    const map = new Map<number, DensitySegment>();
    densityByYear.forEach((segment) => {
      map.set(segment.year, segment);
    });
    return map;
  }, [densityByYear]);

  // Get density at a specific year
  const getDensityAtYear = (year: number): DensityLevel => {
    const segment = densityMap.get(year);
    return segment?.density || 'sparse';
  };

  // Get display mode for a specific milestone
  const getDisplayMode = (_milestone: MilestoneResponse): DisplayMode => {
    // Force all milestones to display as pills
    return 'pill';
  };

  // Get milestones grouped by display mode
  const groupedByDisplayMode = useMemo(() => {
    const groups: Record<DisplayMode, MilestoneResponse[]> = {
      card: [],
      compact: [],
      pill: [],
      dot: [],
      cluster: [],
    };

    milestones.forEach((milestone) => {
      const mode = getDisplayMode(milestone);
      groups[mode].push(milestone);
    });

    return groups;
  }, [milestones, densityMap]);

  // Calculate overall density stats
  const stats = useMemo(() => {
    const totalMilestones = milestones.length;
    const years = densityByYear.length;
    const avgPerYear = years > 0 ? totalMilestones / years : 0;
    const maxPerYear = Math.max(...densityByYear.map((s) => s.count), 0);
    const densestYears = densityByYear
      .filter((s) => s.density === 'very-dense' || s.density === 'dense')
      .map((s) => s.year);

    return {
      totalMilestones,
      years,
      avgPerYear,
      maxPerYear,
      densestYears,
    };
  }, [milestones, densityByYear]);

  // Calculate adaptive spacing multiplier for dense years
  const getSpacingMultiplier = (year: number): number => {
    const segment = densityMap.get(year);
    if (!segment) return 1;

    // Give more space to dense periods
    switch (segment.density) {
      case 'very-dense':
        return 2.5;
      case 'dense':
        return 2;
      case 'moderate':
        return 1.5;
      case 'sparse':
      default:
        return 1;
    }
  };

  return {
    densityByYear,
    densityMap,
    getDensityAtYear,
    getDisplayMode,
    groupedByDisplayMode,
    stats,
    getSpacingMultiplier,
    config,
  };
}

export default useTimelineDensity;
