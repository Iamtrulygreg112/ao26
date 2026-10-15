// The site's only write for the drill: merge a patch into the logged-in
// member's drill_scores doc. The caller decides best-of; examAttempts is an
// atomic increment so parallel tabs can't lose a count.

import { doc, increment, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { DrillScoreDoc } from "./drillData";

export type DrillPatch = Partial<Omit<DrillScoreDoc, "memberId" | "examAttempts">> & { examAttempts?: number };

export async function upsertDrillScore(memberId: string, patch: DrillPatch): Promise<void> {
  const { examAttempts, ...rest } = patch;
  const data: Record<string, unknown> = { ...rest, memberId };
  if (typeof examAttempts === "number" && examAttempts > 0) data.examAttempts = increment(examAttempts);
  await setDoc(doc(db, "drill_scores", memberId), data, { merge: true });
}
