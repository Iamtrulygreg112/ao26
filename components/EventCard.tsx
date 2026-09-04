import Link from "next/link";
import { WEIGHTS, type Weight } from "@/lib/config";
import { formatEventDate, todayISO } from "@/lib/dates";
import type { EventRow } from "@/lib/types";

export function WeightPill({ weight }: { weight: Weight }) {
  const tone = weight === 3 ? "text-gold" : weight === 1 ? "text-muted" : "text-text";
  return (
    <span className={`inline-flex h-7 items-center gap-1 rounded-xl border border-border bg-surface2 px-2 text-xs font-medium ${tone}`}>
      <span className="tabular-nums">{weight}</span>
      <span>{WEIGHTS[weight]}</span>
    </span>
  );
}

type Props = { event: EventRow; workedCount: number; tag?: string };

export default function EventCard({ event, workedCount, tag }: Props) {
  const started = event.date <= todayISO();
  const full = workedCount >= event.headcount;
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition active:scale-[0.98]"
    >
      <WeightPill weight={event.weight} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{event.name}</p>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{formatEventDate(event.date)}</span>
          {tag && <span className="rounded-xl border border-azure/30 bg-azure/10 px-2 text-xs font-medium text-azure">{tag}</span>}
        </div>
      </div>
      {started ? (
        <p className={`shrink-0 text-sm font-medium tabular-nums ${full ? "text-azure" : "text-gold"}`}>
          {workedCount}/{event.headcount}
        </p>
      ) : (
        <p className="shrink-0 text-sm tabular-nums text-muted">needs {event.headcount}</p>
      )}
    </Link>
  );
}
