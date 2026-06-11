import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { EnsureUser } from "@/components/app/ensure-user";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <EnsureUser>
      <AppShell>{children}</AppShell>
    </EnsureUser>
  );
}
