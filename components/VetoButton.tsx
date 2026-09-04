"use client";

import { useState } from "react";
import { useData } from "@/lib/data";
import { likelyCover, veto } from "@/lib/veto";
import { errorText } from "@/lib/writes";
import type { EventRow } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";

type Props = { event: EventRow; memberId: string; compact?: boolean };

/** Danger "Veto" button + confirm dialog + inline result. Used on the Roster and the Home dashboard. */
export default function VetoButton({ event, memberId, compact = false }: Props) {
  const { standings, assignments, workEntries } = useData();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const args = { event, memberId, standings, assignments, workEntries };
  const cover = likelyCover(args);
  const pts = `${event.weight} pt${event.weight === 1 ? "" : "s"}`;
  const body = `You'll lose ${pts}. ${
    cover ? `${cover.name} would be assigned to cover.` : "Nobody is available to cover — the slot will just open up."
  }`;

  return (
    <>
      <div className={compact ? "flex flex-col items-end gap-1" : "flex flex-col gap-1"}>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className={`rounded-xl border border-danger/30 bg-danger/10 font-medium text-danger transition active:scale-[0.98] ${
            compact ? "h-9 px-3 text-sm" : "h-11 px-4"
          }`}
        >
          Veto
        </button>
        {result && <p className="text-sm text-muted">{result}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      {open && (
        <ConfirmDialog
          danger
          title={`Veto ${event.name}?`}
          body={body}
          confirmLabel="Veto"
          onClose={() => setOpen(false)}
          onConfirm={async () => {
            try {
              const r = await veto(args);
              setResult(r.cover ? `${r.cover.name} is covering for you.` : "No one was available to cover.");
              setOpen(false);
            } catch (err) {
              setError(errorText(err));
              setOpen(false);
            }
          }}
        />
      )}
    </>
  );
}
