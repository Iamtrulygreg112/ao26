"use client";

import { useState } from "react";
import { MEMBERS, memberName } from "@/lib/config";
import { useData } from "@/lib/data";
import { formatEventDate, isUpcoming, todayISO } from "@/lib/dates";
import { errorText, markRosterWorked, removeAssignment, setAssignments } from "@/lib/writes";
import type { EventRow } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import Spinner from "./Spinner";
import VetoButton from "./VetoButton";
import PeoplePicker from "./PeoplePicker";

export function CoveringPill({ memberId }: { memberId: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-xl border border-border bg-surface2 px-2 text-xs text-muted">
      covering for {memberName(memberId)}
    </span>
  );
}

export default function Roster({ event, sessionId }: { event: EventRow; sessionId: string }) {
  const { assignments, workEntries, standings } = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undoFor, setUndoFor] = useState<string | null>(null);

  const upcoming = isUpcoming(event.date);
  const future = event.date > todayISO(); // today's event takes adds in the Worked section instead
  const onEvent = assignments.filter((a) => a.eventId === event.id);
  const assigned = onEvent.filter((a) => a.status === "assigned").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const vetoed = onEvent.filter((a) => a.status === "vetoed").sort((a, b) => (a.vetoedAt ?? "").localeCompare(b.vetoedAt ?? ""));
  const workedIds = new Set(workEntries.filter((w) => w.eventId === event.id).map((w) => w.memberId));
  const taken = new Set([...onEvent.map((a) => a.memberId), ...workedIds]);
  const addable = MEMBERS.filter((m) => !taken.has(m.id));
  const unworked = assigned.filter((a) => !workedIds.has(a.memberId)).map((a) => a.memberId);
  const pointsOf = (id: string) => standings.find((s) => s.memberId === id)?.points ?? 0;
  const full = assigned.length >= event.headcount;

  async function run(key: string, op: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await op();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-muted">Roster</h2>
        <span className={`text-sm font-medium tabular-nums ${full ? "text-azure" : "text-gold"}`}>
          {assigned.length}/{event.headcount}
        </span>
      </div>

      {assigned.length === 0 ? (
        <p className="text-sm text-muted">Nobody assigned yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {assigned.map((a) => {
            const me = a.memberId === sessionId;
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{memberName(a.memberId)}</span>
                    <span className="text-xs tabular-nums text-muted">{pointsOf(a.memberId)} pts</span>
                    {a.coveringFor && <CoveringPill memberId={a.coveringFor} />}
                  </div>
                </div>
                {busy === a.memberId && <Spinner />}
                {upcoming && me && <VetoButton event={event} memberId={sessionId} compact />}
                {upcoming && !me && (
                  <button
                    type="button"
                    aria-label={`Remove ${memberName(a.memberId)}`}
                    disabled={busy !== null}
                    onClick={() => run(a.memberId, () => removeAssignment(event.id, a.memberId))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:text-danger active:scale-[0.98]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {vetoed.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted">Vetoed</p>
          <ul className="space-y-1">
            {vetoed.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="line-through">{memberName(a.memberId)}</span>
                <span className="tabular-nums text-danger">−{event.weight}</span>
                {a.vetoedAt && <span>vetoed {formatEventDate(a.vetoedAt.slice(0, 10))}</span>}
                <button type="button" onClick={() => setUndoFor(a.memberId)} className="text-azure underline-offset-4 hover:underline">
                  undo
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {future && (
        <PeoplePicker
          members={addable}
          sessionId={sessionId}
          busyId={busy}
          onPick={(id) => run(id, () => setAssignments(event.id, [id], "manual"))}
        />
      )}

      {!upcoming && unworked.length > 0 && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("mark", () => markRosterWorked(event.id, unworked, sessionId))}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface2 px-4 font-medium transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy === "mark" && <Spinner />}
          Mark roster as worked
        </button>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {undoFor && (
        <ConfirmDialog
          title="Remove this veto?"
          body={`${memberName(undoFor)} gets the ${event.weight} pts back.`}
          confirmLabel="Remove veto"
          onClose={() => setUndoFor(null)}
          onConfirm={async () => {
            await removeAssignment(event.id, undoFor);
            setUndoFor(null);
          }}
        />
      )}
    </div>
  );
}
