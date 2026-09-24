"use client";

import { useEffect, useMemo, useState } from "react";
import { OWNER_ID, TRACKED_MEMBERS, memberName } from "@/lib/config";
import { useSignalData } from "@/lib/signalData";
import { isLinked, type LinkedAccountRow } from "@/lib/linkData";
import {
  useLikeRequestsFor,
  type ChatMessageRow,
  type LikeRequestRow,
} from "@/lib/chatData";
import { requestLike, requestLikes } from "@/lib/likeWrites";
import { errorText } from "@/lib/writes";
import { GOLD_AT } from "./ChatBubble";
import ConfirmDialog from "./ConfirmDialog";
import Spinner from "./Spinner";

const OFFLINE_AFTER_MS = 3 * 60 * 1000;
const CONFIRM_ABOVE = 5;

type Option = "pick" | null;

function firstLine(m: ChatMessageRow): string {
  if (m.text) return m.text.split("\n")[0];
  const a = m.attachments?.[0];
  return a
    ? a.type === "image"
      ? "📷 Photo"
      : a.type === "video"
        ? "🎥 Video"
        : `📎 ${a.name}`
    : "(no text)";
}

function likeStatusText(r: LikeRequestRow): string {
  switch (r.status) {
    case "pending":
      return "Sending…";
    case "sent":
      return "Sent ✓";
    case "dry_run":
      return `Dry run${r.note ? ` · ${r.note}` : ""}`;
    case "skipped":
      return `Skipped · ${r.reason ?? "skipped"}`;
    case "failed":
      return `Failed · ${r.error ?? "error"}`;
  }
}

