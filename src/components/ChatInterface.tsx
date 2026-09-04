import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Sparkles,
  User as UserIcon,
  BrainCircuit,
  AlertCircle,
  RefreshCw,
  Clock,
  Tag,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserSession, JournalMessage } from '../types';

interface ChatInterfaceProps {
  session: UserSession;
  messages: JournalMessage[];
  onSendMessage: (content: string) => Promise<void>;
  onGenerateInsights: () => Promise<void>;
  isGenerating: boolean;
  isAnalyzing: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  onRetryLastMessage?: () => void;
}

const QUICK_PROMPTS = [
  'Help me unpack a difficult decision I need to make.',
  'What went well today, and how can I cultivate more of it?',
  'Brainstorm 3 practical approaches to overcome my current obstacle.',
  'Help me identify any blind spots or biases in my perspective.',
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  session,
  messages,
  onSendMessage,
  onGenerateInsights,
  isGenerating,
  isAnalyzing,
  errorMessage,
  onClearError,
  onRetryLastMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [showSummaryDetails, setShowSummaryDetails] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages or generation start
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isGenerating || isAnalyzing) return;

    setInputText('');
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApplyQuickPrompt = (prompt: string) => {
    setInputText(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-transparent">
      {/* Session Header */}
      <div className="border-b border-amber-900/10 bg-white/70 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-lg font-semibold text-stone-900 line-clamp-1">
              {session.title}
            </h1>
            <span className="text-[11px] font-medium text-amber-950 bg-amber-100/70 border border-amber-200/50 px-2 py-0.5 rounded-full">
              {messages.length} {messages.length === 1 ? 'exchange' : 'exchanges'}
            </span>
          </div>
          <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3 w-3" />
            <span>
              Last updated {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        </div>

        {/* Action: Generate Insights */}
        <button
          id="btn-generate-insights"
          onClick={onGenerateInsights}
          disabled={isGenerating || isAnalyzing || messages.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-white/80 border border-amber-900/15 px-3.5 py-1.5 text-xs font-medium text-stone-800 hover:bg-white disabled:opacity-50 transition-colors shadow-2xs"
          title="Extract executive summary, overarching themes, and actionable timeline insights"
        >
          <BrainCircuit className={`h-4 w-4 text-amber-800 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Synthesizing Insights...' : 'Analyze & Extract Insights'}</span>
        </button>
      </div>

      {/* Optional Session Summary & Themes Banner */}
      {session.summary && (
        <div className="border-b border-amber-100 bg-amber-50/60 px-6 py-2.5 text-xs text-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-amber-900">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Session Executive Summary</span>
            </div>
            <button
              onClick={() => setShowSummaryDetails(!showSummaryDetails)}
              className="text-stone-500 hover:text-stone-800"
            >
              {showSummaryDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {showSummaryDetails && (
            <div className="mt-1.5 space-y-2">
              <p className="text-stone-700 leading-relaxed">{session.summary}</p>
              {session.themes && session.themes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <Tag className="h-3 w-3 text-stone-400" />
                  {session.themes.map((theme, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-white border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            {onRetryLastMessage && (
              <button
                onClick={onRetryLastMessage}
                className="font-medium underline hover:text-rose-900"
              >
                Retry
              </button>
            )}
            <button onClick={onClearError} className="font-medium text-rose-600 hover:text-rose-900">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 rounded-3xl border border-amber-900/15 bg-white/80 backdrop-blur-md text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50/80 border border-amber-900/10 text-amber-800">
              <Sparkles className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Begin Your Reflection
              </h2>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Share what's on your mind—a decision, a victory, an uncertainty, or a feeling.
                Gemini will listen attentively, provide perspective, and help you structure your reflections.
              </p>
            </div>

            <div className="pt-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-900/60 mb-2">
                Quick Reflection Sparks
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyQuickPrompt(prompt)}
                    className="rounded-xl border border-amber-900/10 bg-white/70 backdrop-blur-xs p-3 text-xs text-stone-700 hover:border-amber-900/25 hover:bg-white transition-all text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                id={`message-bubble-${msg.id}`}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-amber-300 shadow-xs mt-1">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-stone-900 text-white rounded-tr-xs'
                      : 'border border-amber-900/10 bg-white/85 backdrop-blur-xs text-stone-800 rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                  ) : (
                    <div className="prose prose-stone prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-serif">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => {
                            const isSafe = href && /^(https?:|mailto:)/i.test(href);
                            return (
                              <a
                                href={isSafe ? href : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-800 underline hover:text-amber-950 font-medium"
                              >
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  <div
                    className={`mt-2 flex items-center justify-between text-[10px] ${
                      isUser ? 'text-stone-400' : 'text-stone-400'
                    }`}
                  >
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!isUser && msg.modelUsed && (
                      <span className="font-mono text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-sm">
                        {msg.modelUsed}
                      </span>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 border border-amber-900/15 text-stone-700 shadow-2xs mt-1">
                    <UserIcon className="h-4 w-4 text-stone-700" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Generating Pulse Indicator */}
        {isGenerating && (
          <div className="flex gap-3.5 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-amber-300 shadow-xs">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div className="border border-amber-900/10 bg-white/85 backdrop-blur-xs rounded-2xl rounded-tl-xs p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <div className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                <span className="font-medium text-stone-900">Gemini is reflecting...</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Synthesizing thoughtful guidance using server-side resilience protocol.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-amber-900/10 bg-white/70 backdrop-blur-md p-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto space-y-2">
          <div className="relative rounded-2xl border border-amber-900/15 bg-white/80 backdrop-blur-xs p-2 focus-within:border-amber-800/40 focus-within:bg-white focus-within:shadow-xs transition-all">
            <textarea
              ref={textareaRef}
              id="input-journal-prompt"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What are you reflecting on right now? (Ctrl+Enter to send)"
              rows={3}
              maxLength={4000}
              disabled={isGenerating || isAnalyzing}
              className="w-full resize-none bg-transparent px-2 py-1 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden disabled:opacity-50 font-serif"
            />

            <div className="flex items-center justify-between pt-1 border-t border-stone-100/80 text-xs text-stone-400 px-1">
              <div className="flex items-center gap-2">
                <span>{inputText.length} / 4000 characters</span>
                <span className="hidden sm:inline">• Ctrl+Enter to send</span>
              </div>

              <button
                type="submit"
                id="btn-send-message"
                disabled={!inputText.trim() || isGenerating || isAnalyzing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 disabled:opacity-40 transition-all"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
