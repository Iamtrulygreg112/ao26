"use client";

import { useRef, useState } from "react";
import { POSITIONS, type Position } from "@/lib/config";
import Popover, { menuItem } from "./Popover";

type Props = { value: Position | null; onChange: (value: Position | null) => void; disabled?: boolean };

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export default function PositionPill({ value, onChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  function choose(v: Position | null) {
    setOpen(false);
    if (v !== value) onChange(v);
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        aria-label={value ? `Position: ${value}` : "Choose a position"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition active:scale-[0.98] disabled:opacity-50 ${
          value ? "border-border bg-surface2 text-text" : "border-transparent bg-surface2 text-muted"
        }`}
      >
        {value ?? "—"}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={btn} align="right">
        {POSITIONS.map((p) => (
          <button key={p} type="button" role="menuitemradio" aria-checked={value === p} onClick={() => choose(p)} className={menuItem}>
            <span className="flex-1">{p}</span>
            {value === p && <Check />}
          </button>
        ))}
        <button type="button" role="menuitemradio" aria-checked={value === null} onClick={() => choose(null)} className={`${menuItem} text-muted`}>
          <span className="flex-1">None</span>
          {value === null && <Check />}
        </button>
      </Popover>
    </div>
  );
}
