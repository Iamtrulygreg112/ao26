"use client";

// Live scheduled-sends queue. Subscribes only while the signed-in Google
// account is the admin, and never to photos subcollections (they hold base64
// and are fetched on demand from the Send page).

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import { useAdmin } from "./adminAuth";
import { rows, type WithId } from "./signalData";

// ---- Firestore contract -------------------------------------------------------

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

export type ScheduledSendRow = WithId<ScheduledSendDoc>;

// ---- Provider ---------------------------------------------------------------

export type SendData = {
  sends: ScheduledSendRow[];
  /** True once the subscription has delivered its first snapshot. */
  loaded: boolean;
  error: string | null;
};

const SendDataContext = createContext<SendData | null>(null);

export function SendDataProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdmin();
  const [sends, setSends] = useState<ScheduledSendRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(
      query(collection(db, "scheduled_sends"), orderBy("sendAt", "desc"), limit(100)),
      (s) => setSends(rows<ScheduledSendDoc>(s)),
      (e: Error) => setError(e.message),
    );
    return unsub;
  }, [isAdmin]);

  const value = useMemo<SendData>(() => ({ sends: sends ?? [], loaded: sends !== null, error }), [sends, error]);

  return <SendDataContext.Provider value={value}>{children}</SendDataContext.Provider>;
}

export function useSendData(): SendData {
  const ctx = useContext(SendDataContext);
  if (!ctx) throw new Error("useSendData() must be used inside <SendDataProvider/>");
  return ctx;
}
