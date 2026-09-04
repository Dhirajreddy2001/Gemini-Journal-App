import React, { useState } from 'react';
import { GoalItem, GoalStatus, UserSession } from '../types';
import { detectGoalsFromJournal } from '../lib/geminiApi';
import {
  saveGoal,
  updateGoalStatus,
  updateGoal,
  deleteGoal,
  batchSaveGoals,
} from '../lib/firestoreService';
import {
  Target,
  Sparkles,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  Calendar,
  ExternalLink,
  Loader2,
  AlertCircle,
  Edit2,
  Save,
} from 'lucide-react';

interface GoalTrackerProps {
  userId: string;
  goals: GoalItem[];
  sessions: UserSession[];
  onGoalsUpdated: (goals: GoalItem[]) => void;
  onNavigateToSession: (sessionId: string) => void;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({
  userId,
  goals,
  sessions,
  onGoalsUpdated,
  onNavigateToSession,
}) => {
  const [filter, setFilter] = useState<GoalStatus | 'all'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New custom goal form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('personal');
  const [newTargetDate, setNewTargetDate] = useState('');

  // Edit Goal modal state
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('personal');
  const [editTargetDate, setEditTargetDate] = useState('');

  // Editing notes state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesBuffer, setNotesBuffer] = useState('');

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    if (filter === 'all') return true;
    if (filter === 'suggested') {
      return g.status === 'suggested' || (g.isAIGenerated && !g.confirmed);
    }
    return g.status === filter;
  });

  const activeCount = goals.filter((g) => g.status === 'active').length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;
  const pausedCount = goals.filter((g) => g.status === 'paused').length;
  const suggestedCount = goals.filter((g) => g.status === 'suggested' || (g.isAIGenerated && !g.confirmed)).length;
  const completionRate = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  // Scan journal with Gemini
  const handleScanJournal = async () => {
    if (sessions.length === 0) {
      setErrorMessage('Write at least one journal entry first before scanning for goals.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    const payload = sessions.slice(0, 10).map((s) => ({
      sessionId: s.id,
      sessionTitle: s.title,
      text: s.summary || s.title,
    }));

    try {
      const response = await detectGoalsFromJournal(payload);
      if (!response.goals || response.goals.length === 0) {
        setErrorMessage('No explicit new goals or commitments detected in recent entries.');
        return;
      }

      // Filter out duplicates that match existing goal titles
      const existingTitles = new Set(goals.map((g) => g.title.toLowerCase().trim()));
      const uniqueNewGoals = response.goals.filter(
        (g) => !existingTitles.has(g.title.toLowerCase().trim())
      );

      if (uniqueNewGoals.length === 0) {
        setErrorMessage('All detected goals have already been recorded in your tracker.');
        return;
      }

      const saved = await batchSaveGoals(userId, uniqueNewGoals);
      onGoalsUpdated([...saved, ...goals]);
    } catch (err: any) {
      console.error('Error scanning goals:', err);
      setErrorMessage(err?.message || 'Failed to scan journal for goals.');
    } finally {
      setIsScanning(false);
    }
  };

  // Confirm an AI-generated goal into user intent
  const handleConfirmGoal = async (goalId: string) => {
    try {
      await updateGoal(userId, goalId, { status: 'active', confirmed: true });
      const updated = goals.map((g) =>
        g.id === goalId ? { ...g, status: 'active' as GoalStatus, confirmed: true, updatedAt: Date.now() } : g
      );
      onGoalsUpdated(updated);
    } catch (err: any) {
      console.error('Failed to confirm goal:', err);
      setErrorMessage('Failed to confirm goal.');
    }
  };

  // Open Edit Modal
  const openEditModal = (goal: GoalItem) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditDescription(goal.description || '');
    setEditCategory(goal.category || 'personal');
    setEditTargetDate(goal.targetDate || '');
  };

  // Save Goal Edits
  const handleSaveGoalEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editTitle.trim()) return;

    try {
      const updates = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        targetDate: editTargetDate || undefined,
        confirmed: true, // Editing confirms user intent
        status: (editingGoal.status === 'suggested' ? 'active' : editingGoal.status) as GoalStatus,
      };

      await updateGoal(userId, editingGoal.id, updates);
      const updated = goals.map((g) =>
        g.id === editingGoal.id ? { ...g, ...updates, updatedAt: Date.now() } : g
      );
      onGoalsUpdated(updated);
      setEditingGoal(null);
    } catch (err: any) {
      console.error('Failed to save goal edits:', err);
      setErrorMessage('Failed to save goal edits.');
    }
  };

  // Status toggle handler
  const handleStatusChange = async (goalId: string, newStatus: GoalStatus) => {
    try {
      await updateGoalStatus(userId, goalId, newStatus);
      const updated = goals.map((g) =>
        g.id === goalId ? { ...g, status: newStatus, confirmed: true, updatedAt: Date.now() } : g
      );
      onGoalsUpdated(updated);
    } catch (err: any) {
      console.error('Failed to update goal status:', err);
      setErrorMessage('Failed to update goal status.');
    }
  };

  // Delete goal
  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(userId, goalId);
      onGoalsUpdated(goals.filter((g) => g.id !== goalId));
    } catch (err: any) {
      console.error('Failed to delete goal:', err);
      setErrorMessage('Failed to delete goal.');
    }
  };

  // Save Progress Notes
  const handleSaveNotes = async (goalId: string) => {
    try {
      await updateGoal(userId, goalId, { progressNotes: notesBuffer });
      const updated = goals.map((g) =>
        g.id === goalId ? { ...g, progressNotes: notesBuffer, updatedAt: Date.now() } : g
      );
      onGoalsUpdated(updated);
      setEditingNotesId(null);
    } catch (err: any) {
      console.error('Failed to save progress notes:', err);
      setErrorMessage('Failed to save notes.');
    }
  };

  // Create manual goal
  const handleCreateCustomGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await saveGoal(userId, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        status: 'active',
        targetDate: newTargetDate || undefined,
      });

      onGoalsUpdated([created, ...goals]);
      setNewTitle('');
      setNewDescription('');
      setNewTargetDate('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create goal:', err);
      setErrorMessage('Failed to create goal.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-y-auto">
      {/* Header Banner */}
      <div className="border-b border-amber-900/10 bg-white/70 backdrop-blur-md px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Target className="h-4 w-4" />
              </span>
              <h1 className="font-serif text-2xl font-bold text-stone-900">
                Goal Tracker from Journal Entries
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Gemini automatically extracts goals and commitments from your journal, letting you track and achieve them.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScanJournal}
              disabled={isScanning}
              className="flex items-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3.5 py-2 text-xs font-semibold text-stone-800 transition-colors shrink-0"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-stone-600" />
                  <span>Scanning Journal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>Detect from Journal</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New Goal</span>
            </button>
          </div>
        </div>

        {/* Stats Row & Filter Tabs */}
        <div className="mx-auto max-w-5xl mt-6 pt-5 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All ({goals.length})
            </button>
            <button
              onClick={() => setFilter('suggested')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'suggested'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Drafts ({suggestedCount})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'active'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'completed'
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setFilter('paused')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'paused'
                  ? 'bg-stone-700 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <PauseCircle className="h-3.5 w-3.5" />
              Paused ({pausedCount})
            </button>
          </div>

          {/* Completion Meter */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-stone-400 font-medium">Completion Rate</div>
              <div className="text-xs font-bold text-stone-800">{completionRate}%</div>
            </div>
            <div className="w-24 h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main List Area */}
      <div className="mx-auto max-w-5xl w-full p-6 sm:p-8 flex-1 space-y-4">
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {filteredGoals.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-4 shadow-xs">
            <Target className="h-12 w-12 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              {filter === 'all' ? 'No goals recorded yet' : `No ${filter} goals`}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              You can automatically extract commitments from your journal entries with Gemini or add your own custom goals.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleScanJournal}
                className="rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800"
              >
                Scan Journal with Gemini
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Add Custom Goal
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredGoals.map((goal) => {
              const isUnconfirmed = goal.status === 'suggested' || (goal.isAIGenerated && !goal.confirmed);

              return (
                <div
                  key={goal.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                    isUnconfirmed
                      ? 'border-amber-400/60 bg-amber-50/40 backdrop-blur-md ring-1 ring-amber-300/40'
                      : goal.status === 'completed'
                      ? 'border-amber-900/10 bg-white/60 backdrop-blur-md'
                      : 'border-amber-900/10 bg-white/80 backdrop-blur-md'
                  }`}
                >
                  {/* Unconfirmed AI Banner */}
                  {isUnconfirmed && (
                    <div className="mb-3.5 rounded-xl bg-amber-50 border border-amber-200/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-950">AI Suggested Goal · Unconfirmed Intent</span>
                          <p className="text-[11px] text-amber-800/90 mt-0.5">
                            Extracted by Gemini from your private reflections. AI goals are not treated as confirmed user intent until you accept or edit them.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleConfirmGoal(goal.id)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Accept & Activate</span>
                        </button>
                        <button
                          onClick={() => openEditModal(goal)}
                          className="rounded-lg bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="h-3 w-3 text-stone-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="rounded-lg bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 px-2.5 py-1.5 text-xs font-medium transition-colors"
                          title="Dismiss suggestion"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Goal Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-sm font-semibold text-stone-900 ${
                            goal.status === 'completed' ? 'line-through text-stone-500' : ''
                          }`}
                        >
                          {goal.title}
                        </h3>
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 capitalize">
                          {goal.category || 'personal'}
                        </span>
                        {isUnconfirmed && (
                          <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold">
                            Draft Suggestion
                          </span>
                        )}
                        {goal.sessionId && (
                          <button
                            onClick={() => onNavigateToSession(goal.sessionId!)}
                            className="inline-flex items-center gap-1 rounded-md bg-stone-50 px-2 py-0.5 text-[10px] text-stone-500 hover:text-stone-900 border border-stone-200"
                            title="Open original journal session"
                          >
                            <span>from entry</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>

                      {goal.description && (
                        <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                          {goal.description}
                        </p>
                      )}

                      {/* Target Date */}
                      {goal.targetDate && (
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                          <Calendar className="h-3 w-3" />
                          <span>Target: {goal.targetDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Switcher & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                        <button
                          onClick={() => handleStatusChange(goal.id, 'active')}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            goal.status === 'active'
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => handleStatusChange(goal.id, 'paused')}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            goal.status === 'paused'
                              ? 'bg-stone-700 text-white font-semibold'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          Paused
                        </button>
                        <button
                          onClick={() => handleStatusChange(goal.id, 'completed')}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            goal.status === 'completed'
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          Done
                        </button>
                      </div>

                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
                        title="Edit goal"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                {/* Progress Notes Section */}
                <div className="mt-3 pt-3 border-t border-stone-100 flex items-start justify-between gap-3 text-xs">
                  {editingNotesId === goal.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={notesBuffer}
                        onChange={(e) => setNotesBuffer(e.target.value)}
                        placeholder="Add progress note or next step..."
                        className="flex-1 rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-stone-900 focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleSaveNotes(goal.id)}
                        className="flex items-center gap-1 rounded-lg bg-stone-900 text-white px-2.5 py-1 text-[11px] font-medium"
                      >
                        <Save className="h-3 w-3" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setEditingNotesId(null)}
                        className="text-stone-500 text-[11px] px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-stone-500 italic text-[11px]">
                        {goal.progressNotes ? `Note: ${goal.progressNotes}` : 'No progress notes logged yet.'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingNotesId(goal.id);
                          setNotesBuffer(goal.progressNotes || '');
                        }}
                        className="text-stone-400 hover:text-stone-700 flex items-center gap-1 text-[11px]"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>{goal.progressNotes ? 'Edit' : 'Add Note'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Add Custom Goal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200 animate-scale-in">
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-4">
              Add Custom Goal
            </h3>
            <form onSubmit={handleCreateCustomGoal} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Run 5 miles every Sunday"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Description / Why it matters
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Additional context or milestones..."
                  rows={2}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                  >
                    <option value="personal">Personal</option>
                    <option value="career">Career</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                    <option value="mindfulness">Mindfulness</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Target Date (optional)
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2 text-xs text-stone-900 focus:outline-hidden"
                  >
                  </input>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-5 py-2 font-semibold text-white hover:bg-stone-800"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200 animate-scale-in">
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">
              Edit Goal
            </h3>
            {editingGoal.isAIGenerated && !editingGoal.confirmed && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
                Saving changes will confirm this goal as your active intention.
              </p>
            )}
            <form onSubmit={handleSaveGoalEdits} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Description / Details
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                  >
                    <option value="personal">Personal</option>
                    <option value="career">Career</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                    <option value="mindfulness">Mindfulness</option>
                    <option value="creativity">Creativity</option>
                    <option value="relationships">Relationships</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2 text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="rounded-xl px-4 py-2 text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-5 py-2 font-semibold text-white hover:bg-stone-800"
                >
                  Save & Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
