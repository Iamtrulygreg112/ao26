// The site's only writes for reactions: create like_requests. The bot owns
// every transition after that, and the rules enforce it. There is no
// undo/un-react anywhere.

import { addDoc, collection, doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { nowISO } from "./dates";
import type { LikeRequestDoc } from "./chatData";

/** One 👍 on one message from one linked pledge's own account. Returns the request id. */
export async function requestLike(messageId: string, memberId: string, requestedBy: string): Promise<string> {
  const data: LikeRequestDoc = { messageId, memberId, requestedBy, status: "pending", createdAt: nowISO() };
  const ref = await addDoc(collection(db, "like_requests"), data);
  return ref.id;
}

/** Several one-off 👍s in one batch (the bot spaces the sends itself). */
export async function requestLikes(messageId: string, memberIds: string[], requestedBy: string): Promise<void> {
  if (memberIds.length === 0) return;
  const batch = writeBatch(db);
  const createdAt = nowISO();
  for (const memberId of memberIds) {
    const data: LikeRequestDoc = { messageId, memberId, requestedBy, status: "pending", createdAt };
    batch.set(doc(collection(db, "like_requests")), data);
  }
  await batch.commit();
}
