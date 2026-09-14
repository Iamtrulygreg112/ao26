"use client";

import { useSession } from "@/lib/useSession";
import { AdminAuthProvider, useAdmin } from "@/lib/adminAuth";
import { SendDataProvider } from "@/lib/sendData";
import BotStatus from "@/components/BotStatus";

const OWNER_ID = "chase";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 2.1 14.8 1 12 1 7.7 1 4 3.5 2.3 7.1l3.6 2.8C6.8 7.3 9.2 5.4 12 5.4z" />
      <path fill="#4285F4" d="M23 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h6.2c-.3 1.4-1.1 2.6-2.3 3.4l3.5 2.7c2.1-1.9 3.6-4.7 3.6-8.2z" />
      <path fill="#FBBC05" d="M5.9 14.1A6.6 6.6 0 0 1 5.5 12c0-.7.1-1.4.4-2.1L2.3 7.1A11 11 0 0 0 1 12c0 1.8.4 3.4 1.2 4.9l3.7-2.8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.8 0-5.2-1.9-6.1-4.5l-3.7 2.8C4 20.5 7.7 23 12 23z" />
    </svg>
  );
}

function SendShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, error, signIn, signOut } = useAdmin();

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex justify-center pt-8">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-5 text-center">
          <h1 className="text-lg font-semibold tracking-tight">Send — sign in with Google to continue</h1>
          <button
            type="button"
            onClick={() => signIn().catch(() => undefined)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-azure px-4 font-medium text-white transition active:scale-[0.98]"
          >
            <GoogleMark />
            Sign in with Google
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center pt-8">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-5 text-center">
          <p className="text-sm">
            Signed in as <span className="font-medium">{user.email ?? "unknown"}</span> — this account isn&apos;t allowed here.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="h-11 w-full rounded-xl border border-border bg-surface2 px-4 font-medium transition active:scale-[0.98]"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const firstName = user.displayName?.split(" ")[0] || user.email || "Admin";

  return (
    <SendDataProvider key={user.uid}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight">Send</h1>
            <BotStatus detailed />
          </div>
          <button type="button" onClick={() => signOut()} className="shrink-0 truncate pt-2 text-sm text-muted transition hover:text-text">
            {firstName} · Sign out
          </button>
        </div>

        {children}
      </div>
    </SendDataProvider>
  );
}

/**
 * Gate, in order: (1) the PIN session must be the owner; (2) a Google account
 * must be signed in; (3) it must be the admin email. Nothing send-related is
 * rendered or subscribed until all three pass. The Firebase Auth SDK is only
 * ever touched past step 1, so no other pledge triggers it.
 */
export default function SendLayout({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  if (session?.id !== OWNER_ID) {
    return <p className="pt-8 text-center text-muted">Not for you.</p>;
  }

  return (
    <AdminAuthProvider>
      <SendShell>{children}</SendShell>
    </AdminAuthProvider>
  );
}
