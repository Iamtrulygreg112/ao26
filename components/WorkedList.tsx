"use client";

import { useState } from "react";
import { MEMBERS, POSITIONS, memberName, type Position } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { addWorkEntry, errorText, removeWorkEntry, setPosition } from "@/lib/writes";
import type { EventRow, WorkEntryRow } from "@/lib/types";
import Spinner from "./Spinner";

type Props = { event: EventRow; entries: WorkEntryRow[]; sessionId: string };

export default function WorkedList({ event, entries, sessionId }: Props) {
  const [busy, setBusy] = useState<string | null>(null); // memberId being written
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (event.date > todayISO()) {
    return <p className="text-sm text-muted">You can log this after the event.</p>;
  }

  const mine = entries.some((w) => w.memberId === sessionId);
  const sorted = [...entries].sort(
    (a, b) => MEMBERS.findIndex((m) => m.id === a.memberId) - MEMBERS.findIndex((m) => m.id === b.memberId),
  );

  async function run(memberId: string, op: () => Promise<void>) {
    setBusy(memberId);
    setErrors((e) => ({ ...e, [memberId]: "" }));
    try {
      await op();
    } catch (err) {
      setErrors((e) => ({ ...e, [memberId]: errorText(err) }));
    } finally {
      setBusy(null);
    }
  }

  const add = (memberId: string) => run(memberId, () => addWorkEntry({ eventId: event.id, memberId, createdBy: sessionId }));

  return (
    <div className="space-y-4">
      {sorted.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {sorted.map((w) => (
            <li key={w.id} className="px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {memberName(w.memberId)}
                  {w.memberId === sessionId && <span className="ml-1 text-xs text-muted">(you)</span>}
                </span>
                {busy === w.memberId && <Spinner />}
                {w.memberId === sessionId ? (
                  <>
                    <select
                      aria-label="Your position"
                      value={w.position ?? ""}
                      disabled={busy === w.memberId}
                      onChange={(e) => {
                        const v = e.target.value;
                        run(w.memberId, () => setPosition(event.id, w.memberId, v ? (v as Position) : null));
                      }}
                      className="h-9 rounded-xl border border-border bg-surface2 px-2 text-sm outline-none focus:border-azure"
                    >
                      <option value="">—</option>
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label="Remove yourself"
                      disabled={busy === w.memberId}
                      onClick={() => run(w.memberId, () => removeWorkEntry(event.id, w.memberId))}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:text-danger active:scale-[0.98]"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-muted">{w.position ?? "—"}</span>
                )}
              </div>
              {errors[w.memberId] && <p className="mt-1 text-sm text-danger">{errors[w.memberId]}</p>}
            </li>
          ))}
        </ul>
      )}

      {sorted.length === 0 && <p className="text-sm text-muted">Nobody logged yet.</p>}

      {mine ? (
        <button type="button" disabled className="h-11 w-full rounded-xl border border-border bg-surface2 px-4 font-medium text-muted">
          You&apos;re logged ✓
        </button>
      ) : (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => add(sessionId)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-azure px-4 font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy === sessionId && <Spinner className="text-white" />}
          I worked
        </button>
      )}
      {!mine && errors[sessionId] && <p className="text-sm text-danger">{errors[sessionId]}</p>}

      <p className="text-sm text-muted">
        Each person here earns <span className="tabular-nums">{event.weight}</span> pt{event.weight === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
