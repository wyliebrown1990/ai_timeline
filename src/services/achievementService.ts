/**
 * Achievement Service (Sprint Feed-6)
 *
 * Manages user achievements with localStorage persistence.
 * Tracks progress toward achievements and unlocks.
 */

const STORAGE_KEY = 'ai_timeline_achievements';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: 'learning' | 'engagement' | 'streak' | 'exploration';
  requirement: number;
  unlockedAt?: string; // ISO date string
  progress?: number;
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Learning achievements
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'View your first 10 stories',
    icon: '👶',
    category: 'learning',
    requirement: 10,
  },
  {
    id: 'curious_mind',
    name: 'Curious Mind',
    description: 'View 50 stories',
    icon: '🔍',
    category: 'learning',
    requirement: 50,
  },
  {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    description: 'View 100 stories',
    icon: '📚',
    category: 'learning',
    requirement: 100,
  },
  {
    id: 'ai_expert',
    name: 'AI Expert',
    description: 'View 500 stories',
    icon: '🎓',
    category: 'learning',
    requirement: 500,
  },

  // Streak achievements
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    category: 'streak',
    requirement: 7,
  },
  {
    id: 'fortnight_fighter',
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day streak',
    icon: '⚡',
    category: 'streak',
    requirement: 14,
  },
  {
    id: 'monthly_master',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🏆',
    category: 'streak',
    requirement: 30,
  },
  {
    id: 'dedicated_learner',
    name: 'Dedicated Learner',
    description: 'Maintain a 100-day streak',
    icon: '💎',
    category: 'streak',
    requirement: 100,
  },

  // Engagement achievements
  {
    id: 'collector',
    name: 'Collector',
    description: 'Save 10 stories to your collection',
    icon: '📌',
    category: 'engagement',
    requirement: 10,
  },
  {
    id: 'curator',
    name: 'Curator',
    description: 'Save 50 stories to your collection',
    icon: '🗂️',
    category: 'engagement',
    requirement: 50,
  },
  {
    id: 'voter',
    name: 'Voice of Reason',
    description: 'Vote on 25 stories',
    icon: '🗳️',
    category: 'engagement',
    requirement: 25,
  },
  {
    id: 'active_voter',
    name: 'Active Voter',
    description: 'Vote on 100 stories',
    icon: '⭐',
    category: 'engagement',
    requirement: 100,
  },

  // Exploration achievements
  {
    id: 'concept_explorer',
    name: 'Concept Explorer',
    description: 'Learn about 25 AI concepts',
    icon: '🧠',
    category: 'exploration',
    requirement: 25,
  },
  {
    id: 'quiz_taker',
    name: 'Quiz Taker',
    description: 'Complete 5 quizzes',
    icon: '✅',
    category: 'exploration',
    requirement: 5,
  },
  {
    id: 'quiz_master',
    name: 'Quiz Master',
    description: 'Complete 25 quizzes',
    icon: '🏅',
    category: 'exploration',
    requirement: 25,
  },
];

interface AchievementData {
  unlockedAchievements: Record<string, string>; // id -> unlockedAt
  progress: Record<string, number>; // id -> current progress
}

/**
 * Get achievement data from localStorage
 */
function getAchievementData(): AchievementData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AchievementData;
    }
  } catch (error) {
    console.warn('Failed to parse achievement data:', error);
  }

  return {
    unlockedAchievements: {},
    progress: {},
  };
}

/**
 * Save achievement data to localStorage
 */
function saveAchievementData(data: AchievementData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save achievement data:', error);
  }
}

/**
 * Achievement Service singleton
 */
