// Every write the admin section makes. The site only ever writes the queue;
// the Pi bot is the only thing that talks to Signal.

import { collection, deleteDoc, doc, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { nowISO } from "./dates";
import type { ScheduledSendDoc, SendPhotoDoc, SendStatus } from "./adminData";

export const MAX_PHOTOS = 6;
export const MAX_TEXT = 2000;

export type NewSend = {
  /** The raw Signal group id from the signal_groups `groupId` field — never a doc id. */
  groupId: string;
  groupName: string;
  text: string;
  sendAt: string; // ISO UTC
  photos: Array<{ base64: string }>;
};

/** One batch: the pending doc plus one photos/{n} doc per image. All or nothing. */
export async function scheduleSend(input: NewSend): Promise<string> {
  if (input.photos.length > MAX_PHOTOS) throw new Error(`Up to ${MAX_PHOTOS} photos.`);
  if (input.text.length > MAX_TEXT) throw new Error(`Message is over ${MAX_TEXT} characters.`);
  if (!input.groupId) throw new Error("Pick a group.");
  if (input.text.trim() === "" && input.photos.length === 0) throw new Error("Add a message or a photo.");

  const ref = doc(collection(db, "scheduled_sends"));
  const data: ScheduledSendDoc = {
    groupId: input.groupId,
    groupName: input.groupName,
    text: input.text,
    sendAt: input.sendAt,
    status: "pending",
    createdAt: nowISO(),
    createdBy: "chase",
    photoCount: input.photos.length,
  };
  const batch = writeBatch(db);
  batch.set(ref, data);
  input.photos.forEach((p, n) => {
    const photo: SendPhotoDoc = { order: n, mime: "image/jpeg", base64: p.base64 };
    batch.set(doc(db, "scheduled_sends", ref.id, "photos", String(n)), photo);
  });
  await batch.commit();
  return ref.id;
}

/** pending → cancelled is the only transition the site may make; the rules enforce it too. */
export async function cancelSend(id: string, localStatus: SendStatus): Promise<void> {
  if (localStatus !== "pending") throw new Error("Only a pending send can be cancelled.");
  await updateDoc(doc(db, "scheduled_sends", id), { status: "cancelled" });
}

const DELETABLE: ReadonlySet<SendStatus> = new Set(["sent", "failed", "cancelled", "dry_run"]);

/** Deletes the photos subcollection, then the doc. Only for finished sends. */
export async function deleteSend(id: string, localStatus: SendStatus): Promise<void> {
  if (!DELETABLE.has(localStatus)) throw new Error("Cancel it first.");
  const photos = await getDocs(collection(db, "scheduled_sends", id, "photos"));
  if (photos.size > 0) {
    const batch = writeBatch(db);
    photos.forEach((p) => batch.delete(p.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "scheduled_sends", id));
}

/** On-demand fetch for the "Load photos" button; never subscribed. */
export async function loadSendPhotos(id: string): Promise<SendPhotoDoc[]> {
  const snap = await getDocs(collection(db, "scheduled_sends", id, "photos"));
  return snap.docs.map((d) => d.data() as SendPhotoDoc).sort((a, b) => a.order - b.order);
}
