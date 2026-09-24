"use client";

// Live Signal-bot data for every logged-in pledge (name + PIN session only; no
// Firebase Auth involved). The Pi bot writes these collections with a service
// account; the site only reads them.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import { db } from "./firebase";

// ---- Firestore contract (written by the bot) --------------------------------

// signal_groups/{groupDocId} — one per group the owner is in, enabled or not.
// groupDocId is the raw id with "/"→"_" and "+"→"-". Always use the `groupId`
// FIELD (raw, base64) when writing scheduled_sends.
export type SignalGroupDoc = {
  groupId: string;
  groupDocId: string;
  name: string;
  enabled: boolean;
  members: number | unknown; // a count in current docs
  lastMessageAt: string; // ISO
  lastMessageTs: number; // ms
  lastMessageText: string; // ≤ 80 chars, "📷 Photo" for a bare picture
  lastMessageAuthor: string;
  messageCount30d: number;
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
  retentionDays?: number;
  likeQueue?: number;
  linkedAccounts?: number;
  version: string;
};

export type WithId<T> = T & { id: string };
export type SignalGroupRow = WithId<SignalGroupDoc>;

// ---- Provider ---------------------------------------------------------------

export type SignalData = {
  groups: SignalGroupRow[];
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
  // undefined = not yet delivered; null = delivered, doc missing.
  const [status, setStatus] = useState<BotStatusDoc | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onErr = (e: Error) => setError(e.message);
    const unsubs = [
      onSnapshot(collection(db, "signal_groups"), (s) => setGroups(rows<SignalGroupDoc>(s)), onErr),
      onSnapshot(doc(db, "signal_meta", "status"), (s) => setStatus(s.exists() ? (s.data() as BotStatusDoc) : null), onErr),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loaded = groups !== null && status !== undefined;

  const value = useMemo<SignalData>(
    () => ({ groups: groups ?? [], status: status ?? null, loaded, error }),
    [groups, status, loaded, error],
  );

  return <SignalDataContext.Provider value={value}>{children}</SignalDataContext.Provider>;
}

export function useSignalData(): SignalData {
  const ctx = useContext(SignalDataContext);
  if (!ctx) throw new Error("useSignalData() must be used inside <SignalDataProvider/>");
  return ctx;
}