export const achievementService = {
  /**
   * Get all achievements with current status
   */
  getAllAchievements(): Achievement[] {
    const data = getAchievementData();

    return ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      unlockedAt: data.unlockedAchievements[achievement.id],
      progress: data.progress[achievement.id] ?? 0,
    }));
  },

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter((a) => a.unlockedAt);
  },

  /**
   * Get locked achievements
   */
  getLockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter((a) => !a.unlockedAt);
  },

  /**
   * Get recently unlocked achievements (within last 24 hours)
   */
  getRecentlyUnlocked(): Achievement[] {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return this.getUnlockedAchievements().filter(
      (a) => a.unlockedAt && a.unlockedAt > oneDayAgo
    );
  },

  /**
   * Check if an achievement is unlocked
   */
  isUnlocked(achievementId: string): boolean {
    const data = getAchievementData();
    return !!data.unlockedAchievements[achievementId];
  },

  /**
   * Get progress for an achievement
   */
  getProgress(achievementId: string): number {
    const data = getAchievementData();
    return data.progress[achievementId] ?? 0;
  },

  /**
   * Update progress for an achievement
   * Returns the achievement if newly unlocked, null otherwise
   */
  updateProgress(achievementId: string, newProgress: number): Achievement | null {
    const data = getAchievementData();
    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);

    if (!achievement) {
      console.warn(`Unknown achievement: ${achievementId}`);
      return null;
    }

    // Already unlocked
    if (data.unlockedAchievements[achievementId]) {
      return null;
    }

    // Update progress
    data.progress[achievementId] = newProgress;

    // Check if newly unlocked
    if (newProgress >= achievement.requirement) {
      const unlockedAt = new Date().toISOString();
      data.unlockedAchievements[achievementId] = unlockedAt;
      saveAchievementData(data);

      return {
        ...achievement,
        unlockedAt,
        progress: newProgress,
      };
    }

    saveAchievementData(data);
    return null;
  },

  /**
   * Increment progress for an achievement
   * Returns the achievement if newly unlocked, null otherwise
   */
  incrementProgress(achievementId: string, amount: number = 1): Achievement | null {
    const currentProgress = this.getProgress(achievementId);
    return this.updateProgress(achievementId, currentProgress + amount);
  },

  /**
   * Check and update multiple achievements based on stats
   * Returns array of newly unlocked achievements
   */
  checkAchievements(stats: {
    itemsViewed?: number;
    streak?: number;
    savedCount?: number;
    votesCount?: number;
    conceptsLearned?: number;
    quizzesCompleted?: number;
  }): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    // Check learning achievements
    if (stats.itemsViewed !== undefined) {
      const learningAchievements = ['first_steps', 'curious_mind', 'knowledge_seeker', 'ai_expert'];
      learningAchievements.forEach((id) => {
        const result = this.updateProgress(id, stats.itemsViewed!);
        if (result) newlyUnlocked.push(result);
      });
    }

    // Check streak achievements
    if (stats.streak !== undefined) {
      const streakAchievements = ['week_warrior', 'fortnight_fighter', 'monthly_master', 'dedicated_learner'];
      streakAchievements.forEach((id) => {
        const result = this.updateProgress(id, stats.streak!);
        if (result) newlyUnlocked.push(result);
      });
    }

    // Check engagement achievements
    if (stats.savedCount !== undefined) {
      const saveAchievements = ['collector', 'curator'];
      saveAchievements.forEach((id) => {
        const result = this.updateProgress(id, stats.savedCount!);
        if (result) newlyUnlocked.push(result);
      });
    }

    if (stats.votesCount !== undefined) {
      const voteAchievements = ['voter', 'active_voter'];
      voteAchievements.forEach((id) => {
        const result = this.updateProgress(id, stats.votesCount!);
        if (result) newlyUnlocked.push(result);
      });
    }

    // Check exploration achievements
    if (stats.conceptsLearned !== undefined) {
      const result = this.updateProgress('concept_explorer', stats.conceptsLearned);
      if (result) newlyUnlocked.push(result);
    }

    if (stats.quizzesCompleted !== undefined) {
      const quizAchievements = ['quiz_taker', 'quiz_master'];
      quizAchievements.forEach((id) => {
        const result = this.updateProgress(id, stats.quizzesCompleted!);
        if (result) newlyUnlocked.push(result);
      });
    }

    return newlyUnlocked;
  },

  /**
   * Get achievement statistics
   */
  getStats(): {
    total: number;
    unlocked: number;
    percentage: number;
  } {
    const all = this.getAllAchievements();
    const unlocked = all.filter((a) => a.unlockedAt).length;

    return {
      total: all.length,
      unlocked,
      percentage: Math.round((unlocked / all.length) * 100),
    };
  },

  /**
   * Reset all achievements (for testing)
   */
  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset achievements:', error);
    }
  },
};

export default achievementService;
