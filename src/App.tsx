/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signInWithGoogleCredential,
  signOutUser,
  formatAuthError,
} from './lib/firebase';
import {
  syncUserProfile,
  createSession,
  getSessions,
  deleteSession,
  updateSessionTitle,
  getMessages,
  saveMessage,
  updateSessionSummaryAndThemes,
  saveInsights,
  getInsights,
  toggleInsightCompletion,
  deleteInsight,
  getGoals,
  saveGoal,
  getDecisions,
  getWeeklyReports,
} from './lib/firestoreService';
import { sendChatMessage, analyzeJournalInsights } from './lib/geminiApi';
import {
  UserSession,
  JournalMessage,
  InsightItem,
  GoalItem,
  DecisionItem,
  WeeklyReportItem,
  NavTab,
} from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { SessionList } from './components/SessionList';
import { ChatInterface } from './components/ChatInterface';
import { InsightTimeline } from './components/InsightTimeline';
import { MemoryGraph } from './components/MemoryGraph';
import { AskJournal } from './components/AskJournal';
import { WeeklyReportView } from './components/WeeklyReportView';
import { GoalTracker } from './components/GoalTracker';
import { DecisionJournal } from './components/DecisionJournal';
import { SecurityModal } from './components/SecurityModal';
import { Sparkles, Loader2 } from 'lucide-react';
import bookThemeBg from './assets/images/book_theme_bg_1788497783644.jpg';

