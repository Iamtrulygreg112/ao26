"use client";

import { useData } from "@/lib/data";
import { useSession } from "@/lib/useSession";
import StandingsTable from "@/components/StandingsTable";

export default function StandingsPage() {
  const { standings } = useData();
  const { session } = useSession();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
        <p className="mt-1 text-sm text-muted">Higher = has worked more. Lowest points are up next.</p>
      </div>
      <StandingsTable standings={standings} meId={session?.id ?? ""} />
    </div>
  );
}
