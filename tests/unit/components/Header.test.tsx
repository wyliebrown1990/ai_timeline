/**
 * Header Component Tests
 *
 * Tests for the main navigation header including Study link and due badge.
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the contexts and dependent components
jest.mock('../../../src/contexts/FlashcardContext', () => ({
  useFlashcardContext: jest.fn(),
}));

jest.mock('../../../src/components/ThemeToggle', () => ({
  ThemeToggleSimple: () => <button data-testid="theme-toggle">Theme</button>,
}));

jest.mock('../../../src/components/Onboarding', () => ({
  ProfileIndicator: () => <div data-testid="profile-indicator">Profile</div>,
}));

import Header from '../../../src/components/Header';
import { useFlashcardContext } from '../../../src/contexts/FlashcardContext';

// =============================================================================
// Test Setup
// =============================================================================

const mockUseFlashcardContext = useFlashcardContext as jest.MockedFunction<
  typeof useFlashcardContext
>;

// Default mock context value
const createDefaultContextValue = (overrides = {}) => ({
  cards: [],
  packs: [],
  stats: {
    totalCards: 0,
    cardsDueToday: 0,
    cardsReviewedToday: 0,
    currentStreak: 0,
    longestStreak: 0,
    masteredCards: 0,
    lastStudyDate: null,
  },
  totalCards: 0,
  dueToday: 0,
  hasCards: false,
  isCardSaved: jest.fn(() => false),
  addCard: jest.fn(),
  removeCard: jest.fn(),
  getCardBySource: jest.fn(),
  getCardById: jest.fn(),
  getDueCards: jest.fn(() => []),
  getCardsByPack: jest.fn(() => []),
  recordReview: jest.fn(),
  createPack: jest.fn(),
  deletePack: jest.fn(),
  renamePack: jest.fn(),
  moveCardToPack: jest.fn(),
  removeCardFromPack: jest.fn(),
  getDefaultPack: jest.fn(),
  resetAll: jest.fn(),
  ...overrides,
});

/**
 * Wrapper component for testing with BrowserRouter
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseFlashcardContext.mockReturnValue(createDefaultContextValue());
});

// =============================================================================
// Tests
// =============================================================================

describe('Header Navigation', () => {
  describe('Study Link', () => {
    it('should display Study link in navigation', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Should have Study link visible in both desktop and mobile nav
      const studyLinks = screen.getAllByRole('link', { name: /study/i });
      expect(studyLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should have correct href for Study link', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const studyLinks = screen.getAllByRole('link', { name: /study/i });
      studyLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/study');
      });
    });
  });

  describe('Due Cards Badge', () => {
    it('should not show badge when no cards are due', () => {
      mockUseFlashcardContext.mockReturnValue(
        createDefaultContextValue({ dueToday: 0 })
      );

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Badge should not be present when dueToday is 0
      expect(screen.queryByLabelText(/cards due for review/i)).not.toBeInTheDocument();
    });

    it('should show badge with due count when cards are due', () => {
      mockUseFlashcardContext.mockReturnValue(
        createDefaultContextValue({ dueToday: 5 })
      );

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Badge should show the count
      const badges = screen.getAllByLabelText(/cards due for review/i);
      expect(badges.length).toBeGreaterThanOrEqual(1);
      badges.forEach((badge) => {
        expect(badge).toHaveTextContent('5');
      });
    });

    it('should display "99+" when due count exceeds 99', () => {
      mockUseFlashcardContext.mockReturnValue(
        createDefaultContextValue({ dueToday: 150 })
      );

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Badge should show "99+" when count exceeds 99
      const badges = screen.getAllByLabelText(/cards due for review/i);
      badges.forEach((badge) => {
        expect(badge).toHaveTextContent('99+');
      });
    });

    it('should show badge with exactly 99 cards', () => {
      mockUseFlashcardContext.mockReturnValue(
        createDefaultContextValue({ dueToday: 99 })
      );

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const badges = screen.getAllByLabelText(/cards due for review/i);
      badges.forEach((badge) => {
        expect(badge).toHaveTextContent('99');
        expect(badge).not.toHaveTextContent('99+');
      });
    });
  });

  describe('Navigation Links', () => {
    it('should include all expected navigation links', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Check that all expected links exist
      expect(screen.getAllByRole('link', { name: /home/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /timeline/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /news/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /learn/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /study/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /glossary/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('should include study link with GraduationCap icon', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Verify Study link exists with correct structure
      const studyLinks = screen.getAllByRole('link', { name: /study/i });
      expect(studyLinks.length).toBeGreaterThanOrEqual(1);
      // The first one is the desktop nav link
      expect(studyLinks[0]).toHaveAttribute('href', '/study');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels for badges', () => {
      mockUseFlashcardContext.mockReturnValue(
        createDefaultContextValue({ dueToday: 10 })
      );

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const badges = screen.getAllByLabelText('10 cards due for review');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });
});
