"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TITLE } from "@/lib/config";
import { clearSession } from "@/lib/session";

type Tab = { href: "/home" | "/events" | "/standings"; label: string; icon: React.ReactNode };

const ICON = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const TABS: Tab[] = [
  {
    href: "/home",
    label: "Home",
    icon: (
      <svg {...ICON}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/events",
    label: "Events",
    icon: (
      <svg {...ICON}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/standings",
    label: "Standings",
    icon: (
      <svg {...ICON}>
        <path d="M4 20V10M12 20V4M20 20v-7" />
      </svg>
    ),
  },
];

export default function Nav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearSession();
    router.replace("/");
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Top bar, md+ */}
      <header className="hidden border-b border-border bg-surface md:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="font-semibold tracking-tight text-gold">{TITLE}</span>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${
                  isActive(t.href) ? "bg-surface2 text-azure" : "text-muted hover:text-text"
                }`}
              >
                {t.icon}
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>{name}</span>
            <span aria-hidden>·</span>
            <button type="button" onClick={logout} className="h-10 px-1 font-medium text-text transition hover:text-azure">
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Bottom bar, mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid h-16 grid-cols-3">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition ${
                isActive(t.href) ? "text-azure" : "text-muted"
              }`}
            >
              {t.icon}
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
