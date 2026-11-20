// The site's only writes for reactions: create like_requests. The bot owns
// every transition after that, and the rules enforce it. There is no
// undo/un-react anywhere. Like Signal, a new emoji replaces the person's old one.

import { addDoc, collection, doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { nowISO } from "./dates";
import type { LikeRequestDoc } from "./chatData";

export const THUMB = "👍";

const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/gu;

/** The bot's normalization: no skin tones, no variation selector — how
 *  reactions / reactedBy keys are stored. Compare emoji only through this. */
export function normalizeEmoji(e: string): string {
  return e.replace(SKIN_TONE, "").replace(/️/g, "");
}

/** The form to SEND: stored keys drop U+FE0F, so a lone BMP symbol (❤, ☺, ✌)
 *  gets it back — without it Signal may draw the plain-text glyph. */
export function withPresentation(e: string): string {
  const cps = [...e];
  return cps.length === 1 && e.codePointAt(0)! < 0x1f000 ? `${e}\uFE0F` : e;
}

/** Exactly one emoji (any sequence: skin tone, ZWJ, flag, keycap), never text. */
export function isSingleEmoji(s: string): boolean {
  if (!s || s.length > 16 || /\s/.test(s)) return false;
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)];
  if (graphemes.length !== 1) return false;
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(s);
}

/** One reaction on one message from one linked pledge's own account. Returns the request id. */
export async function requestLike(messageId: string, memberId: string, requestedBy: string, emoji: string = THUMB): Promise<string> {
  const data: LikeRequestDoc = { messageId, memberId, requestedBy, emoji, status: "pending", createdAt: nowISO() };
  const ref = await addDoc(collection(db, "like_requests"), data);
  return ref.id;
}

/** Several one-off reactions in one batch (the bot spaces the sends itself). */
export async function requestLikes(messageId: string, memberIds: string[], requestedBy: string, emoji: string = THUMB): Promise<void> {
  if (memberIds.length === 0) return;
  const batch = writeBatch(db);
  const createdAt = nowISO();
  for (const memberId of memberIds) {
    const data: LikeRequestDoc = { messageId, memberId, requestedBy, emoji, status: "pending", createdAt };
    batch.set(doc(collection(db, "like_requests")), data);
  }
  await batch.commit();
}
