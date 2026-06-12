"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_TIME_WINDOWS, type TimeWindows } from "@/lib/loop-logic";

/** The signed-in user's day-rhythm windows (Settings → Profile), with defaults. */
export function useTimeWindows(): TimeWindows {
  const user = useQuery(api.users.current);
  return user?.timeWindows ?? DEFAULT_TIME_WINDOWS;
}
