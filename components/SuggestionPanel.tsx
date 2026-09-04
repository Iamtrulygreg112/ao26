"use client";

import { useState } from "react";
import { useData } from "@/lib/data";
import { formatEventDate } from "@/lib/dates";
import { suggest } from "@/lib/suggest";
import { errorText, setAssignment, setAssignments } from "@/lib/writes";
import type { EventRow } from "@/lib/types";
import Spinner from "./Spinner";

export default function SuggestionPanel({ event }: { event: EventRow }) {
  const { standings, assignments, workEntries } = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedCount = assignments.filter((a) => a.eventId === event.id && a.status === "assigned").length;
  const full = assignedCount >= event.headcount;
  const picks = full ? [] : suggest({ event, standings, assignments, workEntries });

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
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted">Suggested</h2>
        <p className="mt-1 text-sm text-muted">Lowest points first · ties go to whoever worked longest ago.</p>
      </div>

      {full ? (
        <p className="text-sm text-muted">Roster is full.</p>
      ) : picks.length === 0 ? (
        <p className="text-sm text-muted">Nobody left to suggest.</p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {picks.map((s) => (
              <li key={s.memberId} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{s.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="tabular-nums">{s.points} pts</span>
                    {s.lastWorked ? <span>last {formatEventDate(s.lastWorked)}</span> : <span className="text-gold">never worked</span>}
                  </div>
                </div>
                {busy === s.memberId && <Spinner />}
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run(s.memberId, () => setAssignment({ eventId: event.id, memberId: s.memberId, source: "suggested" }))}
                  className="h-9 rounded-xl border border-border bg-surface2 px-3 text-sm font-medium transition active:scale-[0.98] disabled:opacity-60"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("all", () => setAssignments(event.id, picks.map((s) => s.memberId), "suggested"))}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-azure px-4 font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy === "all" && <Spinner className="text-white" />}
            Add all <span className="tabular-nums">{picks.length}</span>
          </button>
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
