/**
 * useFeedVoting Hook (Sprint Feed-3)
 *
 * Handles optimistic vote updates with rollback on failure.
 * Prevents double-voting and manages vote state per item.
 */

import { useState, useCallback, useRef } from 'react';
import { useFeedSession } from './useFeedSession';

type VoteType = 'up' | 'down' | null;

interface VoteState {
  userVote: VoteType;
  upvotes: number;
  downvotes: number;
}

interface UseVotingResult {
  getVoteState: (eventId: string) => VoteState;
  vote: (eventId: string, voteType: 'up' | 'down') => Promise<void>;
  initializeVoteState: (
    eventId: string,
    upvotes: number,
    downvotes: number
  ) => void;
}

const API_URL = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

export function useFeedVoting(): UseVotingResult {
  const { getSessionId } = useFeedSession();
  const sessionId = getSessionId();
  const [voteStates, setVoteStates] = useState<Map<string, VoteState>>(
    new Map()
  );
  const pendingVotes = useRef<Set<string>>(new Set());

  /**
   * Initialize vote state for an item (called when card mounts)
   */
  const initializeVoteState = useCallback(
    (eventId: string, upvotes: number, downvotes: number) => {
      setVoteStates((prev) => {
        // Don't overwrite if we already have state (preserves user's local vote)
        if (prev.has(eventId)) return prev;

        const next = new Map(prev);
        next.set(eventId, {
          userVote: null,
          upvotes,
          downvotes,
        });
        return next;
      });
    },
    []
  );

  /**
   * Get current vote state for an item
   */
  const getVoteState = useCallback(
    (eventId: string): VoteState => {
      return (
        voteStates.get(eventId) || {
          userVote: null,
          upvotes: 0,
          downvotes: 0,
        }
      );
    },
    [voteStates]
  );

  /**
   * Submit a vote with optimistic updates
   */
  const vote = useCallback(
    async (eventId: string, voteType: 'up' | 'down') => {
      // Prevent concurrent votes on same item
      if (pendingVotes.current.has(eventId)) {
        return;
      }

      const currentState = getVoteState(eventId);
      const previousVote = currentState.userVote;

      // Calculate new state
      let newUserVote: VoteType;
      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (previousVote === voteType) {
        // Clicking same vote again - remove vote
        newUserVote = null;
        if (voteType === 'up') {
          upvoteDelta = -1;
        } else {
          downvoteDelta = -1;
        }
      } else {
        // New vote or switching vote
        newUserVote = voteType;

        if (voteType === 'up') {
          upvoteDelta = 1;
          if (previousVote === 'down') {
            downvoteDelta = -1;
          }
        } else {
          downvoteDelta = 1;
          if (previousVote === 'up') {
            upvoteDelta = -1;
          }
        }
      }

      // Apply optimistic update
      const optimisticState: VoteState = {
        userVote: newUserVote,
        upvotes: Math.max(0, currentState.upvotes + upvoteDelta),
        downvotes: Math.max(0, currentState.downvotes + downvoteDelta),
      };

      setVoteStates((prev) => {
        const next = new Map(prev);
        next.set(eventId, optimisticState);
        return next;
      });

      // Mark as pending
      pendingVotes.current.add(eventId);

      try {
        // API call - always send the clicked vote type
        // Backend handles toggle logic (same vote twice = remove vote)
        const response = await fetch(`${API_URL}/news/${eventId}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            vote: voteType, // Always send the clicked vote type
          }),
        });

        if (!response.ok) {
          throw new Error('Vote failed');
        }

        // Sync with server response
        const data = await response.json();
        if (data.upvotes !== undefined && data.downvotes !== undefined) {
          // Map backend userVote format to our format
          const serverUserVote = data.userVote === 'up' ? 'up'
            : data.userVote === 'down' ? 'down'
            : null;

          setVoteStates((prev) => {
            const next = new Map(prev);
            next.set(eventId, {
              userVote: serverUserVote,
              upvotes: data.upvotes,
              downvotes: data.downvotes,
            });
            return next;
          });
        }
      } catch (error) {
        console.error('Vote failed, rolling back:', error);

        // Rollback on failure
        setVoteStates((prev) => {
          const next = new Map(prev);
          next.set(eventId, currentState);
          return next;
        });

        // Optionally show toast notification here
      } finally {
        pendingVotes.current.delete(eventId);
      }
    },
    [getVoteState, sessionId]
  );

  return {
    getVoteState,
    vote,
    initializeVoteState,
  };
}

export default useFeedVoting;