export default function App() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<{
    title: string;
    message: string;
    code?: string;
    actionType?: 'new_tab' | 'unauthorized_domain' | 'retry';
  } | null>(null);

  // App navigation state
  const [activeTab, setActiveTab] = useState<NavTab>('journal');
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Journal data state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [reports, setReports] = useState<WeeklyReportItem[]>([]);

  // Async process state
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setAuthError(null);
        try {
          await syncUserProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });
          await loadUserData(currentUser.uid);
        } catch (err: any) {
          console.error('Failed to initialize user session data:', err);
          setErrorMessage('Failed to load your journal data from Cloud Firestore.');
        }
      } else {
        // Clear sensitive state on logout
        setSessions([]);
        setActiveSessionId(null);
        setMessages([]);
        setInsights([]);
        setGoals([]);
        setDecisions([]);
        setReports([]);
        setErrorMessage(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load Sessions, Insights, Goals, Decisions, Reports for current user
  const loadUserData = async (uid: string) => {
    try {
      const [
        fetchedSessions,
        fetchedInsights,
        fetchedGoals,
        fetchedDecisions,
        fetchedReports,
      ] = await Promise.all([
        getSessions(uid),
        getInsights(uid),
        getGoals(uid),
        getDecisions(uid),
        getWeeklyReports(uid),
      ]);

      setSessions(fetchedSessions);
      setInsights(fetchedInsights);
      setGoals(fetchedGoals);
      setDecisions(fetchedDecisions);
      setReports(fetchedReports);

      if (fetchedSessions.length > 0) {
        // Default to the most recently updated session
        const firstSession = fetchedSessions[0];
        setActiveSessionId(firstSession.id);
        const fetchedMessages = await getMessages(uid, firstSession.id);
        setMessages(fetchedMessages);
      } else {
        // Auto-create initial session for convenience
        const initialSession = await createSession(uid, 'My First Reflection');
        setSessions([initialSession]);
        setActiveSessionId(initialSession.id);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Error loading user data:', err);
      setErrorMessage(err?.message || 'Error loading journal sessions.');
    }
  };

  // Sign In Handlers
  const handleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      setErrorMessage(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      setErrorMessage(formatted.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCredentialSignIn = async (credential: string) => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      setErrorMessage(null);
      await signInWithGoogleCredential(credential);
    } catch (err: any) {
      console.error('Credential sign-in error:', err);
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      setErrorMessage(formatted.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Select a Session
  const handleSelectSession = async (sessionId: string) => {
    if (!user || sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setErrorMessage(null);

    try {
      const msgs = await getMessages(user.uid, sessionId);
      setMessages(msgs);
    } catch (err: any) {
      console.error('Failed to load session messages:', err);
      setErrorMessage('Could not load messages for the selected session.');
    }
  };

  // Create a New Session
  const handleCreateSession = async (customTitle?: string) => {
    if (!user || isCreatingSession) return;
    try {
      setIsCreatingSession(true);
      setErrorMessage(null);
      const newSession = await createSession(user.uid, customTitle || 'Untitled Reflection');
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setActiveTab('journal');
    } catch (err: any) {
      console.error('Failed to create new session:', err);
      setErrorMessage('Failed to initialize a new reflection session.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Rename Session
  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!user) return;
    try {
      await updateSessionTitle(user.uid, sessionId, newTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
      );
    } catch (err: any) {
      console.error('Failed to rename session:', err);
      setErrorMessage('Failed to update session title.');
    }
  };

  // Delete Session
  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await deleteSession(user.uid, sessionId);
      const remainingSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(remainingSessions);
      setInsights((prev) => prev.filter((i) => i.sessionId !== sessionId));

      if (activeSessionId === sessionId) {
        if (remainingSessions.length > 0) {
          const next = remainingSessions[0];
          setActiveSessionId(next.id);
          const msgs = await getMessages(user.uid, next.id);
          setMessages(msgs);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      setErrorMessage('Failed to delete session from Cloud Firestore.');
    }
  };

  // Send Message in Active Session
  const handleSendMessage = async (content: string) => {
    if (!user || !activeSessionId) return;

    setErrorMessage(null);
    setLastFailedPrompt(null);
    setIsGenerating(true);

    const activeSession = sessions.find((s) => s.id === activeSessionId);

    try {
      // 1. Persist user message to Firestore first (guaranteed transaction verification)
      const savedUserMsg = await saveMessage(user.uid, activeSessionId, {
        role: 'user',
        content,
      });

      // Update UI with user message immediately
      setMessages((prev) => [...prev, savedUserMsg]);

      // Update session's updatedAt and message count in local state
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messageCount: s.messageCount + 1, updatedAt: Date.now() }
            : s
        )
      );

      // 2. Call backend Gemini endpoint (passes ID Token via Authorization header)
      const chatHistory = messages.map((m) => ({ role: m.role, content: m.content }));
      const apiResponse = await sendChatMessage(
        activeSessionId,
        content,
        chatHistory,
        activeSession?.summary
      );

      // 3. Persist Gemini model response to Firestore
      const savedModelMsg = await saveMessage(user.uid, activeSessionId, {
        role: 'model',
        content: apiResponse.reply,
        modelUsed: apiResponse.modelUsed,
      });

      setMessages((prev) => [...prev, savedModelMsg]);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messageCount: s.messageCount + 1, updatedAt: Date.now() }
            : s
        )
      );
    } catch (err: any) {
      console.error('Error in reflection conversation:', err);
      setLastFailedPrompt(content);
      setErrorMessage(err?.message || 'Failed to exchange reflection with Gemini AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Retry Last Failed Message
  const handleRetryLastMessage = () => {
    if (lastFailedPrompt) {
      handleSendMessage(lastFailedPrompt);
    }
  };

  // Generate Insights and Executive Summary
  const handleGenerateInsights = async () => {
    if (!user || !activeSessionId || messages.length === 0) return;

    const activeSession = sessions.find((s) => s.id === activeSessionId);
    if (!activeSession) return;

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);

      const response = await analyzeJournalInsights(
        activeSessionId,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      // 1. Update session summary and themes in Firestore
      await updateSessionSummaryAndThemes(
        user.uid,
        activeSessionId,
        response.summary,
        response.themes
      );

      // Update local session
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, summary: response.summary, themes: response.themes, updatedAt: Date.now() }
            : s
        )
      );

      // 2. Persist extracted structured insights to Firestore
      if (response.insights && response.insights.length > 0) {
        const savedInsights = await saveInsights(
          user.uid,
          activeSessionId,
          activeSession.title,
          response.insights
        );
        setInsights((prev) => [...savedInsights, ...prev]);
      }
    } catch (err: any) {
      console.error('Failed to generate insights:', err);
      setErrorMessage(err?.message || 'Failed to extract insights and summary.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle Action Item Completion
  const handleToggleInsightComplete = async (insightId: string, completed: boolean) => {
    if (!user) return;
    try {
      await toggleInsightCompletion(user.uid, insightId, completed);
      setInsights((prev) =>
        prev.map((item) => (item.id === insightId ? { ...item, completed } : item))
      );
    } catch (err: any) {
      console.error('Failed to toggle insight completion:', err);
      setErrorMessage('Could not update action item state.');
    }
  };

  // Delete Insight
  const handleDeleteInsight = async (insightId: string) => {
    if (!user) return;
    try {
      await deleteInsight(user.uid, insightId);
      setInsights((prev) => prev.filter((item) => item.id !== insightId));
    } catch (err: any) {
      console.error('Failed to delete insight:', err);
      setErrorMessage('Could not delete insight.');
    }
  };

  // Navigate directly to a session from timeline or graph or ask
  const handleNavigateToSession = (sessionId: string) => {
    setActiveTab('journal');
    handleSelectSession(sessionId);
  };

  // Start new journal session from Weekly prompt
  const handleStartSessionWithPrompt = async (promptText: string) => {
    if (!user) return;
    try {
      setIsCreatingSession(true);
      const newSession = await createSession(user.uid, 'Weekly Reflection Response');
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setActiveTab('journal');
      // Send prompt automatically
      setTimeout(() => {
        handleSendMessage(`Reflection Prompt: ${promptText}`);
      }, 300);
    } catch (err: any) {
      console.error('Failed to start session with prompt:', err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Add Goal from weekly step
  const handleAddGoalFromStep = async (stepTitle: string) => {
    if (!user) return;
    try {
      const newGoal = await saveGoal(user.uid, {
        title: stepTitle,
        description: 'Generated from weekly reflection next steps.',
        category: 'personal',
        status: 'active',
      });
      setGoals((prev) => [newGoal, ...prev]);
      setActiveTab('goals');
    } catch (err: any) {
      console.error('Failed to add goal from step:', err);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  return (
    <div className="relative min-h-screen bg-[#faf7f2] text-stone-900 font-sans flex flex-col selection:bg-amber-200 selection:text-stone-900 overflow-x-hidden">
      {/* Book & Library Theme Ambient Background with Soft Glassy Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Soft, desaturated book backdrop image */}
        <img
          src={bookThemeBg}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-25 mix-blend-multiply filter contrast-95 brightness-105"
        />
        {/* Warm parchment & ambient lamp light gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/55 via-stone-50/70 to-[#faf7f2]/90 backdrop-blur-[2px]" />
        {/* Subtle archival paper micro-texture pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#b45309_0.6px,transparent_1px)] [background-size:28px_28px] opacity-[0.07]" />
      </div>

      {/* Foreground Content with Translucent Glass Layering */}
      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        {/* Top Navigation */}
        <Navbar
          user={user}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isAuthenticating={isAuthenticating}
        />

        {/* Main View Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
        {authLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 p-12">
            <Loader2 className="h-8 w-8 animate-spin text-stone-700" />
            <p className="text-xs font-medium text-stone-500">
              Initializing verified security context...
            </p>
          </div>
        ) : !user ? (
          /* Public Landing Page */
          <LandingPage
            onSignIn={handleSignIn}
            onCredentialSignIn={handleCredentialSignIn}
            isAuthenticating={isAuthenticating}
            onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
            authError={authError}
            onClearError={() => setAuthError(null)}
          />
        ) : activeTab === 'timeline' ? (
          /* 1. Personal Insight Timeline */
          <InsightTimeline
            insights={insights}
            onToggleComplete={handleToggleInsightComplete}
            onDeleteInsight={handleDeleteInsight}
            onNavigateToSession={handleNavigateToSession}
          />
        ) : activeTab === 'graph' ? (
          /* 2. Private Memory Graph */
          <MemoryGraph
            sessions={sessions}
            onNavigateToSession={handleNavigateToSession}
          />
        ) : activeTab === 'ask' ? (
          /* 3. Ask My Journal */
          <AskJournal
            sessions={sessions}
            onNavigateToSession={handleNavigateToSession}
          />
        ) : activeTab === 'reports' ? (
          /* 4. Weekly Reflection Report */
          <WeeklyReportView
            userId={user.uid}
            sessions={sessions}
            reports={reports}
            onReportsUpdated={setReports}
            onStartSessionWithPrompt={handleStartSessionWithPrompt}
            onAddGoalFromStep={handleAddGoalFromStep}
          />
        ) : activeTab === 'goals' ? (
          /* 5. Goal Tracker from Journal Entries */
          <GoalTracker
            userId={user.uid}
            goals={goals}
            sessions={sessions}
            onGoalsUpdated={setGoals}
            onNavigateToSession={handleNavigateToSession}
          />
        ) : activeTab === 'decisions' ? (
          /* 6. Decision Journal & Bias Coach */
          <DecisionJournal
            userId={user.uid}
            decisions={decisions}
            sessions={sessions}
            onDecisionsUpdated={setDecisions}
            onNavigateToSession={handleNavigateToSession}
          />
        ) : (
          /* Active Journal View */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Sessions Sidebar */}
            <SessionList
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onCreateSession={() => handleCreateSession()}
              onDeleteSession={handleDeleteSession}
              onRenameSession={handleRenameSession}
              isCreating={isCreatingSession}
            />

            {/* Right Chat & Reflection Interface */}
            {activeSession ? (
              <ChatInterface
                session={activeSession}
                messages={messages}
                onSendMessage={handleSendMessage}
                onGenerateInsights={handleGenerateInsights}
                isGenerating={isGenerating}
                isAnalyzing={isAnalyzing}
                errorMessage={errorMessage}
                onClearError={() => setErrorMessage(null)}
                onRetryLastMessage={lastFailedPrompt ? handleRetryLastMessage : undefined}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-stone-50/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-600 shadow-xs">
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900">
                    No Active Journal Session
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mt-1">
                    Select a previous reflection from the sidebar or start a new entry to converse with Gemini.
                  </p>
                </div>
                <button
                  onClick={() => handleCreateSession()}
                  disabled={isCreatingSession}
                  className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800"
                >
                  Create New Reflection
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Security Architecture & Threat Model Modal */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
      </div>
    </div>
  );
}
