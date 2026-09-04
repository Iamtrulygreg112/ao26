"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { DataProvider } from "@/lib/data";
import Nav from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, session } = useSession();

  useEffect(() => {
    if (hydrated && !session) router.replace("/");
  }, [hydrated, session, router]);

  // Render nothing until the session has been checked on the client, so a
  // logged-out visitor never sees a flash of the app.
  if (!session) return null;

  return (
    <>
      <Nav name={session.name} />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:pt-8">
        <DataProvider fallback={<p className="pt-16 text-center text-muted">Loading…</p>}>{children}</DataProvider>
      </main>
    </>
  );
}
