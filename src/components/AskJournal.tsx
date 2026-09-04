import React, { useState } from 'react';
import { UserSession } from '../types';
import { askJournal } from '../lib/geminiApi';
import {
  Search,
  Sparkles,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AskJournalProps {
  sessions: UserSession[];
  onNavigateToSession: (sessionId: string) => void;
}

interface QuestionHistoryItem {
  id: string;
  question: string;
  answer: string;
  citedSessions: Array<{ id: string; title: string; date: string; relevance?: string }>;
  keyTakeaways: string[];
  timestamp: number;
}

const SAMPLE_QUESTIONS = [
  'What have I been thinking about most this month?',
  'What decisions have I made about my job search?',
  'What patterns exist around my stress or sleep?',
  'What goals or habits did I commit to recently?',
  'What creative ideas have I brainstormed?',
];

export const AskJournal: React.FC<AskJournalProps> = ({
  sessions,
  onNavigateToSession,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<QuestionHistoryItem[]>([]);
  const [activeItem, setActiveItem] = useState<QuestionHistoryItem | null>(null);

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    // Build the private context corpus strictly from user's sessions
    const corpus = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      date: new Date(s.updatedAt).toLocaleDateString(),
      summary: s.summary || '',
      themes: s.themes || [],
      content: s.summary || `Journal session with ${s.messageCount} reflection exchanges.`,
    }));

    try {
      const result = await askJournal(questionText.trim(), corpus);

      const newItem: QuestionHistoryItem = {
        id: `q-${Date.now()}`,
        question: questionText.trim(),
        answer: result.answer,
        citedSessions: result.citedSessions,
        keyTakeaways: result.keyTakeaways,
        timestamp: Date.now(),
      };

      setHistory((prev) => [newItem, ...prev]);
      setActiveItem(newItem);
      setQuery('');
    } catch (err: any) {
      console.error('Error asking journal:', err);
      setErrorMessage(err?.message || 'Failed to query private journal with Gemini AI.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-50 overflow-y-auto">
      {/* Header Banner */}
      <div className="border-b border-stone-200 bg-white px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Search className="h-4 w-4" />
            </span>
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Ask My Journal
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
              Private History Grounding
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500 max-w-2xl">
            Ask questions about past thoughts, patterns, and decisions. Gemini answers exclusively based on your private journal history without hallucination.
          </p>

          {/* Search Query Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(query);
            }}
            className="mt-5 relative flex items-center"
          >
            <div className="relative flex-1">
              <input
                type="text"
                id="ask-journal-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. What decisions have I made about my career recently?"
                maxLength={1000}
                disabled={isLoading}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/60 py-3.5 pl-11 pr-24 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-500 focus:outline-hidden transition-all shadow-xs"
              />
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400" />
              <div className="absolute right-3 top-3 text-[10px] text-stone-400">
                {query.length}/1000
              </div>
            </div>

            <button
              type="submit"
              id="btn-ask-journal-submit"
              disabled={!query.trim() || isLoading}
              className="ml-3 flex items-center gap-1.5 rounded-xl bg-stone-900 px-5 py-3.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 disabled:opacity-50 transition-colors shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Ask Gemini</span>
                </>
              )}
            </button>
          </form>

          {/* Prompt Suggestion Chips */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Try asking:
            </span>
            {SAMPLE_QUESTIONS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  handleAsk(sample);
                }}
                disabled={isLoading}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-600 hover:border-stone-400 hover:text-stone-900 transition-colors text-left"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="mx-auto max-w-5xl w-full p-6 sm:p-8 flex-1 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Loading Spinner Skeleton */}
        {isLoading && (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xs flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-7 w-7 animate-spin text-stone-700" />
            <p className="text-xs font-medium text-stone-600">
              Synthesizing private journal memories with Gemini...
            </p>
          </div>
        )}

        {/* Active Response Display */}
        {activeItem && !isLoading && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            {/* User Question */}
            <div className="border-b border-stone-100 pb-4">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                Question Asked
              </span>
              <h2 className="font-serif text-xl font-bold text-stone-900 mt-1">
                "{activeItem.question}"
              </h2>
            </div>

            {/* Answer Content */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Grounded Synthesis
                </span>
              </div>
              <div className="text-sm text-stone-800 leading-relaxed space-y-3 font-normal">
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
                  {activeItem.answer}
                </ReactMarkdown>
              </div>
            </div>

            {/* Key Takeaways */}
            {activeItem.keyTakeaways && activeItem.keyTakeaways.length > 0 && (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-amber-700" />
                  Key Takeaways from Your Journal
                </h4>
                <ul className="space-y-1.5 text-xs text-amber-900">
                  {activeItem.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cited Sessions */}
            {activeItem.citedSessions && activeItem.citedSessions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-stone-500" />
                  Cited Journal Sessions ({activeItem.citedSessions.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeItem.citedSessions.map((cited, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 flex items-start justify-between gap-3 hover:bg-stone-100 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-xs text-stone-900 line-clamp-1">
                          {cited.title}
                        </div>
                        {cited.relevance && (
                          <p className="text-[11px] text-stone-500 line-clamp-2">
                            {cited.relevance}
                          </p>
                        )}
                        {cited.date && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                            <Calendar className="h-3 w-3" />
                            {cited.date}
                          </span>
                        )}
                      </div>
                      {cited.id && (
                        <button
                          onClick={() => onNavigateToSession(cited.id)}
                          className="rounded-lg p-1.5 text-stone-500 hover:bg-white hover:text-stone-900 transition-colors shrink-0"
                          title="View session"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State / Question History */}
        {!activeItem && !isLoading && (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-4 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Ask anything about your past reflections
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                Your entries remain confidential and encrypted. Gemini searches exclusively across your own reflections to find patterns, decisions, and ideas.
              </p>
            </div>
          </div>
        )}

        {/* Previous Questions in this session */}
        {history.length > 1 && (
          <div className="space-y-3 pt-4 border-t border-stone-200">
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
              Previous Questions ({history.length})
            </h3>
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveItem(item)}
                  className={`w-full text-left rounded-xl border p-3 text-xs transition-colors flex items-center justify-between ${
                    activeItem?.id === item.id
                      ? 'border-stone-900 bg-stone-50 font-medium text-stone-900'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <span className="truncate">"{item.question}"</span>
                  <ArrowRight className="h-3.5 w-3.5 text-stone-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
