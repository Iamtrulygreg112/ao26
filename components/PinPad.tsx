"use client";

import { useState } from "react";

type Props = {
  onComplete: (pin: string) => void;
  /** When true, the dots play a 300ms shake. */
  shake?: boolean;
  disabled?: boolean;
};

const KEYS: Array<string | null> = ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, "0", "back"];

/** 3x4 keypad with 4 dots. To clear the entered digits, remount it with a new React `key`. */
export default function PinPad({ onComplete, shake = false, disabled = false }: Props) {
  const [digits, setDigits] = useState("");

  function press(key: string) {
    if (disabled) return;
    if (key === "back") {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (digits.length >= 4) return;
    const next = digits + key;
    setDigits(next);
    if (next.length === 4) onComplete(next);
  }

  return (
    <div className="mx-auto w-full max-w-xs space-y-8">
      <div
        className={`flex justify-center gap-4 ${shake ? "animate-shake" : ""}`}
        role="status"
        aria-label={`${digits.length} of 4 digits entered`}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border transition ${
              i < digits.length ? "border-azure bg-azure" : "border-border bg-surface2"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key) => {
          if (key === null) return <span key="blank" aria-hidden />;
          const isBack = key === "back";
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={isBack ? "Delete" : key}
              className="flex h-14 items-center justify-center rounded-xl border border-border bg-surface2 text-xl font-medium tabular-nums transition active:scale-[0.98] disabled:opacity-50"
            >
              {isBack ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              ) : (
                key
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
