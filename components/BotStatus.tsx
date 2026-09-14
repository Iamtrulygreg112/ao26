"use client";

import { useEffect, useState } from "react";
import { useAdminData } from "@/lib/adminData";
import { formatRelative } from "@/lib/dates";

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

function Badge({ children, tone = "text-muted" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full border border-border bg-surface px-2 text-[11px] font-medium tabular-nums ${tone}`}>
      {children}
    </span>
  );
}

/** Heartbeat pill for the Pi bot. Renders nothing until the status doc exists. */
export default function BotStatus() {
  const { status } = useAdminData();
  // Re-evaluate "within 3 minutes" without waiting for a new snapshot.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!status) return null;

  const lastSeenMs = new Date(status.lastSeen).getTime();
  const online = Number.isFinite(lastSeenMs) && now - lastSeenMs < ONLINE_WINDOW_MS;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex h-7 items-center gap-2 rounded-full border px-3 text-xs font-medium ${
          online ? "border-border bg-surface2 text-text" : "border-danger/30 bg-danger/10 text-danger"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-danger"}`} aria-hidden />
        {online ? "Bot online" : `Bot offline · last seen ${formatRelative(status.lastSeen, now)}`}
      </span>
      {status.dryRun && <Badge>DRY RUN</Badge>}
      {status.armed && <Badge tone="text-gold">ARMED</Badge>}
      <Badge>{status.groupsEnabled} groups</Badge>
    </div>
  );
}
