import React, { useState } from 'react';
import { DecisionItem, DecisionReview, UserSession } from '../types';
import { coachDecision } from '../lib/geminiApi';
import {
  saveDecision,
  updateDecision,
  recordDecisionReview,
  deleteDecision,
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedDecisionForReview, setSelectedDecisionForReview] = useState<DecisionItem | null>(null);
  const [isAnalyzingCoach, setIsAnalyzingCoach] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Record New Decision</span>
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

        {decisions.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-4 shadow-xs">
            <Scale className="h-12 w-12 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No Decisions Logged Yet
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Making a career shift, investment, or personal crossroad? Document your options, assumptions, and confidence score to calibrate judgment over time.
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
            >
              Log First Decision
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map((decision) => {
              const isReviewed = Boolean(decision.reviewOutcome);
              const isPastReviewDate =
                decision.reviewDate && new Date(decision.reviewDate).getTime() <= Date.now();

              return (
                <div
                  key={decision.id}
                  className="rounded-2xl border border-amber-900/10 bg-white/80 backdrop-blur-md p-6 shadow-sm space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-stone-900">
                          {decision.title}
                        </h3>
                        {isReviewed ? (
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
                            Pending Review
                          </span>
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

                    <div className="flex items-center gap-2">
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
    </div>
  );
};
