/**
 * OnboardingModal Component
 *
 * Multi-step onboarding flow that personalizes the learning experience
 * based on role, goals, and time availability. Generates a custom
 * learning path recommendation and sets the default explanation level.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Clock, Check } from 'lucide-react';
import type {
  UserRole,
  LearningGoal,
  TimeCommitment,
  CreateUserProfile,
  AudienceType,
} from '../../types/userProfile';
import {
  USER_ROLE_LABELS,
  LEARNING_GOAL_LABELS,
  USER_ROLES,
  LEARNING_GOALS,
  TIME_COMMITMENTS,
  AUDIENCE_TYPE_OPTIONS,
  AUDIENCE_TYPES,
} from '../../types/userProfile';
import { getRoleDefaultExplanationLevel } from '../../hooks/useUserProfile';
import {
  generateRecommendations,
  getPathDetails,
  type PersonalizedPlan,
} from '../../services/pathRecommendation';

// =============================================================================
// Types
// =============================================================================

interface OnboardingModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when onboarding is completed with profile data */
  onComplete: (profile: CreateUserProfile) => void;
  /** Callback when user skips onboarding */
  onSkip: () => void;
  /** Callback to start a learning path */
  onStartPath?: (pathId: string) => void;
  /** Callback to explore all paths */
  onExploreAll?: () => void;
}

// Onboarding step type - 'audience' is the new first step
type OnboardingStep = 'audience' | 'role' | 'goals' | 'time' | 'results';

// =============================================================================
// Step Data
// =============================================================================

const TIME_COMMITMENT_DISPLAY: Record<TimeCommitment, { label: string; description: string }> = {
  quick: {
    label: '15 minutes',
    description: 'Just the essentials - the key moments you need to know',
  },
  standard: {
    label: '1 hour',
    description: 'A solid foundation - understand the major breakthroughs and their impact',
  },
  deep: {
    label: 'Deep dive',
    description: 'Comprehensive understanding - explore the full history and technical details',
  },
};

// =============================================================================
// Component
// =============================================================================

