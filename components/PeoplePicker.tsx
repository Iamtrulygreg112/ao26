"use client";

import { useState } from "react";
import type { Member } from "@/lib/config";
import { errorText } from "@/lib/writes";
import Spinner from "./Spinner";

type Props = {
  /** Members who can still be added. */
  members: Member[];
  sessionId: string;
  label: string;
  onSubmit: (memberIds: string[]) => Promise<void>;
};

/** One place to add yourself and/or other people: tick names, press Update. */
export default function PeoplePicker({ members, sessionId, label, onSubmit }: Props) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (members.length === 0) return null;

  // You first, then config order.
  const ordered = [...members.filter((m) => m.id === sessionId), ...members.filter((m) => m.id !== sessionId)];

  function toggle(id: string) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (picked.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit([...picked]);
      setPicked(new Set());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {ordered.map((m) => {
          const on = picked.has(m.id);
          const me = m.id === sessionId;
          return (
            <button
              key={m.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={busy}
              onClick={() => toggle(m.id)}
              className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-left font-medium transition active:scale-[0.98] ${
                on ? "border-azure bg-azure/15 text-text" : "border-border bg-surface2 text-muted"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  on ? "border-azure bg-azure text-white" : "border-border"
                }`}
                aria-hidden
              >
                {on && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </span>
              <span className="truncate">{me ? `${m.name} (you)` : m.name}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy || picked.size === 0}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-azure px-4 font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {busy && <Spinner className="text-white" />}
        {picked.size > 0 ? (
          <>
            Update <span className="tabular-nums">({picked.size})</span>
          </>
        ) : (
          "Update"
        )}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
