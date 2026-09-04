import React, { useState } from 'react';
import { DecisionItem, DecisionReview, UserSession } from '../types';
import { coachDecision, detectDecisionsFromJournal } from '../lib/geminiApi';
import {
  saveDecision,
  updateDecision,
  recordDecisionReview,
  deleteDecision,
  batchSaveDecisions,
} from '../lib/firestoreService';
import {
  Scale,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
  Edit2,
  ExternalLink,
} from 'lucide-react';

interface DecisionJournalProps {
  userId: string;
  decisions: DecisionItem[];
  sessions: UserSession[];
  onDecisionsUpdated: (decisions: DecisionItem[]) => void;
  onNavigateToSession: (sessionId: string) => void;
}

export const DecisionJournal: React.FC<DecisionJournalProps> = ({
  userId,
  decisions,
  sessions,
  onDecisionsUpdated,
  onNavigateToSession,
}) => {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'drafts' | 'review'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedDecisionForReview, setSelectedDecisionForReview] = useState<DecisionItem | null>(null);
  const [isAnalyzingCoach, setIsAnalyzingCoach] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Decision Modal State
  const [editingDecision, setEditingDecision] = useState<DecisionItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>(['']);
  const [editReasoning, setEditReasoning] = useState('');
  const [editAssumptions, setEditAssumptions] = useState<string[]>(['']);
  const [editChoice, setEditChoice] = useState('');
  const [editConfidenceScore, setEditConfidenceScore] = useState<number>(80);

  // New Decision Form State
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['Option A: ', 'Option B: ']);
  const [reasoning, setReasoning] = useState('');
  const [assumptions, setAssumptions] = useState<string[]>(['']);
  const [choice, setChoice] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number>(80);
  const [reviewMonths, setReviewMonths] = useState<number>(3);

  // Review Form State
  const [actualOutcome, setActualOutcome] = useState('');
  const [workedOut, setWorkedOut] = useState<'yes' | 'partial' | 'no'>('yes');
  const [assumptionsValidated, setAssumptionsValidated] = useState(true);
  const [lessonsLearned, setLessonsLearned] = useState('');

  // Counts & Filter logic
  const confirmedCount = decisions.filter((d) => d.confirmed !== false).length;
  const draftCount = decisions.filter((d) => d.isAIGenerated && !d.confirmed).length;
  const readyReviewCount = decisions.filter(
    (d) => d.reviewDate && new Date(d.reviewDate).getTime() <= Date.now() && !d.reviewOutcome
  ).length;

  const filteredDecisions = decisions.filter((d) => {
    if (filter === 'confirmed') return d.confirmed !== false;
    if (filter === 'drafts') return d.isAIGenerated && !d.confirmed;
    if (filter === 'review') {
      return d.reviewDate && new Date(d.reviewDate).getTime() <= Date.now() && !d.reviewOutcome;
    }
    return true;
  });

  // Scan journal for decisions
  const handleScanDecisions = async () => {
    if (sessions.length === 0) {
      setErrorMessage('Write at least one journal entry first before scanning for decisions.');
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
      const response = await detectDecisionsFromJournal(payload);
      if (!response.decisions || response.decisions.length === 0) {
        setErrorMessage('No unrecorded decision crossroads detected in recent journal entries.');
        return;
      }

      const existingTitles = new Set(decisions.map((d) => d.title.toLowerCase().trim()));
      const uniqueNew = response.decisions.filter(
        (d) => !existingTitles.has(d.title.toLowerCase().trim())
      );

      if (uniqueNew.length === 0) {
        setErrorMessage('All detected decisions have already been logged in your Decision Journal.');
        return;
      }

      const saved = await batchSaveDecisions(userId, uniqueNew);
      onDecisionsUpdated([...saved, ...decisions]);
    } catch (err: any) {
      console.error('Error scanning decisions:', err);
      setErrorMessage(err?.message || 'Failed to detect decisions from journal.');
    } finally {
      setIsScanning(false);
    }
  };

  // Confirm an AI-generated decision
  const handleConfirmDecision = async (id: string) => {
    try {
      await updateDecision(userId, id, { confirmed: true });
      const updated = decisions.map((d) =>
        d.id === id ? { ...d, confirmed: true, updatedAt: Date.now() } : d
      );
      onDecisionsUpdated(updated);
    } catch (err: any) {
      console.error('Failed to confirm decision:', err);
      setErrorMessage('Failed to confirm decision.');
    }
  };

  // Open Edit Decision Modal
  const openEditModal = (decision: DecisionItem) => {
    setEditingDecision(decision);
    setEditTitle(decision.title);
    setEditOptions(decision.options.length > 0 ? [...decision.options] : ['']);
    setEditReasoning(decision.reasoning || '');
    setEditAssumptions(decision.assumptions.length > 0 ? [...decision.assumptions] : ['']);
    setEditChoice(decision.choice || '');
    setEditConfidenceScore(decision.confidenceScore ?? 80);
  };

  // Save Decision Edits
  const handleSaveDecisionEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDecision || !editTitle.trim()) return;

    try {
      const updates = {
        title: editTitle.trim(),
        options: editOptions.filter((o) => o.trim()),
        reasoning: editReasoning.trim(),
        assumptions: editAssumptions.filter((a) => a.trim()),
        choice: editChoice.trim(),
        confidenceScore: editConfidenceScore,
        confirmed: true, // Editing confirms user ownership
      };

      await updateDecision(userId, editingDecision.id, updates);
      const updated = decisions.map((d) =>
        d.id === editingDecision.id ? { ...d, ...updates, updatedAt: Date.now() } : d
      );
      onDecisionsUpdated(updated);
      setEditingDecision(null);
    } catch (err: any) {
      console.error('Failed to save decision edits:', err);
      setErrorMessage('Failed to save decision edits.');
    }
  };

  // Add/Remove Option inputs
  const handleAddOption = () => setOptions([...options, '']);
  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  // Add/Remove Assumption inputs
  const handleAddAssumption = () => setAssumptions([...assumptions, '']);
  const handleRemoveAssumption = (index: number) => {
    if (assumptions.length <= 1) return;
    setAssumptions(assumptions.filter((_, i) => i !== index));
  };

  // AI Decision Coach
  const handleConsultCoach = async () => {
    if (!title.trim()) {
      setErrorMessage('Please enter a decision title first.');
      return;
    }

    setIsAnalyzingCoach(true);
    setErrorMessage(null);

    try {
      const result = await coachDecision({
        title,
        options: options.filter((o) => o.trim()),
        reasoning,
        assumptions: assumptions.filter((a) => a.trim()),
        choice,
      });

      setCoachFeedback(result);
    } catch (err: any) {
      console.error('Error coaching decision:', err);
      setErrorMessage(err?.message || 'Failed to analyze decision with Gemini Decision Coach.');
    } finally {
      setIsAnalyzingCoach(false);
    }
  };

  // Save Decision
  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const reviewDateMs = Date.now() + reviewMonths * 30 * 24 * 60 * 60 * 1000;
      const reviewDateStr = new Date(reviewDateMs).toISOString().split('T')[0];

      const saved = await saveDecision(userId, {
        title: title.trim(),
        options: options.filter((o) => o.trim()),
        reasoning: reasoning.trim(),
        assumptions: assumptions.filter((a) => a.trim()),
        choice: choice.trim(),
        confidenceScore,
        reviewDate: reviewDateStr,
      });

      onDecisionsUpdated([saved, ...decisions]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Failed to save decision:', err);
      setErrorMessage('Failed to save decision.');
    }
  };

  // Save Review Outcome
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecisionForReview) return;

    const review: DecisionReview = {
      actualOutcome: actualOutcome.trim(),
      workedOut,
      assumptionsValidated,
      lessonsLearned: lessonsLearned.trim(),
      reviewedAt: Date.now(),
    };

    try {
      await recordDecisionReview(userId, selectedDecisionForReview.id, review);
      const updated = decisions.map((d) =>
        d.id === selectedDecisionForReview.id ? { ...d, reviewOutcome: review, updatedAt: Date.now() } : d
      );
      onDecisionsUpdated(updated);
      setIsReviewModalOpen(false);
      setSelectedDecisionForReview(null);
    } catch (err: any) {
      console.error('Failed to save review:', err);
      setErrorMessage('Failed to record review.');
    }
  };

  const handleDeleteDecision = async (id: string) => {
    try {
      await deleteDecision(userId, id);
      onDecisionsUpdated(decisions.filter((d) => d.id !== id));
    } catch (err: any) {
      console.error('Failed to delete decision:', err);
      setErrorMessage('Failed to delete decision.');
    }
  };

  const resetForm = () => {
    setTitle('');
    setOptions(['Option A: ', 'Option B: ']);
    setReasoning('');
    setAssumptions(['']);
    setChoice('');
    setConfidenceScore(80);
    setCoachFeedback(null);
  };

  const openReviewModal = (decision: DecisionItem) => {
    setSelectedDecisionForReview(decision);
    if (decision.reviewOutcome) {
      setActualOutcome(decision.reviewOutcome.actualOutcome || '');
      setWorkedOut(decision.reviewOutcome.workedOut || 'yes');
      setAssumptionsValidated(decision.reviewOutcome.assumptionsValidated ?? true);
      setLessonsLearned(decision.reviewOutcome.lessonsLearned || '');
    } else {
      setActualOutcome('');
      setWorkedOut('yes');
      setAssumptionsValidated(true);
      setLessonsLearned('');
    }
    setIsReviewModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-y-auto">
      {/* Header Banner */}
      <div className="border-b border-amber-900/10 bg-white/70 backdrop-blur-md px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <Scale className="h-4 w-4" />
              </span>
              <h1 className="font-serif text-2xl font-bold text-stone-900">
                Decision Journal & Bias Coach
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Record critical decisions, options, assumptions, and confidence ratings. Stress-test thinking with Gemini and review long-term outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleScanDecisions}
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
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Detect from Journal</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Record New Decision</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mx-auto max-w-5xl mt-5 pt-4 border-t border-stone-100 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All ({decisions.length})
          </button>
          <button
            onClick={() => setFilter('drafts')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filter === 'drafts'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Drafts ({draftCount})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filter === 'confirmed'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirmed ({confirmedCount})
          </button>
          <button
            onClick={() => setFilter('review')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filter === 'review'
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Ready for Review ({readyReviewCount})
          </button>
        </div>
      </div>

      {/* Main List Area */}
      <div className="mx-auto max-w-5xl w-full p-6 sm:p-8 flex-1 space-y-6">
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {filteredDecisions.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-4 shadow-xs">
            <Scale className="h-12 w-12 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No Decisions Found
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {filter === 'drafts'
                ? 'No unconfirmed AI drafts. Click "Detect from Journal" to discover decision crossroads from your entries.'
                : 'Document your options, assumptions, and confidence score to calibrate judgment over time.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Log First Decision
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDecisions.map((decision) => {
              const isReviewed = Boolean(decision.reviewOutcome);
              const isPastReviewDate =
                decision.reviewDate && new Date(decision.reviewDate).getTime() <= Date.now();
              const isUnconfirmedDraft = decision.isAIGenerated && !decision.confirmed;

              return (
                <div
                  key={decision.id}
                  className={`rounded-2xl border p-6 shadow-sm space-y-4 transition-all ${
                    isUnconfirmedDraft
                      ? 'border-amber-400/70 bg-amber-50/30 backdrop-blur-md ring-1 ring-amber-300/40'
                      : 'border-amber-900/10 bg-white/80 backdrop-blur-md'
                  }`}
                >
                  {/* AI Draft Unconfirmed Notice */}
                  {isUnconfirmedDraft && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-950">AI-Extracted Decision · Draft (Unconfirmed)</span>
                          <p className="text-[11px] text-amber-800/90 mt-0.5">
                            Identified by Gemini from your private reflections. AI drafts are not factual user decisions until you review and confirm them.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleConfirmDecision(decision.id)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Confirm Decision</span>
                        </button>
                        <button
                          onClick={() => openEditModal(decision)}
                          className="rounded-lg bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="h-3 w-3 text-stone-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDecision(decision.id)}
                          className="rounded-lg bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 px-2.5 py-1.5 text-xs font-medium transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-lg font-bold text-stone-900">
                          {decision.title}
                        </h3>
                        {isUnconfirmedDraft ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900 border border-amber-200">
                            AI Draft
                          </span>
                        ) : isReviewed ? (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              decision.reviewOutcome?.workedOut === 'yes'
                                ? 'bg-emerald-100 text-emerald-800'
                                : decision.reviewOutcome?.workedOut === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            Outcome: {decision.reviewOutcome?.workedOut.toUpperCase()}
                          </span>
                        ) : isPastReviewDate ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Ready for Review
                          </span>
                        ) : (
                          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-medium text-stone-600">
                            Confirmed · Pending Review
                          </span>
                        )}

                        {decision.sessionId && (
                          <button
                            onClick={() => onNavigateToSession(decision.sessionId!)}
                            className="inline-flex items-center gap-1 rounded-md bg-stone-50 px-2 py-0.5 text-[10px] text-stone-500 hover:text-stone-900 border border-stone-200"
                            title="Open original journal session"
                          >
                            <span>from entry</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-stone-400">
                        <span>
                          Logged {new Date(decision.createdAt).toLocaleDateString()}
                        </span>
                        {decision.reviewDate && (
                          <span>• Target Review: {decision.reviewDate}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditModal(decision)}
                        className="p-1.5 text-stone-400 hover:text-stone-800 transition-colors"
                        title="Edit decision"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => openReviewModal(decision)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          isReviewed
                            ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            : isPastReviewDate
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                        }`}
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>{isReviewed ? 'Update Review' : 'Review Outcome'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteDecision(decision.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                        title="Delete decision"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Options & Choice Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Options considered */}
                    <div className="space-y-1.5 bg-stone-50 p-3.5 rounded-xl border border-stone-200/60">
                      <div className="font-semibold text-stone-700 uppercase tracking-wider text-[10px]">
                        Options Considered
                      </div>
                      <ul className="space-y-1 text-stone-800">
                        {decision.options.map((opt, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-stone-400">•</span>
                            <span>{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Chosen option & confidence */}
                    <div className="space-y-2 bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-900 uppercase tracking-wider text-[10px]">
                          Choice Made
                        </span>
                        <span className="text-xs font-bold text-indigo-700">
                          {decision.confidenceScore}% Confidence
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-indigo-950">
                        {decision.choice || 'Not explicitly chosen'}
                      </div>
                      {decision.reasoning && (
                        <p className="text-xs text-indigo-900/80 line-clamp-3 leading-relaxed">
                          "{decision.reasoning}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Assumptions */}
                  {decision.assumptions && decision.assumptions.length > 0 && (
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-stone-600 text-[11px]">
                        Core Assumptions:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {decision.assumptions.map((asm, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-stone-100 px-2.5 py-1 text-[11px] text-stone-700 border border-stone-200"
                          >
                            {asm}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Outcome Card (If reviewed) */}
                  {decision.reviewOutcome && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-xs space-y-2">
                      <div className="font-semibold text-emerald-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Retrospective Review (Reviewed {new Date(decision.reviewOutcome.reviewedAt).toLocaleDateString()})
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Assumptions validated: {decision.reviewOutcome.assumptionsValidated ? 'Yes' : 'No / Diverged'}
                        </span>
                      </div>
                      {decision.reviewOutcome.actualOutcome && (
                        <p className="text-emerald-950 leading-relaxed">
                          <strong>What happened:</strong> {decision.reviewOutcome.actualOutcome}
                        </p>
                      )}
                      {decision.reviewOutcome.lessonsLearned && (
                        <p className="text-emerald-950 leading-relaxed">
                          <strong>Lessons Learned:</strong> {decision.reviewOutcome.lessonsLearned}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Decision Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-stone-200 space-y-5 animate-scale-in my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Record New Decision
                </h2>
                <p className="text-xs text-stone-500">
                  Document the choice, reasoning, and test assumptions before committing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDecision} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Decision Title / Crossroads *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Accept new job offer vs. stay at current company"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              {/* Options */}
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Options Considered
                </label>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...options];
                          updated[idx] = e.target.value;
                          setOptions(updated);
                        }}
                        placeholder={`Option ${idx + 1}...`}
                        className="flex-1 rounded-xl border border-stone-300 p-2 text-xs text-stone-900 focus:outline-hidden"
                      />
                      {options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Option</span>
                  </button>
                </div>
              </div>

              {/* Chosen option & Confidence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Chosen Direction / Final Choice
                  </label>
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    placeholder="e.g. Accept the new job offer"
                    className="w-full rounded-xl border border-stone-300 p-2 text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-stone-700">
                      Confidence Level: {confidenceScore}%
                    </label>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={confidenceScore}
                    onChange={(e) => setConfidenceScore(Number(e.target.value))}
                    className="w-full accent-stone-900 mt-2"
                  />
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Reasoning & Trade-Offs
                </label>
                <textarea
                  rows={3}
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Why are you choosing this? What pros, cons, or risks were weighed?"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              {/* Assumptions */}
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Key Assumptions (What must hold true for this to be right?)
                </label>
                <div className="space-y-2">
                  {assumptions.map((asm, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={asm}
                        onChange={(e) => {
                          const updated = [...assumptions];
                          updated[idx] = e.target.value;
                          setAssumptions(updated);
                        }}
                        placeholder="e.g. The new team culture is supportive and growth-focused..."
                        className="flex-1 rounded-xl border border-stone-300 p-2 text-xs text-stone-900 focus:outline-hidden"
                      />
                      {assumptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAssumption(idx)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddAssumption}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Assumption</span>
                  </button>
                </div>
              </div>

              {/* Review Horizon */}
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Review Horizon
                </label>
                <select
                  value={reviewMonths}
                  onChange={(e) => setReviewMonths(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 p-2 text-xs text-stone-900 focus:outline-hidden"
                >
                  <option value={1}>1 Month from now</option>
                  <option value={3}>3 Months from now (Quarterly)</option>
                  <option value={6}>6 Months from now</option>
                  <option value={12}>1 Year from now</option>
                </select>
              </div>

              {/* AI Bias Coach Banner / Stress Test */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Gemini Decision & Bias Coach
                  </span>
                  <button
                    type="button"
                    onClick={handleConsultCoach}
                    disabled={isAnalyzingCoach || !title.trim()}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 text-[11px] font-semibold disabled:opacity-50 flex items-center gap-1"
                  >
                    {isAnalyzingCoach ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Stress-testing...</span>
                      </>
                    ) : (
                      <span>Analyze Biases & Blind Spots</span>
                    )}
                  </button>
                </div>

                {coachFeedback && (
                  <div className="space-y-3 pt-2 text-xs border-t border-indigo-200/60 animate-fade-in">
                    <p className="text-indigo-950 font-normal leading-relaxed">
                      {coachFeedback.critique}
                    </p>

                    {coachFeedback.unexaminedAssumptions && coachFeedback.unexaminedAssumptions.length > 0 && (
                      <div>
                        <div className="font-semibold text-indigo-900 text-[11px]">
                          Unexamined Assumptions:
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-indigo-900">
                          {coachFeedback.unexaminedAssumptions.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {coachFeedback.keyQuestions && coachFeedback.keyQuestions.length > 0 && (
                      <div>
                        <div className="font-semibold text-indigo-900 text-[11px]">
                          Key Questions Before Deciding:
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-indigo-900">
                          {coachFeedback.keyQuestions.map((q: string, i: number) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-6 py-2 font-semibold text-white hover:bg-stone-800 shadow-xs"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Outcome Modal */}
      {isReviewModalOpen && selectedDecisionForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-stone-200 space-y-5 animate-scale-in">
            <div className="border-b border-stone-100 pb-3">
              <h2 className="font-serif text-xl font-bold text-stone-900">
                Review Decision Outcome
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                "{selectedDecisionForReview.title}" (Chosen: {selectedDecisionForReview.choice || 'N/A'})
              </p>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Did the decision work out?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkedOut('yes')}
                    className={`rounded-xl p-2.5 text-xs font-semibold border text-center transition-colors ${
                      workedOut === 'yes'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    Yes, Worked Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkedOut('partial')}
                    className={`rounded-xl p-2.5 text-xs font-semibold border text-center transition-colors ${
                      workedOut === 'partial'
                        ? 'border-amber-600 bg-amber-50 text-amber-800'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    Partial / Mixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkedOut('no')}
                    className={`rounded-xl p-2.5 text-xs font-semibold border text-center transition-colors ${
                      workedOut === 'no'
                        ? 'border-rose-600 bg-rose-50 text-rose-800'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    Did Not Work Out
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  What actually happened?
                </label>
                <textarea
                  rows={3}
                  required
                  value={actualOutcome}
                  onChange={(e) => setActualOutcome(e.target.value)}
                  placeholder="Describe the real-world outcome and impact..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-assumptions"
                  checked={assumptionsValidated}
                  onChange={(e) => setAssumptionsValidated(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900"
                />
                <label htmlFor="chk-assumptions" className="text-stone-700 font-medium">
                  Did your initial assumptions hold true in reality?
                </label>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Lessons Learned & Calibrations
                </label>
                <textarea
                  rows={2}
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  placeholder="What would you do differently next time? What surprised you?"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-6 py-2 font-semibold text-white hover:bg-stone-800 shadow-xs"
                >
                  Record Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Decision Modal */}
      {editingDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-stone-200 my-8 animate-scale-in">
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">
              Edit Decision Record
            </h3>
            {editingDecision.isAIGenerated && !editingDecision.confirmed && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
                Review and update the fields below. Saving will confirm this as your validated decision record.
              </p>
            )}
            <form onSubmit={handleSaveDecisionEdits} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Decision Title *
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
                  Options Considered (one per line)
                </label>
                <textarea
                  rows={3}
                  value={editOptions.join('\n')}
                  onChange={(e) => setEditOptions(e.target.value.split('\n'))}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Choice Made / Chosen Path
                </label>
                <input
                  type="text"
                  value={editChoice}
                  onChange={(e) => setEditChoice(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Reasoning & Mental Model
                </label>
                <textarea
                  rows={2}
                  value={editReasoning}
                  onChange={(e) => setEditReasoning(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Key Assumptions & Predictions (one per line)
                </label>
                <textarea
                  rows={2}
                  value={editAssumptions.join('\n')}
                  onChange={(e) => setEditAssumptions(e.target.value.split('\n'))}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-700">
                    Confidence Level: {editConfidenceScore}%
                  </label>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={editConfidenceScore}
                  onChange={(e) => setEditConfidenceScore(Number(e.target.value))}
                  className="w-full accent-stone-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingDecision(null)}
                  className="rounded-xl px-4 py-2 text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-6 py-2 font-semibold text-white hover:bg-stone-800 shadow-xs"
                >
                  Save & Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
