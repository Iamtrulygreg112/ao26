"use client";

import { useState } from "react";

type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  /** When set, the confirm button is enabled only when the typed text matches exactly. */
  requireText?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

export default function ConfirmDialog({ title, body, confirmLabel, danger, requireText, onConfirm, onClose }: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canConfirm = !busy && (requireText === undefined || typed === requireText);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-4 md:items-center" role="dialog" aria-modal aria-labelledby="confirm-title">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-5">
        <h2 id="confirm-title" className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted">{body}</p>
        {requireText !== undefined && (
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={requireText}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-border bg-surface2 px-4 outline-none focus:border-azure"
          />
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="h-11 flex-1 rounded-xl border border-border bg-surface2 px-4 font-medium transition active:scale-[0.98]">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className={`h-11 flex-1 rounded-xl px-4 font-medium transition active:scale-[0.98] disabled:opacity-40 ${
              danger ? "border border-danger/30 bg-danger/10 text-danger" : "bg-azure text-white"
            }`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
