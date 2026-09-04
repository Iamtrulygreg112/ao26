"use client";

import { useState } from "react";
import { WEIGHTS, type Weight } from "@/lib/config";
import { todayISO } from "@/lib/dates";

export type EventFormValues = { name: string; date: string; headcount: number; weight: Weight; notes: string | null };

type Props = {
  initial?: EventFormValues;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel?: () => void;
};

const WEIGHT_KEYS = [1, 2, 3] as const;

export default function EventForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [headcount, setHeadcount] = useState(String(initial?.headcount ?? 4));
  const [weight, setWeight] = useState<Weight>(initial?.weight ?? 2);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hc = Number(headcount);
  const valid = name.trim().length > 0 && name.trim().length <= 60 && date.length === 10 && Number.isInteger(hc) && hc >= 1 && notes.length <= 200;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), date, headcount: hc, weight, notes: notes.trim() ? notes.trim() : null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const field = "h-11 w-full rounded-xl border border-border bg-surface2 px-4 outline-none focus:border-azure";
  const label = "block text-xs uppercase tracking-widest text-muted mb-2";

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor="ev-name" className={label}>Name</label>
        <input id="ev-name" type="text" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ev-date" className={label}>Date</label>
          <input id="ev-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${field} tabular-nums`} />
        </div>
        <div>
          <label htmlFor="ev-headcount" className={label}>Headcount</label>
          <input id="ev-headcount" type="number" required min={1} inputMode="numeric" value={headcount} onChange={(e) => setHeadcount(e.target.value)} className={`${field} tabular-nums`} />
        </div>
      </div>
      <div>
        <p className={label}>Weight</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Weight">
          {WEIGHT_KEYS.map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={weight === w}
              onClick={() => setWeight(w)}
              className={`h-11 rounded-xl border px-2 text-sm font-medium transition active:scale-[0.98] ${
                weight === w ? "border-azure bg-azure text-white" : "border-border bg-surface2 text-muted"
              }`}
            >
              <span className="tabular-nums">{w}</span> {WEIGHTS[w]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="ev-notes" className={label}>Notes (optional)</label>
        <textarea id="ev-notes" maxLength={200} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-border bg-surface2 px-4 py-3 outline-none focus:border-azure" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="h-11 flex-1 rounded-xl border border-border bg-surface2 px-4 font-medium transition active:scale-[0.98]">
            Cancel
          </button>
        )}
        <button type="submit" disabled={!valid || busy} className="h-11 flex-1 rounded-xl bg-azure px-4 font-medium text-white transition active:scale-[0.98] disabled:opacity-40">
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
