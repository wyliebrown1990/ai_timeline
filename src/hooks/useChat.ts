/**
 * useChat Hook
 * Manages state and logic for the AI Learning Companion chat
 */

import { useState, useCallback } from 'react';
import type {
  ChatMessage,
  ChatPanelState,
  ExplainMode,
  MilestoneContext,
} from '../types/chat';
import { chatApi } from '../services/chatApi';

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing chat state and interactions
 */
export function useChat() {
  const [state, setState] = useState<ChatPanelState>({
    isOpen: false,
    messages: [],
    isLoading: false,
    error: null,
    milestoneContext: null,
    explainMode: 'plain_english',
    suggestedFollowUps: [],
  });

  /**
   * Open the chat panel
   */
  const openChat = useCallback((milestoneContext?: MilestoneContext) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      milestoneContext: milestoneContext || null,
      error: null,
    }));
  }, []);

  /**
   * Close the chat panel
   */
  const closeChat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  /**
   * Toggle the chat panel open/closed
   */
  const toggleChat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  }, []);

  /**
   * Set the explanation mode
   */
  const setExplainMode = useCallback((mode: ExplainMode) => {
    setState((prev) => ({
      ...prev,
      explainMode: mode,
    }));
  }, []);

  /**
   * Set milestone context for contextual explanations
   */
  const setMilestoneContext = useCallback((context: MilestoneContext | null) => {
    setState((prev) => ({
      ...prev,
      milestoneContext: context,
    }));
  }, []);

  /**
   * Send a message to the AI companion
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
      suggestedFollowUps: [],
    }));

    try {
      const response = await chatApi.sendMessage({
        message: content.trim(),
        milestoneContext: state.milestoneContext || undefined,
        explainMode: state.explainMode,
      });

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.response,
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        suggestedFollowUps: response.suggestedFollowUps || [],
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [state.milestoneContext, state.explainMode]);

  /**
   * Clear the chat history
   */
  const clearChat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
      error: null,
      suggestedFollowUps: [],
    }));
  }, []);

  /**
   * Dismiss the current error
   */
  const dismissError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Open chat with a pre-filled question about a milestone
   */
  const explainMilestone = useCallback((milestone: MilestoneContext) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      milestoneContext: milestone,
      error: null,
    }));
  }, []);

  return {
    // State
    isOpen: state.isOpen,
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    milestoneContext: state.milestoneContext,
    explainMode: state.explainMode,
    suggestedFollowUps: state.suggestedFollowUps,

    // Actions
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    setExplainMode,
    setMilestoneContext,
    clearChat,
    dismissError,
    explainMilestone,
  };
}
