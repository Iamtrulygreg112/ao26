"use client";

// Live chat data: the message pages for one group, plus the per-message
// like_requests subscription that only the open ReactSheet mounts.
// Nothing here is global — each page/sheet opens and closes its own listeners.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { useSignalData, type SignalGroupRow, type WithId } from "./signalData";

// ---- Firestore contract (written by the bot) --------------------------------

export type AttachmentMeta = { type: "image" | "video" | "file"; name: string };

// signal_messages/{authorUuid}_{ts} (enabled groups) and owner_messages/… (the
// owner's other groups) — same shape. Metadata only; the site never loads media.
export type ChatMessageDoc = {
  groupId: string;
  groupDocId: string;
  groupName: string;
  authorUuid: string;
  authorMemberId: string | null;
  authorName: string;
  ts: number; // ms
  sentAt: string; // ISO
  text: string | null;
  attachments: AttachmentMeta[];
  quote: { authorName: string; text: string | null } | null;
  reactions: Record<string, number>; // every emoji, everyone — what Signal shows
  thumbs: number; // distinct mapped non-owner members with a 👍
  likedBy: string[]; // member ids
  notLikedBy: string[]; // member ids
  unmappedReactors: number;
  ownerReacted: boolean;
  autoThumbed: boolean;
  updatedAt: string;
};
export type ChatMessageRow = WithId<ChatMessageDoc>;

export type LikeRequestStatus = "pending" | "sent" | "dry_run" | "skipped" | "failed";
// like_requests/{id} — CREATED BY THE SITE; the bot moves status along.
export type LikeRequestDoc = {
  messageId: string;
  memberId: string;
  requestedBy: string;
  status: LikeRequestStatus;
  createdAt: string;
  sentAt?: string;
  note?: string; // dry_run
  reason?: string; // skipped: "already reacted" | "not linked" | "unknown message" | "group not enabled"
  error?: string; // failed
};
export type LikeRequestRow = WithId<LikeRequestDoc>;

export const collectionFor = (owner: boolean) => (owner ? "owner_messages" : "signal_messages");

const PAGE = 50;

// ---- Groups -------------------------------------------------------------------

/** Enabled groups newest-activity first (shared chats), and the owner-only rest. */
export function useGroups(): { shared: SignalGroupRow[]; ownerOnly: SignalGroupRow[]; loaded: boolean; error: string | null } {
  const { groups, loaded, error } = useSignalData();
  return useMemo(() => {
    const byRecent = (a: SignalGroupRow, b: SignalGroupRow) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "");
    return {
      shared: groups.filter((g) => g.enabled).sort(byRecent),
      ownerOnly: groups.filter((g) => !g.enabled).sort(byRecent),
      loaded,
      error,
    };
  }, [groups, loaded, error]);
}

// ---- One chat, paged ------------------------------------------------------------
//
// Page 0 is live and open-ended: every message at or after the oldest of the
// first 50 (so new messages append and reactions on recent ones update).
// Older pages are live too, but bounded: "the 50 before ts X". Each page is its
// own listener; they are merged, de-duplicated and sorted oldest → newest.

export type Chat = {
  messages: ChatMessageRow[];
  loaded: boolean;
  error: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  loadOlder: () => void;
};

function rowsOf(docs: QueryDocumentSnapshot<DocumentData>[]): ChatMessageRow[] {
  return docs.map((d) => ({ ...(d.data() as ChatMessageDoc), id: d.id }));
}

export function useChat(groupDocId: string, { owner = false }: { owner?: boolean } = {}): Chat {
  const [pages, setPages] = useState<{ key: string; rows: ChatMessageRow[][]; loaded: boolean; hasMore: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const unsubs = useRef<Array<() => void>>([]);
  const key = `${owner ? "o" : "s"}:${groupDocId}`;
  const col = collectionFor(owner);

  useEffect(() => {
    let cancelled = false;
    const base = query(collection(db, col), where("groupDocId", "==", groupDocId), orderBy("ts", "desc"));
    // First: which 50 are newest? Then listen open-endedly from the oldest of those.
    getDocs(query(base, limit(PAGE)))
      .then((first) => {
        if (cancelled) return;
        const anchorTs = first.size > 0 ? (first.docs[first.size - 1].data() as ChatMessageDoc).ts : 0;
        const live = onSnapshot(
          query(base, where("ts", ">=", anchorTs)),
          (s) => {
            setPages((prev) => {
              const rows = prev && prev.key === key ? [...prev.rows] : [];
              rows[0] = rowsOf(s.docs);
              return { key, rows, loaded: true, hasMore: prev?.key === key ? prev.hasMore : first.size === PAGE };
            });
          },
          (e) => setError(e.message),
        );
        unsubs.current.push(live);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      unsubs.current.forEach((u) => u());
      unsubs.current = [];
    };
  }, [col, groupDocId, key]);

  const current = pages?.key === key ? pages : null;

  const messages = useMemo(() => {
    if (!current) return [];
    const byId = new Map<string, ChatMessageRow>();
    for (const page of current.rows) for (const m of page ?? []) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => a.ts - b.ts);
  }, [current]);

  const oldestTs = messages.length > 0 ? messages[0].ts : null;
  const hasMore = current?.hasMore ?? false;

  const loadOlder = useCallback(() => {
    if (!current || !hasMore || loadingOlder || oldestTs === null) return;
    setLoadingOlder(true);
    const pageIndex = current.rows.length;
    const q = query(collection(db, col), where("groupDocId", "==", groupDocId), where("ts", "<", oldestTs), orderBy("ts", "desc"), limit(PAGE));
    let first = true;
    const unsub = onSnapshot(
      q,
      (s) => {
        // Decide hasMore now: state updaters run later, after `first` has flipped.
        const more = first ? s.size === PAGE : null;
        setPages((prev) => {
          if (!prev || prev.key !== key) return prev;
          const rows = [...prev.rows];
          rows[pageIndex] = rowsOf(s.docs);
          return { ...prev, rows, hasMore: more ?? prev.hasMore };
        });
        if (first) {
          first = false;
          setLoadingOlder(false);
        }
      },
      (e) => {
        setError(e.message);
        setLoadingOlder(false);
      },
    );
    unsubs.current.push(unsub);
  }, [current, hasMore, loadingOlder, oldestTs, col, groupDocId, key]);

  return { messages, loaded: current?.loaded ?? false, error, hasMore, loadingOlder, loadOlder };
}

// ---- Per-message (only while a ReactSheet is open) ----------------------------

type Delivered<T> = { id: string; value: T; error: string | null };

/** Every like_requests doc for one message, newest first. Single-field filter: no index needed. */
export function useLikeRequestsFor(messageId: string): { requests: LikeRequestRow[]; loaded: boolean; error: string | null } {
  const [state, setState] = useState<Delivered<LikeRequestRow[]> | null>(null);
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "like_requests"), where("messageId", "==", messageId)),
      (s) => {
        const rows = s.docs.map((d) => ({ ...(d.data() as LikeRequestDoc), id: d.id }));
        rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setState({ id: messageId, value: rows, error: null });
      },
      (e) => setState({ id: messageId, value: [], error: e.message }),
    );
  }, [messageId]);
  const current = state?.id === messageId ? state : null;
  return { requests: current?.value ?? [], loaded: current !== null, error: current?.error ?? null };
}
