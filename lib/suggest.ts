// The one place suggestion logic lives. Pure: no I/O. The roster panel, the
// veto cover, and the veto preview all call this so they always agree.

import type { AssignmentDoc, EventRow, Standing, WorkEntryDoc } from "./types";

/** points asc, then lastWorked asc with never-worked FIRST, then shifts asc, then config order. */
export function compareForSuggestion(a: Standing, b: Standing): number {
  if (a.points !== b.points) return a.points - b.points;
  if (a.lastWorked !== b.lastWorked) {
    if (a.lastWorked === null) return -1;
    if (b.lastWorked === null) return 1;
    return a.lastWorked < b.lastWorked ? -1 : 1;
  }
  if (a.shifts !== b.shifts) return a.shifts - b.shifts;
  return a.sortOrder - b.sortOrder;
}

export function suggest(input: {
  event: EventRow;
  standings: Standing[];
  assignments: AssignmentDoc[];
  workEntries: WorkEntryDoc[];
  exclude?: string[];
  count?: number;
}): Standing[] {
  const { event, standings, assignments, workEntries, exclude = [] } = input;

  const onEvent = assignments.filter((a) => a.eventId === event.id);
  const assignedCount = onEvent.filter((a) => a.status === "assigned").length;
  const count = input.count ?? Math.max(0, event.headcount - assignedCount);
  if (count === 0) return [];

  const skip = new Set<string>(exclude);
  for (const a of onEvent) skip.add(a.memberId); // either status: vetoed people are never re-suggested
  for (const w of workEntries) if (w.eventId === event.id) skip.add(w.memberId);

  return standings
    .filter((s) => !skip.has(s.memberId))
    .sort(compareForSuggestion)
    .slice(0, count);
}
