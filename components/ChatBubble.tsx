"use client";

import type { ChatMessageRow } from "@/lib/chatData";
import { colorFor } from "@/lib/colors";
import { formatClock } from "@/lib/dates";

export const GOLD_AT = 20;

function attachmentLabel(a: ChatMessageRow["attachments"][number]): string {
  if (a.type === "image") return "📷 Photo";
  if (a.type === "video") return "🎥 Video";
  return `📎 ${a.name || "File"}`;
}

/** Ordered for display: 👍 first, then by count. */
export function reactionPills(reactions: Record<string, number> | undefined): Array<[string, number]> {
  const entries = Object.entries(reactions ?? {}).filter(([, n]) => n > 0);
  entries.sort((a, b) => (a[0] === "👍" ? -1 : b[0] === "👍" ? 1 : b[1] - a[1]));
  return entries;
}

type Props = {
  m: ChatMessageRow;
  /** True when this is the first bubble of a run from the same author. */
  showName: boolean;
  mine: boolean;
  onOpen: (m: ChatMessageRow) => void;
};

export default function ChatBubble({ m, showName, mine, onOpen }: Props) {
  const pills = reactionPills(m.reactions);
  const author = colorFor(m.authorUuid || m.authorName);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] md:max-w-[70%] ${showName ? "mt-2" : "mt-0.5"}`}>
        <button
          type="button"
          onClick={() => onOpen(m)}
          className={`block w-full rounded-2xl px-3.5 py-2 text-left transition active:scale-[0.99] ${
            mine ? "rounded-br-md bg-azure text-white" : "rounded-bl-md bg-surface2 text-text"
          }`}
        >
          {showName && !mine && <p className={`mb-0.5 text-xs font-semibold ${author.name}`}>{m.authorName}</p>}
          {m.quote && (
            <div className={`mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs ${mine ? "border-white/60 bg-white/10" : "border-azure bg-surface"}`}>
              <p className={`font-medium ${mine ? "text-white" : "text-azure"}`}>{m.quote.authorName}</p>
              <p className={`line-clamp-2 ${mine ? "text-white/80" : "text-muted"}`}>{m.quote.text || "📷 Photo"}</p>
            </div>
          )}
          {m.attachments?.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1">
              {m.attachments.map((a, i) => (
                <span key={i} className={`inline-flex h-6 max-w-full items-center truncate rounded-full px-2 text-[11px] ${mine ? "bg-white/15" : "bg-surface"}`}>
                  {attachmentLabel(a)}
                </span>
              ))}
            </div>
          )}
          {m.text && <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.text}</p>}
          <p className={`mt-0.5 text-right text-[10px] tabular-nums ${mine ? "text-white/70" : "text-muted"}`}>{formatClock(m.ts)}</p>
        </button>
        {pills.length > 0 && (
          <div className={`-mt-1.5 flex flex-wrap gap-1 px-1 ${mine ? "justify-end" : ""}`}>
            {pills.map(([emoji, n]) => {
              const thumbs = emoji === "👍";
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onOpen(m)}
                  aria-label={`${emoji} ${n}${thumbs ? ", react as someone" : ""}`}
                  className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium tabular-nums transition active:scale-[0.97] ${
                    thumbs && n >= GOLD_AT ? "border-gold/50 bg-gold/15 text-gold" : "border-border bg-surface text-text"
                  }`}
                >
                  <span aria-hidden>{emoji}</span>
                  {n}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
