/**
 * useAchievements Hook (Sprint Feed-6)
 *
 * Manages achievement checking and notifications.
 */

import { useState, useCallback } from 'react';
import { achievementService, type Achievement } from '../services/achievementService';

interface UseAchievementsReturn {
  pendingAchievements: Achievement[];
  dismissAchievement: () => void;
  checkAchievements: (stats: {
    itemsViewed?: number;
    streak?: number;
    savedCount?: number;
    votesCount?: number;
    conceptsLearned?: number;
    quizzesCompleted?: number;
  }) => void;
  getAllAchievements: () => Achievement[];
  getUnlockedAchievements: () => Achievement[];
  getStats: () => { total: number; unlocked: number; percentage: number };
}

export function useAchievements(): UseAchievementsReturn {
  // Queue of achievements to show
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);

  // Dismiss the current achievement
  const dismissAchievement = useCallback(() => {
    setPendingAchievements((prev) => prev.slice(1));
  }, []);

  // Check achievements against stats
  const checkAchievements = useCallback(
    (stats: {
      itemsViewed?: number;
      streak?: number;
      savedCount?: number;
      votesCount?: number;
      conceptsLearned?: number;
      quizzesCompleted?: number;
    }) => {
      const newlyUnlocked = achievementService.checkAchievements(stats);

      if (newlyUnlocked.length > 0) {
        setPendingAchievements((prev) => [...prev, ...newlyUnlocked]);
      }
    },
    []
  );

  // Wrapped service methods
  const getAllAchievements = useCallback(() => {
    return achievementService.getAllAchievements();
  }, []);

  const getUnlockedAchievements = useCallback(() => {
    return achievementService.getUnlockedAchievements();
  }, []);

  const getStats = useCallback(() => {
    return achievementService.getStats();
  }, []);

  return {
    pendingAchievements,
    dismissAchievement,
    checkAchievements,
    getAllAchievements,
    getUnlockedAchievements,
    getStats,
  };
}

export default useAchievements;
