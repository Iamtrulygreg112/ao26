"use client";

import { useState } from "react";
import { useSession } from "@/lib/useSession";
import { isLinked, useLinkedAccounts } from "@/lib/linkData";
import { TRACKED_MEMBERS } from "@/components/MemberGrid";
import LinkCard from "@/components/LinkCard";

const OWNER_ID = "chase";

/** Owner only: pick any other pledge and show a link code for them. */
function LinkOthers() {
  const { accounts, loaded, error } = useLinkedAccounts();
  const [picked, setPicked] = useState<string | null>(null);
  const linkedCount = TRACKED_MEMBERS.filter((m) => isLinked(accounts.get(m.id))).length;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs uppercase tracking-widest text-muted">Link someone else</h2>
        <p className="text-sm tabular-nums text-muted">{loaded ? `${linkedCount} of ${TRACKED_MEMBERS.length} linked` : "…"}</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="flex flex-wrap gap-1.5" aria-label="Members">
        {TRACKED_MEMBERS.map((m) => {
          const linked = isLinked(accounts.get(m.id));
          const active = picked === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setPicked(active ? null : m.id)}
                className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition active:scale-[0.98] ${
                  active ? "bg-azure text-white" : linked ? "bg-surface2 text-text" : "border border-border text-muted"
                }`}
              >
                {m.name}
                {linked && (
                  <span className={active ? "text-white" : "text-green-500"} aria-label="linked">
                    ✓
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {picked && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{TRACKED_MEMBERS.find((m) => m.id === picked)?.name}</p>
          <LinkCard key={picked} memberId={picked} />
        </div>
      )}
    </section>
  );
}

export default function LinkPage() {
  const { session } = useSession();
  const me = session?.id ?? "";

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Link your Signal</h1>
        <p className="text-sm leading-relaxed text-muted">
          This connects your Signal to the pledge-class Pi, the same way Signal Desktop connects to your phone. It lets the Pi see the
          pledge group chats on your account. Right now it only reads — it never sends anything as you. You can remove it any time in
          Signal → Settings → Linked Devices.
        </p>
        {me && <LinkCard memberId={me} />}
      </section>

      {me === OWNER_ID && <LinkOthers />}
    </div>
  );
}
