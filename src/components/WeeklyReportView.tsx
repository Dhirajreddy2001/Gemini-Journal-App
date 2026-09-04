import React, { useState } from 'react';
import { UserSession, WeeklyReportItem } from '../types';
import { generateWeeklyReport } from '../lib/geminiApi';
import { saveWeeklyReport, deleteWeeklyReport } from '../lib/firestoreService';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  ArrowRight,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';

interface WeeklyReportViewProps {
  userId: string;
  sessions: UserSession[];
  reports: WeeklyReportItem[];
  onReportsUpdated: (updatedReports: WeeklyReportItem[]) => void;
  onStartSessionWithPrompt: (prompt: string) => void;
  onAddGoalFromStep?: (title: string) => void;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  userId,
  sessions,
  reports,
  onReportsUpdated,
  onStartSessionWithPrompt,
  onAddGoalFromStep,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    reports.length > 0 ? reports[0].id : null
  );

  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0] || null;

  // Handle generating a new weekly report
  const handleGenerateReport = async () => {
    if (sessions.length === 0) {
      setErrorMessage('You need at least one journal session to generate a weekly reflection report.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Filter sessions from past 7 days, or take the 10 most recent sessions
    const recentSessions = sessions.filter((s) => s.updatedAt >= sevenDaysAgo);
    const sessionsToAnalyze = recentSessions.length > 0 ? recentSessions : sessions.slice(0, 10);

    const weekLabel = `Week of ${new Date(sevenDaysAgo).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} - ${new Date(now).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;

    const sessionsPayload = sessionsToAnalyze.map((s) => ({
      id: s.id,
      title: s.title,
      date: new Date(s.updatedAt).toLocaleDateString(),
      summary: s.summary || '',
      themes: s.themes || [],
      content: s.summary || '',
    }));

    try {
      const apiResult = await generateWeeklyReport(weekLabel, sessionsPayload);

      const savedReport = await saveWeeklyReport(userId, {
        weekLabel,
        startDate: sevenDaysAgo,
        endDate: now,
        executiveSummary: apiResult.executiveSummary,
        topThemes: apiResult.topThemes,
        unfinishedGoals: apiResult.unfinishedGoals,
        decisionsSummary: apiResult.decisionsSummary,
        suggestedNextSteps: apiResult.suggestedNextSteps,
        reflectionPrompt: apiResult.reflectionPrompt,
        sessionCount: sessionsToAnalyze.length,
      });

      const updated = [savedReport, ...reports];
      onReportsUpdated(updated);
      setSelectedReportId(savedReport.id);
    } catch (err: any) {
      console.error('Error generating weekly report:', err);
      setErrorMessage(err?.message || 'Failed to synthesize weekly reflection report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteWeeklyReport(userId, reportId);
      const remaining = reports.filter((r) => r.id !== reportId);
      onReportsUpdated(remaining);
      if (selectedReportId === reportId) {
        setSelectedReportId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      console.error('Failed to delete report:', err);
      setErrorMessage('Failed to delete report.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-50 overflow-y-auto">
      {/* Header Banner */}
      <div className="border-b border-stone-200 bg-white px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <Calendar className="h-4 w-4" />
              </span>
              <h1 className="font-serif text-2xl font-bold text-stone-900">
                Weekly Reflection Report
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Synthesizes your weekly thoughts, top themes, unfinished goals, decisions, and guiding next steps.
            </p>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 disabled:opacity-50 transition-colors shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                <span>Synthesizing Week...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Generate Weekly Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="mx-auto max-w-6xl w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Left Column: Report History Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Saved Reports ({reports.length})
            </h3>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white p-4 text-center text-xs text-stone-500">
              No reports generated yet. Click "Generate Weekly Report" above to create your first review.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`group relative rounded-xl border p-3.5 text-left cursor-pointer transition-all ${
                    activeReport?.id === report.id
                      ? 'border-stone-900 bg-white shadow-xs ring-1 ring-stone-900/10'
                      : 'border-stone-200 bg-white/70 hover:bg-white text-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-xs text-stone-900">
                      {report.weekLabel}
                    </div>
                    <button
                      onClick={(e) => handleDeleteReport(report.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 transition-opacity"
                      title="Delete report"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {report.executiveSummary}
                  </p>
                  <div className="mt-2 text-[10px] text-stone-400">
                    Analyzed {report.sessionCount} session{report.sessionCount > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 3 Columns: Active Report Display */}
        <div className="lg:col-span-3 space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isGenerating ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3 shadow-xs">
              <Loader2 className="h-8 w-8 animate-spin text-stone-700 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Synthesizing Your Weekly Journal
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Gemini 3.6 Flash is extracting emotional trajectories, top recurring themes, pending commitments, and next steps.
              </p>
            </div>
          ) : activeReport ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              {/* Header Title */}
              <div className="border-b border-stone-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Weekly Synthesis
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-stone-900 mt-1">
                    {activeReport.weekLabel}
                  </h2>
                </div>
                <div className="text-xs text-stone-400">
                  Synthesized from {activeReport.sessionCount} journal sessions
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-stone-500" />
                  Executive Reflection
                </h3>
                <p className="text-sm text-stone-800 leading-relaxed font-normal bg-stone-50 p-4 rounded-xl border border-stone-200/70">
                  {activeReport.executiveSummary}
                </p>
              </div>

              {/* Top Themes */}
              {activeReport.topThemes && activeReport.topThemes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Top Recurring Themes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeReport.topThemes.map((theme, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-stone-100 px-3 py-1 text-xs font-medium text-stone-800 border border-stone-200"
                      >
                        #{theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 2-Column Grid: Unfinished Goals & Important Decisions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unfinished Goals */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    Unfinished Goals & Intentions
                  </h4>
                  {activeReport.unfinishedGoals && activeReport.unfinishedGoals.length > 0 ? (
                    <ul className="space-y-2 text-xs text-amber-950">
                      {activeReport.unfinishedGoals.map((goal, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-amber-700 italic">No pending goals detected this week.</p>
                  )}
                </div>

                {/* Decisions Summary */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Important Decisions Recorded
                  </h4>
                  {activeReport.decisionsSummary && activeReport.decisionsSummary.length > 0 ? (
                    <ul className="space-y-2 text-xs text-indigo-950">
                      {activeReport.decisionsSummary.map((dec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{dec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-indigo-700 italic">No crossroads or decisions marked this week.</p>
                  )}
                </div>
              </div>

              {/* Suggested Next Steps */}
              {activeReport.suggestedNextSteps && activeReport.suggestedNextSteps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Suggested Next Steps for Upcoming Week
                  </h3>
                  <div className="space-y-2">
                    {activeReport.suggestedNextSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-stone-200 bg-white p-3 text-xs flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-600">
                            {idx + 1}
                          </span>
                          <span className="text-stone-800 font-medium">{step}</span>
                        </div>
                        {onAddGoalFromStep && (
                          <button
                            onClick={() => onAddGoalFromStep(step)}
                            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 shrink-0"
                            title="Add to Goal Tracker"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Track as Goal</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reflection Prompt for Next Week */}
              {activeReport.reflectionPrompt && (
                <div className="rounded-xl border border-stone-300 bg-stone-900 p-5 text-white space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                    <HelpCircle className="h-4 w-4" />
                    <span>Reflection Prompt for Next Week</span>
                  </div>
                  <p className="font-serif text-sm font-medium leading-relaxed italic text-stone-100">
                    "{activeReport.reflectionPrompt}"
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => onStartSessionWithPrompt(activeReport.reflectionPrompt)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                    >
                      <span>Journal About This Now</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-4 shadow-xs">
              <Calendar className="h-12 w-12 text-stone-300 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                No Weekly Report Selected
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Generate a weekly reflection report to discover overarching trajectories, pending goals, and compassionate next steps.
              </p>
              <button
                onClick={handleGenerateReport}
                className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Generate First Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
