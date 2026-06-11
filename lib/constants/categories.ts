/**
 * Canonical category list for the whole app.
 * Screens, Convex schema validators, and AI prompts all read from here —
 * never duplicate this list inline.
 */
export const CATEGORIES = [
  "Work",
  "Money/Admin",
  "House",
  "Health",
  "Relationship",
  "Product",
  "Idea",
  "Waiting On",
  "Someday",
  "Trash",
] as const;

export type Category = (typeof CATEGORIES)[number];
