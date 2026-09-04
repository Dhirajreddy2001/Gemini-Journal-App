import { getValidIdToken } from './firebase';
import { ChatApiResponse, InsightsApiResponse } from '../types';

export async function sendChatMessage(
  sessionId: string,
  prompt: string,
  history: Array<{ role: 'user' | 'model'; content: string }>,
  sessionSummary?: string
): Promise<ChatApiResponse> {
  let token = await getValidIdToken();
  if (!token) {
    throw new Error('Authentication required: You must be signed in to converse with Gemini.');
  }

  const payload = {
    sessionId,
    prompt,
    history,
    sessionSummary,
  };

  let response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  // If 401, force token refresh and try once more
  if (response.status === 401) {
    token = await getValidIdToken(true);
    if (!token) throw new Error('Authentication session expired. Please sign in again.');
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `Server returned error (${response.status})`;
    throw new Error(errorMsg);
  }

  return {
    reply: data.reply || 'No response received from model.',
    modelUsed: data.modelUsed || 'gemini-3.6-flash',
  };
}

export async function analyzeJournalInsights(
  sessionId: string,
  messages: Array<{ role: 'user' | 'model'; content: string }>
): Promise<InsightsApiResponse> {
  let token = await getValidIdToken();
  if (!token) {
    throw new Error('Authentication required: You must be signed in to extract insights.');
  }

  const payload = {
    sessionId,
    messages,
  };

  let response = await fetch('/api/analyze-insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    token = await getValidIdToken(true);
    if (!token) throw new Error('Authentication session expired. Please sign in again.');
    response = await fetch('/api/analyze-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `Failed to generate insights (${response.status})`;
    throw new Error(errorMsg);
  }

  return {
    summary: data.summary || '',
    themes: Array.isArray(data.themes) ? data.themes : [],
    insights: Array.isArray(data.insights) ? data.insights : [],
    modelUsed: data.modelUsed,
  };
}

export async function askJournal(
  question: string,
  corpus: Array<{ id: string; title: string; date: string; content?: string; summary?: string; themes?: string[] }>
): Promise<import('../types').AskJournalApiResponse> {
  let token = await getValidIdToken();
  if (!token) {
    throw new Error('Authentication required: You must be signed in to query your journal.');
  }

  const payload = { question, corpus };
  let response = await fetch('/api/ask-journal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    token = await getValidIdToken(true);
    if (!token) throw new Error('Authentication session expired. Please sign in again.');
    response = await fetch('/api/ask-journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Failed to answer question (${response.status})`);
  }

  return {
    answer: data.answer || '',
    citedSessions: Array.isArray(data.citedSessions) ? data.citedSessions : [],
    keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [],
    modelUsed: data.modelUsed,
  };
}

export async function generateWeeklyReport(
  weekLabel: string,
  sessions: Array<{ id: string; title: string; date: string; summary?: string; themes?: string[]; content?: string }>
): Promise<import('../types').WeeklyReportApiResponse> {
  let token = await getValidIdToken();
  if (!token) {
    throw new Error('Authentication required: You must be signed in to generate a weekly report.');
  }

  const payload = { weekLabel, sessions };
  let response = await fetch('/api/weekly-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    token = await getValidIdToken(true);
    if (!token) throw new Error('Authentication session expired. Please sign in again.');
    response = await fetch('/api/weekly-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Failed to generate weekly report (${response.status})`);
  }

  return {
    executiveSummary: data.executiveSummary || '',
    topThemes: Array.isArray(data.topThemes) ? data.topThemes : [],
    unfinishedGoals: Array.isArray(data.unfinishedGoals) ? data.unfinishedGoals : [],
    decisionsSummary: Array.isArray(data.decisionsSummary) ? data.decisionsSummary : [],
    suggestedNextSteps: Array.isArray(data.suggestedNextSteps) ? data.suggestedNextSteps : [],
    reflectionPrompt: data.reflectionPrompt || '',
    modelUsed: data.modelUsed,
  };
}

export async function detectGoalsFromJournal(
  sessions: Array<{ sessionId: string; sessionTitle: string; text: string }>
): Promise<import('../types').DetectGoalsApiResponse> {
  let token = await getValidIdToken();
  if (!token) {
    throw new Error('Authentication required: You must be signed in to detect goals.');
  }

  const payload = { sessions };
  let response = await fetch('/api/detect-goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    token = await getValidIdToken(true);
    if (!token) throw new Error('Authentication session expired. Please sign in again.');
    response = await fetch('/api/detect-goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Failed to detect goals (${response.status})`);
  }

  return {
    goals: Array.isArray(data.goals) ? data.goals : [],
    modelUsed: data.modelUsed,
  };
}

export async function detectDecisionsFromJournal(
  sessions: Array<{ sessionId: string; sessionTitle: string; text: string }>
): Promise<{ decisions: any[]; modelUsed?: string }> {
  let token = await getValidIdToken();
  if (!token) {
    throw new Error('Authentication required: You must be signed in to detect decisions.');
  }

  const payload = { sessions };
  let response = await fetch('/api/detect-decisions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    token = await getValidIdToken(true);
    if (!token) throw new Error('Authentication session expired. Please sign in again.');
    response = await fetch('/api/detect-decisions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Failed to detect decisions (${response.status})`);
  }

  return {
    decisions: Array.isArray(data.decisions) ? data.decisions : [],
    modelUsed: data.modelUsed,
  };
}

export async function coachDecision(
  decision: { title: string; options: string[]; reasoning: string; assumptions: string[]; choice?: string }
): Promise<import('../types').DecisionCoachApiResponse> {
  let token = await getValidIdToken();
  if (!token) {
    throw new Error('Authentication required: You must be signed in to consult Decision Coach.');
  }

  const payload = { decision };
  let response = await fetch('/api/decision-coach', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    token = await getValidIdToken(true);
    if (!token) throw new Error('Authentication session expired. Please sign in again.');
    response = await fetch('/api/decision-coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Failed to evaluate decision (${response.status})`);
  }

  return {
    critique: data.critique || '',
    unexaminedAssumptions: Array.isArray(data.unexaminedAssumptions) ? data.unexaminedAssumptions : [],
    keyQuestions: Array.isArray(data.keyQuestions) ? data.keyQuestions : [],
    riskFactors: Array.isArray(data.riskFactors) ? data.riskFactors : [],
    modelUsed: data.modelUsed,
  };
}

