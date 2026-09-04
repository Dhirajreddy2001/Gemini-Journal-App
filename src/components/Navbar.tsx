import React from 'react';
import {
  ShieldCheck,
  BookOpen,
  Clock,
  Network,
  Search,
  Calendar,
  Target,
  Scale,
  LogOut,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { NavTab } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSecurityModal: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  isAuthenticating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenSecurityModal,
  onSignIn,
  onSignOut,
  isAuthenticating,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ElementType }> = [
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'graph', label: 'Memory Graph', icon: Network },
    { id: 'ask', label: 'Ask Journal', icon: Search },
    { id: 'reports', label: 'Weekly Reports', icon: Calendar },
    { id: 'goals', label: 'Goal Tracker', icon: Target },
    { id: 'decisions', label: 'Decisions', icon: Scale },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-amber-900/10 bg-white/75 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-stone-100 shadow-xs border border-amber-900/30">
            <BookOpen className="h-4.5 w-4.5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-base sm:text-lg font-semibold tracking-tight text-stone-900 whitespace-nowrap">
                Personal Gemini Journal
              </span>
              <span className="hidden xl:inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
                Isolated
              </span>
            </div>
            <p className="hidden 2xl:block text-[11px] text-stone-500">
              Private reflection with Gemini 3.6 Flash & Cloud Firestore
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Desktop & Tablet) */}
        {user && (
          <nav className="hidden lg:flex items-center rounded-xl bg-stone-100/70 backdrop-blur-xs p-1 border border-amber-900/10 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white/95 text-stone-900 shadow-xs font-semibold border border-amber-900/10'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-700' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Security Architecture Explainer Button */}
          <button
            id="btn-security-architecture"
            onClick={onOpenSecurityModal}
            className="flex items-center gap-1.5 rounded-lg border border-amber-900/15 bg-white/60 backdrop-blur-xs px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-white/90 hover:text-stone-900 transition-colors shadow-2xs"
            title="View Security & Threat Model Mitigations"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Security</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-8 w-8 rounded-full ring-1 ring-stone-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-stone-700 text-xs font-medium">
                    {user.email ? user.email.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
                  </div>
                )}
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-medium text-stone-900 truncate max-w-[110px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </div>
                </div>
              </div>

              <button
                id="btn-sign-out"
                onClick={onSignOut}
                className="flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1.5 text-xs font-medium text-stone-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                title="Sign out of your session"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              id="btn-sign-in-nav"
              onClick={onSignIn}
              disabled={isAuthenticating}
              className="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>{isAuthenticating ? 'Connecting...' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Horizontal Scroll Navigation (for mobile and tablet) */}
      {user && (
        <div className="flex lg:hidden border-t border-amber-900/10 bg-white/60 backdrop-blur-md px-3 py-1.5 overflow-x-auto gap-1.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 py-1 px-2.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-white/95 text-stone-900 shadow-xs border border-amber-900/15 font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-700' : 'text-stone-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
