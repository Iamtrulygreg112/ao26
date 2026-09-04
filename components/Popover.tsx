"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The button that opened this popover; clicks on it are not "outside". */
  anchor: React.RefObject<HTMLElement | null>;
  align?: "left" | "right";
  children: React.ReactNode;
};

/**
 * Tiny in-house popover. Render it as a sibling of the anchor inside a
 * `relative` wrapper; it sits 6px below the anchor, aligned to one edge.
 * Closes on outside tap, Escape, and route change.
 */
export default function Popover({ open, onClose, anchor, align = "left", children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const openedOn = useRef(pathname);

  useEffect(() => {
    if (!open) {
      openedOn.current = pathname;
      return;
    }
    // Route changed while open: close.
    if (openedOn.current !== pathname) {
      onClose();
      return;
    }
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchor, pathname]);

  if (!open) return null;

  return (
    <div
      ref={panel}
      role="menu"
      className={`absolute top-full z-50 mt-1.5 min-w-[10rem] max-w-[calc(100vw-2rem)] origin-top animate-pop rounded-xl border border-border bg-surface p-1 shadow-lg ${
        align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
      }`}
    >
      {children}
    </div>
  );
}

export const menuItem =
  "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition hover:bg-surface2 active:bg-surface2";
