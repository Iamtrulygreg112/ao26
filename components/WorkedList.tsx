"use client";

import { useState } from "react";
import { MEMBERS, POSITIONS, memberName, type Position } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { addWorkEntries, errorText, removeWorkEntry, setPosition } from "@/lib/writes";
import type { EventRow, WorkEntryRow } from "@/lib/types";
import Spinner from "./Spinner";
import PeoplePicker from "./PeoplePicker";

type Props = { event: EventRow; entries: WorkEntryRow[]; sessionId: string };

export default function WorkedList({ event, entries, sessionId }: Props) {
  const [busy, setBusy] = useState<string | null>(null); // memberId being written
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (event.date > todayISO()) {
    return <p className="text-sm text-muted">You can log this after the event.</p>;
  }

  const withEntry = new Set(entries.map((w) => w.memberId));
  const available = MEMBERS.filter((m) => !withEntry.has(m.id));
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

  return (
    <div className="space-y-4">
      {sorted.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {sorted.map((w) => (
            <li key={w.id} className="px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-medium">{memberName(w.memberId)}</span>
                {busy === w.memberId && <Spinner />}
                <select
                  aria-label={`Position for ${memberName(w.memberId)}`}
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
                  aria-label={`Remove ${memberName(w.memberId)}`}
                  disabled={busy === w.memberId}
                  onClick={() => run(w.memberId, () => removeWorkEntry(event.id, w.memberId))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:text-danger active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              {errors[w.memberId] && <p className="mt-1 text-sm text-danger">{errors[w.memberId]}</p>}
            </li>
          ))}
        </ul>
      )}

      {sorted.length === 0 && <p className="text-sm text-muted">Nobody logged yet.</p>}

      <PeoplePicker
        members={available}
        sessionId={sessionId}
        label="Add people who worked"
        onSubmit={(ids) => addWorkEntries(event.id, ids, sessionId)}
      />

      <p className="text-sm text-muted">
        Each person here earns <span className="tabular-nums">{event.weight}</span> pt{event.weight === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
