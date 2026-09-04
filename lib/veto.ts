import { isUpcoming } from "./dates";
import { suggest } from "./suggest";
import { commitVeto } from "./writes";
import type { AssignmentDoc, EventRow, Standing, WorkEntryDoc } from "./types";

export type VetoInput = {
  event: EventRow;
  memberId: string;
  standings: Standing[];
  assignments: AssignmentDoc[];
  workEntries: WorkEntryDoc[];
};

/** Who would be pulled to cover if this member vetoed right now. Same call the veto itself makes. */
export function likelyCover(args: VetoInput): Standing | null {
  const { event, memberId, standings, assignments, workEntries } = args;
  return suggest({ event, standings, assignments, workEntries, exclude: [memberId], count: 1 })[0] ?? null;
}

/**
 * Veto yourself off an upcoming event. Costs the event's weight (via the
 * status "vetoed" doc) and assigns exactly one cover, in a single batch.
 */
export async function veto(args: VetoInput): Promise<{ cover: Standing | null }> {
  const { event, memberId, assignments } = args;

  const mine = assignments.find((a) => a.eventId === event.id && a.memberId === memberId);
  if (!mine || mine.status !== "assigned") throw new Error("You're not on this roster.");
  if (!isUpcoming(event.date)) throw new Error("Too late to veto — the event already happened.");

  const cover = likelyCover(args);
  await commitVeto(event.id, memberId, cover?.memberId ?? null);
  return { cover };
}
