// Every Firestore write in the app lives here. Pages and components call these
// and surface the rejected error inline; nothing here swallows errors.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { nowISO, todayISO } from "./dates";
import type { Position, Weight } from "./config";
import type { AssignmentDoc, AssignmentSource, EventDoc, WorkEntryDoc } from "./types";

export type NewEvent = {
  name: string;
  date: string;
  headcount: number;
  weight: Weight;
  notes: string | null;
  createdBy: string;
};

export type EventPatch = Partial<Pick<EventDoc, "name" | "date" | "headcount" | "weight" | "notes">>;

export async function createEvent(input: NewEvent): Promise<string> {
  const data: EventDoc = { ...input, createdAt: nowISO() };
  const ref = await addDoc(collection(db, "events"), data);
  return ref.id;
}

export async function updateEvent(id: string, patch: EventPatch): Promise<void> {
  await updateDoc(doc(db, "events", id), patch);
}

/** Firestore has no cascade; this is the cascade. One batch: assignments + work entries + the event. */
export async function deleteEvent(id: string): Promise<void> {
  const [assignments, entries] = await Promise.all([
    getDocs(query(collection(db, "assignments"), where("eventId", "==", id))),
    getDocs(query(collection(db, "work_entries"), where("eventId", "==", id))),
  ]);
  const batch = writeBatch(db);
  assignments.forEach((d) => batch.delete(d.ref));
  entries.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "events", id));
  await batch.commit();
}

export const workEntryId = (eventId: string, memberId: string) => `${eventId}_${memberId}`;

export async function addWorkEntry(input: { eventId: string; memberId: string; createdBy: string }): Promise<void> {
  const snap = await getDoc(doc(db, "events", input.eventId));
  if (!snap.exists()) throw new Error("This event no longer exists.");
  const event = snap.data() as EventDoc;
  if (event.date > todayISO()) throw new Error("You can log this after the event.");

  const data: WorkEntryDoc = {
    eventId: input.eventId,
    memberId: input.memberId,
    position: null,
    createdBy: input.createdBy,
    createdAt: nowISO(),
  };
  await setDoc(doc(db, "work_entries", workEntryId(input.eventId, input.memberId)), data);
}

export async function setPosition(eventId: string, memberId: string, position: Position | null): Promise<void> {
  await updateDoc(doc(db, "work_entries", workEntryId(eventId, memberId)), { position });
}

export async function removeWorkEntry(eventId: string, memberId: string): Promise<void> {
  await deleteDoc(doc(db, "work_entries", workEntryId(eventId, memberId)));
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

// ---- Assignments (rosters) ----------------------------------------------

export const assignmentId = (eventId: string, memberId: string) => `${eventId}_${memberId}`;

function assignmentDoc(input: {
  eventId: string;
  memberId: string;
  source: AssignmentSource;
  coveringFor: string | null;
}): AssignmentDoc {
  return {
    eventId: input.eventId,
    memberId: input.memberId,
    status: "assigned",
    source: input.source,
    coveringFor: input.coveringFor,
    createdAt: nowISO(),
    vetoedAt: null,
  };
}

export async function setAssignment(input: {
  eventId: string;
  memberId: string;
  source: AssignmentSource;
  coveringFor?: string | null;
}): Promise<void> {
  const data = assignmentDoc({ ...input, coveringFor: input.coveringFor ?? null });
  await setDoc(doc(db, "assignments", assignmentId(input.eventId, input.memberId)), data);
}

/** Several assignments in one batch (the "Add all" button). */
export async function setAssignments(eventId: string, memberIds: string[], source: AssignmentSource): Promise<void> {
  if (memberIds.length === 0) return;
  const batch = writeBatch(db);
  for (const memberId of memberIds) {
    batch.set(doc(db, "assignments", assignmentId(eventId, memberId)), assignmentDoc({ eventId, memberId, source, coveringFor: null }));
  }
  await batch.commit();
}

export async function removeAssignment(eventId: string, memberId: string): Promise<void> {
  await deleteDoc(doc(db, "assignments", assignmentId(eventId, memberId)));
}

/** One batch: work entries (position null) for every listed member. Merge so an existing position survives. */
export async function markRosterWorked(eventId: string, memberIds: string[], createdBy: string): Promise<void> {
  if (memberIds.length === 0) return;
  const batch = writeBatch(db);
  for (const memberId of memberIds) {
    const data: WorkEntryDoc = { eventId, memberId, position: null, createdBy, createdAt: nowISO() };
    batch.set(doc(db, "work_entries", workEntryId(eventId, memberId)), data, { merge: true });
  }
  await batch.commit();
}

/**
 * The veto batch: mark the member vetoed and, if there is one, assign the cover.
 * Both happen or neither. The vetoed doc is never deleted — it IS the penalty.
 */
export async function commitVeto(eventId: string, memberId: string, coverMemberId: string | null): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "assignments", assignmentId(eventId, memberId)), { status: "vetoed", vetoedAt: nowISO() });
  if (coverMemberId) {
    batch.set(
      doc(db, "assignments", assignmentId(eventId, coverMemberId)),
      assignmentDoc({ eventId, memberId: coverMemberId, source: "cover", coveringFor: memberId }),
    );
  }
  await batch.commit();
}

/** Several work entries at once (position null), one batch. Same future-date guard as addWorkEntry. */
export async function addWorkEntries(eventId: string, memberIds: string[], createdBy: string): Promise<void> {
  if (memberIds.length === 0) return;
  const snap = await getDoc(doc(db, "events", eventId));
  if (!snap.exists()) throw new Error("This event no longer exists.");
  if ((snap.data() as EventDoc).date > todayISO()) throw new Error("You can log this after the event.");
  const batch = writeBatch(db);
  for (const memberId of memberIds) {
    const data: WorkEntryDoc = { eventId, memberId, position: null, createdBy, createdAt: nowISO() };
    batch.set(doc(db, "work_entries", workEntryId(eventId, memberId)), data);
  }
  await batch.commit();
}
