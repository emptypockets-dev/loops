"use client";

import type { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

// Fallback keeps `next build` working before NEXT_PUBLIC_CONVEX_URL is set;
// the client only opens a connection in the browser.
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
);

/**
 * Convex wired to Clerk. ConvexProviderWithClerk + Clerk's useAuth is required
 * (plain ConvexProvider would not forward the "convex" JWT).
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
