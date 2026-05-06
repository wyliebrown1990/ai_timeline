/**
 * QuizHistoryList — presentational list of past weekly quizzes.
 *
 * Sprint Quiz-1. Parent owns the fetch (NewsQuizPage calls newsQuizApi.getHistory)
 * and passes rows down — matches the parent-pass-down convention in NewsPage.tsx.
 */

import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import type { QuizHistoryRow } from '../../services/api';

interface QuizHistoryListProps {
  /** Quiz currently being viewed; suppressed from the list to avoid duplication. */
  currentQuizId?: string;
  /** History rows fetched by the parent. Empty array renders nothing. */
  rows: QuizHistoryRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function QuizHistoryList({ currentQuizId, rows }: QuizHistoryListProps) {
  const visible = rows.filter((r) => r.id !== currentQuizId);
  if (visible.length === 0) return null;

  return (
    <section className="mt-10 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Past quizzes
      </h2>
      <ul className="space-y-2">
        {visible.map((row) => {
          const hasAttempt = row.userBestScore !== undefined && row.userBestTotal !== undefined;
          return (
            <li key={row.id}>
              <Link
                to={`/news/quiz/${row.id}`}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      AI news from {formatDate(row.weekStart)} – {formatDate(row.weekEnd)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {row.questionCount} questions
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {hasAttempt ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="w-4 h-4" />
                      Your best: {row.userBestScore}/{row.userBestTotal}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Not taken yet
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default QuizHistoryList;
