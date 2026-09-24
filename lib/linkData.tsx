"use client";

// Live Signal-link data. These hooks open their own subscriptions and are
// mounted only by the pages that need them (Home card, /link), not globally.

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { WithId } from "./types";

// ---- Firestore contract -------------------------------------------------------

export type LinkRequestStatus = "pending" | "queued" | "waiting" | "linked" | "expired" | "superseded" | "failed";

// link_requests/{autoId} — CREATED BY THE SITE as "pending"; the bot moves
// status along and adds the other fields. The site never updates a request.
export type LinkRequestDoc = {
  memberId: string;
  requestedBy: string; // session id
  status: LinkRequestStatus;
  createdAt: string; // ISO
  // Set by the bot on "queued" (all link slots busy): 1-based place in line.
  position?: number;
  // Set by the bot on "superseded" (a newer request for the same member won).
  supersededBy?: string;
  // Set by the bot on "waiting".
  uri?: string; // sgnl://linkdevice?... — rendered as the QR
  expiresAt?: string; // ISO
  // Set by the bot on "linked".
  linkedAt?: string; // ISO
  // Set by the bot on "failed".
  error?: string;
};

// linked_accounts/{memberId} — bot-written. The doc also carries `number` and
// `uuid`; they are deliberately left out of this type so nothing renders them.
export type LinkedAccountDoc = {
  memberId: string;
  deviceName: string;
  linkedAt: string; // ISO
  status: "linked" | "gone";
};

export type LinkRequestRow = WithId<LinkRequestDoc>;
export type LinkedAccountRow = WithId<LinkedAccountDoc>;

export type LinkedNow = LinkedAccountDoc & { status: "linked" };
export const isLinked = (a: LinkedAccountDoc | null | undefined): a is LinkedNow => a?.status === "linked";

/** A request the bot is still working on (or about to): pending, or waiting with time left. */
export function isActiveRequest(r: LinkRequestDoc, now: number): boolean {
  if (r.status === "pending" || r.status === "queued") return true;
  if (r.status !== "waiting") return false;
  const expires = r.expiresAt ? new Date(r.expiresAt).getTime() : NaN;
  return !Number.isFinite(expires) || expires > now;
}

// ---- Hooks --------------------------------------------------------------------

/** Every linked_accounts doc, keyed by memberId. `loaded` once the first snapshot lands. */
export function useLinkedAccounts(): { accounts: Map<string, LinkedAccountRow>; loaded: boolean; error: string | null } {
  const [accounts, setAccounts] = useState<Map<string, LinkedAccountRow> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, "linked_accounts"),
      (s) => setAccounts(new Map(s.docs.map((d) => [d.id, { ...(d.data() as LinkedAccountDoc), id: d.id }]))),
      (e) => setError(e.message),
    );
  }, []);

  return { accounts: accounts ?? new Map(), loaded: accounts !== null, error };
}

// Snapshot state is tagged with the id it came from, so switching ids yields
// `undefined` (not delivered) again without a setState inside the effect.
type Delivered<T> = { id: string; value: T | null; error: string | null };

/** One linked_accounts doc. `undefined` = not delivered yet; `null` = delivered, missing. */
export function useLinkedAccount(memberId: string): { account: LinkedAccountRow | null | undefined; error: string | null } {
  const [state, setState] = useState<Delivered<LinkedAccountRow> | null>(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, "linked_accounts", memberId),
      (s) => setState({ id: memberId, value: s.exists() ? { ...(s.data() as LinkedAccountDoc), id: s.id } : null, error: null }),
      (e) => setState({ id: memberId, value: null, error: e.message }),
    );
  }, [memberId]);

  const current = state?.id === memberId ? state : null;
  return { account: current ? current.value : undefined, error: current?.error ?? null };
}

/** One link_requests doc. Pass null to subscribe to nothing. `undefined` = not delivered yet. */
export function useLinkRequest(id: string | null): { request: LinkRequestRow | null | undefined; error: string | null } {
  const [state, setState] = useState<Delivered<LinkRequestRow> | null>(null);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, "link_requests", id),
      (s) => {
        console.debug("[link] request", s.id, s.exists() ? s.data() : "(missing)");
        setState({ id, value: s.exists() ? { ...(s.data() as LinkRequestDoc), id: s.id } : null, error: null });
      },
      (e) => setState({ id, value: null, error: e.message }),
    );
  }, [id]);

  if (!id) return { request: null, error: null };
  const current = state?.id === id ? state : null;
  return { request: current ? current.value : undefined, error: current?.error ?? null };
}

/**
 * Every link_requests doc for one member, newest first, live. Used to attach
 * to a request that is already pending/waiting (after a reload, or one the
 * owner made for this member) instead of creating another one — the Pi runs
 * one link session at a time, so extra requests only lengthen the queue.
 * Single-field filter only (no orderBy), so no composite index is needed.
 */
export function useLinkRequests(memberId: string): { requests: LinkRequestRow[]; loaded: boolean; error: string | null } {
  const [state, setState] = useState<Delivered<LinkRequestRow[]> | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "link_requests"), where("memberId", "==", memberId)),
      (s) => {
        const rows = s.docs.map((d) => ({ ...(d.data() as LinkRequestDoc), id: d.id }));
        rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setState({ id: memberId, value: rows, error: null });
      },
      (e) => setState({ id: memberId, value: null, error: e.message }),
    );
  }, [memberId]);

  const current = state?.id === memberId ? state : null;
  return { requests: current?.value ?? [], loaded: current !== null, error: current?.error ?? null };
}
