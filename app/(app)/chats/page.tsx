"use client";

import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { OWNER_ID } from "@/lib/config";
import { useGroups } from "@/lib/chatData";
import { AdminAuthProvider, useAdmin } from "@/lib/adminAuth";
import { colorFor, initials } from "@/lib/colors";
import { formatRelative } from "@/lib/dates";
import type { SignalGroupRow } from "@/lib/signalData";
import BotStatus from "@/components/BotStatus";

function GroupRow({ g, href }: { g: SignalGroupRow; href: string }) {
  const c = colorFor(g.name);
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-3 py-3 transition hover:bg-surface2 active:bg-surface2">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${c.avatar}`} aria-hidden>
          {initials(g.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate font-medium">{g.name}</span>
            {g.lastMessageAt && <span className="shrink-0 text-xs tabular-nums text-muted">{formatRelative(g.lastMessageAt)}</span>}
          </span>
          <span className="block truncate text-sm text-muted">
            {g.lastMessageAuthor ? `${g.lastMessageAuthor}: ` : ""}
            {g.lastMessageText || "No messages yet"}
          </span>
        </span>
      </Link>
    </li>
  );
}

function ChatList({ groups, hrefFor }: { groups: SignalGroupRow[]; hrefFor: (g: SignalGroupRow) => string }) {
  if (groups.length === 0) return <p className="px-3 py-3 text-sm text-muted">No chats yet.</p>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {groups.map((g) => (
        <GroupRow key={g.id} g={g} href={hrefFor(g)} />
      ))}
    </ul>
  );
}

/** Owner only. The Auth SDK is touched only inside this section. */
function OwnerChatsInner({ groups }: { groups: SignalGroupRow[] }) {
  const { user, isAdmin, loading, error, signIn, signOut } = useAdmin();
  if (loading) return null;
  if (!user) {
    return (
      <ul className="rounded-xl border border-border bg-surface">
        <li>
          <button type="button" onClick={() => signIn().catch(() => undefined)} className="flex h-14 w-full items-center gap-3 px-3 text-left transition hover:bg-surface2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-muted" aria-hidden>
              🔒
            </span>
            <span className="flex-1 font-medium">Sign in to view</span>
            <span className="text-xs text-muted">Google</span>
          </button>
          {error && <p className="px-3 pb-3 text-sm text-danger">{error}</p>}
        </li>
      </ul>
    );
  }
  if (!isAdmin) {
    return (
      <div className="space-y-2 rounded-xl border border-border bg-surface p-3 text-sm">
        <p>
          Signed in as <span className="font-medium">{user.email ?? "unknown"}</span> — this account isn&apos;t allowed here.
        </p>
        <button type="button" onClick={() => signOut()} className="text-muted underline underline-offset-2">
          Sign out
        </button>
      </div>
    );
  }
  return <ChatList groups={groups} hrefFor={(g) => `/chats/${encodeURIComponent(g.groupDocId)}?owner=1`} />;
}

export default function ChatsPage() {
  const { session } = useSession();
  const { shared, ownerOnly, loaded, error } = useGroups();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
        <BotStatus />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!loaded ? <p className="text-sm text-muted">Loading…</p> : <ChatList groups={shared} hrefFor={(g) => `/chats/${encodeURIComponent(g.groupDocId)}`} />}

      {session?.id === OWNER_ID && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-widest text-muted">Your other chats</h2>
          <AdminAuthProvider>
            <OwnerChatsInner groups={ownerOnly} />
          </AdminAuthProvider>
        </section>
      )}
    </div>
  );
}
