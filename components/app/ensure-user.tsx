"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { LoadingState } from "./loading-state";

/**
 * Runs the idempotent users.ensure mutation (user upsert + default-loop
 * seeding) once per session before rendering the app, so screens never see a
 * half-initialized account.
 */
export function EnsureUser({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.users.ensure);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || started.current) return;
    started.current = true;
    ensure({
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
      .then(() => setReady(true))
      .catch((error) => {
        console.error("users.ensure failed", error);
        // Still show the app — queries degrade to empty states.
        toast.error("Couldn't finish account setup. Some data may not load — try refreshing.");
        setReady(true);
      });
  }, [isAuthenticated, ensure]);

  if (isLoading || (isAuthenticated && !ready)) {
    return <LoadingState fullPage label="Setting up your command center…" />;
  }

  if (!isAuthenticated) {
    // Middleware normally redirects before this renders; calm fallback just in case.
    return <LoadingState fullPage label="Redirecting to sign-in…" />;
  }

  return <>{children}</>;
}
