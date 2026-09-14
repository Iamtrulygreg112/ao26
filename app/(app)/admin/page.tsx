"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /admin has no content of its own; the Signal page is the default section.
// Client-side so the layout gate above it still decides who gets anywhere.
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/signal");
  }, [router]);
  return null;
}
