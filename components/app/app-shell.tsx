"use client";

import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { TopBar } from "./top-bar";

/** Calm command-center frame: fixed sidebar on desktop, sheet menu on mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-card p-4 md:block">
        <SidebarNav />
      </aside>
      <div className="md:pl-60">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
