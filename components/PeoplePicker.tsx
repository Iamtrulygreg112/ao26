"use client";

import type { Member } from "@/lib/config";
import Spinner from "./Spinner";

type Props = {
  /** Members who can still be added. */
  members: Member[];
  sessionId: string;
  /** Called immediately when a chip is tapped. */
  onPick: (memberId: string) => void;
  /** Member id currently being written, if any. */
  busyId?: string | null;
};

/** Chip grid of people not yet on a list; tapping a chip adds them. */
export default function PeoplePicker({ members, sessionId, onPick, busyId = null }: Props) {
  if (members.length === 0) return <p className="text-sm text-muted">Everyone&apos;s here.</p>;

  // You first, then config order.
  const ordered = [...members.filter((m) => m.id === sessionId), ...members.filter((m) => m.id !== sessionId)];

  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
      {ordered.map((m) => (
        <button
          key={m.id}
          type="button"
          disabled={busyId !== null}
          onClick={() => onPick(m.id)}
          className="flex h-9 items-center justify-center gap-1 truncate rounded-full border border-border bg-surface2 px-3 text-sm transition hover:border-azure active:scale-[0.98] disabled:opacity-60"
        >
          {busyId === m.id && <Spinner />}
          <span className="truncate">{m.id === sessionId ? `${m.name} (you)` : m.name}</span>
        </button>
      ))}
    </div>
  );
}
