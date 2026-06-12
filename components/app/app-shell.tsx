"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "./bottom-nav";
import { SidebarNav } from "./sidebar-nav";
import { TopBar } from "./top-bar";

/** Press "c" anywhere (outside a field or dialog) to jump straight to capture. */
function useCaptureShortcut() {
  const router = useRouter();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "c" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      router.push("/capture");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}

/**
 * Calm command-center frame: fixed sidebar on desktop, top bar + bottom tab
 * bar on mobile.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useCaptureShortcut();

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-card p-4 md:block">
        <SidebarNav />
      </aside>
      <div className="md:pl-60">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
