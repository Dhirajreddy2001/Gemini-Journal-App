export type InsightCategory = 'theme' | 'goal' | 'decision' | 'idea' | 'action_item';

export interface UserSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  summary?: string;
  themes?: string[];
  messageCount: number;
}

export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: number;
  modelUsed?: string;
}

export interface InsightItem {
  id: string;
  sessionId: string;
  sessionTitle?: string;
  category: InsightCategory;
  title: string;
  details: string;
  completed?: boolean;
  createdAt: number;
}

export type GoalStatus = 'active' | 'completed' | 'paused';

export interface GoalItem {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  category?: string;
  sessionId?: string;
  sessionTitle?: string;
  targetDate?: string;
  progressNotes?: string;
  createdAt: number;
  updatedAt: number;
}

export type NavTab =
  | 'journal'
  | 'timeline'
  | 'graph'
  | 'ask'
  | 'reports'
  | 'goals'
  | 'decisions';

export interface DecisionReview {
  workedOut: 'yes' | 'partial' | 'no';
  actualOutcome?: string;
  actualResult?: string;
  assumptionsValidated?: boolean;
  lessonsLearned?: string;
  reviewedAt: number;
}

export interface DecisionItem {
  id: string;
  title: string;
  options: string[];
  reasoning: string;
  assumptions: string[];
  choice: string;
  confidenceScore?: number;
  sessionId?: string;
  sessionTitle?: string;
  reviewDate?: string;
  reviewOutcome?: DecisionReview;
  createdAt: number;
  updatedAt: number;
}

export interface WeeklyReportItem {
  id: string;
  weekLabel: string;
  startDate: number;
  endDate: number;
  executiveSummary: string;
  topThemes: string[];
  unfinishedGoals: string[];
  decisionsSummary: string[];
  suggestedNextSteps: string[];
  reflectionPrompt: string;
  sessionCount: number;
  createdAt: number;
}

export interface MemoryTopicNode {
  id: string;
  label: string;
  category: string;
  count: number;
  sessionIds: string[];
}

export interface MemoryTopicEdge {
  source: string;
  target: string;
  weight: number;
  sharedSessionIds: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number;
  reflectionCount?: number;
}

export interface ChatApiResponse {
  reply: string;
  modelUsed: string;
  error?: string;
}

export interface InsightsApiResponse {
  summary: string;
  themes: string[];
  insights: Array<{
    category: InsightCategory;
    title: string;
    details: string;
  }>;
  modelUsed?: string;
  error?: string;
}

export interface AskJournalApiResponse {
  answer: string;
  citedSessions: Array<{
    id: string;
    title: string;
    date: string;
    relevance?: string;
  }>;
  keyTakeaways: string[];
  modelUsed?: string;
  error?: string;
}

export interface WeeklyReportApiResponse {
  executiveSummary: string;
  topThemes: string[];
  unfinishedGoals: string[];
  decisionsSummary: string[];
  suggestedNextSteps: string[];
  reflectionPrompt: string;
  modelUsed?: string;
  error?: string;
}

export interface DetectGoalsApiResponse {
  goals: Array<{
    title: string;
    description: string;
    category?: string;
    status: GoalStatus;
    sessionId?: string;
    sessionTitle?: string;
  }>;
  modelUsed?: string;
  error?: string;
}

export interface DecisionCoachApiResponse {
  critique: string;
  unexaminedAssumptions: string[];
  keyQuestions: string[];
  riskFactors: string[];
  modelUsed?: string;
  error?: string;
}

