import { MEMBERS } from "./config";
import type { AssignmentRow, EventRow, Standing, WorkEntryRow } from "./types";

/** The only place points are computed. Pure. */
export function computeStandings(
  events: EventRow[],
  assignments: AssignmentRow[],
  workEntries: WorkEntryRow[],
): Standing[] {
  const eventById = new Map(events.map((e) => [e.id, e]));

  return MEMBERS.map((m, sortOrder) => {
    let points = 0;
    let shifts = 0;
    let vetoes = 0;
    let lastWorked: string | null = null;

    for (const w of workEntries) {
      if (w.memberId !== m.id) continue;
      const ev = eventById.get(w.eventId);
      if (!ev) continue; // orphan mid-delete
      points += ev.weight;
      shifts += 1;
      if (lastWorked === null || ev.date > lastWorked) lastWorked = ev.date;
    }

    for (const a of assignments) {
      if (a.memberId !== m.id || a.status !== "vetoed") continue;
      const ev = eventById.get(a.eventId);
      if (!ev) continue;
      points -= ev.weight;
      vetoes += 1;
    }

    return { memberId: m.id, name: m.name, sortOrder, points, shifts, vetoes, lastWorked };
  });
}

/** points desc, shifts desc, config order asc. */
export function compareForTable(a: Standing, b: Standing): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.shifts !== a.shifts) return b.shifts - a.shifts;
  return a.sortOrder - b.sortOrder;
}

/** 1-based rank in table order, or 0 if the member is unknown. */
export function rankOf(memberId: string, standings: Standing[]): number {
  const sorted = [...standings].sort(compareForTable);
  return sorted.findIndex((s) => s.memberId === memberId) + 1;
}
