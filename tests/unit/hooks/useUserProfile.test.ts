import { renderHook, act } from '@testing-library/react';
import { useUserProfile, getRoleDefaultExplanationLevel } from '../../../src/hooks/useUserProfile';
import type { CreateUserProfile, UserRole } from '../../../src/types/userProfile';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useUserProfile', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('initial state', () => {
    it('should have no profile on first load', () => {
      const { result } = renderHook(() => useUserProfile());

      expect(result.current.profile).toBeUndefined();
      expect(result.current.onboardingCompleted).toBe(false);
      expect(result.current.onboardingSkipped).toBe(false);
    });

    it('should detect first-time visitors', () => {
      const { result } = renderHook(() => useUserProfile());

      expect(result.current.isFirstTimeVisitor).toBe(true);
    });

    it('should load existing profile from localStorage', () => {
      // Pre-populate localStorage
      const existingProfile = {
        profile: {
          id: 'user_123',
          role: 'developer',
          goals: ['build_with_ai'],
          timeCommitment: 'standard',
          preferredExplanationLevel: 'technical',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        onboardingCompleted: true,
        onboardingSkipped: false,
      };
      localStorageMock.setItem('ai-timeline-user', JSON.stringify(existingProfile));

      const { result } = renderHook(() => useUserProfile());

      // Wait for useEffect to run
      expect(result.current.profile?.role).toBe('developer');
      expect(result.current.onboardingCompleted).toBe(true);
      expect(result.current.isFirstTimeVisitor).toBe(false);
    });
  });

  // ==========================================================================
  // createProfile Tests
  // ==========================================================================

  describe('createProfile', () => {
    it('should create a new user profile', () => {
      const { result } = renderHook(() => useUserProfile());

      const profileData: CreateUserProfile = {
        role: 'executive',
        goals: ['discuss_at_work', 'evaluate_tools'],
        timeCommitment: 'quick',
        preferredExplanationLevel: 'business',
      };

      let newProfile;
      act(() => {
        newProfile = result.current.createProfile(profileData);
      });

      expect(result.current.profile).toBeDefined();
      expect(result.current.profile?.role).toBe('executive');
      expect(result.current.profile?.goals).toEqual(['discuss_at_work', 'evaluate_tools']);
      expect(result.current.profile?.timeCommitment).toBe('quick');
      expect(result.current.profile?.preferredExplanationLevel).toBe('business');
      expect(result.current.profile?.id).toMatch(/^user_/);
      expect(result.current.profile?.createdAt).toBeDefined();
      expect(result.current.profile?.updatedAt).toBeDefined();
    });

    it('should set onboardingCompleted to true', () => {
      const { result } = renderHook(() => useUserProfile());

      const profileData: CreateUserProfile = {
        role: 'student',
        goals: ['hype_vs_real'],
        timeCommitment: 'deep',
        preferredExplanationLevel: 'simple',
      };

      act(() => {
        result.current.createProfile(profileData);
      });

      expect(result.current.onboardingCompleted).toBe(true);
      expect(result.current.isFirstTimeVisitor).toBe(false);
    });

    it('should persist profile to localStorage', () => {
      const { result } = renderHook(() => useUserProfile());

      const profileData: CreateUserProfile = {
        role: 'developer',
        goals: ['build_with_ai'],
        timeCommitment: 'standard',
        preferredExplanationLevel: 'technical',
      };

      act(() => {
        result.current.createProfile(profileData);
      });

      const stored = JSON.parse(localStorageMock.getItem('ai-timeline-user') || '{}');
      expect(stored.profile.role).toBe('developer');
      expect(stored.onboardingCompleted).toBe(true);
    });
  });

  // ==========================================================================
  // updateProfile Tests
  // ==========================================================================

  describe('updateProfile', () => {
    it('should update an existing profile', () => {
      const { result } = renderHook(() => useUserProfile());

      // Create initial profile
      act(() => {
        result.current.createProfile({
          role: 'executive',
          goals: ['discuss_at_work'],
          timeCommitment: 'quick',
          preferredExplanationLevel: 'business',
        });
      });

      expect(result.current.profile?.role).toBe('executive');

      // Update the profile
      act(() => {
        result.current.updateProfile({ role: 'developer' });
      });

      expect(result.current.profile?.role).toBe('developer');
      expect(result.current.profile?.goals).toEqual(['discuss_at_work']); // Unchanged
      expect(result.current.profile?.timeCommitment).toBe('quick'); // Unchanged
      expect(result.current.profile?.preferredExplanationLevel).toBe('business'); // Unchanged
      expect(result.current.profile?.updatedAt).toBeDefined();
    });

    it('should not crash when updating without a profile', () => {
      const { result } = renderHook(() => useUserProfile());

      // Should not throw
      act(() => {
        result.current.updateProfile({ role: 'developer' });
      });

      expect(result.current.profile).toBeUndefined();
    });
  });

  // ==========================================================================
  // skipOnboarding Tests
  // ==========================================================================

  describe('skipOnboarding', () => {
    it('should mark onboarding as skipped', () => {
      const { result } = renderHook(() => useUserProfile());

      act(() => {
        result.current.skipOnboarding();
      });

      expect(result.current.onboardingSkipped).toBe(true);
      expect(result.current.onboardingCompleted).toBe(false);
      expect(result.current.profile).toBeUndefined();
      expect(result.current.isFirstTimeVisitor).toBe(false);
    });

    it('should persist skipped state to localStorage', () => {
      const { result } = renderHook(() => useUserProfile());

      act(() => {
        result.current.skipOnboarding();
      });

      const stored = JSON.parse(localStorageMock.getItem('ai-timeline-user') || '{}');
      expect(stored.onboardingSkipped).toBe(true);
    });
  });

  // ==========================================================================
  // completeOnboarding Tests
  // ==========================================================================

  describe('completeOnboarding', () => {
    it('should mark onboarding as completed', () => {
      const { result } = renderHook(() => useUserProfile());

      act(() => {
        result.current.completeOnboarding();
      });

      expect(result.current.onboardingCompleted).toBe(true);
    });
  });

  // ==========================================================================
  // resetUserData Tests
  // ==========================================================================

  describe('resetUserData', () => {
    it('should clear all user data', () => {
      const { result } = renderHook(() => useUserProfile());

      // Create a profile first
      act(() => {
        result.current.createProfile({
          role: 'developer',
          goals: ['build_with_ai'],
          timeCommitment: 'standard',
          preferredExplanationLevel: 'technical',
        });
      });

      expect(result.current.profile).toBeDefined();

      // Reset
      act(() => {
        result.current.resetUserData();
      });

      expect(result.current.profile).toBeUndefined();
      expect(result.current.onboardingCompleted).toBe(false);
      expect(result.current.onboardingSkipped).toBe(false);
      expect(result.current.isFirstTimeVisitor).toBe(true);
    });
  });

  // ==========================================================================
  // getExplanationLevel Tests
  // ==========================================================================

  describe('getExplanationLevel', () => {
    it('should return profile preference if set', () => {
      const { result } = renderHook(() => useUserProfile());

      act(() => {
        result.current.createProfile({
          role: 'student',
          goals: ['hype_vs_real'],
          timeCommitment: 'standard',
          preferredExplanationLevel: 'technical', // Not default for student
        });
      });

      expect(result.current.getExplanationLevel()).toBe('technical');
    });

    it('should return simple by default when no profile', () => {
      const { result } = renderHook(() => useUserProfile());

      expect(result.current.getExplanationLevel()).toBe('simple');
    });
  });
});

