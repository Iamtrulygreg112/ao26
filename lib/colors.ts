// Deterministic per-name colors for avatars and author names. Tailwind class
// pairs (not raw hex) so they follow the design tokens' dark palette.

const PALETTE: Array<{ avatar: string; name: string }> = [
  { avatar: "bg-rose-500/25 text-rose-200", name: "text-rose-300" },
  { avatar: "bg-orange-500/25 text-orange-200", name: "text-orange-300" },
  { avatar: "bg-amber-500/25 text-amber-200", name: "text-amber-300" },
  { avatar: "bg-lime-500/25 text-lime-200", name: "text-lime-300" },
  { avatar: "bg-emerald-500/25 text-emerald-200", name: "text-emerald-300" },
  { avatar: "bg-cyan-500/25 text-cyan-200", name: "text-cyan-300" },
  { avatar: "bg-sky-500/25 text-sky-200", name: "text-sky-300" },
  { avatar: "bg-violet-500/25 text-violet-200", name: "text-violet-300" },
  { avatar: "bg-fuchsia-500/25 text-fuchsia-200", name: "text-fuchsia-300" },
  { avatar: "bg-pink-500/25 text-pink-200", name: "text-pink-300" },
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function colorFor(key: string): { avatar: string; name: string } {
  return PALETTE[hash(key) % PALETTE.length];
}

/** "Social + Omicron" → "SO"; "🚨like reminders fall 26🚨" → "LR". */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return letters.join("") || "?";
}
