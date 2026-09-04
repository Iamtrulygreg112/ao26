"use client";

import Link from "next/link";
import { useData } from "@/lib/data";
import { isPast, isUpcoming } from "@/lib/dates";
import EventCard from "@/components/EventCard";

export default function EventsPage() {
  const { events, workEntries } = useData();
  const upcoming = events.filter((e) => isUpcoming(e.date)).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((e) => isPast(e.date)).sort((a, b) => b.date.localeCompare(a.date));
  const worked = (id: string) => workEntries.filter((w) => w.eventId === id).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <Link href="/events/new" className="flex h-11 items-center rounded-xl bg-azure px-4 font-medium text-white transition active:scale-[0.98]">
          + New
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">No upcoming events</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => <EventCard key={e.id} event={e} workedCount={worked(e.id)} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet</p>
        ) : (
          <div className="space-y-2">
            {past.map((e) => <EventCard key={e.id} event={e} workedCount={worked(e.id)} />)}
          </div>
        )}
      </section>
    </div>
  );
}