export function OnboardingModal({
  isOpen,
  onComplete,
  onSkip,
  onStartPath,
  onExploreAll,
}: OnboardingModalProps) {
  // Form state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('audience');
  const [selectedAudience, setSelectedAudience] = useState<AudienceType | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<LearningGoal[]>([]);
  const [selectedTime, setSelectedTime] = useState<TimeCommitment>('standard');
  const [plan, setPlan] = useState<PersonalizedPlan | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('audience');
      setSelectedAudience(null);
      setSelectedRole(null);
      setSelectedGoals([]);
      setSelectedTime('standard');
      setPlan(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSkip]);

  // Step navigation - steps vary based on audience type
  // 'everyday' users get a simplified flow (skip role/goals)
  // 'leader' users skip detailed goals for fast-track business content
  // 'technical' and 'general' users see the full flow
  const getStepsForAudience = useCallback((audience: AudienceType | null): OnboardingStep[] => {
    if (audience === 'everyday') {
      // Simplified flow: audience -> time -> results
      return ['audience', 'time', 'results'];
    }
    if (audience === 'leader') {
      // Business-focused flow: skip detailed goals
      return ['audience', 'role', 'time', 'results'];
    }
    // Full flow for 'technical' and 'general'
    return ['audience', 'role', 'goals', 'time', 'results'];
  }, []);

  const steps = getStepsForAudience(selectedAudience);
  const currentStepIndex = steps.indexOf(currentStep);

  const goToNextStep = useCallback(() => {
    // Re-calculate steps in case audience just changed
    const currentSteps = getStepsForAudience(selectedAudience);
    const currentIndex = currentSteps.indexOf(currentStep);
    const nextIndex = currentIndex + 1;
    const nextStep = currentSteps[nextIndex];

    if (nextIndex < currentSteps.length && nextStep) {
      // If moving to results, generate the plan first
      if (nextStep === 'results') {
        // Use defaults for everyday users who skip role/goals
        const role = selectedRole || (selectedAudience === 'everyday' ? 'everyday_user' : 'curious');
        const goals = selectedGoals.length > 0 ? selectedGoals :
          selectedAudience === 'everyday' ? ['stay_informed'] :
          selectedAudience === 'leader' ? ['evaluate_tools'] :
          ['hype_vs_real'];
        const generatedPlan = generateRecommendations(role, goals as LearningGoal[], selectedTime);
        setPlan(generatedPlan);
      }
      setCurrentStep(nextStep);
    }
  }, [getStepsForAudience, selectedAudience, currentStep, selectedRole, selectedGoals, selectedTime]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    const prevStep = steps[prevIndex];
    if (prevIndex >= 0 && prevStep) {
      setCurrentStep(prevStep);
    }
  }, [currentStepIndex, steps]);

  // Goal selection toggle
  const toggleGoal = useCallback((goal: LearningGoal) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) {
        return prev.filter((g) => g !== goal);
      }
      if (prev.length >= 3) {
        // Replace the oldest selection
        return [...prev.slice(1), goal];
      }
      return [...prev, goal];
    });
  }, []);

  // Complete onboarding - creates profile with audience-appropriate defaults
  const handleComplete = useCallback(() => {
    // Audience must be selected
    if (!selectedAudience) return;

    // For everyday users, use sensible defaults if they didn't go through all steps
    const role = selectedRole || (selectedAudience === 'everyday' ? 'everyday_user' : 'curious');
    const goals = selectedGoals.length > 0 ? selectedGoals :
      selectedAudience === 'everyday' ? ['stay_informed'] as LearningGoal[] :
      selectedAudience === 'leader' ? ['evaluate_tools'] as LearningGoal[] :
      ['hype_vs_real'] as LearningGoal[];

    const profile: CreateUserProfile = {
      role,
      audienceType: selectedAudience,
      goals,
      timeCommitment: selectedTime,
      preferredExplanationLevel: getRoleDefaultExplanationLevel(role),
    };

    onComplete(profile);
  }, [selectedAudience, selectedRole, selectedGoals, selectedTime, onComplete]);

  // Start learning with the suggested path
  const handleStartLearning = useCallback(() => {
    handleComplete();
    if (plan?.suggestedStartPath && onStartPath) {
      onStartPath(plan.suggestedStartPath);
    }
  }, [handleComplete, plan, onStartPath]);

  // Explore all paths instead
  const handleExploreAll = useCallback(() => {
    handleComplete();
    if (onExploreAll) {
      onExploreAll();
    }
  }, [handleComplete, onExploreAll]);

  // Check if can proceed to next step
  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'audience':
        return selectedAudience !== null;
      case 'role':
        return selectedRole !== null;
      case 'goals':
        return selectedGoals.length >= 1 && selectedGoals.length <= 3;
      case 'time':
        return true; // Always has a default
      case 'results':
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedAudience, selectedRole, selectedGoals]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onSkip()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal */}
      <div
        ref={modalRef}
        data-testid="onboarding-modal"
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header with progress */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {steps.slice(0, -1).map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`
                    w-2.5 h-2.5 rounded-full transition-colors
                    ${index <= currentStepIndex ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
                  `}
                />
                {index < steps.length - 2 && (
                  <div
                    className={`
                      w-8 h-0.5 transition-colors
                      ${index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
                    `}
                  />
                )}
              </div>
            ))}
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              {/* Show step count dynamically based on audience-specific flow */}
              {currentStep !== 'results' ? `Step ${currentStepIndex + 1} of ${steps.length - 1}` : 'Your Plan'}
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={onSkip}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Audience Selection - Visual cards for each audience type */}
          {currentStep === 'audience' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 id="onboarding-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                  What brings you to AI Timeline?
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Choose your path to get personalized content.
                </p>
              </div>

              {/* Visual audience cards - displayed in a grid */}
              <div className="grid gap-4" role="radiogroup" aria-label="Select your audience type">
                {AUDIENCE_TYPES.filter(type => type !== 'general').map((audienceType) => {
                  const option = AUDIENCE_TYPE_OPTIONS[audienceType];
                  const isSelected = selectedAudience === audienceType;
                  return (
                    <button
                      key={audienceType}
                      onClick={() => setSelectedAudience(audienceType)}
                      className={`
                        w-full p-5 text-left rounded-2xl border-2 transition-all
                        ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                        }
                      `}
                      role="radio"
                      aria-checked={isSelected}
                      data-testid={`audience-${audienceType}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl" role="img" aria-hidden="true">
                          {option.icon}
                        </span>
                        <div className="flex-1">
                          <div className={`
                            font-semibold text-lg
                            ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}
                          `}>
                            {option.label}
                          </div>
                          <p className={`
                            mt-1 text-sm leading-relaxed
                            ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}
                          `}>
                            {option.description}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* "Explorer" option (general) - shown as a subtle alternative */}
                <button
                  onClick={() => setSelectedAudience('general')}
                  className={`
                    w-full p-4 text-center rounded-xl border-2 transition-all
                    ${
                      selectedAudience === 'general'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                  role="radio"
                  aria-checked={selectedAudience === 'general'}
                  data-testid="audience-general"
                >
                  <span className={`
                    text-sm font-medium
                    ${selectedAudience === 'general' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}
                  `}>
                    {AUDIENCE_TYPE_OPTIONS.general.icon} {AUDIENCE_TYPE_OPTIONS.general.label} - {AUDIENCE_TYPE_OPTIONS.general.description}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Role Selection */}
          {currentStep === 'role' && (
            <div className="space-y-6">
              <div>
                <h2 id="onboarding-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                  Welcome! Let&apos;s personalize your learning.
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  What&apos;s your role?
                </p>
              </div>

              <div className="space-y-2" role="radiogroup" aria-label="Select your role">
                {USER_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`
                      w-full px-4 py-3 text-left rounded-xl border-2 transition-all
                      ${
                        selectedRole === role
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                    role="radio"
                    aria-checked={selectedRole === role}
                    data-testid={`role-${role}`}
                  >
                    <span className={`
                      font-medium
                      ${selectedRole === role ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}
                    `}>
                      {USER_ROLE_LABELS[role]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Goal Selection */}
          {currentStep === 'goals' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  What are your goals?
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Select 1-3 goals that matter most to you.
                </p>
              </div>

              <div className="space-y-2" role="group" aria-label="Select your learning goals">
                {LEARNING_GOALS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      onClick={() => toggleGoal(goal)}
                      className={`
                        w-full px-4 py-3 text-left rounded-xl border-2 transition-all flex items-center justify-between
                        ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                      role="checkbox"
                      aria-checked={isSelected}
                      data-testid={`goal-${goal}`}
                    >
                      <span className={`
                        font-medium
                        ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}
                      `}>
                        {LEARNING_GOAL_LABELS[goal]}
                      </span>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedGoals.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedGoals.length} of 3 goals selected
                </p>
              )}
            </div>
          )}

          {/* Step 3: Time Commitment */}
          {currentStep === 'time' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  How much time do you have?
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  We&apos;ll tailor your learning path to fit your schedule.
                </p>
              </div>

              <div className="space-y-3" role="radiogroup" aria-label="Select your time commitment">
                {TIME_COMMITMENTS.map((commitment) => {
                  const display = TIME_COMMITMENT_DISPLAY[commitment];
                  const isSelected = selectedTime === commitment;
                  return (
                    <button
                      key={commitment}
                      onClick={() => setSelectedTime(commitment)}
                      className={`
                        w-full px-4 py-4 text-left rounded-xl border-2 transition-all
                        ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                      role="radio"
                      aria-checked={isSelected}
                      data-testid={`time-${commitment}`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <div className={`
                            font-semibold
                            ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}
                          `}>
                            {display.label}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {display.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results Screen */}
          {currentStep === 'results' && plan && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Your Personalized Learning Plan
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Based on your goals, here&apos;s what we recommend:
                </p>
              </div>

              <div className="space-y-3">
                {plan.recommendedPaths.map((rec, index) => {
                  const pathDetails = getPathDetails(rec.pathId);
                  if (!pathDetails) return null;

                  return (
                    <div
                      key={rec.pathId}
                      className={`
                        p-4 rounded-xl border-2 transition-colors
                        ${index === 0 ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                      `}
                      data-testid={`recommendation-${rec.pathId}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{pathDetails.icon}</span>
                            <span className={`font-semibold ${index === 0 ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                              {index + 1}. {pathDetails.title}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {rec.reason}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          ~{pathDetails.estimatedMinutes} min
                        </span>
                      </div>
                      {index === 0 && (
                        <button
                          onClick={handleStartLearning}
                          className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          data-testid="start-path-button"
                        >
                          Start Here
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Total estimated time: ~{plan.estimatedTotalMinutes} minutes
                </p>
                <button
                  onClick={handleExploreAll}
                  className="w-full px-4 py-2 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  data-testid="explore-all-button"
                >
                  Explore All Paths Instead
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        {currentStep !== 'results' && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {/* Show Skip on first step (audience), Back button on others */}
            {currentStep === 'audience' ? (
              <button
                onClick={onSkip}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                data-testid="skip-button"
              >
                Skip
              </button>
            ) : (
              <button
                onClick={goToPreviousStep}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                data-testid="back-button"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <button
              onClick={goToNextStep}
              disabled={!canProceed()}
              className={`
                flex items-center gap-1 px-6 py-2 rounded-lg font-medium transition-colors
                ${
                  canProceed()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }
              `}
              data-testid="next-button"
            >
              {currentStep === 'time' ? 'Create My Plan' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingModal;
