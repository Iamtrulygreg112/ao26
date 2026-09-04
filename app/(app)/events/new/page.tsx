"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { createEvent } from "@/lib/writes";
import EventForm from "@/components/EventForm";

export default function NewEventPage() {
  const router = useRouter();
  const { session } = useSession();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <EventForm
        submitLabel="Create"
        onCancel={() => router.push("/events")}
        onSubmit={async (v) => {
          const id = await createEvent({ ...v, createdBy: session?.id ?? "" });
          router.push(`/events/${id}`);
        }}
      />
    </div>
  );
}
