import type { Position, Weight } from "./config";

// events/{eventId}
export type EventDoc = {
  name: string;
  date: string; // "YYYY-MM-DD"
  headcount: number; // >= 1
  weight: Weight;
  notes: string | null;
  createdBy: string; // memberId
  createdAt: string; // ISO
};

export type AssignmentStatus = "assigned" | "vetoed";
export type AssignmentSource = "manual" | "suggested" | "cover";

// assignments/{eventId}_{memberId}
export type AssignmentDoc = {
  eventId: string;
  memberId: string;
  status: AssignmentStatus;
  source: AssignmentSource;
  coveringFor: string | null; // memberId
  createdAt: string; // ISO
  vetoedAt: string | null; // ISO
};

// work_entries/{eventId}_{memberId}
export type WorkEntryDoc = {
  eventId: string;
  memberId: string;
  position: Position | null;
  createdBy: string; // memberId
  createdAt: string; // ISO
};

// pins/{memberId}
export type PinDoc = {
  hash: string; // hex
  salt: string; // hex
  createdAt: string; // ISO
};

// Computed, never stored.
export type Standing = {
  memberId: string;
  name: string;
  sortOrder: number;
  points: number;
  shifts: number;
  vetoes: number;
  lastWorked: string | null; // "YYYY-MM-DD"
};

// Documents as read from a snapshot, with their Firestore id attached.
export type WithId<T> = T & { id: string };
export type EventRow = WithId<EventDoc>;
export type AssignmentRow = WithId<AssignmentDoc>;
export type WorkEntryRow = WithId<WorkEntryDoc>;
