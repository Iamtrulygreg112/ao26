"use client";

import { useState } from "react";
import { MEMBERS, memberName } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { addWorkEntry, errorText, removeWorkEntry, setPosition } from "@/lib/writes";
import type { EventRow, WorkEntryRow } from "@/lib/types";
import Spinner from "./Spinner";
import PositionPill from "./PositionPill";
import PeoplePicker from "./PeoplePicker";

type Props = {
  event: EventRow;
  entries: WorkEntryRow[];
  sessionId: string;
  managing: boolean;
  onManagingChange: (managing: boolean) => void;
};

const LABEL = "text-xs uppercase tracking-widest text-muted";

export default function WorkedList({ event, entries, sessionId, managing, onManagingChange }: Props) {
  const [busy, setBusy] = useState<string | null>(null); // memberId being written
  const [errors, setErrors] = useState<Record<string, string>>({});

  const future = event.date > todayISO();
  const mine = entries.some((w) => w.memberId === sessionId);
  const onList = new Set(entries.map((w) => w.memberId));
  const addable = MEMBERS.filter((m) => !onList.has(m.id));
  const order = (id: string) => MEMBERS.findIndex((m) => m.id === id);
  const sorted = [...entries].sort((a, b) => order(a.memberId) - order(b.memberId));

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
      <div className="flex items-center justify-between">
        <p className={LABEL}>
          Worked{" "}
          {!future && (
            <span className="tabular-nums text-gold">
              {entries.length}/{event.headcount}
            </span>
          )}
        </p>
        {!future && (
          <button type="button" onClick={() => onManagingChange(!managing)} className="text-sm text-azure">
            {managing ? "Done" : "Manage"}
          </button>
        )}
      </div>

      {future ? (
        <p className="text-sm text-muted">You can log this after the event.</p>
      ) : (
        <>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted">Nobody logged yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {sorted.map((w) => (
                <li key={w.id} className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {memberName(w.memberId)}
                      {w.memberId === sessionId && <span className="ml-1 text-xs text-muted">(you)</span>}
                    </span>
                    {busy === w.memberId && <Spinner />}
                    <PositionPill
                      value={w.position}
                      disabled={busy === w.memberId}
                      onChange={(v) => run(w.memberId, () => setPosition(event.id, w.memberId, v))}
                    />
                    {managing && (
                      <button
                        type="button"
                        aria-label={`Remove ${memberName(w.memberId)}`}
                        disabled={busy === w.memberId}
                        onClick={() => run(w.memberId, () => removeWorkEntry(event.id, w.memberId))}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:text-danger active:scale-[0.98]"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {errors[w.memberId] && <p className="mt-1 text-sm text-danger">{errors[w.memberId]}</p>}
                </li>
              ))}
            </ul>
          )}

          {managing ? (
            <div className="space-y-2">
              <p className={LABEL}>Add</p>
              <PeoplePicker members={addable} sessionId={sessionId} busyId={busy} onPick={add} />
              {Object.entries(errors)
                .filter(([id, msg]) => msg && !onList.has(id))
                .map(([id, msg]) => (
                  <p key={id} className="text-sm text-danger">{memberName(id)}: {msg}</p>
                ))}
            </div>
          ) : (
            <>
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
            </>
          )}
        </>
      )}
    </div>
  );
}
