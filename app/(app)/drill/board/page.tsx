"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { MEMBERS, OWNER_ID, TRACKED_MEMBERS, type Member } from "@/lib/config";
import { hasStarted, masteryAvg, useDrillScores, type DrillScoreDoc } from "@/lib/drillData";
import { formatRelative } from "@/lib/dates";

type SortKey = "exam" | "attempts" | "greek" | "mastery" | "creed" | "active";

type Row = { m: Member; d: DrillScoreDoc | undefined; started: boolean; mastery: number | null };

const COLS: Array<{ key: SortKey; label: string; hideSm?: boolean; align?: "right" }> = [
  { key: "exam", label: "Midterm", align: "right" },
  { key: "attempts", label: "Tries", align: "right" },
  { key: "greek", label: "Greek", hideSm: true, align: "right" },
  { key: "mastery", label: "Mastery" },
  { key: "creed", label: "Creed", hideSm: true, align: "right" },
  { key: "active", label: "Active", align: "right" },
];

function value(r: Row, k: SortKey): number {
  switch (k) {
    case "exam":
      return r.d?.examBest ?? -1;
    case "attempts":
      return r.d?.examAttempts ?? 0;
    case "greek":
      return r.d?.greekBestMs ? -r.d.greekBestMs : -Infinity; // lower ms is better → sort as higher
    case "mastery":
      return r.mastery ?? -1;
    case "creed":
      return r.d?.creedBest ?? -1;
    case "active":
      return r.d?.lastActive ? Date.parse(r.d.lastActive) : -1;
  }
}

function sortRows(rows: Row[], key: SortKey): Row[] {
  return [...rows].sort((a, b) => {
    const d = value(b, key) - value(a, key);
    if (d !== 0) return d;
    if (key !== "mastery") {
      const m = (b.mastery ?? -1) - (a.mastery ?? -1);
      if (m !== 0) return m;
    }
    return MEMBERS.findIndex((x) => x.id === a.m.id) - MEMBERS.findIndex((x) => x.id === b.m.id);
  });
}

function ScoreRow({ r, me, now }: { r: Row; me: string; now: number }) {
  const d = r.d;
  const muted = !r.started;
  return (
    <tr className={`${r.m.id === me ? "border-l-2 border-l-azure" : "border-l-2 border-l-transparent"} ${muted ? "text-muted" : ""}`}>
      <td className="py-2 pl-3 pr-2">
        <span className="font-medium">{r.m.name}</span>
        {muted && <span className="ml-2 inline-flex h-5 items-center rounded-full bg-danger/10 px-2 text-[10px] font-medium text-danger">hasn&apos;t started</span>}
      </td>
      <td className={`py-2 pr-2 text-right text-lg font-semibold tabular-nums tracking-tight ${muted ? "" : "text-gold"}`}>{d?.examBest ?? "—"}{typeof d?.examBest === "number" && <span className="text-xs">%</span>}</td>
      <td className="py-2 pr-2 text-right tabular-nums">{d?.examAttempts ?? 0}</td>
      <td className="hidden py-2 pr-2 text-right tabular-nums sm:table-cell">{d?.greekBestMs ? `${(d.greekBestMs / 1000).toFixed(1)}s` : "—"}</td>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface2" aria-hidden>
            <div className="h-full bg-azure" style={{ width: `${r.mastery ?? 0}%` }} />
          </div>
          <span className="text-xs tabular-nums">{r.mastery ?? "—"}{r.mastery !== null && "%"}</span>
        </div>
      </td>
      <td className="hidden py-2 pr-2 text-right tabular-nums sm:table-cell">{typeof d?.creedBest === "number" ? `${d.creedBest}%` : "—"}</td>
      <td className="py-2 pr-3 text-right text-xs tabular-nums text-muted">{d?.lastActive ? formatRelative(d.lastActive, now) : "—"}</td>
    </tr>
  );
}

export default function DrillBoardPage() {
  const { session } = useSession();
  const me = session?.id ?? "";
  const { scores, loaded, error } = useDrillScores();
  const [sort, setSort] = useState<SortKey>("exam");
  const [now] = useState(() => Date.now());

  const { rows, owner } = useMemo(() => {
    const toRow = (m: Member): Row => {
      const d = scores.get(m.id);
      return { m, d, started: hasStarted(d), mastery: masteryAvg(d) };
    };
    return { rows: sortRows(TRACKED_MEMBERS.map(toRow), sort), owner: toRow(MEMBERS.find((m) => m.id === OWNER_ID)!) };
  }, [scores, sort]);
  const startedCount = rows.filter((r) => r.started).length;

  const th = (c: (typeof COLS)[number]) => (
    <th key={c.key} aria-sort={sort === c.key ? "descending" : "none"} className={`${c.hideSm ? "hidden sm:table-cell" : ""} py-2 pr-2 ${c.align === "right" ? "text-right" : "text-left"}`}>
      <button type="button" onClick={() => setSort(c.key)} className={`text-[11px] uppercase tracking-widest ${sort === c.key ? "text-text" : "text-muted"}`}>
        {c.label}
        {sort === c.key ? " ↓" : ""}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Drill scoreboard</h1>
        <Link href="/drill" className="text-sm text-muted underline underline-offset-2 transition hover:text-text">
          Drill →
        </Link>
      </div>
      <p className="text-sm tabular-nums text-muted">Midterm Sun 10/18 · {loaded ? `${startedCount} of ${TRACKED_MEMBERS.length} have started` : "…"}</p>
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pl-3 pr-2 text-left text-[11px] uppercase tracking-widest text-muted">Name</th>
              {COLS.map(th)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <ScoreRow key={r.m.id} r={r} me={me} now={now} />
            ))}
          </tbody>
          <tbody className="border-t-4 border-border">
            <ScoreRow r={owner} me={me} now={now} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
