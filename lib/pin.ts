// A 4-digit PIN is a deterrent, not security. It stops people logging shifts
// as each other by accident, nothing more. Anyone with the URL can write to
// Firestore; the rules only keep PINs un-listable and un-changeable.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { nowISO } from "./dates";
import type { PinDoc } from "./types";

const PIN_RE = /^\d{4}$/;
const ITERATIONS = 100_000;
const KEY_BYTES = 32;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromHex(saltHex) as BufferSource,
      iterations: ITERATIONS,
    },
    key,
    KEY_BYTES * 8,
  );
  return toHex(new Uint8Array(bits));
}

export function newSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function assertPin(pin: string): void {
  if (!PIN_RE.test(pin)) throw new Error("PIN must be exactly 4 digits");
}

export type LoginResult = { ok: true } | { needsPin: true };

export async function login(memberId: string, pin: string): Promise<LoginResult> {
  assertPin(pin);
  const snap = await getDoc(doc(db, "pins", memberId));
  if (!snap.exists()) return { needsPin: true };
  const data = snap.data() as PinDoc;
  const hash = await hashPin(pin, data.salt);
  if (!constantTimeEqual(hash, data.hash)) {
    await new Promise((r) => setTimeout(r, 800));
    throw new Error("Wrong PIN");
  }
  return { ok: true };
}

export async function setPin(memberId: string, pin: string): Promise<void> {
  assertPin(pin);
  const salt = newSalt();
  const hash = await hashPin(pin, salt);
  const data: PinDoc = { hash, salt, createdAt: nowISO() };
  try {
    await setDoc(doc(db, "pins", memberId), data);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "permission-denied") {
      throw new Error("PIN already set — ask Chase to reset it.");
    }
    throw err;
  }
}

/** True if this member has already set a PIN. */
export async function hasPin(memberId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "pins", memberId));
  return snap.exists();
}
