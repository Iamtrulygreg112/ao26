"use client";

import { useRef, useState } from "react";
import Popover, { menuItem } from "./Popover";

export default function EventMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  function pick(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={btn}
        type="button"
        aria-label="Event options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface2 hover:text-text"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={btn} align="right">
        <button type="button" role="menuitem" onClick={() => pick(onEdit)} className={menuItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit event
        </button>
        <button type="button" role="menuitem" onClick={() => pick(onDelete)} className={`${menuItem} text-danger`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Delete event
        </button>
      </Popover>
    </div>
  );
}
