"use client";

// Live admin data. Subscribes to the bot-owned collections only while the
// signed-in Google account is the admin, and never to photos subcollections
// (they hold base64 and are fetched on demand from the Send page).

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAdmin } from "./adminAuth";

// ---- Firestore contract (written by the bot unless noted) --------------------

// signal_groups/{encodedId} — doc id is the raw id with "/"→"_" and "+"→"-".
// Always use the `groupId` FIELD (raw, base64) when writing scheduled_sends.
export type SignalGroupDoc = {
  groupId: string;
  name: string;
  enabled: boolean;
  members: unknown;
  updatedAt: string;
};

// signal_messages/{authorUuid}_{ts} — only messages at/over the 👍 threshold.
export type SignalMessageDoc = {
  groupId: string;
  groupName: string;
  authorUuid: string;
  authorMemberId: string | null;
  authorName: string;
  ts: number; // ms
  sentAt: string; // ISO
  text: string | null;
  thumbs: number;
  likedBy: string[]; // member ids
  notLikedBy: string[]; // member ids
  unmappedReactors: number;
  ownerReacted: boolean;
  autoThumbed: boolean;
  updatedAt: string;
};

// signal_meta/status — heartbeat every 60s.
export type BotStatusDoc = {
  online: boolean;
  lastSeen: string; // ISO
  dryRun: boolean;
  armed: boolean;
  account: string;
  groupsEnabled: number;
  membersMapped: number;
  version: string;
};

export type SendStatus = "pending" | "sending" | "sent" | "failed" | "dry_run" | "cancelled";

// scheduled_sends/{autoId} — WRITTEN BY THE SITE; the bot moves status along.
export type ScheduledSendDoc = {
  groupId: string; // raw Signal group id
  groupName: string;
  text: string; // may be ""
  sendAt: string; // ISO UTC
  status: SendStatus;
  createdAt: string; // ISO
  createdBy: "chase";
  photoCount: number;
  // Set by the bot on failed / dry_run.
  error?: string;
  note?: string;
  attemptedAt?: string;
};

// scheduled_sends/{id}/photos/{n}
export type SendPhotoDoc = {
  order: number;
  mime: "image/jpeg";
  base64: string;
};

export type WithId<T> = T & { id: string };
export type SignalGroupRow = WithId<SignalGroupDoc>;
export type SignalMessageRow = WithId<SignalMessageDoc>;
export type ScheduledSendRow = WithId<ScheduledSendDoc>;

// ---- Provider ---------------------------------------------------------------

export type AdminData = {
  groups: SignalGroupRow[];
  messages: SignalMessageRow[];
  /** null once loaded if the status doc doesn't exist yet. */
  status: BotStatusDoc | null;
  sends: ScheduledSendRow[];
  /** True once every subscription has delivered its first snapshot. */
  loaded: boolean;
  error: string | null;
};

const AdminDataContext = createContext<AdminData | null>(null);

function rows<T>(snap: QuerySnapshot<DocumentData>): Array<WithId<T>> {
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
}

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdmin();
  const [groups, setGroups] = useState<SignalGroupRow[] | null>(null);
  const [messages, setMessages] = useState<SignalMessageRow[] | null>(null);
  // undefined = not yet delivered; null = delivered, doc missing.
  const [status, setStatus] = useState<BotStatusDoc | null | undefined>(undefined);
  const [sends, setSends] = useState<ScheduledSendRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const onErr = (e: Error) => setError(e.message);
    const unsubs = [
      onSnapshot(collection(db, "signal_groups"), (s) => setGroups(rows<SignalGroupDoc>(s)), onErr),
      onSnapshot(
        query(collection(db, "signal_messages"), orderBy("ts", "desc"), limit(200)),
        (s) => setMessages(rows<SignalMessageDoc>(s)),
        onErr,
      ),
      onSnapshot(doc(db, "signal_meta", "status"), (s) => setStatus(s.exists() ? (s.data() as BotStatusDoc) : null), onErr),
      onSnapshot(
        query(collection(db, "scheduled_sends"), orderBy("sendAt", "desc"), limit(100)),
        (s) => setSends(rows<ScheduledSendDoc>(s)),
        onErr,
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isAdmin]);

  const loaded = groups !== null && messages !== null && status !== undefined && sends !== null;

  const value = useMemo<AdminData>(
    () => ({
      groups: groups ?? [],
      messages: messages ?? [],
      status: status ?? null,
      sends: sends ?? [],
      loaded,
      error,
    }),
    [groups, messages, status, sends, loaded, error],
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminData {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData() must be used inside <AdminDataProvider/>");
  return ctx;
}
