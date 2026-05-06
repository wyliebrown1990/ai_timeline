/**
 * Sprint Quiz-1 — QuizHistoryList renders rows, hides the current quiz,
 * shows "Your best" pill only when a session has attempted, and uses <Link>
 * (not onClick) so middle-click and screen-readers work correctly.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuizHistoryList } from '../../../../src/components/Quiz/QuizHistoryList';
import type { QuizHistoryRow } from '../../../../src/services/api';

const ROW_BASE: QuizHistoryRow = {
  id: 'quiz-old-1',
  weekOf: '2026-04-24T00:00:00Z',
  weekStart: '2026-04-17T00:00:00Z',
  weekEnd: '2026-04-24T00:00:00Z',
  questionCount: 5,
  createdAt: '2026-04-24T14:00:00Z',
};

const ROW_WITH_ATTEMPT: QuizHistoryRow = {
  id: 'quiz-old-2',
  weekOf: '2026-04-17T00:00:00Z',
  weekStart: '2026-04-10T00:00:00Z',
  weekEnd: '2026-04-17T00:00:00Z',
  questionCount: 5,
  createdAt: '2026-04-17T14:00:00Z',
  userBestScore: 4,
  userBestTotal: 5,
  userBestPercentage: 80,
  userLastAttemptAt: '2026-04-18T10:00:00Z',
};

function renderList(props: Parameters<typeof QuizHistoryList>[0]) {
  return render(
    <MemoryRouter>
      <QuizHistoryList {...props} />
    </MemoryRouter>
  );
}

describe('QuizHistoryList', () => {
  it('renders nothing when rows is empty', () => {
    const { container } = renderList({ rows: [] });
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when only row matches currentQuizId', () => {
    const { container } = renderList({ rows: [ROW_BASE], currentQuizId: ROW_BASE.id });
    expect(container.firstChild).toBeNull();
  });

  it('renders one row per quiz, excluding the current one', () => {
    renderList({
      rows: [ROW_BASE, ROW_WITH_ATTEMPT],
      currentQuizId: ROW_BASE.id,
    });
    expect(screen.getByText(/AI news from/i)).toBeInTheDocument();
    // The current quiz id should be hidden — only the other row shows.
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows "Your best" pill when row has userBestScore', () => {
    renderList({ rows: [ROW_WITH_ATTEMPT] });
    expect(screen.getByText(/Your best: 4\/5/i)).toBeInTheDocument();
  });

  it('shows "Not taken yet" when row has no attempt', () => {
    renderList({ rows: [ROW_BASE] });
    expect(screen.getByText(/Not taken yet/i)).toBeInTheDocument();
  });

  it('renders each row as a <Link> to /news/quiz/:id (not onClick navigate)', () => {
    renderList({ rows: [ROW_BASE, ROW_WITH_ATTEMPT] });
    const links = screen.getAllByRole('link');
    const hrefs = links.map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/news/quiz/quiz-old-1');
    expect(hrefs).toContain('/news/quiz/quiz-old-2');
  });

  it('shows "X questions" count per row', () => {
    renderList({ rows: [ROW_BASE] });
    expect(screen.getByText(/5 questions/i)).toBeInTheDocument();
  });
});
