"use client";

// Live drill scores for the scoreboard, the Home card and the /drill writer
// (which needs the current doc for best-of writes). Mounted only by those pages.

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export const DECK_KEYS = ["order", "members", "whois", "exec", "greek", "creed", "history"] as const;
export type DeckKey = (typeof DECK_KEYS)[number];

// drill_scores/{memberId} — written by the site for the logged-in member only
// (rules: memberId must match the doc id; only these keys).
export type DrillScoreDoc = {
  memberId: string;
  examBest?: number; // 0–100, never decreases
  examLast?: number; // 0–100, last finished mock midterm
  examAttempts?: number;
  greekBestMs?: number; // lower is better, never increases
  mastery?: Partial<Record<DeckKey, number>>; // integer percents
  creedBest?: number; // 0–100, never decreases
  lastActive: string; // ISO
  updatedAt: string; // ISO
};

/** Average of the deck percents (missing decks count as 0), or null when there is no mastery yet. */
export function masteryAvg(d: DrillScoreDoc | undefined): number | null {
  if (!d?.mastery) return null;
  const total = DECK_KEYS.reduce((s, k) => s + (d.mastery?.[k] ?? 0), 0);
  return Math.round(total / DECK_KEYS.length);
}

export const hasStarted = (d: DrillScoreDoc | undefined): boolean => !!d && ((d.examAttempts ?? 0) > 0 || typeof d.examBest === "number");

export function useDrillScores(): { scores: Map<string, DrillScoreDoc>; loaded: boolean; error: string | null } {
  const [scores, setScores] = useState<Map<string, DrillScoreDoc> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, "drill_scores"),
      (s) => setScores(new Map(s.docs.map((d) => [d.id, d.data() as DrillScoreDoc]))),
      (e) => setError(e.message),
    );
  }, []);

  return { scores: scores ?? new Map(), loaded: scores !== null, error };
}
