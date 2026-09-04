"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MEMBERS } from "@/lib/config";
import { clearSession } from "@/lib/session";
import { useSession } from "@/lib/useSession";
import { useData } from "@/lib/data";
import { formatEventDate, isUpcoming, todayISO } from "@/lib/dates";
import { rankOf } from "@/lib/standings";
import { addWorkEntry, errorText } from "@/lib/writes";
import EventCard, { WeightPill } from "@/components/EventCard";
import { CoveringPill } from "@/components/Roster";
import VetoButton from "@/components/VetoButton";
import Spinner from "@/components/Spinner";

function Stat({ label, value, tone = "text-text" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-surface px-3 py-3">
      <p className={`text-2xl font-semibold tabular-nums tracking-tight ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { session } = useSession();
  const { events, workEntries, assignments, standings } = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const me = session?.id ?? "";
  const today = todayISO();
  const mine = standings.find((s) => s.memberId === me);
  const rank = rankOf(me, standings);

  const eventById = new Map(events.map((e) => [e.id, e]));
  const myAssigned = new Set(assignments.filter((a) => a.memberId === me && a.status === "assigned").map((a) => a.eventId));
  const myShifts = assignments
    .filter((a) => a.memberId === me && a.status === "assigned")
    .map((a) => ({ a, e: eventById.get(a.eventId) }))
    .filter((x): x is { a: (typeof assignments)[number]; e: (typeof events)[number] } => !!x.e && isUpcoming(x.e.date))
    .sort((x, y) => x.e.date.localeCompare(y.e.date));

  const upcoming = events.filter((e) => isUpcoming(e.date)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const worked = (id: string) => workEntries.filter((w) => w.eventId === id).length;

  const mineByEvent = new Set(workEntries.filter((w) => w.memberId === me).map((w) => w.eventId));
  const unlogged = events
    .filter((e) => e.date <= today && !mineByEvent.has(e.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  function logout() {
    clearSession();
    router.replace("/");
  }

  async function log(eventId: string) {
    setBusy(eventId);
    setErrors((e) => ({ ...e, [eventId]: "" }));
    try {
      await addWorkEntry({ eventId, memberId: me, createdBy: me });
    } catch (err) {
      setErrors((e) => ({ ...e, [eventId]: errorText(err) }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Hi {session?.name}</h1>
        <div className="flex gap-2">
          <Stat label="Points" value={String(mine?.points ?? 0)} tone="text-gold" />
          <Stat label="Rank" value={`#${rank} of ${MEMBERS.length}`} />
          <Stat label="Shifts" value={String(mine?.shifts ?? 0)} />
          {(mine?.vetoes ?? 0) > 0 && <Stat label="Vetoes" value={String(mine?.vetoes)} tone="text-muted" />}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Your upcoming shifts</h2>
        {myShifts.length === 0 ? (
          <p className="text-sm text-muted">Nothing assigned. Enjoy it.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {myShifts.map(({ a, e }) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/events/${e.id}`} className="block truncate font-medium">{e.name}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span>{formatEventDate(e.date)}</span>
                    <WeightPill weight={e.weight} />
                    {a.coveringFor && <CoveringPill memberId={a.coveringFor} />}
                  </div>
                </div>
                <VetoButton event={e} memberId={me} compact />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Upcoming events</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                workedCount={worked(e.id)}
                tag={myAssigned.has(e.id) ? "you're on it" : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Log a shift</h2>
        {unlogged.length === 0 ? (
          <p className="text-sm text-muted">You&apos;re all caught up.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {unlogged.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/events/${e.id}`} className="block truncate font-medium">{e.name}</Link>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                      <span>{formatEventDate(e.date)}</span>
                      <WeightPill weight={e.weight} />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => log(e.id)}
                    className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-azure px-4 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {busy === e.id && <Spinner className="text-white" />}
                    I worked this
                  </button>
                </div>
                {errors[e.id] && <p className="mt-1 text-sm text-danger">{errors[e.id]}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" onClick={logout} className="h-11 rounded-xl border border-border bg-surface2 px-4 font-medium transition active:scale-[0.98]">
        Log out
      </button>
    </div>
  );
}
