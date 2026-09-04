"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/lib/data";
import { useSession } from "@/lib/useSession";
import { formatEventDate } from "@/lib/dates";
import { deleteEvent, updateEvent } from "@/lib/writes";
import { WeightPill } from "@/components/EventCard";
import EventForm from "@/components/EventForm";
import WorkedList from "@/components/WorkedList";
import ConfirmDialog from "@/components/ConfirmDialog";
import EventMenu from "@/components/EventMenu";

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { events, workEntries } = useData();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [managing, setManaging] = useState(false);

  const event = events.find((e) => e.id === id);
  if (!event) {
    return (
      <div className="space-y-4">
        <p className="text-muted">This event was deleted.</p>
        <Link href="/events" className="text-azure underline-offset-4 hover:underline">Back to events</Link>
      </div>
    );
  }

  const entries = workEntries.filter((w) => w.eventId === event.id);
  const full = entries.length >= event.headcount;

  return (
    <div className="space-y-8">
      {editing || managing ? (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setManaging(false);
          }}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface2 px-4 font-medium transition active:scale-[0.98]"
        >
          <BackArrow />
          Back to event
        </button>
      ) : (
        <Link href="/events" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface2 px-4 font-medium transition active:scale-[0.98]">
          <BackArrow />
          Events
        </Link>
      )}
      {editing ? (
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Edit event</h1>
          <EventForm
            initial={{ name: event.name, date: event.date, headcount: event.headcount, weight: event.weight, notes: event.notes }}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={async (v) => {
              await updateEvent(event.id, v);
              setEditing(false);
            }}
          />
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-start gap-3">
            <h1 className="min-w-0 flex-1 break-words text-2xl font-semibold tracking-tight">{event.name}</h1>
            <div className="mt-1 shrink-0">
              <EventMenu onEdit={() => setEditing(true)} onDelete={() => setConfirmDelete(true)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>{formatEventDate(event.date)}</span>
            <WeightPill weight={event.weight} />
            <span className={`font-medium tabular-nums ${full ? "text-azure" : "text-gold"}`}>
              {entries.length}/{event.headcount} worked
            </span>
          </div>
          {event.notes && <p className="text-sm text-text">{event.notes}</p>}
        </section>
      )}

      {/* <Roster/> is hidden for now; components/Roster.tsx stays for later. */}

      {/* <SuggestionPanel event={event} /> is hidden for now; components/SuggestionPanel.tsx stays for later. */}

      <section>
        <WorkedList event={event} entries={entries} sessionId={session?.id ?? ""} managing={managing} onManagingChange={setManaging} />
      </section>

      {confirmDelete && (
        <ConfirmDialog
          danger
          title={`Delete ${event.name}?`}
          body="Type the event name to confirm. This removes everyone's points from it."
          confirmLabel="Delete"
          requireText={event.name}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteEvent(event.id);
            router.push("/events");
          }}
        />
      )}
    </div>
  );
}
