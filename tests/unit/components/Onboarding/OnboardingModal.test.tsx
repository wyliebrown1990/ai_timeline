import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingModal } from '../../../../src/components/Onboarding/OnboardingModal';

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

    it('should show step 1 initially (audience selection)', () => {
      renderModal();
      // New flow starts with audience selection
      expect(screen.getByText(/what brings you to ai timeline/i)).toBeInTheDocument();
    });

    it('should show audience selection on first step', () => {
      renderModal();
      expect(screen.getByTestId('audience-everyday')).toBeInTheDocument();
      expect(screen.getByTestId('audience-leader')).toBeInTheDocument();
      expect(screen.getByTestId('audience-technical')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Step 1: Audience Selection
  // ==========================================================================

  describe('step 1: audience selection', () => {
    it('should display all audience options', () => {
      renderModal();

      expect(screen.getByTestId('audience-everyday')).toBeInTheDocument();
      expect(screen.getByTestId('audience-leader')).toBeInTheDocument();
      expect(screen.getByTestId('audience-technical')).toBeInTheDocument();
    });

    it('should allow selecting an audience', () => {
      renderModal();

      const everydayButton = screen.getByTestId('audience-everyday');
      fireEvent.click(everydayButton);

      expect(everydayButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should disable next button until audience is selected', () => {
      renderModal();

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton).toBeDisabled();

      fireEvent.click(screen.getByTestId('audience-everyday'));
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
  // Everyday Audience Flow (3 steps: audience -> time -> results)
  // ==========================================================================

  describe('everyday audience flow', () => {
    const selectEveryday = () => {
      renderModal();
      fireEvent.click(screen.getByTestId('audience-everyday'));
      fireEvent.click(screen.getByTestId('next-button'));
    };

    it('should skip role and goals for everyday users', () => {
      selectEveryday();

      // Should go directly to time selection, not role
      expect(screen.getByText(/how much time do you have/i)).toBeInTheDocument();
    });

    it('should show correct step count for everyday users', () => {
      selectEveryday();

      // Everyday flow: audience -> time -> results (3 steps, but results not counted in display)
      // So on time step: Step 2 of 2
      expect(screen.getByText(/step 2 of 2/i)).toBeInTheDocument();
    });

    it('should allow everyday users to complete flow', () => {
      selectEveryday();

      // On time step, click Create My Plan
      fireEvent.click(screen.getByTestId('next-button'));

      // Should show results
      expect(screen.getByText(/your personalized learning plan/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Leader Audience Flow (4 steps: audience -> role -> time -> results)
  // ==========================================================================

  describe('leader audience flow', () => {
    const selectLeader = () => {
      renderModal();
      fireEvent.click(screen.getByTestId('audience-leader'));
      fireEvent.click(screen.getByTestId('next-button'));
    };

    it('should show role selection for leaders (skip goals)', () => {
      selectLeader();

      // Should go to role selection
      expect(screen.getByText(/what's your role/i)).toBeInTheDocument();
    });

    it('should skip goals step for leaders and go to time', () => {
      selectLeader();

      // Select a role
      fireEvent.click(screen.getByTestId('role-executive'));
      fireEvent.click(screen.getByTestId('next-button'));

      // Should go to time, not goals
      expect(screen.getByText(/how much time do you have/i)).toBeInTheDocument();
    });

    it('should show correct step count for leader users', () => {
      selectLeader();

      // Leader flow: audience -> role -> time -> results (4 steps, results not counted)
      // So on role step: Step 2 of 3
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Technical Audience Flow (5 steps: audience -> role -> goals -> time -> results)
  // ==========================================================================

  describe('technical audience flow', () => {
    const selectTechnical = () => {
      renderModal();
      fireEvent.click(screen.getByTestId('audience-technical'));
      fireEvent.click(screen.getByTestId('next-button'));
    };

    const goToGoals = () => {
      selectTechnical();
      fireEvent.click(screen.getByTestId('role-developer'));
      fireEvent.click(screen.getByTestId('next-button'));
    };

    it('should show role selection for technical users', () => {
      selectTechnical();

      expect(screen.getByText(/what's your role/i)).toBeInTheDocument();
    });

    it('should show goals step for technical users', () => {
      goToGoals();

      expect(screen.getByText(/what are your goals/i)).toBeInTheDocument();
    });

    it('should show correct step count for technical users', () => {
      selectTechnical();

      // Technical flow: audience -> role -> goals -> time -> results (5 steps, results not counted)
      // So on role step: Step 2 of 4
      expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
    });

    it('should allow selecting multiple goals', () => {
      goToGoals();

      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      fireEvent.click(screen.getByTestId('goal-career_transition'));

      expect(screen.getByTestId('goal-build_with_ai')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('goal-career_transition')).toHaveAttribute('aria-checked', 'true');
    });

    it('should show goal count', () => {
      goToGoals();

      fireEvent.click(screen.getByTestId('goal-build_with_ai'));
      expect(screen.getByText(/1 of 3 goals selected/i)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('goal-career_transition'));
      expect(screen.getByText(/2 of 3 goals selected/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Role Selection (for leader and technical)
  // ==========================================================================

  describe('role selection', () => {
    const goToRoleStep = () => {
      renderModal();
      fireEvent.click(screen.getByTestId('audience-technical'));
      fireEvent.click(screen.getByTestId('next-button'));
    };

    it('should display all role options', () => {
      goToRoleStep();

      expect(screen.getByTestId('role-executive')).toBeInTheDocument();
      expect(screen.getByTestId('role-product_manager')).toBeInTheDocument();
      expect(screen.getByTestId('role-marketing_sales')).toBeInTheDocument();
      expect(screen.getByTestId('role-developer')).toBeInTheDocument();
      expect(screen.getByTestId('role-student')).toBeInTheDocument();
      expect(screen.getByTestId('role-curious')).toBeInTheDocument();
    });

    it('should allow selecting a role', () => {
      goToRoleStep();

      const developerButton = screen.getByTestId('role-developer');
      fireEvent.click(developerButton);

      expect(developerButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should disable next button until role is selected', () => {
      goToRoleStep();

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton).toBeDisabled();

      fireEvent.click(screen.getByTestId('role-executive'));
      expect(nextButton).toBeEnabled();
    });

    it('should show back button instead of skip', () => {
      goToRoleStep();

      expect(screen.queryByTestId('skip-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('should go back to audience selection when back is clicked', () => {
      goToRoleStep();

      fireEvent.click(screen.getByTestId('back-button'));
      expect(screen.getByText(/what brings you to ai timeline/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Time Commitment
  // ==========================================================================

  describe('time commitment', () => {
    const goToTimeStep = () => {
      renderModal();
      // Use everyday flow for simplest path to time step
      fireEvent.click(screen.getByTestId('audience-everyday'));
      fireEvent.click(screen.getByTestId('next-button'));
    };

    it('should display all time options', () => {
      goToTimeStep();

      expect(screen.getByTestId('time-quick')).toBeInTheDocument();
      expect(screen.getByTestId('time-standard')).toBeInTheDocument();
      expect(screen.getByTestId('time-deep')).toBeInTheDocument();
    });

    it('should have standard selected by default', () => {
      goToTimeStep();

      expect(screen.getByTestId('time-standard')).toHaveAttribute('aria-checked', 'true');
    });

    it('should allow changing time commitment', () => {
      goToTimeStep();

      fireEvent.click(screen.getByTestId('time-quick'));
      expect(screen.getByTestId('time-quick')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('time-standard')).toHaveAttribute('aria-checked', 'false');
    });

    it('should show "Create My Plan" button text', () => {
      goToTimeStep();

      expect(screen.getByTestId('next-button')).toHaveTextContent(/create my plan/i);
    });
  });

  // ==========================================================================
  // Results Screen
  // ==========================================================================

  describe('results screen', () => {
    const goToResults = () => {
      renderModal();
      // Use everyday flow for simplest path
      fireEvent.click(screen.getByTestId('audience-everyday'));
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
          audienceType: 'everyday',
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

    it('should have proper radiogroup role for audience selection', () => {
      renderModal();

      expect(screen.getByRole('radiogroup', { name: /select your audience type/i })).toBeInTheDocument();
    });

    it('should call onSkip when Escape is pressed', () => {
      renderModal();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnSkip).toHaveBeenCalled();
    });
  });
});