// ==========================================================================
// getRoleDefaultExplanationLevel Tests
// ==========================================================================

describe('getRoleDefaultExplanationLevel', () => {
  it('should return business for executive', () => {
    expect(getRoleDefaultExplanationLevel('executive')).toBe('business');
  });

  it('should return business for product_manager', () => {
    expect(getRoleDefaultExplanationLevel('product_manager')).toBe('business');
  });

  it('should return business for marketing_sales', () => {
    expect(getRoleDefaultExplanationLevel('marketing_sales')).toBe('business');
  });

  it('should return business for operations_hr', () => {
    expect(getRoleDefaultExplanationLevel('operations_hr')).toBe('business');
  });

  it('should return technical for developer', () => {
    expect(getRoleDefaultExplanationLevel('developer')).toBe('technical');
  });

  it('should return simple for student', () => {
    expect(getRoleDefaultExplanationLevel('student')).toBe('simple');
  });

  it('should return simple for curious', () => {
    expect(getRoleDefaultExplanationLevel('curious')).toBe('simple');
  });

  it('should map all roles correctly', () => {
    const roleExpectations: Record<UserRole, string> = {
      executive: 'business',
      product_manager: 'business',
      marketing_sales: 'business',
      operations_hr: 'business',
      developer: 'technical',
      student: 'simple',
      curious: 'simple',
    };

    for (const [role, expectedLevel] of Object.entries(roleExpectations)) {
      expect(getRoleDefaultExplanationLevel(role as UserRole)).toBe(expectedLevel);
    }
  });
});
