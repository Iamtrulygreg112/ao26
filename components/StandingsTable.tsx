import { formatEventDate } from "@/lib/dates";
import { compareForTable } from "@/lib/standings";
import type { Standing } from "@/lib/types";

export default function StandingsTable({ standings, meId }: { standings: Standing[]; meId: string }) {
  const rows = [...standings].sort(compareForTable);
  const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-widest text-muted";
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full tabular-nums">
        <thead className="border-b border-border">
          <tr>
            <th className={`${th} w-10`}>#</th>
            <th className={th}>Name</th>
            <th className={`${th} text-right`}>Pts</th>
            <th className={`${th} text-right`}>Shifts</th>
            <th className={`${th} text-right`}>Vetoes</th>
            <th className={`${th} hidden text-right sm:table-cell`}>Last worked</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((s, i) => (
            <tr key={s.memberId} className={s.memberId === meId ? "border-l-2 border-l-azure" : "border-l-2 border-l-transparent"}>
              <td className="px-3 py-2 text-sm text-muted">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{s.name}</td>
              <td className="px-3 py-2 text-right text-lg font-semibold text-gold">{s.points}</td>
              <td className="px-3 py-2 text-right text-sm">{s.shifts}</td>
              <td className="px-3 py-2 text-right text-sm text-muted">{s.vetoes === 0 ? "—" : s.vetoes}</td>
              <td className="hidden px-3 py-2 text-right text-sm text-muted sm:table-cell">
                {s.lastWorked ? formatEventDate(s.lastWorked) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
