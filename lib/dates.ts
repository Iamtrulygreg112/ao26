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

// ---- Admin (Signal) time formatting, always in the app timezone -------------

const laTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const laWeekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const laWeekdayDate = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** "Sat 9:41 PM" within the last week, otherwise "Sat, Sep 12 · 9:41 PM". */
export function formatMessageTime(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const recent = now - ms >= 0 && now - ms < WEEK_MS;
  return recent ? `${laWeekday.format(d)} ${laTime.format(d)}` : `${laWeekdayDate.format(d)} · ${laTime.format(d)}`;
}

/** "Sat, Sep 12 · 9:41 PM" from an ISO string. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${laWeekdayDate.format(d)} · ${laTime.format(d)}`;
}

/** "just now", "4m ago", "3h ago", "2d ago". */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "unknown";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
