import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Database,
  ArrowRight,
  BrainCircuit,
  ExternalLink,
  AlertTriangle,
  Copy,
  Check,
  X,
  Info,
  Bookmark,
} from 'lucide-react';
import { firebaseConfig } from '../lib/firebase';

interface LandingPageProps {
  onSignIn: () => void;
  onCredentialSignIn: (credential: string) => void;
  isAuthenticating: boolean;
  onOpenSecurityModal?: () => void;
  authError: {
    title: string;
    message: string;
    code?: string;
    actionType?: 'new_tab' | 'unauthorized_domain' | 'retry';
  } | null;
  onClearError: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onCredentialSignIn,
  isAuthenticating,
  onOpenSecurityModal,
  authError,
  onClearError,
}) => {
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(typeof window !== 'undefined' && window.self !== window.top);
  }, []);

  // Initialize Google Identity Services (GSI)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer: NodeJS.Timeout;
    const initGsi = () => {
      const google = (window as any).google;
      if (google?.accounts?.id && firebaseConfig.oAuthClientId) {
        try {
          google.accounts.id.initialize({
            client_id: firebaseConfig.oAuthClientId,
            callback: (response: any) => {
              if (response?.credential) {
                onCredentialSignIn(response.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const btnEl = document.getElementById('gsi-official-button');
          if (btnEl) {
            btnEl.innerHTML = '';
            google.accounts.id.renderButton(btnEl, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 260,
            });
          }
        } catch (err) {
          console.warn('Google Identity Services init note:', err);
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGsi();
    } else {
      timer = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          initGsi();
          clearInterval(timer);
        }
      }, 300);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [onCredentialSignIn]);

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  const handleCopyDomain = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Iframe Notice Banner */}
        {isInIframe && (
          <div className="mb-6 rounded-2xl border border-amber-300/70 bg-amber-50/80 backdrop-blur-md p-4 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Info className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                <strong>Preview iFrame Active:</strong> Some browser security settings block Google OAuth popups inside embedded frames. If sign-in is blocked, launch in a separate tab.
              </span>
            </div>
            <button
              onClick={handleOpenInNewTab}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 text-amber-100 px-3 py-1.5 text-xs font-semibold hover:bg-stone-800 transition-colors shrink-0 shadow-2xs"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open in New Tab</span>
            </button>
          </div>
        )}

        {/* Hero Section styled as a Frosted Glass Journal Folio / Bookplate */}
        <div className="relative rounded-3xl border border-amber-900/15 bg-white/75 backdrop-blur-md p-8 sm:p-12 shadow-sm text-center space-y-6 overflow-hidden">
          {/* Subtle Decorative Bookmark Ribbon */}
          <div className="absolute -top-1 right-8 w-6 h-10 bg-amber-700/85 rounded-b-sm shadow-xs flex items-end justify-center pb-1 pointer-events-none">
            <Bookmark className="h-3 w-3 text-amber-100" />
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-stone-900 max-w-3xl mx-auto leading-tight">
            Your private space for thoughtful reflection and growth.
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-stone-600 leading-relaxed">
            Converse with an empathetic AI reflection companion powered by{' '}
            <span className="font-medium text-stone-900">Gemini 3.6 Flash</span>. Every session is
            strictly isolated to your verified identity in Cloud Firestore, with automated insights
            tracking your personal evolution.
          </p>

          <p className="italic text-xs text-stone-500 font-serif max-w-lg mx-auto">
            "A journal is the quiet sanctuary where thoughts find clarity and moments become wisdom."
          </p>

          {/* Authentication Error & Resolution Alert Card */}
          {authError && (
            <div
              id="auth-error-banner"
              className="mx-auto max-w-xl text-left rounded-2xl border border-rose-200 bg-rose-50/90 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-all animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-rose-950">{authError.title}</h4>
                    <p className="text-xs text-rose-800 leading-relaxed">{authError.message}</p>
                    {authError.code && (
                      <span className="inline-block font-mono text-[10px] text-rose-600 bg-rose-100/70 px-1.5 py-0.5 rounded">
                        Error Code: {authError.code}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClearError}
                  className="text-rose-400 hover:text-rose-700 p-1 rounded transition-colors"
                  title="Dismiss error message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons inside Error Banner */}
              <div className="mt-3.5 pt-3 border-t border-rose-200/70 flex flex-wrap items-center gap-2">
                {authError.actionType === 'new_tab' && (
                  <button
                    onClick={handleOpenInNewTab}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-rose-800 transition-colors shadow-2xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Launch in Standalone Tab</span>
                  </button>
                )}

                {authError.actionType === 'unauthorized_domain' && (
                  <button
                    onClick={handleCopyDomain}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-rose-300 text-rose-900 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 transition-colors shadow-2xs"
                  >
                    {copiedDomain ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedDomain ? 'Domain Copied!' : 'Copy Current Domain'}</span>
                  </button>
                )}

                <button
                  onClick={onSignIn}
                  disabled={isAuthenticating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-rose-200 text-stone-700 px-3 py-1.5 text-xs font-medium hover:bg-rose-100/50 transition-colors"
                >
                  <span>Retry Sign-In</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Action Area */}
          <div className="pt-2 flex flex-col items-center justify-center gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
              {/* Google Identity Services native rendered button container */}
              <div id="gsi-official-button" className="min-h-[44px] flex items-center justify-center"></div>

              {/* Standard Popup Button fallback */}
              <button
                id="btn-landing-google-signin"
                onClick={onSignIn}
                disabled={isAuthenticating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-stone-800 disabled:opacity-60 transition-all hover:scale-[1.01]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.18 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.26v3.15C3.27 21.39 7.37 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.26C.46 8.18 0 10.04 0 12s.46 3.82 1.26 5.41l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.27 2.61 1.26 6.59l4.02 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                  />
                </svg>
                <span>{isAuthenticating ? 'Authorizing...' : 'Google Popup Sign-In'}</span>
                <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
              </button>
            </div>


          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-amber-900/10 bg-white/80 backdrop-blur-md p-6 shadow-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              Multi-Turn Reflection Partner
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Converse fluidly with Gemini 3.6 Flash. Brainstorm solutions to personal obstacles,
              unpack complex emotions, and receive constructive questions tailored to your thoughts.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-900/10 bg-white/80 backdrop-blur-md p-6 shadow-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              Personal Insight Timeline
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Every journal session automatically generates executive summaries, key themes,
              decisions made, and actionable commitments cataloged chronologically over time.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-900/10 bg-white/80 backdrop-blur-md p-6 shadow-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              Path-Isolated Cloud Firestore
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Enforced at the storage layer: security rules strictly prevent cross-user reads,
              modifications, or queries. Only your cryptographically verified UID can access your data.
            </p>
          </div>
        </div>


      </div>
    </div>
  );
};