function Row({
  label,
  sub,
  onClick,
  disabled,
  active,
}: {
  label: string;
  sub?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={active}
      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left transition active:scale-[0.99] disabled:opacity-50 ${
        active ? "bg-surface2" : "bg-surface hover:bg-surface2"
      }`}
    >
      <span className="font-medium">{label}</span>
      {sub && (
        <span className="shrink-0 text-right text-xs text-muted">{sub}</span>
      )}
    </button>
  );
}

type Props = {
  /** The live message row — the sheet re-renders as likedBy changes. */
  m: ChatMessageRow;
  me: string;
  linked: Map<string, LinkedAccountRow>;
  onClose: () => void;
};

/** "React 👍 as…" — bottom sheet on phones, centered panel on wider screens. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export default function ReactSheet({ m, me, linked, onClose }: Props) {
  const { status, loaded: botLoaded } = useSignalData();
  const now = useNow(15_000);
  const { requests } = useLikeRequestsFor(m.id);
  const [open, setOpen] = useState<Option>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const likedBy = useMemo(() => new Set(m.likedBy ?? []), [m.likedBy]);
  const notLiked = useMemo(() => new Set(m.notLikedBy ?? []), [m.notLikedBy]);
  const thumbs = m.reactions?.["👍"] ?? m.thumbs;
  const isLinkedId = (id: string) => isLinked(linked.get(id));

  const lastSeen = status ? new Date(status.lastSeen).getTime() : NaN;
  const online = Number.isFinite(lastSeen) && now - lastSeen < OFFLINE_AFTER_MS;
  const banner =
    botLoaded &&
    (!online
      ? "The Pi is offline — requests will wait until it's back."
      : status?.dryRun
        ? "The bot is in DRY RUN — nothing is actually sent."
        : null);

  // "Me"
  const myLatest = requests.find((r) => r.memberId === me) ?? null;
  const meLiked = likedBy.has(me);
  const meLinked = isLinkedId(me);
  const meDisabledWhy =
    me === OWNER_ID
      ? "The Pi is your account"
      : meLiked
        ? "Already liked"
        : !meLinked
          ? "Not linked"
          : myLatest?.status === "pending"
            ? "Sending…"
            : null;

  // "Pick people"
  const selectable = TRACKED_MEMBERS.filter(
    (x) => !likedBy.has(x.id) && isLinkedId(x.id),
  );
  const selectedIds = [...picked].filter((id) =>
    selectable.some((x) => x.id === id),
  );
  const pickPending = requests.filter((r) => r.status === "pending").length;
  // Linked members who haven't reacted (and aren't mid-request) — what "Select all" checks.
  const allWhoHavent = selectable
    .filter(
      (x) =>
        notLiked.has(x.id) &&
        !requests.some((r) => r.memberId === x.id && r.status === "pending"),
    )
    .map((x) => x.id);
  const allSelected =
    allWhoHavent.length > 0 && allWhoHavent.every((id) => picked.has(id));

  async function likeMe() {
    setBusy(true);
    setError(null);
    try {
      await requestLike(m.id, me, me);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function likePicked() {
    setBusy(true);
    setError(null);
    try {
      await requestLikes(m.id, selectedIds, me);
      setPicked(new Set());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 md:items-center md:p-4"
        role="dialog"
        aria-modal
        aria-labelledby="react-title"
        onClick={onClose}
      >
        <div
          className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-border bg-surface pb-[env(safe-area-inset-bottom)] md:max-w-md md:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border md:hidden"
            aria-hidden
          />
          <div className="shrink-0 space-y-1 px-4 pb-3 pt-3">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="react-title"
                className="text-base font-semibold tracking-tight"
              >
                React 👍 as…
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 -mt-1 h-8 px-2 text-sm text-muted transition hover:text-text"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <p className="truncate text-sm text-muted">
              <span className="text-text">{m.authorName}:</span> {firstLine(m)}
            </p>
            <p className="text-xs tabular-nums text-muted">
              <span
                className={
                  thumbs >= GOLD_AT ? "font-medium text-gold" : "text-text"
                }
              >
                👍 {thumbs}
              </span>{" "}
              · {m.notLikedBy?.length ?? 0} haven&apos;t
            </p>
            {banner && (
              <p className="rounded-lg bg-gold/10 px-3 py-1.5 text-xs text-gold">
                {banner}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
            {/* Me */}
            <Row
              label="Me"
              sub={
                myLatest &&
                (myLatest.status === "pending" || myLatest.status === "sent")
                  ? likeStatusText(myLatest)
                  : (meDisabledWhy ?? `as ${memberName(me)}`)
              }
              disabled={busy || meDisabledWhy !== null}
              onClick={likeMe}
            />
            {myLatest &&
              !meLiked &&
              myLatest.status !== "pending" &&
              myLatest.status !== "sent" && (
                <p className="px-4 text-xs text-muted">
                  {likeStatusText(myLatest)}
                </p>
              )}

            {/* Pick people */}
            <Row
              label="Pick people"
              sub={
                open === "pick" ? "▲" : `${selectable.length} linked haven't`
              }
              active={open === "pick"}
              onClick={() => setOpen(open === "pick" ? null : "pick")}
            />
            {open === "pick" && (
              <div className="space-y-3 px-1 pb-1">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-muted">
                    {allWhoHavent.length} linked{" "}
                    {allWhoHavent.length === 1
                      ? "person hasn't"
                      : "people haven't"}{" "}
                    reacted
                  </p>
                  <button
                    type="button"
                    disabled={allWhoHavent.length === 0}
                    onClick={() =>
                      setPicked(allSelected ? new Set() : new Set(allWhoHavent))
                    }
                    className="text-xs font-medium text-azure underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {allSelected ? "Clear" : "Select all who haven't"}
                  </button>
                </div>
                <ul className="flex flex-wrap gap-1.5" aria-label="People">
                  {TRACKED_MEMBERS.map((x) => {
                    const liked = likedBy.has(x.id);
                    const isLinkedX = isLinkedId(x.id);
                    const sel = picked.has(x.id);
                    const pending = requests.some(
                      (r) => r.memberId === x.id && r.status === "pending",
                    );
                    if (liked) {
                      return (
                        <li
                          key={x.id}
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-surface2 px-3 text-xs font-medium text-text"
                          aria-label={`${x.name} liked`}
                        >
                          {x.name} <span className="text-green-500">✓</span>
                        </li>
                      );
                    }
                    if (!isLinkedX) {
                      return (
                        <li
                          key={x.id}
                          className="inline-flex h-8 items-center rounded-full border border-dashed border-border px-3 text-xs text-muted opacity-60"
                          title="not linked"
                          aria-label={`${x.name} not linked`}
                        >
                          {x.name}
                        </li>
                      );
                    }
                    return (
                      <li key={x.id}>
                        <button
                          type="button"
                          aria-pressed={sel}
                          disabled={pending}
                          onClick={() =>
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (next.has(x.id)) next.delete(x.id);
                              else next.add(x.id);
                              return next;
                            })
                          }
                          className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition active:scale-[0.98] disabled:opacity-60 ${
                            sel
                              ? "bg-azure text-white"
                              : "border border-border text-text"
                          }`}
                        >
                          {pending && <Spinner className="h-3 w-3" />}
                          {x.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  disabled={busy || selectedIds.length === 0}
                  onClick={() =>
                    selectedIds.length > CONFIRM_ABOVE
                      ? setConfirming(true)
                      : likePicked()
                  }
                  className="h-11 w-full rounded-xl bg-azure px-4 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  {`Like as ${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}`}
                </button>
                {pickPending > 0 && (
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <Spinner className="h-3 w-3" /> {pickPending} sending… chips
                    flip as each 👍 lands.
                  </p>
                )}
              </div>
            )}

            {error && <p className="px-4 text-sm text-danger">{error}</p>}
          </div>
        </div>
      </div>
      {/* A sibling of the backdrop, so its taps never bubble into onClose. */}
      {confirming && (
        <ConfirmDialog
          title={`Like as ${selectedIds.length} people?`}
          body={`A 👍 will go out from each of their linked Signal accounts, a few seconds apart. There is no undo.`}
          confirmLabel={`Like as ${selectedIds.length}`}
          onConfirm={likePicked}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
