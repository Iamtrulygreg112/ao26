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
import Roster from "@/components/Roster";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { events, workEntries } = useData();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  return (
    <div className="space-y-8">
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
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>{formatEventDate(event.date)}</span>
            <WeightPill weight={event.weight} />
            <span className="tabular-nums">needs {event.headcount}</span>
          </div>
          {event.notes && <p className="text-sm text-text">{event.notes}</p>}
          <button type="button" onClick={() => setEditing(true)} className="text-sm text-azure underline-offset-4 hover:underline">
            Edit
          </button>
        </section>
      )}

      <section>
        <Roster event={event} sessionId={session?.id ?? ""} />
      </section>

      {/* <SuggestionPanel event={event} /> is hidden for now; components/SuggestionPanel.tsx stays for later. */}

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Worked</h2>
        <WorkedList event={event} entries={entries} sessionId={session?.id ?? ""} />
      </section>

      <section className="pt-4">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="h-11 w-full rounded-xl border border-danger/30 bg-danger/10 px-4 font-medium text-danger transition active:scale-[0.98]"
        >
          Delete event
        </button>
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
