import { render, screen, fireEvent, within } from '@testing-library/react';
import { OnboardingModal } from '../../../../src/components/Onboarding/OnboardingModal';
import type { CreateUserProfile } from '../../../../src/types/userProfile';

// Mock the pathRecommendation service
jest.mock('../../../../src/services/pathRecommendation', () => ({
  generateRecommendations: jest.fn(() => ({
    recommendedPaths: [
      { pathId: 'chatgpt-story', relevanceScore: 85, reason: 'Great for learning' },
      { pathId: 'ai-fundamentals', relevanceScore: 70, reason: 'Build foundations' },
    ],
    estimatedTotalMinutes: 75,
    suggestedStartPath: 'chatgpt-story',
  })),
  getPathDetails: jest.fn((pathId: string) => {
    const paths: Record<string, object> = {
      'chatgpt-story': {
        id: 'chatgpt-story',
        title: 'The ChatGPT Story',
        estimatedMinutes: 30,
        icon: '🤖',
      },
      'ai-fundamentals': {
        id: 'ai-fundamentals',
        title: 'AI Fundamentals',
        estimatedMinutes: 45,
        icon: '🧠',
      },
    };
    return paths[pathId];
  }),
}));

describe('OnboardingModal', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();
  const mockOnStartPath = jest.fn();
  const mockOnExploreAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <OnboardingModal
        isOpen={isOpen}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onStartPath={mockOnStartPath}
        onExploreAll={mockOnExploreAll}
      />
    );
  };

  // ==========================================================================
  // Basic Rendering
  // ==========================================================================

  describe('basic rendering', () => {
    it('should render when isOpen is true', () => {
      renderModal(true);
      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      renderModal(false);
      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();
    });

    it('should show step 1 of 3 initially', () => {
      renderModal();
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    it('should show role selection on first step', () => {
      renderModal();
      expect(screen.getByText(/what's your role/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Step 1: Role Selection
  // ==========================================================================

  describe('step 1: role selection', () => {
    it('should display all role options', () => {
      renderModal();

      expect(screen.getByTestId('role-executive')).toBeInTheDocument();
      expect(screen.getByTestId('role-product_manager')).toBeInTheDocument();
      expect(screen.getByTestId('role-marketing_sales')).toBeInTheDocument();
      expect(screen.getByTestId('role-developer')).toBeInTheDocument();
      expect(screen.getByTestId('role-student')).toBeInTheDocument();
      expect(screen.getByTestId('role-curious')).toBeInTheDocument();
    });

    it('should allow selecting a role', () => {
      renderModal();

      const developerButton = screen.getByTestId('role-developer');
      fireEvent.click(developerButton);

      expect(developerButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should disable next button until role is selected', () => {
      renderModal();

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton).toBeDisabled();

      fireEvent.click(screen.getByTestId('role-executive'));
      expect(nextButton).toBeEnabled();
    });

    it('should show skip button on first step', () => {
      renderModal();
      expect(screen.getByTestId('skip-button')).toBeInTheDocument();
    });

    it('should call onSkip when skip is clicked', () => {
      renderModal();

      fireEvent.click(screen.getByTestId('skip-button'));
      expect(mockOnSkip).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Step 2: Goal Selection
  // ==========================================================================

  describe('step 2: goal selection', () => {
    const goToStep2 = () => {
      renderModal();
      fireEvent.click(screen.getByTestId('role-developer'));
      fireEvent.click(screen.getByTestId('next-button'));
    };

    it('should navigate to goal selection after role', () => {
      goToStep2();

      expect(screen.getByText(/what are your goals/i)).toBeInTheDocument();
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });

    it('should display all goal options', () => {
      goToStep2();

      expect(screen.getByTestId('goal-discuss_at_work')).toBeInTheDocument();
      expect(screen.getByTestId('goal-evaluate_tools')).toBeInTheDocument();
      expect(screen.getByTestId('goal-hype_vs_real')).toBeInTheDocument();
      expect(screen.getByTestId('goal-industry_impact')).toBeInTheDocument();
      expect(screen.getByTestId('goal-build_with_ai')).toBeInTheDocument();
      expect(screen.getByTestId('goal-career_transition')).toBeInTheDocument();
    });

    it('should allow selecting multiple goals', () => {
      goToStep2();

      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      fireEvent.click(screen.getByTestId('goal-career_transition'));

      expect(screen.getByTestId('goal-build_with_ai')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('goal-career_transition')).toHaveAttribute('aria-checked', 'true');
    });

    it('should show goal count', () => {
      goToStep2();

      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      expect(screen.getByText(/1 of 3 goals selected/i)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('goal-career_transition'));
      expect(screen.getByText(/2 of 3 goals selected/i)).toBeInTheDocument();
    });

    it('should limit to 3 goals (replacing oldest)', () => {
      goToStep2();

      fireEvent.click(screen.getByTestId('goal-discuss_at_work'));
      fireEvent.click(screen.getByTestId('goal-evaluate_tools'));
      fireEvent.click(screen.getByTestId('goal-hype_vs_real'));
      fireEvent.click(screen.getByTestId('goal-build_with_ai')); // Should replace first

      expect(screen.getByText(/3 of 3 goals selected/i)).toBeInTheDocument();
      expect(screen.getByTestId('goal-discuss_at_work')).toHaveAttribute('aria-checked', 'false');
    });

    it('should allow deselecting goals', () => {
      goToStep2();

      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      expect(screen.getByTestId('goal-build_with_ai')).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      expect(screen.getByTestId('goal-build_with_ai')).toHaveAttribute('aria-checked', 'false');
    });

    it('should show back button instead of skip', () => {
      goToStep2();

      expect(screen.queryByTestId('skip-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('should go back to step 1 when back is clicked', () => {
      goToStep2();

      fireEvent.click(screen.getByTestId('back-button'));
      expect(screen.getByText(/what's your role/i)).toBeInTheDocument();
    });

    it('should disable next button until at least 1 goal selected', () => {
      goToStep2();

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton).toBeDisabled();

      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      expect(nextButton).toBeEnabled();
    });
  });

  // ==========================================================================
  // Step 3: Time Commitment
  // ==========================================================================

  describe('step 3: time commitment', () => {
    const goToStep3 = () => {
      renderModal();
      fireEvent.click(screen.getByTestId('role-developer'));
      fireEvent.click(screen.getByTestId('next-button'));
      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      fireEvent.click(screen.getByTestId('next-button'));
    };

    it('should navigate to time selection after goals', () => {
      goToStep3();

      expect(screen.getByText(/how much time do you have/i)).toBeInTheDocument();
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    });

    it('should display all time options', () => {
      goToStep3();

      expect(screen.getByTestId('time-quick')).toBeInTheDocument();
      expect(screen.getByTestId('time-standard')).toBeInTheDocument();
      expect(screen.getByTestId('time-deep')).toBeInTheDocument();
    });

    it('should have standard selected by default', () => {
      goToStep3();

      expect(screen.getByTestId('time-standard')).toHaveAttribute('aria-checked', 'true');
    });

    it('should allow changing time commitment', () => {
      goToStep3();

      fireEvent.click(screen.getByTestId('time-quick'));
      expect(screen.getByTestId('time-quick')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('time-standard')).toHaveAttribute('aria-checked', 'false');
    });

    it('should show "Create My Plan" button text', () => {
      goToStep3();

      expect(screen.getByTestId('next-button')).toHaveTextContent(/create my plan/i);
    });
  });

  // ==========================================================================
  // Results Screen
  // ==========================================================================

  describe('results screen', () => {
    const goToResults = () => {
      renderModal();
      fireEvent.click(screen.getByTestId('role-developer'));
      fireEvent.click(screen.getByTestId('next-button'));
      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      fireEvent.click(screen.getByTestId('next-button'));
      fireEvent.click(screen.getByTestId('next-button')); // Create My Plan
    };

    it('should show personalized plan heading', () => {
      goToResults();

      expect(screen.getByText(/your personalized learning plan/i)).toBeInTheDocument();
    });

    it('should show recommended paths', () => {
      goToResults();

      expect(screen.getByTestId('recommendation-chatgpt-story')).toBeInTheDocument();
      expect(screen.getByTestId('recommendation-ai-fundamentals')).toBeInTheDocument();
    });

    it('should show path titles', () => {
      goToResults();

      expect(screen.getByText(/the chatgpt story/i)).toBeInTheDocument();
      expect(screen.getByText(/ai fundamentals/i)).toBeInTheDocument();
    });

    it('should show estimated total time', () => {
      goToResults();

      expect(screen.getByText(/total estimated time: ~75 minutes/i)).toBeInTheDocument();
    });

    it('should show Start Here button on first recommendation', () => {
      goToResults();

      expect(screen.getByTestId('start-path-button')).toBeInTheDocument();
    });

    it('should show Explore All Paths button', () => {
      goToResults();

      expect(screen.getByTestId('explore-all-button')).toBeInTheDocument();
    });

    it('should call onComplete and onStartPath when Start Here clicked', () => {
      goToResults();

      fireEvent.click(screen.getByTestId('start-path-button'));

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'developer',
          goals: ['build_with_ai'],
          timeCommitment: 'standard',
        })
      );
      expect(mockOnStartPath).toHaveBeenCalledWith('chatgpt-story');
    });

    it('should call onComplete and onExploreAll when explore clicked', () => {
      goToResults();

      fireEvent.click(screen.getByTestId('explore-all-button'));

      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockOnExploreAll).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper dialog role', () => {
      renderModal();

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('should have proper radiogroup role for role selection', () => {
      renderModal();

      expect(screen.getByRole('radiogroup', { name: /select your role/i })).toBeInTheDocument();
    });

    it('should call onSkip when Escape is pressed', () => {
      renderModal();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnSkip).toHaveBeenCalled();
    });
  });
});
