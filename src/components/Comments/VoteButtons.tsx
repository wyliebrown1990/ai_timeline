/**
 * VoteButtons Component
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Upvote/downvote buttons with score display
 */

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { voteOnComment } from '../../services/commentsApi';
import { cn } from '../../lib/utils';

interface VoteButtonsProps {
  commentId: string;
  score: number;
  userVote: number | null | undefined;
  onVoteChange?: (newScore: number, newUserVote: number | null) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function VoteButtons({
  commentId,
  score,
  userVote,
  onVoteChange,
  size = 'md',
  className,
}: VoteButtonsProps) {
  const { isAuthenticated } = useUserAuth();
  const [currentVote, setCurrentVote] = useState<number | null>(userVote ?? null);
  const [currentScore, setCurrentScore] = useState(score);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    if (!isAuthenticated) {
      // Could show a login prompt here
      return;
    }

    if (isVoting) return;

    // Determine new vote value
    const newVote = currentVote === value ? 0 : value;

    // Optimistic update
    const oldVote = currentVote;
    const oldScore = currentScore;

    // Calculate new score
    let scoreDelta = 0;
    if (oldVote === 1) scoreDelta -= 1;
    if (oldVote === -1) scoreDelta += 1;
    if (newVote === 1) scoreDelta += 1;
    if (newVote === -1) scoreDelta -= 1;

    setCurrentVote(newVote === 0 ? null : newVote);
    setCurrentScore(oldScore + scoreDelta);

    setIsVoting(true);

    try {
      const result = await voteOnComment(commentId, newVote as 1 | -1 | 0);
      setCurrentScore(result.score);
      setCurrentVote(result.userVote);
      onVoteChange?.(result.score, result.userVote);
    } catch (error) {
      // Revert on error
      setCurrentVote(oldVote);
      setCurrentScore(oldScore);
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const iconSize = size === 'sm' ? 16 : 20;
  const buttonPadding = size === 'sm' ? 'p-0.5' : 'p-1';

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <button
        onClick={() => handleVote(1)}
        disabled={isVoting || !isAuthenticated}
        className={cn(
          buttonPadding,
          'rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          currentVote === 1
            ? 'text-orange-500'
            : 'text-gray-400 hover:text-orange-500'
        )}
        title={isAuthenticated ? 'Upvote' : 'Sign in to vote'}
        aria-label="Upvote"
      >
        <ChevronUp size={iconSize} strokeWidth={currentVote === 1 ? 3 : 2} />
      </button>

      <span
        className={cn(
          'font-medium tabular-nums',
          size === 'sm' ? 'text-xs' : 'text-sm',
          currentVote === 1 && 'text-orange-500',
          currentVote === -1 && 'text-blue-500',
          !currentVote && 'text-gray-600 dark:text-gray-400'
        )}
      >
        {currentScore}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isVoting || !isAuthenticated}
        className={cn(
          buttonPadding,
          'rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          currentVote === -1
            ? 'text-blue-500'
            : 'text-gray-400 hover:text-blue-500'
        )}
        title={isAuthenticated ? 'Downvote' : 'Sign in to vote'}
        aria-label="Downvote"
      >
        <ChevronDown size={iconSize} strokeWidth={currentVote === -1 ? 3 : 2} />
      </button>
    </div>
  );
}
