"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, type QuerySnapshot, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";
import { computeStandings } from "./standings";
import type { AssignmentDoc, AssignmentRow, EventDoc, EventRow, Standing, WorkEntryDoc, WorkEntryRow } from "./types";

export type Data = {
  events: EventRow[];
  assignments: AssignmentRow[];
  workEntries: WorkEntryRow[];
  standings: Standing[];
  loaded: boolean;
};

const DataContext = createContext<Data | null>(null);

function rows<T>(snap: QuerySnapshot<DocumentData>): Array<T & { id: string }> {
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
}

/**
 * Subscribes to the whole dataset (a few hundred docs at most) so every page
 * updates live for everyone. Renders `fallback` until all three collections
 * have delivered their first snapshot.
 */
export function DataProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[] | null>(null);
  const [workEntries, setWorkEntries] = useState<WorkEntryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onErr = (e: Error) => setError(e.message);
    const unsubs = [
      onSnapshot(collection(db, "events"), (s) => setEvents(rows<EventDoc>(s)), onErr),
      onSnapshot(collection(db, "assignments"), (s) => setAssignments(rows<AssignmentDoc>(s)), onErr),
      onSnapshot(collection(db, "work_entries"), (s) => setWorkEntries(rows<WorkEntryDoc>(s)), onErr),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loaded = events !== null && assignments !== null && workEntries !== null;

  const value = useMemo<Data>(() => {
    const e = events ?? [];
    const a = assignments ?? [];
    const w = workEntries ?? [];
    return { events: e, assignments: a, workEntries: w, standings: computeStandings(e, a, w), loaded };
  }, [events, assignments, workEntries, loaded]);

  if (!loaded) {
    return (
      <>
        {fallback}
        {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
      </>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Data {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData() must be used inside <DataProvider/>");
  return ctx;
}
