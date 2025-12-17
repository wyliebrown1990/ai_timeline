/**
 * AICompanion Component
 * Main container that combines the floating button and chat panel
 * with integrated state management
 */

import { useChat } from '../../hooks/useChat';
import { AICompanionButton } from './AICompanionButton';
import { ChatPanel } from './ChatPanel';
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
      />
    </>
  );
}
