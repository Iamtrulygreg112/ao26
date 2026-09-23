// The only write the site makes for Signal linking: create a request. The Pi
// bot owns every status transition after that, and the rules enforce it.

import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { nowISO } from "./dates";
import { getSession } from "./session";
import type { LinkRequestDoc } from "./linkData";

/** Creates link_requests/{autoId} as "pending" and returns the id. */
export async function requestLink(memberId: string): Promise<string> {
  const session = getSession();
  if (!session) throw new Error("Not logged in.");
  const data: LinkRequestDoc = {
    memberId,
    requestedBy: session.id,
    status: "pending",
    createdAt: nowISO(),
  };
  const ref = await addDoc(collection(db, "link_requests"), data);
  return ref.id;
}
