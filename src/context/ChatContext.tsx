/**
 * ChatContext
 * Provides shared chat state across the application
 * Allows any component to open the AI companion with milestone context
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useChat } from '../hooks/useChat';
import { AICompanionButton } from '../components/AICompanion/AICompanionButton';
import { ChatPanel } from '../components/AICompanion/ChatPanel';
import type { MilestoneContext, ExplainMode } from '../types/chat';

/**
 * Chat context value interface
 */
interface ChatContextValue {
  /** Open chat panel, optionally with milestone context */
  openChat: (milestoneContext?: MilestoneContext) => void;
  /** Close the chat panel */
  closeChat: () => void;
  /** Open chat with a specific milestone for explanation */
  explainMilestone: (milestone: MilestoneContext) => void;
  /** Whether the chat panel is currently open */
  isOpen: boolean;
  /** Set the explanation mode */
  setExplainMode: (mode: ExplainMode) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Hook to access chat context
 * Must be used within a ChatProvider
 */
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

/**
 * Chat provider props
 */
interface ChatProviderProps {
  children: ReactNode;
}

/**
 * ChatProvider Component
 * Wraps the application to provide chat functionality and renders the chat UI
 */
export function ChatProvider({ children }: ChatProviderProps) {
  const {
    isOpen,
    messages,
    isLoading,
    error,
    milestoneContext,
    explainMode,
    suggestedFollowUps,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    setExplainMode,
    clearChat,
    dismissError,
    explainMilestone,
  } = useChat();

  const contextValue: ChatContextValue = {
    openChat,
    closeChat,
    explainMilestone,
    isOpen,
    setExplainMode,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}

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
        milestoneContext={milestoneContext}
        explainMode={explainMode}
        suggestedFollowUps={suggestedFollowUps}
        onSendMessage={sendMessage}
        onSetExplainMode={setExplainMode}
        onClearChat={clearChat}
        onDismissError={dismissError}
      />
    </ChatContext.Provider>
  );
}
