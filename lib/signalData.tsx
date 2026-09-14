"use client";

// Live Signal-bot data for every logged-in pledge (name + PIN session only; no
// Firebase Auth involved). The Pi bot writes these collections with a service
// account; the site only reads them.

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

// ---- Firestore contract (written by the bot) --------------------------------

// signal_groups/{encodedId} — doc id is the raw id with "/"→"_" and "+"→"-".
// Always use the `groupId` FIELD (raw, base64) when writing scheduled_sends.
export type SignalGroupDoc = {
  groupId: string;
  name: string;
  enabled: boolean;
  members: unknown;
  updatedAt: string;
};

// signal_messages/{authorUuid}_{ts} — only messages at/over the bot's mirror threshold.
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

export type WithId<T> = T & { id: string };
export type SignalGroupRow = WithId<SignalGroupDoc>;
export type SignalMessageRow = WithId<SignalMessageDoc>;

// ---- Provider ---------------------------------------------------------------

export type SignalData = {
  groups: SignalGroupRow[];
  messages: SignalMessageRow[];
  /** null once loaded if the status doc doesn't exist yet. */
  status: BotStatusDoc | null;
  /** True once every subscription has delivered its first snapshot. */
  loaded: boolean;
  error: string | null;
};

const SignalDataContext = createContext<SignalData | null>(null);

export function rows<T>(snap: QuerySnapshot<DocumentData>): Array<WithId<T>> {
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
}

export function SignalDataProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<SignalGroupRow[] | null>(null);
  const [messages, setMessages] = useState<SignalMessageRow[] | null>(null);
  // undefined = not yet delivered; null = delivered, doc missing.
  const [status, setStatus] = useState<BotStatusDoc | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onErr = (e: Error) => setError(e.message);
    const unsubs = [
      onSnapshot(collection(db, "signal_groups"), (s) => setGroups(rows<SignalGroupDoc>(s)), onErr),
      onSnapshot(
        query(collection(db, "signal_messages"), orderBy("ts", "desc"), limit(200)),
        (s) => setMessages(rows<SignalMessageDoc>(s)),
        onErr,
      ),
      onSnapshot(doc(db, "signal_meta", "status"), (s) => setStatus(s.exists() ? (s.data() as BotStatusDoc) : null), onErr),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loaded = groups !== null && messages !== null && status !== undefined;

  const value = useMemo<SignalData>(
    () => ({ groups: groups ?? [], messages: messages ?? [], status: status ?? null, loaded, error }),
    [groups, messages, status, loaded, error],
  );

  return <SignalDataContext.Provider value={value}>{children}</SignalDataContext.Provider>;
}

export function useSignalData(): SignalData {
  const ctx = useContext(SignalDataContext);
  if (!ctx) throw new Error("useSignalData() must be used inside <SignalDataProvider/>");
  return ctx;
}
