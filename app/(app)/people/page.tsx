"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { OWNER_ID, TRACKED_MEMBERS } from "@/lib/config";
import { isLinked, useLinkedAccounts, type LinkedAccountRow } from "@/lib/linkData";
import { formatEventDate } from "@/lib/dates";
import { colorFor, initials } from "@/lib/colors";

type Filter = "all" | "linked" | "not";

function Pill({ account }: { account: LinkedAccountRow | undefined }) {
  if (isLinked(account)) {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-green-500/15 px-2 text-[11px] font-medium text-green-400">
        Linked <span className="text-green-500/70">· since {formatEventDate(account.linkedAt.slice(0, 10))}</span>
      </span>
    );
  }
  if (account?.status === "gone") {
    return <span className="inline-flex h-6 items-center rounded-full border border-border px-2 text-[11px] font-medium text-muted">Unlinked</span>;
  }
  return <span className="inline-flex h-6 items-center rounded-full border border-dashed border-border px-2 text-[11px] font-medium text-muted">Not linked</span>;
}

export default function PeoplePage() {
  const { session } = useSession();
  const { accounts, loaded, error } = useLinkedAccounts();
  const [filter, setFilter] = useState<Filter>("all");
  const isOwner = session?.id === OWNER_ID;

  const linkedCount = TRACKED_MEMBERS.filter((m) => isLinked(accounts.get(m.id))).length;
  const shown = TRACKED_MEMBERS.filter((m) => {
    const linked = isLinked(accounts.get(m.id));
    return filter === "all" || (filter === "linked" ? linked : !linked);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm tabular-nums text-muted">{loaded ? `${linkedCount} of ${TRACKED_MEMBERS.length} linked` : "…"}</p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Filter">
        {(
          [
            ["all", "All"],
            ["linked", "Linked"],
            ["not", "Not linked"],
          ] as Array<[Filter, string]>
        ).map(([f, label]) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`h-9 rounded-full border px-3.5 text-sm font-medium transition active:scale-[0.98] ${
              filter === f ? "border-border bg-surface2 text-text" : "border-border bg-surface text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!loaded ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">{filter === "not" ? "Everyone is linked." : "Nobody yet."}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {shown.map((m) => {
            const account = accounts.get(m.id);
            const linked = isLinked(account);
            const c = colorFor(m.name);
            const inner = (
              <>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${c.avatar}`} aria-hidden>
                  {initials(m.name)}
                </span>
                <span className="flex-1 truncate font-medium">
                  {m.name}
                  {m.id === session?.id && <span className="text-muted"> (you)</span>}
                </span>
                <Pill account={account} />
              </>
            );
            const href = isOwner ? `/link?member=${m.id}` : "/link";
            return (
              <li key={m.id}>
                {linked ? (
                  <div className="flex items-center gap-3 px-3 py-2.5">{inner}</div>
                ) : (
                  <Link href={href} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface2 active:bg-surface2">
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
