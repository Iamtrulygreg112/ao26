"use client";

// Google sign-in for the admin gate only. Pledges never touch Firebase Auth;
// their name + PIN login is untouched. One account passes: ADMIN_EMAIL.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export const ADMIN_EMAIL = "chasescron@gmail.com";

export type AdminAuth = {
  user: User | null;
  isAdmin: boolean;
  /** True until Firebase has reported the initial auth state. */
  loading: boolean;
  /** Last sign-in error, if any. */
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuth | null>(null);

const REDIRECT_FALLBACK_CODES = new Set(["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"]);

function codeOf(err: unknown): string | null {
  return typeof err === "object" && err !== null && typeof (err as { code?: unknown }).code === "string"
    ? (err as { code: string }).code
    : null;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Sign-in failed";
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    // Completes a signInWithRedirect round-trip (the popup fallback). Resolves
    // null when there was no redirect, so it is harmless on a normal load.
    getRedirectResult(auth).catch((err: unknown) => {
      if (codeOf(err) === "auth/popup-closed-by-user" || codeOf(err) === "auth/cancelled-popup-request") return;
      setError(messageOf(err));
    });
    return unsub;
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = codeOf(err);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      if (code && REDIRECT_FALLBACK_CODES.has(code)) {
        await signInWithRedirect(auth, provider);
        return;
      }
      setError(messageOf(err));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AdminAuth>(
    () => ({
      user,
      isAdmin: !!user && user.email === ADMIN_EMAIL,
      loading,
      error,
      signIn,
      signOut,
    }),
    [user, loading, error, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdmin(): AdminAuth {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdmin() must be used inside <AdminAuthProvider/>");
  return ctx;
}
