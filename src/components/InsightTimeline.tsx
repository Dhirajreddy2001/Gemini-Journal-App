import React, { useState } from 'react';
import {
  Clock,
  Target,
  Compass,
  Lightbulb,
  CheckSquare,
  Bookmark,
  Search,
  Check,
  Trash2,
  Filter,
  Sparkles,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { InsightItem, InsightCategory } from '../types';

interface InsightTimelineProps {
  insights: InsightItem[];
  onToggleComplete: (insightId: string, completed: boolean) => Promise<void>;
  onDeleteInsight: (insightId: string) => Promise<void>;
  onNavigateToSession?: (sessionId: string) => void;
}

export const InsightTimeline: React.FC<InsightTimelineProps> = ({
  insights,
  onToggleComplete,
  onDeleteInsight,
  onNavigateToSession,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInsights = insights.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q) ||
      (item.sessionTitle && item.sessionTitle.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // Calculate statistics
  const totalCount = insights.length;
  const actionItems = insights.filter((i) => i.category === 'action_item');
  const pendingActions = actionItems.filter((i) => !i.completed).length;
  const goalsCount = insights.filter((i) => i.category === 'goal').length;
  const decisionsCount = insights.filter((i) => i.category === 'decision').length;

  const getCategoryConfig = (category: InsightCategory) => {
    switch (category) {
      case 'goal':
        return {
          label: 'Goal',
          icon: Target,
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          badge: 'bg-indigo-100/70 text-indigo-800',
        };
      case 'decision':
        return {
          label: 'Decision',
          icon: Compass,
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100/70 text-emerald-800',
        };
      case 'idea':
        return {
          label: 'Idea',
          icon: Lightbulb,
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          badge: 'bg-amber-100/70 text-amber-800',
        };
      case 'action_item':
        return {
          label: 'Action Item',
          icon: CheckSquare,
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          badge: 'bg-rose-100/70 text-rose-800',
        };
      case 'theme':
      default:
        return {
          label: 'Theme',
          icon: Bookmark,
          bg: 'bg-sky-50',
          text: 'text-sky-700',
          border: 'border-sky-200',
          badge: 'bg-sky-100/70 text-sky-800',
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header & Metric Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold text-stone-900">
                Personal Insight Timeline
              </h1>
              <span className="rounded-full bg-amber-100/70 border border-amber-200/60 px-2.5 py-0.5 text-xs font-medium text-amber-950">
                {totalCount} Total
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Recurring themes, goals, decisions, and action commitments synthesized from your journal entries.
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-amber-900/10 bg-white/75 backdrop-blur-md p-4 shadow-xs">
            <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Total Insights</div>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-1">{totalCount}</div>
          </div>
          <div className="rounded-2xl border border-amber-900/10 bg-white/75 backdrop-blur-md p-4 shadow-xs">
            <div className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Pending Actions</div>
            <div className="text-2xl font-serif font-bold text-rose-900 mt-1">{pendingActions}</div>
          </div>
          <div className="rounded-2xl border border-amber-900/10 bg-white/75 backdrop-blur-md p-4 shadow-xs">
            <div className="text-[11px] font-medium text-indigo-600 uppercase tracking-wider">Goals Formulated</div>
            <div className="text-2xl font-serif font-bold text-indigo-900 mt-1">{goalsCount}</div>
          </div>
          <div className="rounded-2xl border border-amber-900/10 bg-white/75 backdrop-blur-md p-4 shadow-xs">
            <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Decisions Made</div>
            <div className="text-2xl font-serif font-bold text-emerald-900 mt-1">{decisionsCount}</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-900/10 bg-white/75 backdrop-blur-md p-3 shadow-xs">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Insights' },
              { id: 'goal', label: 'Goals' },
              { id: 'decision', label: 'Decisions' },
              { id: 'idea', label: 'Ideas' },
              { id: 'action_item', label: 'Action Items' },
              { id: 'theme', label: 'Themes' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`filter-tab-${tab.id}`}
                onClick={() => setSelectedCategory(tab.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              id="input-search-insights"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search insights..."
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Insights Chronological Feed */}
        {filteredInsights.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">
              <Sparkles className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              {insights.length === 0 ? 'No insights extracted yet' : 'No insights matching your filter'}
            </h3>
            <p className="mx-auto max-w-md text-xs text-stone-600 leading-relaxed">
              {insights.length === 0
                ? 'Converse with Gemini in the Active Journal tab and click "Analyze & Extract Insights" to populate your personal timeline.'
                : 'Try adjusting your search query or switching the category filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredInsights.map((item) => {
              const config = getCategoryConfig(item.category);
              const IconComponent = config.icon;
              const isAction = item.category === 'action_item';

              return (
                <div
                  key={item.id}
                  id={`insight-card-${item.id}`}
                  className="group relative rounded-2xl border border-amber-900/10 bg-white/80 backdrop-blur-md p-4 shadow-xs transition-all hover:border-amber-900/25 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Category Icon / Checkbox for Action Items */}
                      {isAction ? (
                        <button
                          onClick={() => onToggleComplete(item.id, !item.completed)}
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                            item.completed
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-stone-300 bg-stone-50 hover:border-stone-400 text-transparent'
                          }`}
                          title={item.completed ? 'Mark as incomplete' : 'Mark as completed'}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${config.bg} ${config.text}`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                      )}

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${config.badge}`}
                          >
                            {config.label}
                          </span>
                          <h4
                            className={`font-serif text-sm font-semibold ${
                              item.completed ? 'line-through text-stone-400' : 'text-stone-900'
                            }`}
                          >
                            {item.title}
                          </h4>
                        </div>

                        <p
                          className={`text-xs leading-relaxed ${
                            item.completed ? 'line-through text-stone-400' : 'text-stone-600'
                          }`}
                        >
                          {item.details}
                        </p>

                        {/* Attribution & Date */}
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>

                          {item.sessionTitle && (
                            <span className="flex items-center gap-1 text-stone-500">
                              <span>From:</span>
                              {onNavigateToSession ? (
                                <button
                                  onClick={() => onNavigateToSession(item.sessionId)}
                                  className="underline hover:text-stone-900 flex items-center gap-0.5"
                                >
                                  {item.sessionTitle}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </button>
                              ) : (
                                <span>{item.sessionTitle}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete action */}
                    <button
                      onClick={() => onDeleteInsight(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-600 p-1 transition-opacity"
                      title="Delete insight"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
