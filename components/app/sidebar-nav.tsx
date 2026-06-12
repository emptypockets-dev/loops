"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, NotebookPen, Orbit, Plus, RefreshCw, Settings, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/loops", label: "Loops", icon: RefreshCw },
  { href: "/review", label: "Review", icon: NotebookPen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex h-full flex-col gap-1">
      <Link
        href="/today"
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Orbit className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="text-lg font-semibold tracking-tight">Loops</span>
      </Link>
      <Link
        href="/capture"
        onClick={onNavigate}
        className={cn(buttonVariants({ size: "default" }), "mb-3 w-full justify-start")}
      >
        <Plus aria-hidden="true" />
        Capture
      </Link>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
      <p className="mt-auto px-3 py-4 text-xs leading-relaxed text-muted-foreground">
        AI suggests.
        <br />
        You decide.
      </p>
    </nav>
  );
}
