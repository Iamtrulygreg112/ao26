export type Session = { id: string; name: string };

export const SESSION_KEY = "ao26_session";
/** Fired on window whenever this tab changes the session (the native "storage" event only fires in other tabs). */
export const SESSION_EVENT = "ao26_session_change";

export function parseSession(raw: string | null | undefined): Session | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Session).id === "string" &&
      typeof (parsed as Session).name === "string"
    ) {
      return { id: (parsed as Session).id, name: (parsed as Session).name };
    }
  } catch {
    // fall through
  }
  return null;
}

export function readSessionRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  return parseSession(readSessionRaw());
}

export function setSession(s: Session): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}
