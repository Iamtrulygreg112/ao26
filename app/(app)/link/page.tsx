"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { isLinked, useLinkedAccount, useLinkedAccounts } from "@/lib/linkData";
import { OWNER_ID, TRACKED_MEMBERS } from "@/lib/config";
import LinkCard from "@/components/LinkCard";

/** Owner only: pick any other pledge and show a link code for them. */
function LinkOthers() {
  const { accounts, loaded, error } = useLinkedAccounts();
  const preselect = useSearchParams().get("member");
  const [picked, setPicked] = useState<string | null>(() => (preselect && TRACKED_MEMBERS.some((m) => m.id === preselect) ? preselect : null));
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

/**
 * The owner's own account IS the Pi's account, so his card is replaced by a
 * note. If linked_accounts/chase exists anyway, somebody scanned a code that was
 * shown on the owner's card — say so and how to undo it.
 */
function OwnerNote() {
  const { account } = useLinkedAccount(OWNER_ID);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
      <p className="text-muted">The Pi already runs on your Signal account — there&apos;s nothing to link for you. Use the chips below to link someone else.</p>
      {isLinked(account) && (
        <div className="space-y-1 rounded-lg bg-gold/10 px-3 py-2 text-gold">
          <p className="font-medium">Someone else&apos;s phone is linked as &ldquo;{account.deviceName}&rdquo;.</p>
          <p className="text-xs">
            That happens when another person scans a code shown here for you. Likes as that person won&apos;t work until they fix it: on their phone, Signal → Settings → Linked
            Devices → remove &ldquo;{account.deviceName}&rdquo;, then link again from their own chip below. The site can&apos;t move a link — the Pi records it under
            whoever&apos;s code was scanned.
          </p>
        </div>
      )}
    </div>
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
          This connects your Signal to the pledge-class Pi, the same way Signal Desktop connects to your phone. The Pi sees the pledge
          group chats on your account, and anyone in the PC can add a 👍 as you on messages in those chats. It never sends messages as
          you and never touches your DMs. You can remove it any time in Signal → Settings → Linked Devices.
        </p>
        {me && (me === OWNER_ID ? <OwnerNote /> : <LinkCard memberId={me} />)}
      </section>

      {me === OWNER_ID && (
        <Suspense fallback={null}>
          <LinkOthers />
        </Suspense>
      )}
    </div>
  );
}
