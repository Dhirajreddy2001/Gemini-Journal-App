import React, { useState } from 'react';
import { Plus, Search, Trash2, Edit3, MessageSquare, Sparkles, Check, X, Calendar } from 'lucide-react';
import { UserSession } from '../types';

interface SessionListProps {
  sessions: UserSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  isCreating: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  isCreating,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredSessions = sessions.filter((session) => {
    const term = searchTerm.toLowerCase();
    const titleMatch = session.title.toLowerCase().includes(term);
    const summaryMatch = session.summary?.toLowerCase().includes(term);
    const themeMatch = session.themes?.some((t) => t.toLowerCase().includes(term));
    return titleMatch || summaryMatch || themeMatch;
  });

  const handleStartRename = (session: UserSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleValue(session.title);
  };

  const handleSaveRename = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitleValue.trim()) {
      onRenameSession(sessionId, editTitleValue.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const handleRequestDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(sessionId);
  };

  const handleConfirmDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
    setConfirmDeleteId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-amber-900/10 bg-white/70 backdrop-blur-md h-[calc(100vh-4rem)]">
      {/* Header & New Session CTA */}
      <div className="p-4 border-b border-amber-900/10 bg-white/40 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-900">Journal Sessions</h2>
          <span className="text-xs font-medium text-amber-900 bg-amber-100/70 border border-amber-200/50 px-2 py-0.5 rounded-full">
            {sessions.length} {sessions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <button
          id="btn-new-session"
          onClick={onCreateSession}
          disabled={isCreating}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 disabled:opacity-60 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{isCreating ? 'Creating Session...' : 'New Reflection Entry'}</span>
        </button>

        {/* Search Bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <input
            id="input-search-sessions"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sessions or themes..."
            className="w-full rounded-lg border border-stone-200/80 bg-white/80 backdrop-blur-xs py-1.5 pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-700/50 focus:bg-white focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredSessions.length === 0 ? (
          <div className="p-6 text-center text-stone-500 space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/70 border border-amber-900/10 text-stone-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-stone-600">
              {searchTerm ? 'No sessions matching search.' : 'No journal sessions yet.'}
            </p>
            <p className="text-[11px] text-stone-400">
              {searchTerm ? 'Try a different keyword' : 'Create your first reflection entry above to begin.'}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingSessionId === session.id;
            const isDeleting = confirmDeleteId === session.id;

            return (
              <div
                key={session.id}
                id={`session-card-${session.id}`}
                onClick={() => onSelectSession(session.id)}
                className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer overflow-hidden ${
                  isActive
                    ? 'border-amber-900/30 bg-white/95 shadow-sm ring-1 ring-amber-900/10'
                    : 'border-stone-200/70 bg-white/60 backdrop-blur-xs hover:border-amber-900/20 hover:bg-white/90'
                }`}
              >
                {/* Active Bookmark Ribbon Accent */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600" />
                )}
                {/* Delete Confirmation Overlay */}
                {isDeleting ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 space-y-2 text-center"
                  >
                    <p className="text-xs font-medium text-rose-700">
                      Permanently delete this session and all its messages?
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => handleConfirmDelete(session.id, e)}
                        className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="rounded-md border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Top Row: Title & Action Icons */}
                    <div className="flex items-start justify-between gap-2">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            className="w-full rounded-md border border-stone-300 bg-white px-2 py-0.5 text-xs text-stone-900 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            onClick={(e) => handleSaveRename(session.id, e)}
                            className="text-emerald-600 hover:text-emerald-700 p-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="text-stone-400 hover:text-stone-600 p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-serif text-sm font-medium text-stone-900 line-clamp-1 flex-1">
                          {session.title}
                        </h3>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleStartRename(session, e)}
                            className="text-stone-400 hover:text-stone-600 p-1 rounded-sm"
                            title="Rename session"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => handleRequestDelete(session.id, e)}
                            className="text-stone-400 hover:text-rose-600 p-1 rounded-sm"
                            title="Delete session"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata: Date & Message Count */}
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-stone-400" />
                        {new Date(session.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-stone-400" />
                        {session.messageCount} {session.messageCount === 1 ? 'msg' : 'msgs'}
                      </span>
                      {session.summary && (
                        <span className="flex items-center gap-0.5 text-amber-700 font-medium">
                          <Sparkles className="h-2.5 w-2.5" />
                          Summarized
                        </span>
                      )}
                    </div>

                    {/* Summary Excerpt if available */}
                    {session.summary && (
                      <p className="mt-2 text-[11px] text-stone-600 line-clamp-2 leading-relaxed bg-stone-100/50 p-1.5 rounded-md">
                        {session.summary}
                      </p>
                    )}

                    {/* Theme Tags */}
                    {session.themes && session.themes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {session.themes.slice(0, 3).map((theme, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
