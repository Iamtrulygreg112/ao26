"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MEMBERS, TITLE, type Member } from "@/lib/config";
import { setSession } from "@/lib/session";
import { useSession } from "@/lib/useSession";
import { hasPin, login, setPin } from "@/lib/pin";
import PinPad from "@/components/PinPad";

type Phase = "enter" | "set" | "confirm";

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, session } = useSession();
  const [member, setMember] = useState<Member | null>(null);
  const [phase, setPhase] = useState<Phase>("enter");
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [padKey, setPadKey] = useState(0);

  useEffect(() => {
    if (hydrated && session) router.replace("/home");
  }, [hydrated, session, router]);

  const clearPad = useCallback(() => setPadKey((k) => k + 1), []);

  function fail(text: string) {
    setError(text);
    setShake(true);
    clearPad();
    setTimeout(() => setShake(false), 300);
  }

  async function pick(m: Member) {
    setMember(m);
    setPhase("enter");
    setFirstPin(null);
    setMessage(null);
    setError(null);
    clearPad();
    // Find out up front whether this person still needs to set a PIN.
    setBusy(true);
    try {
      if (!(await hasPin(m.id))) {
        setPhase("set");
        setMessage("First time — set a 4-digit PIN");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach the server");
    } finally {
      setBusy(false);
    }
  }

  function back() {
    if (busy) return;
    setMember(null);
    setPhase("enter");
    setFirstPin(null);
    setMessage(null);
    setError(null);
  }

  function finish(m: Member) {
    setSession({ id: m.id, name: m.name });
    router.replace("/home");
  }

  async function onComplete(pin: string) {
    if (!member || busy) return;
    setError(null);

    if (phase === "set") {
      setFirstPin(pin);
      setPhase("confirm");
      setMessage("Enter it again");
      clearPad();
      return;
    }

    if (phase === "confirm") {
      if (pin !== firstPin) {
        setPhase("set");
        setFirstPin(null);
        setMessage("First time — set a 4-digit PIN");
        fail("Didn't match, start over");
        return;
      }
      setBusy(true);
      try {
        await setPin(member.id, pin);
        finish(member);
      } catch (err) {
        setBusy(false);
        setPhase("enter");
        setFirstPin(null);
        setMessage(null);
        fail(err instanceof Error ? err.message : "Something went wrong");
      }
      return;
    }

    setBusy(true);
    try {
      const result = await login(member.id, pin);
      if ("needsPin" in result) {
        setBusy(false);
        setPhase("set");
        setMessage("First time — set a 4-digit PIN");
        clearPad();
        return;
      }
      finish(member);
    } catch (err) {
      setBusy(false);
      fail(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (!hydrated || session) return null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-12 pt-12 md:pt-20">
      <h1 className="text-center text-3xl font-semibold tracking-tight text-gold md:text-4xl">{TITLE}</h1>

      {member === null ? (
        <section className="mt-10 space-y-8">
          <p className="text-center text-lg text-muted">Who are you?</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {MEMBERS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(m)}
                className="h-14 rounded-2xl border border-border bg-surface px-4 font-medium transition active:scale-[0.98]"
              >
                {m.name}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-6 space-y-8">
          <button
            type="button"
            onClick={back}
            className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface2 px-4 font-medium transition active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <div className="text-center">
            <p className="text-3xl font-semibold tracking-tight">{member.name}</p>
            <button type="button" onClick={back} className="mt-2 text-sm text-muted underline-offset-4 hover:underline">
              not you?
            </button>
          </div>

          <div className="min-h-6 text-center text-sm" aria-live="polite">
            {error ? (
              <span className="text-danger">{error}</span>
            ) : message ? (
              <span className="text-gold">{message}</span>
            ) : busy && phase === "enter" ? (
              <span className="text-muted">Checking…</span>
            ) : (
              <span className="text-muted">Enter your PIN</span>
            )}
          </div>

          <PinPad key={padKey} onComplete={onComplete} shake={shake} disabled={busy} />
        </section>
      )}
    </main>
  );
}
