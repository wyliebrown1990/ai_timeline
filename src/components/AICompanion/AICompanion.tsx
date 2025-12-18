/**
 * AICompanion Component
 * Main container that combines the floating button and chat panel
 * with integrated state management
 * @version 2.0 - Added free tier support
 */

import { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { AICompanionButton } from './AICompanionButton';
import { ChatPanel } from './ChatPanel';
import { apiKeyService } from '../../services/apiKeyService';
import type { MilestoneContext } from '../../types/chat';

/**
 * Props for the AICompanion component
 */
interface AICompanionProps {
  /** Optional initial milestone context for contextual explanations */
  initialMilestoneContext?: MilestoneContext;
}

/**
 * AI Learning Companion component
 * Provides a floating chat interface for asking questions about AI history
 */
export function AICompanion({ initialMilestoneContext }: AICompanionProps) {
  const {
    isOpen,
    messages,
    isLoading,
    error,
    milestoneContext,
    explainMode,
    suggestedFollowUps,
    toggleChat,
    closeChat,
    sendMessage,
    setExplainMode,
    clearChat,
    dismissError,
  } = useChat();

  // Track API access - re-check when panel opens
  const [hasApiAccess, setHasApiAccess] = useState(() => {
    const access = apiKeyService.hasAIAccess();
    // eslint-disable-next-line no-console
    console.log('[AICompanion] Initial hasApiAccess:', access);
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__AI_COMPANION_LOADED__ = true;
    }
    return access;
  });

  // Re-check access whenever the panel opens
  useEffect(() => {
    if (isOpen) {
      const access = apiKeyService.hasAIAccess();
      console.log('[AICompanion] Panel opened, hasApiAccess:', access);
      setHasApiAccess(access);
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating action button */}
      <AICompanionButton
        isOpen={isOpen}
        onClick={toggleChat}
        hasUnreadResponse={false}
      />

      {/* Chat panel */}
      <ChatPanel
        isOpen={isOpen}
        onClose={closeChat}
        messages={messages}
        isLoading={isLoading}
        error={error}
        milestoneContext={initialMilestoneContext || milestoneContext}
        explainMode={explainMode}
        suggestedFollowUps={suggestedFollowUps}
        onSendMessage={sendMessage}
        onSetExplainMode={setExplainMode}
        onClearChat={clearChat}
        onDismissError={dismissError}
        hasApiKey={hasApiAccess}
      />
    </>
  );
}
