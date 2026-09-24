"use client";

import { useEffect, useState } from "react";
import { useSignalData } from "@/lib/signalData";
import { isActiveRequest, isLinked, useLinkedAccount, useLinkRequest, useLinkRequests } from "@/lib/linkData";
import { requestLink } from "@/lib/linkWrites";
import { errorText } from "@/lib/writes";
import { formatDateTime } from "@/lib/dates";
import { memberName } from "@/lib/config";
import { getSession } from "@/lib/session";
import QrCode from "./QrCode";
import Spinner from "./Spinner";

// Same window BotStatus uses: a heartbeat older than this means the Pi is off.
const OFFLINE_AFTER_MS = 3 * 60 * 1000;
// How long "Linked ✓" shows before the card re-renders from linked_accounts.
const LINKED_FLASH_MS = 2500;
// Attach to the member's newest expired/failed request only this long after
// it was created, so "Code expired." is what you see after a reload, but not
// on a visit days later.
const RECENT_MS = 15 * 60 * 1000;
// A "pending" request older than this gets a note. The Pi runs one link
// session at a time, so a request made while another code is live waits
// its turn (each session lasts up to two minutes).
const SLOW_START_MS = 8 * 1000;

const OFFLINE_TEXT = "The Pi is offline right now — try later.";

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** "1:47" from a millisecond remainder (never negative). */
function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-11 rounded-xl bg-azure px-4 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function TextButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="text-sm text-muted underline underline-offset-2 transition hover:text-text disabled:opacity-60">
      {children}
    </button>
  );
}

/**
 * The request → QR → linked state machine for one member. Driven by
 * linked_accounts/{memberId} plus one link_requests doc: the one this card
 * created, or — after a reload, or when the owner made one for this member —
 * the newest request that is still pending/waiting. The site only ever
 * creates that doc; the bot owns every transition.
 */
