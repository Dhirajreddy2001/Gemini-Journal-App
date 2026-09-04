import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserSession, JournalMessage, InsightItem, InsightCategory, UserProfile } from '../types';

/**
 * Strict Zero-Crash Payload Hygiene:
 * Strips all undefined properties before sending to Firestore
 */
function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanPayload(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

// ----------------------------------------------------------------------
// User Profile Sync
// ----------------------------------------------------------------------
export async function syncUserProfile(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }): Promise<void> {
  if (!user?.uid) return;
  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);

  const now = Date.now();
  if (!existing.exists()) {
    const payload = cleanPayload({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: now,
      preferences: {
        theme: 'light',
        reflectionFrequency: 'daily',
      },
    });
    await setDoc(userRef, payload);
  }
}

// ----------------------------------------------------------------------
// Sessions Management
// ----------------------------------------------------------------------
export async function createSession(uid: string, initialTitle?: string): Promise<UserSession> {
  if (!uid) throw new Error('User ID is required to create a journal session.');
  
  const sessionsCol = collection(db, 'users', uid, 'sessions');
  const sessionDocRef = doc(sessionsCol);
  const now = Date.now();
  const title = initialTitle?.trim() || `Journal ${new Date(now).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

  const newSession: UserSession = {
    id: sessionDocRef.id,
    title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    themes: [],
  };

  await setDoc(sessionDocRef, cleanPayload(newSession));
  return newSession;
}

export async function getSessions(uid: string): Promise<UserSession[]> {
  if (!uid) return [];
  const sessionsCol = collection(db, 'users', uid, 'sessions');
  const q = query(sessionsCol, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  const sessions: UserSession[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    sessions.push({
      id: docSnap.id,
      title: data.title || 'Untitled Session',
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
      updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
      summary: data.summary,
      themes: Array.isArray(data.themes) ? data.themes : [],
      messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
    });
  });

  return sessions;
}

export async function updateSessionTitle(uid: string, sessionId: string, newTitle: string): Promise<void> {
  if (!uid || !sessionId) return;
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  await updateDoc(sessionRef, cleanPayload({
    title: newTitle.trim() || 'Untitled Session',
    updatedAt: Date.now(),
  }));
}

export async function deleteSession(uid: string, sessionId: string): Promise<{
  deletedInsightCount: number;
  deletedGoalCount: number;
  deletedDecisionCount: number;
}> {
  if (!uid || !sessionId) throw new Error('UID and Session ID are required to delete a session.');
  
  // 1. Delete all nested messages
  const messagesCol = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
  const messagesSnap = await getDocs(messagesCol);
  const deletePromises: Promise<void>[] = [];
  messagesSnap.forEach((msgDoc) => {
    deletePromises.push(deleteDoc(msgDoc.ref));
  });
  await Promise.all(deletePromises);

  // 2. Delete linked insights (derived consistency)
  const insightsCol = collection(db, 'users', uid, 'insights');
  const insightsQ = query(insightsCol, where('sessionId', '==', sessionId));
  const insightsSnap = await getDocs(insightsQ);
  const insightDeletePromises: Promise<void>[] = [];
  insightsSnap.forEach((insDoc) => {
    insightDeletePromises.push(deleteDoc(insDoc.ref));
  });
  await Promise.all(insightDeletePromises);

  // 3. Delete linked goals (derived consistency)
  const goalsCol = collection(db, 'users', uid, 'goals');
  const goalsQ = query(goalsCol, where('sessionId', '==', sessionId));
  const goalsSnap = await getDocs(goalsQ);
  const goalDeletePromises: Promise<void>[] = [];
  goalsSnap.forEach((gDoc) => {
    goalDeletePromises.push(deleteDoc(gDoc.ref));
  });
  await Promise.all(goalDeletePromises);

  // 4. Delete linked decisions (derived consistency)
  const decisionsCol = collection(db, 'users', uid, 'decisions');
  const decisionsQ = query(decisionsCol, where('sessionId', '==', sessionId));
  const decisionsSnap = await getDocs(decisionsQ);
  const decisionDeletePromises: Promise<void>[] = [];
  decisionsSnap.forEach((dDoc) => {
    decisionDeletePromises.push(deleteDoc(dDoc.ref));
  });
  await Promise.all(decisionDeletePromises);

  // 5. Delete the session document itself
  const sessionDocRef = doc(db, 'users', uid, 'sessions', sessionId);
  await deleteDoc(sessionDocRef);

  return {
    deletedInsightCount: insightsSnap.size,
    deletedGoalCount: goalsSnap.size,
    deletedDecisionCount: decisionsSnap.size,
  };
}

// ----------------------------------------------------------------------
// Messages Management
// ----------------------------------------------------------------------
export async function getMessages(uid: string, sessionId: string): Promise<JournalMessage[]> {
  if (!uid || !sessionId) return [];
  const messagesCol = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);

  const messages: JournalMessage[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    messages.push({
      id: docSnap.id,
      role: data.role === 'model' ? 'model' : 'user',
      content: data.content || '',
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
      modelUsed: data.modelUsed,
    });
  });

  return messages;
}

export async function saveMessage(
  uid: string,
  sessionId: string,
  msg: { role: 'user' | 'model'; content: string; modelUsed?: string }
): Promise<JournalMessage> {
  if (!uid || !sessionId) throw new Error('UID and Session ID are required to save a message.');

  const messagesCol = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
  const messageDocRef = doc(messagesCol);
  const now = Date.now();

  const fullMessage: JournalMessage = {
    id: messageDocRef.id,
    role: msg.role,
    content: msg.content,
    createdAt: now,
    modelUsed: msg.modelUsed,
  };

  // Write message document
  await setDoc(messageDocRef, cleanPayload(fullMessage));

  // Update session updatedAt and messageCount
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  if (sessionSnap.exists()) {
    const currentCount = sessionSnap.data()?.messageCount || 0;
    await updateDoc(sessionRef, cleanPayload({
      updatedAt: now,
      messageCount: currentCount + 1,
    }));
  }

  return fullMessage;
}

export async function updateSessionSummaryAndThemes(
  uid: string,
  sessionId: string,
  summary: string,
  themes: string[]
): Promise<void> {
  if (!uid || !sessionId) return;
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  await updateDoc(sessionRef, cleanPayload({
    summary,
    themes,
    updatedAt: Date.now(),
  }));
}

// ----------------------------------------------------------------------
// Personal Insight Timeline Management
// ----------------------------------------------------------------------
export async function saveInsights(
  uid: string,
  sessionId: string,
  sessionTitle: string,
  insights: Array<{ category: InsightCategory; title: string; details: string }>
): Promise<InsightItem[]> {
  if (!uid || !sessionId || !Array.isArray(insights)) return [];

  const insightsCol = collection(db, 'users', uid, 'insights');
  const now = Date.now();
  const createdItems: InsightItem[] = [];

  for (const item of insights) {
    const itemRef = doc(insightsCol);
    const insightItem: InsightItem = {
      id: itemRef.id,
      sessionId,
      sessionTitle,
      category: item.category,
      title: item.title,
      details: item.details,
      completed: item.category === 'action_item' ? false : undefined,
      createdAt: now,
    };
    await setDoc(itemRef, cleanPayload(insightItem));
    createdItems.push(insightItem);
  }

  return createdItems;
}

export async function getInsights(uid: string): Promise<InsightItem[]> {
  if (!uid) return [];
  const insightsCol = collection(db, 'users', uid, 'insights');
  const q = query(insightsCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  const items: InsightItem[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    items.push({
      id: docSnap.id,
      sessionId: data.sessionId,
      sessionTitle: data.sessionTitle,
      category: data.category as InsightCategory,
      title: data.title || '',
      details: data.details || '',
      completed: data.completed,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    });
  });

  return items;
}

export async function toggleInsightCompletion(uid: string, insightId: string, completed: boolean): Promise<void> {
  if (!uid || !insightId) return;
  const insightRef = doc(db, 'users', uid, 'insights', insightId);
  await updateDoc(insightRef, cleanPayload({ completed }));
}

export async function deleteInsight(uid: string, insightId: string): Promise<void> {
  if (!uid || !insightId) return;
  const insightRef = doc(db, 'users', uid, 'insights', insightId);
  await deleteDoc(insightRef);
}

// ----------------------------------------------------------------------
// Goal Tracker Management
// ----------------------------------------------------------------------
export async function saveGoal(
  uid: string,
  goal: Omit<import('../types').GoalItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<import('../types').GoalItem> {
  if (!uid) throw new Error('User ID is required to save a goal.');
  const goalsCol = collection(db, 'users', uid, 'goals');
  const goalRef = doc(goalsCol);
  const now = Date.now();

  const fullGoal: import('../types').GoalItem = {
    id: goalRef.id,
    title: goal.title,
    description: goal.description || '',
    status: goal.status || 'active',
    category: goal.category || 'personal',
    sessionId: goal.sessionId,
    sessionTitle: goal.sessionTitle,
    targetDate: goal.targetDate,
    progressNotes: goal.progressNotes || '',
    isAIGenerated: Boolean(goal.isAIGenerated),
    confirmed: goal.confirmed !== undefined ? goal.confirmed : !goal.isAIGenerated,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(goalRef, cleanPayload(fullGoal));
  return fullGoal;
}

export async function getGoals(uid: string): Promise<import('../types').GoalItem[]> {
  if (!uid) return [];
  const goalsCol = collection(db, 'users', uid, 'goals');
  const q = query(goalsCol, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  const goals: import('../types').GoalItem[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    goals.push({
      id: docSnap.id,
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'active',
      category: data.category || 'personal',
      sessionId: data.sessionId,
      sessionTitle: data.sessionTitle,
      targetDate: data.targetDate,
      progressNotes: data.progressNotes || '',
      isAIGenerated: Boolean(data.isAIGenerated),
      confirmed: data.confirmed !== undefined ? Boolean(data.confirmed) : !data.isAIGenerated,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
      updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
    });
  });

  return goals;
}

export async function updateGoalStatus(
  uid: string,
  goalId: string,
  status: import('../types').GoalStatus
): Promise<void> {
  if (!uid || !goalId) return;
  const goalRef = doc(db, 'users', uid, 'goals', goalId);
  const confirmed = status !== 'suggested';
  await updateDoc(goalRef, cleanPayload({ status, confirmed, updatedAt: Date.now() }));
}

export async function updateGoal(
  uid: string,
  goalId: string,
  updates: Partial<import('../types').GoalItem>
): Promise<void> {
  if (!uid || !goalId) return;
  const goalRef = doc(db, 'users', uid, 'goals', goalId);
  await updateDoc(goalRef, cleanPayload({ ...updates, updatedAt: Date.now() }));
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  if (!uid || !goalId) return;
  const goalRef = doc(db, 'users', uid, 'goals', goalId);
  await deleteDoc(goalRef);
}

export async function batchSaveGoals(
  uid: string,
  newGoals: Array<{
    title: string;
    description: string;
    category?: string;
    status: import('../types').GoalStatus;
    sessionId?: string;
    sessionTitle?: string;
    isAIGenerated?: boolean;
    confirmed?: boolean;
  }>
): Promise<import('../types').GoalItem[]> {
  if (!uid || !Array.isArray(newGoals) || newGoals.length === 0) return [];
  const saved: import('../types').GoalItem[] = [];

  for (const g of newGoals) {
    const item = await saveGoal(uid, {
      title: g.title,
      description: g.description,
      category: g.category,
      status: g.status,
      sessionId: g.sessionId,
      sessionTitle: g.sessionTitle,
      isAIGenerated: g.isAIGenerated,
      confirmed: g.confirmed,
    });
    saved.push(item);
  }

  return saved;
}

// ----------------------------------------------------------------------
// Decision Journal Management
// ----------------------------------------------------------------------
export async function saveDecision(
  uid: string,
  decision: Omit<import('../types').DecisionItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<import('../types').DecisionItem> {
  if (!uid) throw new Error('User ID is required to save a decision.');
  const decisionsCol = collection(db, 'users', uid, 'decisions');
  const decisionRef = doc(decisionsCol);
  const now = Date.now();

  const fullDecision: import('../types').DecisionItem = {
    id: decisionRef.id,
    title: decision.title,
    options: Array.isArray(decision.options) ? decision.options : [],
    reasoning: decision.reasoning || '',
    assumptions: Array.isArray(decision.assumptions) ? decision.assumptions : [],
    choice: decision.choice || '',
    confidenceScore: typeof decision.confidenceScore === 'number' ? decision.confidenceScore : 80,
    sessionId: decision.sessionId,
    sessionTitle: decision.sessionTitle,
    reviewDate: decision.reviewDate,
    reviewOutcome: decision.reviewOutcome,
    isAIGenerated: Boolean(decision.isAIGenerated),
    confirmed: decision.confirmed !== undefined ? decision.confirmed : !decision.isAIGenerated,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(decisionRef, cleanPayload(fullDecision));
  return fullDecision;
}

export async function getDecisions(uid: string): Promise<import('../types').DecisionItem[]> {
  if (!uid) return [];
  const decisionsCol = collection(db, 'users', uid, 'decisions');
  const q = query(decisionsCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  const decisions: import('../types').DecisionItem[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    decisions.push({
      id: docSnap.id,
      title: data.title || '',
      options: Array.isArray(data.options) ? data.options : [],
      reasoning: data.reasoning || '',
      assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
      choice: data.choice || '',
      confidenceScore: typeof data.confidenceScore === 'number' ? data.confidenceScore : 80,
      sessionId: data.sessionId,
      sessionTitle: data.sessionTitle,
      reviewDate: data.reviewDate,
      reviewOutcome: data.reviewOutcome,
      isAIGenerated: Boolean(data.isAIGenerated),
      confirmed: data.confirmed !== undefined ? Boolean(data.confirmed) : !data.isAIGenerated,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
      updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
    });
  });

  return decisions;
}

export async function batchSaveDecisions(
  uid: string,
  newDecisions: Array<{
    title: string;
    options: string[];
    reasoning: string;
    assumptions: string[];
    choice: string;
    confidenceScore?: number;
    sessionId?: string;
    sessionTitle?: string;
    isAIGenerated?: boolean;
    confirmed?: boolean;
  }>
): Promise<import('../types').DecisionItem[]> {
  if (!uid || !Array.isArray(newDecisions) || newDecisions.length === 0) return [];
  const saved: import('../types').DecisionItem[] = [];

  for (const d of newDecisions) {
    const item = await saveDecision(uid, {
      title: d.title,
      options: d.options,
      reasoning: d.reasoning,
      assumptions: d.assumptions,
      choice: d.choice,
      confidenceScore: d.confidenceScore,
      sessionId: d.sessionId,
      sessionTitle: d.sessionTitle,
      isAIGenerated: d.isAIGenerated ?? true,
      confirmed: d.confirmed ?? false,
    });
    saved.push(item);
  }

  return saved;
}

export async function updateDecision(
  uid: string,
  decisionId: string,
  updates: Partial<import('../types').DecisionItem>
): Promise<void> {
  if (!uid || !decisionId) return;
  const decisionRef = doc(db, 'users', uid, 'decisions', decisionId);
  await updateDoc(decisionRef, cleanPayload({ ...updates, updatedAt: Date.now() }));
}

export async function recordDecisionReview(
  uid: string,
  decisionId: string,
  reviewOutcome: import('../types').DecisionReview
): Promise<void> {
  if (!uid || !decisionId) return;
  const decisionRef = doc(db, 'users', uid, 'decisions', decisionId);
  await updateDoc(decisionRef, cleanPayload({
    reviewOutcome,
    updatedAt: Date.now(),
  }));
}

export async function deleteDecision(uid: string, decisionId: string): Promise<void> {
  if (!uid || !decisionId) return;
  const decisionRef = doc(db, 'users', uid, 'decisions', decisionId);
  await deleteDoc(decisionRef);
}

// ----------------------------------------------------------------------
// Weekly Reflection Reports Management
// ----------------------------------------------------------------------
export async function saveWeeklyReport(
  uid: string,
  report: Omit<import('../types').WeeklyReportItem, 'id' | 'createdAt'>
): Promise<import('../types').WeeklyReportItem> {
  if (!uid) throw new Error('User ID is required to save a weekly report.');
  const reportsCol = collection(db, 'users', uid, 'reports');
  const reportRef = doc(reportsCol);
  const now = Date.now();

  const fullReport: import('../types').WeeklyReportItem = {
    id: reportRef.id,
    weekLabel: report.weekLabel,
    startDate: report.startDate,
    endDate: report.endDate,
    executiveSummary: report.executiveSummary,
    topThemes: Array.isArray(report.topThemes) ? report.topThemes : [],
    unfinishedGoals: Array.isArray(report.unfinishedGoals) ? report.unfinishedGoals : [],
    decisionsSummary: Array.isArray(report.decisionsSummary) ? report.decisionsSummary : [],
    suggestedNextSteps: Array.isArray(report.suggestedNextSteps) ? report.suggestedNextSteps : [],
    reflectionPrompt: report.reflectionPrompt,
    sessionCount: report.sessionCount || 0,
    createdAt: now,
  };

  await setDoc(reportRef, cleanPayload(fullReport));
  return fullReport;
}

export async function getWeeklyReports(uid: string): Promise<import('../types').WeeklyReportItem[]> {
  if (!uid) return [];
  const reportsCol = collection(db, 'users', uid, 'reports');
  const q = query(reportsCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  const reports: import('../types').WeeklyReportItem[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    reports.push({
      id: docSnap.id,
      weekLabel: data.weekLabel || 'Weekly Report',
      startDate: typeof data.startDate === 'number' ? data.startDate : Date.now() - 7 * 86400000,
      endDate: typeof data.endDate === 'number' ? data.endDate : Date.now(),
      executiveSummary: data.executiveSummary || '',
      topThemes: Array.isArray(data.topThemes) ? data.topThemes : [],
      unfinishedGoals: Array.isArray(data.unfinishedGoals) ? data.unfinishedGoals : [],
      decisionsSummary: Array.isArray(data.decisionsSummary) ? data.decisionsSummary : [],
      suggestedNextSteps: Array.isArray(data.suggestedNextSteps) ? data.suggestedNextSteps : [],
      reflectionPrompt: data.reflectionPrompt || '',
      sessionCount: typeof data.sessionCount === 'number' ? data.sessionCount : 0,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    });
  });

  return reports;
}

export async function deleteWeeklyReport(uid: string, reportId: string): Promise<void> {
  if (!uid || !reportId) return;
  const reportRef = doc(db, 'users', uid, 'reports', reportId);
  await deleteDoc(reportRef);
}

