/**
 * ChatPanel Component
 * Slide-out drawer containing the AI companion chat interface
 * Anthropic Warm theme - elegant, minimal design
 */

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { X, Send, Trash2, AlertCircle, Sparkles, ChevronDown, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, ExplainMode, MilestoneContext } from '../../types/chat';
import { EXPLAIN_MODE_LABELS } from '../../types/chat';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  milestoneContext: MilestoneContext | null;
  explainMode: ExplainMode;
  suggestedFollowUps: string[];
  onSendMessage: (message: string) => void;
  onSetExplainMode: (mode: ExplainMode) => void;
  onClearChat: () => void;
  onDismissError: () => void;
  /** Whether user has configured an API key */
  hasApiKey?: boolean;
}

/**
 * Typing indicator component shown while AI is responding
 */
function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-4 bg-warm-100 dark:bg-warm-800 rounded-lg max-w-[80%]">
      <Sparkles className="w-4 h-4 text-primary-500 animate-pulse" />
      <div className="flex space-x-1">
        <span className="w-2 h-2 bg-warmGray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-warmGray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-warmGray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

/**
 * Individual chat message bubble
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          max-w-[85%] p-3 rounded-lg
          ${
            isUser
              ? 'bg-primary-500 text-white rounded-br-none'
              : 'bg-warm-100 dark:bg-warm-800 text-warmGray-800 dark:text-warm-100 rounded-bl-none'
          }
        `}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-base prose-ul:my-1 prose-li:my-0.5">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <time
          className={`
            text-xs mt-1 block
            ${isUser ? 'text-primary-200' : 'text-warmGray-500 dark:text-warm-400'}
          `}
          dateTime={new Date(message.timestamp).toISOString()}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </div>
  );
}

/**
 * Explain mode selector dropdown
 */
function ExplainModeSelector({
  currentMode,
  onSelectMode,
}: {
  currentMode: ExplainMode;
  onSelectMode: (mode: ExplainMode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modes: ExplainMode[] = ['plain_english', 'for_boss', 'technical', 'interview'];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-1 px-2 py-1 text-xs
          bg-warm-100 dark:bg-warm-700 rounded
          hover:bg-warm-200 dark:hover:bg-warm-600
          transition-colors
        "
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{EXPLAIN_MODE_LABELS[currentMode]}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          className="
            absolute bottom-full left-0 mb-1
            bg-white dark:bg-warm-800 rounded-lg shadow-warm-lg
            border border-warm-200 dark:border-warm-700
            py-1 min-w-[160px] z-10
          "
          role="listbox"
        >
          {modes.map((mode) => (
            <li key={mode}>
              <button
                onClick={() => {
                  onSelectMode(mode);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-3 py-2 text-sm
                  hover:bg-warm-100 dark:hover:bg-warm-700
                  ${mode === currentMode ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : ''}
                `}
                role="option"
                aria-selected={mode === currentMode}
              >
                {EXPLAIN_MODE_LABELS[mode]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Main chat panel component
 */
export function ChatPanel({
  isOpen,
  onClose,
  messages,
  isLoading,
  error,
  milestoneContext,
  explainMode,
  suggestedFollowUps,
  onSendMessage,
  onSetExplainMode,
  onClearChat,
  onDismissError,
  hasApiKey = true,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    if (!isLoading) {
      onSendMessage(question);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="
        fixed bottom-24 right-6 z-[60]
        w-[380px] max-w-[calc(100vw-3rem)]
        h-[500px] max-h-[calc(100vh-8rem)]
        bg-white dark:bg-warm-900
        rounded-xl shadow-warm-lg
        border border-warm-200 dark:border-warm-700
        flex flex-col
        animate-in slide-in-from-bottom-4 duration-300
      "
      role="dialog"
      aria-label="AI Learning Companion"
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-warmGray-800 dark:text-warm-100">AI Companion</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearChat}
            className="p-2 text-warmGray-500 hover:text-warmGray-700 dark:hover:text-warm-300 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-warmGray-500 hover:text-warmGray-700 dark:hover:text-warm-300 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Milestone context banner */}
      {milestoneContext && (
        <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800">
          <p className="text-xs text-primary-700 dark:text-primary-300">
            <span className="font-medium">Discussing:</span> {milestoneContext.title}
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* API Key required banner */}
        {!hasApiKey && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                API Key Required
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                To use the AI companion, you'll need to enter your Anthropic API key.
                Click the send button or type a message to get started.
              </p>
            </div>
          </div>
        )}

        {/* Welcome message if no messages */}
        {messages.length === 0 && hasApiKey && (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-primary-500 mx-auto mb-4" />
            <h3 className="font-medium text-warmGray-800 dark:text-warm-100 mb-2">
              Ask me anything about AI history
            </h3>
            <p className="text-sm text-warmGray-500 dark:text-warm-400 mb-4">
              I can explain concepts in plain English, help you prepare for interviews, or dive into technical details.
            </p>
            {/* Suggested starter questions */}
            <div className="space-y-2">
              {[
                'What is a transformer in AI?',
                'Why was GPT-3 significant?',
                'How did deep learning start?',
              ].map((question) => (
                <button
                  key={question}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="
                    block w-full text-left px-3 py-2 text-sm
                    bg-warm-100 dark:bg-warm-800 rounded-lg
                    hover:bg-warm-200 dark:hover:bg-warm-700
                    transition-colors
                  "
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={onDismissError}
                className="text-xs text-red-600 dark:text-red-400 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Suggested follow-ups */}
        {suggestedFollowUps.length > 0 && !isLoading && (
          <div className="pt-2">
            <p className="text-xs text-warmGray-500 dark:text-warm-400 mb-2">Suggested questions:</p>
            <div className="space-y-1">
              {suggestedFollowUps.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="
                    block w-full text-left px-3 py-2 text-sm
                    bg-warm-50 dark:bg-warm-800 rounded-lg
                    hover:bg-warm-100 dark:hover:bg-warm-700
                    border border-warm-200 dark:border-warm-700
                    transition-colors
                  "
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <footer className="p-4 border-t border-warm-200 dark:border-warm-700">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about AI history..."
                rows={1}
                className="
                  w-full px-3 py-2 pr-10
                  bg-warm-100 dark:bg-warm-800
                  border border-warm-200 dark:border-warm-700
                  rounded-lg resize-none
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  text-sm text-warmGray-800 dark:text-warm-100
                  placeholder-warmGray-500 dark:placeholder-warm-500
                "
                style={{ minHeight: '40px', maxHeight: '120px' }}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="
                p-2 bg-primary-500 text-white rounded-lg
                hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Mode selector */}
          <div className="flex items-center justify-between text-warmGray-500 dark:text-warm-400">
            <ExplainModeSelector currentMode={explainMode} onSelectMode={onSetExplainMode} />
            <span className="text-xs">Shift+Enter for new line</span>
          </div>
        </form>
      </footer>
    </div>
  );
}
