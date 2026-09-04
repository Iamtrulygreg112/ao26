"use client";

import { useMemo, useSyncExternalStore } from "react";
import { SESSION_EVENT, parseSession, readSessionRaw, type Session } from "./session";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SESSION_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SESSION_EVENT, onChange);
  };
}

// `undefined` = still hydrating (server snapshot); `null` = hydrated, no session.
const getServerSnapshot = (): string | null | undefined => undefined;

/**
 * Reads the localStorage session without a setState-in-effect. During SSR and
 * hydration `hydrated` is false, so callers can render nothing and avoid a flash.
 */
export function useSession(): { hydrated: boolean; session: Session | null } {
  const raw = useSyncExternalStore(subscribe, readSessionRaw, getServerSnapshot);
  const session = useMemo(() => parseSession(raw), [raw]);
  return { hydrated: raw !== undefined, session };
}
