import { MEMBERS } from "@/lib/config";

const OWNER_ID = "chase";

/** The 28 pledges the bot tracks, in config order. */
export const TRACKED_MEMBERS = MEMBERS.filter((m) => m.id !== OWNER_ID);

function ThumbsUp() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 11v10H3V11h4z" />
      <path d="M7 11l4-8c1.7 0 3 1.3 3 3v3h5.2a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 18 21H7" />
    </svg>
  );
}

type Props = {
  likedBy: string[];
  notLikedBy: string[];
  /** "all" = every tracked member, lit or dimmed; "missing" = only those who haven't reacted. */
  mode: "all" | "missing";
};

export default function MemberGrid({ likedBy, notLikedBy, mode }: Props) {
  const liked = new Set(likedBy);
  const missing = new Set(notLikedBy);
  const shown = mode === "missing" ? TRACKED_MEMBERS.filter((m) => missing.has(m.id)) : TRACKED_MEMBERS;

  if (mode === "missing" && shown.length === 0) {
    return <p className="text-sm font-medium text-gold">Everyone&apos;s on it.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={mode === "missing" ? "Not yet reacted" : "Reactions"}>
      {shown.map((m) => {
        const hit = liked.has(m.id);
        return (
          <li
            key={m.id}
            className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${
              hit ? "bg-surface2 text-text" : "border border-border text-muted opacity-60"
            }`}
          >
            {hit && <ThumbsUp />}
            {m.name}
          </li>
        );
      })}
    </ul>
  );
}
