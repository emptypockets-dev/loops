import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// One timezone-aware hourly tick handles everything scheduled: daily briefs
// at each user's local 5am, weekly reviews Sunday at each user's local 4pm
// (offset captured from the browser at sign-in; UTC fallback).
crons.hourly(
  "scheduled deliveries",
  { minuteUTC: 5 },
  internal.ai.runScheduledDeliveries,
  {}
);

export default crons;
