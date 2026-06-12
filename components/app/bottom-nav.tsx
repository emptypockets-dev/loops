"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, NotebookPen, Plus, RefreshCw, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/capture", label: "Capture", icon: Plus, primary: true },
  { href: "/loops", label: "Loops", icon: RefreshCw },
  { href: "/review", label: "Review", icon: NotebookPen },
] as const;

/** Thumb-reach navigation on phones; the desktop sidebar covers ≥ md. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const primary = "primary" in item && item.primary;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {primary ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : (
                <item.icon className="mt-1.5 h-5 w-5" aria-hidden="true" />
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
