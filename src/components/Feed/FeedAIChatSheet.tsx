/**
 * FeedAIChatSheet Component (Sprint Feed-3)
 *
 * Slide-up sheet for AI-powered Q&A about feed items.
 * Uses the existing chatApi service for AI responses.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { chatApi } from '../../services/chatApi';
import type { ChatMessage, ExplainMode } from '../../types/chat';
import { cn } from '../../lib/utils';

interface FeedAIChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  headline: string;
  summary: string;
  whyItMatters: string | null;
}

// Suggested questions for the user
const SUGGESTED_QUESTIONS = [
  'Explain this in simple terms',
  'Why is this significant?',
  'What are the implications?',
  'How does this affect the AI industry?',
];

export function FeedAIChatSheet({
  isOpen,
  onClose,
  eventId,
  headline,
  summary,
  whyItMatters,
}: FeedAIChatSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explainMode, setExplainMode] = useState<ExplainMode>('plain_english');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset state when sheet opens with new event
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setError(null);
      setInputValue('');
    }
  }, [isOpen, eventId]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Send message to AI
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);
      setError(null);

      try {
        // Build context for the AI
        const context = `News Article: "${headline}"

Summary: ${summary}

${whyItMatters ? `Why It Matters: ${whyItMatters}` : ''}`;

        const response = await chatApi.sendMessage({
          message: `Context about a news article:\n${context}\n\nUser question: ${message.trim()}`,
          milestoneContext: {
            id: eventId,
            title: headline,
            description: summary,
            date: new Date().toISOString(),
          },
          explainMode,
        });

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.response,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get AI response';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [headline, summary, whyItMatters, eventId, explainMode, isLoading]
  );

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle suggested question click
  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50',
              'bg-gray-900',
              'rounded-t-2xl shadow-2xl',
              'max-h-[85vh] flex flex-col'
            )}
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-700">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 rounded-lg bg-blue-500/20">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    Ask AI
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </h2>
                  <p className="text-sm text-gray-400 truncate">{headline}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-full flex-shrink-0',
                  'text-gray-400 hover:text-gray-200',
                  'hover:bg-gray-800',
                  'transition-colors'
                )}
                aria-label="Close AI chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[200px]">
              {/* Empty state with suggestions */}
              {messages.length === 0 && !isLoading && (
                <div className="space-y-4">
                  <p className="text-center text-gray-400 text-sm">
                    Ask me anything about this article
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTED_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        onClick={() => handleSuggestedQuestion(question)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-full',
                          'bg-gray-800 text-gray-300',
                          'hover:bg-gray-700 hover:text-white',
                          'transition-colors'
                        )}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2',
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-100'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-700">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isLoading}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-full',
                    'bg-gray-800 text-white placeholder-gray-500',
                    'border border-gray-700 focus:border-blue-500',
                    'outline-none transition-colors',
                    'disabled:opacity-50'
                  )}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={cn(
                    'p-2.5 rounded-full',
                    'bg-blue-600 text-white',
                    'hover:bg-blue-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors'
                  )}
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>

              {/* Explain mode selector */}
              <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
                <span className="text-xs text-gray-500 flex-shrink-0">
                  Style:
                </span>
                {(
                  [
                    'plain_english',
                    'technical',
                    'for_boss',
                    'interview',
                  ] as ExplainMode[]
                ).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setExplainMode(mode)}
                    className={cn(
                      'px-2 py-1 text-xs rounded-full flex-shrink-0',
                      'transition-colors',
                      explainMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    )}
                  >
                    {mode === 'plain_english' && 'Simple'}
                    {mode === 'technical' && 'Technical'}
                    {mode === 'for_boss' && 'Business'}
                    {mode === 'interview' && 'Interview'}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default FeedAIChatSheet;
