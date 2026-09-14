"use client";

import { useState } from "react";
import { useSignalData, type SignalMessageRow } from "@/lib/signalData";
import { useSession } from "@/lib/useSession";
import { formatMessageTime } from "@/lib/dates";
import MemberGrid from "@/components/MemberGrid";

const ALL = "__all__";

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition active:scale-[0.98] ${
        active ? "border-border bg-surface2 text-text" : "border-border bg-surface text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center gap-2 text-sm">
      <span className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border transition ${on ? "border-azure bg-azure" : "border-border bg-surface2"}`} aria-hidden>
        <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      <span className={on ? "text-text" : "text-muted"}>{label}</span>
    </button>
  );
}

// Heuristic for "would this overflow three lines?" — avoids measuring the DOM.
const needsExpand = (text: string) => text.length > 140 || text.split("\n").length > 3;

function MessageCard({ m, onlyMissing }: { m: SignalMessageRow; onlyMissing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const missing = m.notLikedBy?.length ?? 0;
  const text = m.text;

  return (
    <li className="space-y-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <span className="font-medium">{m.authorName}</span>
        <span className="text-muted">{m.groupName}</span>
        <span className="ml-auto text-xs text-muted tabular-nums">{formatMessageTime(m.ts)}</span>
      </div>

      {text ? (
        <div>
          <p className={`whitespace-pre-wrap break-words text-sm ${expanded ? "" : "line-clamp-3"}`}>{text}</p>
          {needsExpand(text) && (
            <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 text-xs text-azure underline-offset-4 hover:underline">
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">(photo / no text)</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-gold">{m.thumbs}</span>
          <span className="text-sm" aria-label="thumbs up">👍</span>
        </span>
        <span className="text-xs text-muted tabular-nums">{missing} missing</span>
        {m.autoThumbed && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gold">
            <Check />
            auto
          </span>
        )}
        {m.unmappedReactors > 0 && <span className="text-[11px] text-muted tabular-nums">+{m.unmappedReactors} non-pledges</span>}
      </div>

      <MemberGrid likedBy={m.likedBy ?? []} notLikedBy={m.notLikedBy ?? []} mode={onlyMissing ? "missing" : "all"} />
    </li>
  );
}

export default function SignalPage() {
  const { groups, messages, loaded, error } = useSignalData();
  const { session } = useSession();
  const [groupId, setGroupId] = useState<string>(ALL);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [justMe, setJustMe] = useState(false);
  const me = session?.id ?? "";

  const enabled = groups.filter((g) => g.enabled).sort((a, b) => a.name.localeCompare(b.name));
  const inGroup = groupId === ALL ? messages : messages.filter((m) => m.groupId === groupId);
  const shown = justMe ? inGroup.filter((m) => (m.notLikedBy ?? []).includes(me)) : inGroup;

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={groupId === ALL} onClick={() => setGroupId(ALL)}>All</Chip>
        {enabled.map((g) => (
          <Chip key={g.id} active={groupId === g.groupId} onClick={() => setGroupId(g.groupId)}>
            {g.name}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Toggle on={onlyMissing} onChange={setOnlyMissing} label="Only show who's missing" />
        <Toggle on={justMe} onChange={setJustMe} label="Just me" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!loaded ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        justMe ? (
          <p className="text-sm font-medium text-gold">You&apos;re caught up.</p>
        ) : (
          <p className="text-sm text-muted">Nothing has hit the threshold yet.</p>
        )
      ) : (
        <ul className="space-y-2">
          {shown.map((m) => (
            <MessageCard key={m.id} m={m} onlyMissing={onlyMissing} />
          ))}
        </ul>
      )}
    </div>
  );
}
