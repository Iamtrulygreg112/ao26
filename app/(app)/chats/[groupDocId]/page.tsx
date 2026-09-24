"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { OWNER_ID, TRACKED_MEMBERS } from "@/lib/config";
import { useChat, type ChatMessageRow } from "@/lib/chatData";
import { useSignalData } from "@/lib/signalData";
import { isLinked, useLinkedAccounts } from "@/lib/linkData";
import { AdminAuthProvider, useAdmin } from "@/lib/adminAuth";
import { dayKey, formatDayLabel } from "@/lib/dates";
import ChatBubble from "@/components/ChatBubble";
import ReactSheet from "@/components/ReactSheet";
import Spinner from "@/components/Spinner";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const BOTTOM_SLACK_PX = 80;
const TOP_TRIGGER_PX = 120;

function Chevron() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

type Item = { kind: "day"; key: string; label: string } | { kind: "msg"; key: string; m: ChatMessageRow; showName: boolean };

function buildItems(messages: ChatMessageRow[], now: number): Item[] {
  const items: Item[] = [];
  let lastDay: string | null = null;
  let prev: ChatMessageRow | null = null;
  for (const m of messages) {
    const day = dayKey(m.ts);
    if (day !== lastDay) {
      items.push({ kind: "day", key: `day-${day}`, label: formatDayLabel(m.ts, now) });
      lastDay = day;
      prev = null;
    }
    const grouped = !!prev && prev.authorUuid === m.authorUuid && m.ts - prev.ts < GROUP_WINDOW_MS;
    items.push({ kind: "msg", key: m.id, m, showName: !grouped });
    prev = m;
  }
  return items;
}

function Thread({ groupDocId, owner }: { groupDocId: string; owner: boolean }) {
  const { session } = useSession();
  const me = session?.id ?? "";
  const { groups } = useSignalData();
  const group = groups.find((g) => g.groupDocId === groupDocId || g.id === groupDocId) ?? null;
  const { messages, loaded, error, hasMore, loadingOlder, loadOlder } = useChat(groupDocId, { owner });
  const { accounts } = useLinkedAccounts();
  const linkedCount = TRACKED_MEMBERS.filter((x) => isLinked(accounts.get(x.id))).length;
  // The bot writes `members` as a count; older docs may carry a list.
  const memberCount = typeof group?.members === "number" ? group.members : Array.isArray(group?.members) ? group.members.length : null;

  const scroller = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const lastCount = useRef(0);
  const lastNewestId = useRef<string | null>(null);
  const prependState = useRef<{ height: number; top: number } | null>(null);
  const [now] = useState(() => Date.now());

  const items = useMemo(() => buildItems(messages, now), [messages, now]);
  const newest = messages.length > 0 ? messages[messages.length - 1] : null;

  // Keep the viewport steady when older messages are prepended; otherwise
  // stick to the bottom (first load, or new messages while already there).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const p = prependState.current;
    if (p) {
      el.scrollTop = el.scrollHeight - p.height + p.top;
      prependState.current = null;
      return;
    }
    const newestChanged = newest?.id !== lastNewestId.current;
    if (lastCount.current === 0 || (newestChanged && atBottom)) {
      el.scrollTop = el.scrollHeight;
    } else if (newestChanged && !atBottom) {
      setUnseen(true);
    }
    lastCount.current = messages.length;
    lastNewestId.current = newest?.id ?? null;
  }, [messages.length, newest?.id, atBottom]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK_PX;
    setAtBottom(bottom);
    if (bottom) setUnseen(false);
    if (el.scrollTop < TOP_TRIGGER_PX && hasMore && !loadingOlder) {
      prependState.current = { height: el.scrollHeight, top: el.scrollTop };
      loadOlder();
    }
  }, [hasMore, loadingOlder, loadOlder]);

  // If the first page doesn't fill the view, there is nothing to scroll — offer more anyway.
  useEffect(() => {
    if (!loaded || !hasMore || loadingOlder) return;
    const el = scroller.current;
    if (el && el.scrollHeight <= el.clientHeight) loadOlder();
  }, [loaded, hasMore, loadingOlder, loadOlder, messages.length]);

  function jumpToBottom() {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUnseen(false);
  }

  const openMessage = openId ? messages.find((m) => m.id === openId) ?? null : null;

  return (
    <div className="-mb-24 flex h-[calc(100dvh-5.5rem)] flex-col">
      <header className="flex shrink-0 items-center gap-1 border-b border-border pb-2">
        <Link href="/chats" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:text-text" aria-label="Back to chats">
          <Chevron />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight">{group?.name ?? "Chat"}</h1>
          <p className="truncate text-xs tabular-nums text-muted">
            {memberCount !== null && <>{memberCount} members · </>}
            {linkedCount} linked
            {owner && <> · owner only</>}
          </p>
        </div>
      </header>

      <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2">
        {error && <p className="py-2 text-center text-sm text-danger">{error}</p>}
        {!loaded ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
            <Spinner /> Loading…
          </p>
        ) : (
          <>
            {loadingOlder && (
              <p className="flex items-center justify-center gap-2 py-2 text-xs text-muted">
                <Spinner /> Older messages…
              </p>
            )}
            {!hasMore && messages.length > 0 && <p className="py-2 text-center text-[11px] text-muted">Beginning of the last 30 days</p>}
            {messages.length === 0 && <p className="py-8 text-center text-sm text-muted">No messages in the last 30 days.</p>}
            {items.map((it) =>
              it.kind === "day" ? (
                <div key={it.key} className="my-3 flex justify-center">
                  <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-muted">{it.label}</span>
                </div>
              ) : (
                <ChatBubble key={it.key} m={it.m} showName={it.showName} mine={!!me && it.m.authorMemberId === me} onOpen={(m) => setOpenId(m.id)} />
              ),
            )}
          </>
        )}
      </div>

      {unseen && (
        <div className="pointer-events-none relative">
          <button
            type="button"
            onClick={jumpToBottom}
            className="pointer-events-auto absolute bottom-3 left-1/2 h-9 -translate-x-1/2 rounded-full border border-border bg-surface px-4 text-sm font-medium shadow-lg transition active:scale-[0.98]"
          >
            ↓ New messages
          </button>
        </div>
      )}

      {openMessage && <ReactSheet m={openMessage} me={me} linked={accounts} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** owner=1: the session must be chase AND the Google account the admin, or nothing is subscribed. */
function OwnerGate({ groupDocId }: { groupDocId: string }) {
  const { loading, isAdmin } = useAdmin();
  if (loading) return null;
  if (!isAdmin) return <p className="pt-8 text-center text-muted">Not for you.</p>;
  return <Thread groupDocId={groupDocId} owner />;
}

function ChatRoute() {
  const params = useParams<{ groupDocId: string }>();
  const search = useSearchParams();
  const { session } = useSession();
  const raw = params.groupDocId ?? "";
  const groupDocId = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  const owner = search.get("owner") === "1";

  if (!groupDocId) return null;
  if (!owner) return <Thread groupDocId={groupDocId} owner={false} />;
  if (session?.id !== OWNER_ID) return <p className="pt-8 text-center text-muted">Not for you.</p>;
  return (
    <AdminAuthProvider>
      <OwnerGate groupDocId={groupDocId} />
    </AdminAuthProvider>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatRoute />
    </Suspense>
  );
}