export default function LinkCard({ memberId }: { memberId: string }) {
  const { account, error: accountError } = useLinkedAccount(memberId);
  const { requests, loaded: requestsLoaded, error: requestsError } = useLinkRequests(memberId);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(1000);

  // Newest request the bot is still working on, if any. Tracking it (rather
  // than creating another) is what keeps repeated taps/reloads from queueing
  // extra two-minute sessions on the Pi.
  const active = requests.find((r) => isActiveRequest(r, now)) ?? null;
  // The doc this card follows: the one it created, else the member's newest
  // request if it is live or recent (expired/failed/"already linked" still
  // show after a reload). A "linked" request is never followed — the Linked
  // state comes from linked_accounts.
  const newest = requests[0] ?? null;
  const attachId =
    newest && newest.status !== "linked" && (isActiveRequest(newest, now) || now - new Date(newest.createdAt).getTime() < RECENT_MS)
      ? newest.id
      : null;
  const requestId = createdId ?? attachId;
  const { request, error: requestError } = useLinkRequest(requestId);

  const { status: bot, loaded: botLoaded } = useSignalData();
  const lastSeenMs = bot ? new Date(bot.lastSeen).getTime() : NaN;
  const online = Number.isFinite(lastSeenMs) && now - lastSeenMs < OFFLINE_AFTER_MS;
  const offlineNote = botLoaded && !online ? <p className="text-sm text-danger">{OFFLINE_TEXT}</p> : null;

  // Once the bot flips the request to "linked", flash it briefly, then drop the
  // request so linked_accounts drives the card again.
  const requestStatus = request?.status;
  useEffect(() => {
    if (requestStatus !== "linked") return;
    const t = setTimeout(() => setCreatedId(null), LINKED_FLASH_MS);
    return () => clearTimeout(t);
  }, [requestStatus]);

  async function start() {
    if (busy || active) return; // one live request per member; the bot serialises them anyway
    setBusy(true);
    setError(null);
    try {
      setCreatedId(await requestLink(memberId));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const frame = "rounded-xl border border-border bg-surface p-4";
  const errors = (
    <>
      {error && <p className="text-sm text-danger">{error}</p>}
      {requestsError && <p className="text-sm text-danger">{requestsError}</p>}
      {accountError && <p className="text-sm text-danger">{accountError}</p>}
    </>
  );

  if (account === undefined || !requestsLoaded) {
    return (
      <div className={`${frame} flex items-center gap-2 text-sm text-muted`}>
        <Spinner /> Loading…
      </div>
    );
  }

  const alreadyLinkedFail = request?.status === "failed" && /already linked/i.test(request.error ?? "");

  // ---- Request in flight ------------------------------------------------------

  // The listener on the request doc failed: say so, rather than spinning forever.
  if (requestError) {
    return (
      <div className={`${frame} space-y-3`}>
        <p className="text-sm text-danger">{requestError}</p>
        <PrimaryButton onClick={start} disabled={!online || !!active}>Try again</PrimaryButton>
        {offlineNote}
        {errors}
      </div>
    );
  }

  if (busy || (requestId && request === undefined) || request?.status === "pending" || request?.status === "queued") {
    const slow = request?.status === "pending" && now - new Date(request.createdAt).getTime() > SLOW_START_MS;
    return (
      <div className={`${frame} space-y-2`}>
        <p className="flex items-center gap-2 text-sm">
          <Spinner /> {request?.status === "queued" ? `You're #${request.position ?? "?"} in line…` : "Starting…"}
        </p>
        {slow && (
          <p className="text-sm text-muted">
            The Pi is showing someone else&apos;s code right now. Yours is next and can take up to two minutes — keep this page open.
          </p>
        )}
        {errors}
      </div>
    );
  }

  if (request?.status === "linked") {
    return (
      <div className={`${frame} flex items-center gap-2 font-medium text-green-500`}>
        <Check /> Linked ✓
      </div>
    );
  }

  if (request?.status === "waiting" && request.uri) {
    const remaining = request.expiresAt ? new Date(request.expiresAt).getTime() - now : Infinity;
    if (remaining > 0) {
      return (
        <div className={`${frame} space-y-3`}>
          <div className="mx-auto w-full max-w-[280px] rounded-2xl bg-white p-3">
            <QrCode text={request.uri} className="aspect-square w-full" />
          </div>
          <p className="text-center text-sm tabular-nums text-muted">
            Expires in {Number.isFinite(remaining) ? countdown(remaining) : "—"}
          </p>
          {getSession()?.id !== memberId && (
            <p className="rounded-lg bg-gold/10 px-3 py-1.5 text-sm font-medium text-gold">
              This code is for {memberName(memberId)} only — only {memberName(memberId)}&apos;s phone should scan it.
            </p>
          )}
          <p className="text-sm">On the phone that has Signal: Settings → Linked Devices → + → scan this.</p>
          <a href={request.uri} className="block text-sm text-muted underline underline-offset-2 transition hover:text-text">
            Can&apos;t scan? On this phone, try opening the link in Signal
          </a>
          <p className="text-xs text-muted">
            You can&apos;t scan a code on the phone it&apos;s shown on — have a friend show you theirs, or open this page on a laptop.
          </p>
          {errors}
        </div>
      );
    }
    // Countdown ran out before the bot marked it; fall through to the expired view.
  }

  if (request?.status === "expired" || request?.status === "superseded" || request?.status === "waiting") {
    return (
      <div className={`${frame} space-y-3`}>
        <p className="text-sm">Code expired.</p>
        <PrimaryButton onClick={start} disabled={!online}>Show a new code</PrimaryButton>
        {offlineNote}
        {errors}
      </div>
    );
  }

  if (request?.status === "failed" && !alreadyLinkedFail) {
    return (
      <div className={`${frame} space-y-3`}>
        <p className="text-sm text-danger">{request.error || "Something went wrong."}</p>
        <PrimaryButton onClick={start} disabled={!online}>Try again</PrimaryButton>
        {offlineNote}
        {errors}
      </div>
    );
  }

  // ---- No request in flight: linked_accounts decides ---------------------------

  if (isLinked(account)) {
    return (
      <div className={`${frame} space-y-3`}>
        <div className="flex items-center gap-2 font-medium text-green-500">
          <Check />
          <span>Linked since {formatDateTime(account.linkedAt)}</span>
        </div>
        {alreadyLinkedFail && (
          <p className="text-sm text-muted">Already linked — remove pledgepi from Signal → Linked Devices first, then try again.</p>
        )}
        <TextButton onClick={start} disabled={!online}>Link again</TextButton>
        {offlineNote}
        {errors}
      </div>
    );
  }

  return (
    <div className={`${frame} space-y-3`}>
      {account?.status === "gone" && <p className="text-sm text-muted">This link was removed from Signal. Show a new code to link again.</p>}
      <PrimaryButton onClick={start} disabled={!online}>Show QR code</PrimaryButton>
      {offlineNote}
      {errors}
    </div>
  );
}
