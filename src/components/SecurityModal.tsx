import React from 'react';
import { X, ShieldCheck, Lock, Key, Database, Cpu, EyeOff, CheckCircle2 } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-900">
                Security Architecture & Threat Model
              </h2>
              <p className="text-xs text-stone-500">
                OWASP Top 10 Web & LLM Defense Matrix for Personal Gemini Journal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-6 space-y-6 text-xs text-stone-700 leading-relaxed">
          {/* Threat Summary Table */}
          <div>
            <h3 className="font-serif text-sm font-semibold text-stone-900 mb-2">
              Agentic Threat Model (5 Threat Zones)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-stone-100 text-stone-800 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="p-2.5">Threat Zone</th>
                    <th className="p-2.5">Identified Risk</th>
                    <th className="p-2.5">Implemented Countermeasure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-amber-600" />
                      1. Input Surfaces
                    </td>
                    <td className="p-2.5 text-stone-600">
                      Oversized payloads, script injection, command injection.
                    </td>
                    <td className="p-2.5 text-emerald-800 bg-emerald-50/40">
                      Top-level body parser limit (1MB), max 4000 char validation, safe ReactMarkdown output encoding.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-indigo-600" />
                      2. Planning & Reasoning
                    </td>
                    <td className="p-2.5 text-stone-600">
                      Prompt injection via user reflections attempting persona hijacking.
                    </td>
                    <td className="p-2.5 text-emerald-800 bg-emerald-50/40">
                      Contextual delimiters treating reflection notes strictly as plain data, resilient system instructions.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      3. Tool Execution
                    </td>
                    <td className="p-2.5 text-stone-600">
                      Unauthorized API invocation, privilege escalation, identity spoofing.
                    </td>
                    <td className="p-2.5 text-emerald-800 bg-emerald-50/40">
                      Mandatory cryptographic Firebase ID token verification with Google JWKS. Client-sent UIDs are discarded.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900 flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-sky-600" />
                      4. Memory & State
                    </td>
                    <td className="p-2.5 text-stone-600">
                      Cross-user Firestore read/write, IDOR, data leakage.
                    </td>
                    <td className="p-2.5 text-emerald-800 bg-emerald-50/40">
                      Strict path-level Firestore Security Rules: <code>request.auth.uid == userId</code>. Default-deny on all top collections.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-900 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-rose-600" />
                      5. Inter-System Comm
                    </td>
                    <td className="p-2.5 text-stone-600">
                      Gemini API key leakage, log leakage of private entries.
                    </td>
                    <td className="p-2.5 text-emerald-800 bg-emerald-50/40">
                      Keys stored exclusively in Secret Manager / backend container env. Zero-log policy excludes reflections and tokens from stdout.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Core Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <h4 className="font-semibold text-stone-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Resilient Gemini Fallback Ladder
              </h4>
              <p className="text-stone-600">
                Server sequentially falls back across:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 font-mono text-[10px] text-stone-700">
                <li>gemini-3.6-flash (Primary)</li>
                <li>gemini-3.1-flash-lite (HA Fallback)</li>
                <li>gemini-flash-latest (Dynamic Alias)</li>
                <li>gemini-3.7-flash (Deep Reasoning Fallback)</li>
              </ul>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <h4 className="font-semibold text-stone-900 flex items-center gap-1.5">
                <EyeOff className="h-4 w-4 text-emerald-600" />
                Zero-Log Confidentiality
              </h4>
              <p className="text-stone-600">
                Journal contents, prompts, and model replies are never written to application logs.
                Only operational metadata (HTTP method, route, latency, and status code) is recorded.
              </p>
            </div>
          </div>

          {/* Firestore Security Rules Block */}
          <div>
            <h4 className="font-semibold text-stone-900 mb-1.5">
              Active Cloud Firestore Security Rules
            </h4>
            <pre className="rounded-xl bg-stone-900 p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // Zero insecure defaults
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /sessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      match /insights/{insightId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-stone-200 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            Close Security Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
