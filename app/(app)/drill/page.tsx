"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { useDrillScores, type DrillScoreDoc } from "@/lib/drillData";
import { upsertDrillScore, type DrillPatch } from "@/lib/drillWrites";
import { nowISO } from "@/lib/dates";

type Bridge = { type: "ato-drill"; memberId: string; patch: Record<string, unknown>; at: number };

const isBridge = (d: unknown): d is Bridge =>
  typeof d === "object" && d !== null && (d as Bridge).type === "ato-drill" && typeof (d as Bridge).memberId === "string" && typeof (d as Bridge).patch === "object";

const int = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);

/**
 * Turn a bridge patch into what we'll actually write: best-of for bests
 * (a score never goes down by playing more), pass-through for the rest.
 */
function toWrite(patch: Record<string, unknown>, current: DrillScoreDoc | undefined): DrillPatch {
  const out: DrillPatch = {};
  const examBest = int(patch.examBest);
  if (examBest !== undefined && examBest >= 0 && examBest <= 100 && examBest > (current?.examBest ?? -1)) out.examBest = examBest;
  const greek = int(patch.greekBestMs);
  if (greek !== undefined && greek > 0 && greek < (current?.greekBestMs ?? Infinity)) out.greekBestMs = greek;
  const creed = int(patch.creedBest);
  if (creed !== undefined && creed >= 0 && creed <= 100 && creed > (current?.creedBest ?? -1)) out.creedBest = creed;
  const examLast = int(patch.examLast);
  if (examLast !== undefined && examLast >= 0 && examLast <= 100) out.examLast = examLast;
  const attempts = int(patch.examAttempts);
  if (attempts !== undefined && attempts > 0) out.examAttempts = attempts;
  if (typeof patch.mastery === "object" && patch.mastery !== null) {
    const m: Record<string, number> = {};
    for (const [k, v] of Object.entries(patch.mastery as Record<string, unknown>)) {
      const n = int(v);
      if (n !== undefined && n >= 0 && n <= 100) m[k] = n;
    }
    if (Object.keys(m).length) out.mastery = m;
  }
  return out;
}

export default function DrillPage() {
  const { session } = useSession();
  const me = session?.id ?? "";
  const { scores } = useDrillScores();
  // Latest doc without re-binding the listener on every snapshot.
  const currentRef = useRef<DrillScoreDoc | undefined>(undefined);
  useEffect(() => {
    currentRef.current = scores.get(me);
  }, [scores, me]);

  useEffect(() => {
    if (!me) return;
    const onMessage = (e: MessageEvent) => {
      // Only our own origin, only our frame's declared member, only when it is the session's.
      if (e.origin !== window.location.origin) return;
      if (!isBridge(e.data) || e.data.memberId !== me) return;
      const patch = toWrite(e.data.patch, currentRef.current);
      if (Object.keys(patch).length === 0) return;
      const now = nowISO();
      upsertDrillScore(me, { ...patch, lastActive: now, updatedAt: now }).catch((err: unknown) => console.warn("[drill] write failed", err));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [me]);

  if (!me) return null;

  return (
    <div className="-mb-24 flex h-[calc(100dvh-5.5rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between pb-2">
        <h1 className="text-base font-semibold tracking-tight">Drill</h1>
        <Link href="/drill/board" className="text-sm text-muted underline underline-offset-2 transition hover:text-text">
          Scoreboard →
        </Link>
      </div>
      <iframe
        title="ATΩ Pledge Drill"
        src={`/drill/index.html?me=${encodeURIComponent(me)}`}
        className="min-h-0 w-full flex-1 rounded-xl border border-border bg-surface"
        style={{ border: 0 }}
      />
    </div>
  );
}
