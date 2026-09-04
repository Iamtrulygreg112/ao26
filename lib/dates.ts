import { TZ } from "./config";

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const eventFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** Today's date as "YYYY-MM-DD" in the app timezone. */
export function todayISO(): string {
  // en-CA yields YYYY-MM-DD directly.
  return isoFormatter.format(new Date());
}

export function isPast(dateISO: string): boolean {
  return dateISO < todayISO();
}

export function isToday(dateISO: string): boolean {
  return dateISO === todayISO();
}

export function isUpcoming(dateISO: string): boolean {
  return dateISO >= todayISO();
}

/** "2026-09-12" -> "Sat, Sep 12". Parsed as a calendar date, independent of the client's timezone. */
export function formatEventDate(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return eventFormatter.format(new Date(Date.UTC(y, m - 1, d)));
}

export function nowISO(): string {
  return new Date().toISOString();
}
