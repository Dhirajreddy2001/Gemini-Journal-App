import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

// Firebase Client Configuration
export const firebaseConfig = {
  projectId: firebaseConfigData.projectId || '',
  appId: firebaseConfigData.appId || '',
  apiKey: firebaseConfigData.apiKey || '',
  authDomain: firebaseConfigData.authDomain || '',
  storageBucket: firebaseConfigData.storageBucket || '',
  messagingSenderId: firebaseConfigData.messagingSenderId || '',
  firestoreDatabaseId: firebaseConfigData.firestoreDatabaseId || '(default)',
  oAuthClientId: firebaseConfigData.oAuthClientId || '',
};

// Initialize App (Singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore with target database ID
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Authentication Helpers
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In popup error:', error);
    throw error;
  }
}

// Google Identity Services (GSI) Credential Sign-In
// Bypasses cross-origin iframe popup and third-party storage restrictions
export async function signInWithGoogleCredential(idToken: string) {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return result.user;
  } catch (error: any) {
    console.error('Google Credential Sign-In error:', error);
    throw error;
  }
}

export async function signOutUser() {
  await signOut(auth);
}

// Token helper for authenticated API calls
export async function getValidIdToken(forceRefresh = false): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return await currentUser.getIdToken(forceRefresh);
}

// Helper to translate Firebase Auth errors into actionable advice
export function formatAuthError(err: any): { title: string; message: string; code?: string; actionType?: 'new_tab' | 'unauthorized_domain' | 'retry' } {
  const code = err?.code || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  if (code === 'auth/unauthorized-domain') {
    return {
      title: 'Domain Not Authorized in Firebase',
      message: `The domain "${hostname}" is not on Firebase Authentication's authorized domains list. Add "${hostname}" under Firebase Console > Authentication > Settings > Authorized domains.`,
      code,
      actionType: 'unauthorized_domain',
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      title: 'Browser Blocked Popup Window',
      message: 'Your browser or iframe sandbox blocked the authentication popup. Please click "Open in New Tab" to sign in directly without iframe restrictions.',
      code,
      actionType: 'new_tab',
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      title: 'Sign-In Interrupted',
      message: 'The sign-in popup was closed before completing authentication. This frequently happens in preview iframes when third-party cookies are partitioned. Try opening the app in a standalone tab.',
      code,
      actionType: 'new_tab',
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      title: 'Provider Not Enabled',
      message: 'Google Sign-In is not enabled yet in your Firebase Project Console. Enable it under Firebase Console > Authentication > Sign-in method > Google.',
      code,
    };
  }

  if (code === 'auth/cancelled-popup-request') {
    return {
      title: 'Previous Request Cancelled',
      message: 'A previous popup request was superseded. Please click the sign-in button again.',
      code,
      actionType: 'retry',
    };
  }

  return {
    title: 'Sign-In Failed',
    message: err?.message || 'Unable to complete sign-in. Please try again or open the app in a new tab.',
    code,
  };
}
