import type { Category } from "./categories";
import type { Cadence, LoopTimeOfDay } from "./enums";

export interface DefaultLoopSeed {
  name: string;
  description: string;
  category: Category;
  cadence: Cadence;
  timeOfDay: LoopTimeOfDay;
  steps: string[];
  minimumVersion: string;
  idealVersion: string;
}

/**
 * Default loops seeded once per user (idempotent — guarded by
 * users.defaultLoopsSeededAt). Editing or deleting them later never
 * re-creates them.
 */
export const DEFAULT_LOOPS: DefaultLoopSeed[] = [
  {
    name: "Morning Command Center",
    description: "Start the day from one calm place instead of fifteen open tabs.",
    category: "Work",
    cadence: "daily",
    timeOfDay: "morning",
    steps: [
      "Open Today and read the Daily Brief.",
      "Scan the Inbox for anything genuinely urgent.",
      "Pick today's top 3 outcomes.",
      "Choose one 5-minute start and do it now.",
      "Close everything else.",
    ],
    minimumVersion: "Read the Daily Brief and pick one small action.",
    idealVersion: "Brief read, top 3 chosen, and one 5-minute start done before anything else opens.",
  },
  {
    name: "Evening Shutdown",
    description: "Close the day so your head doesn't have to hold it overnight.",
    category: "Work",
    cadence: "daily",
    timeOfDay: "evening",
    steps: [
      "Capture anything still on your mind into the Inbox.",
      "Mark what got done today.",
      "Choose tomorrow's first action.",
      "Say \"shutdown complete\" and stop.",
    ],
    minimumVersion: "Capture open thoughts into the Inbox, then stop.",
    idealVersion: "Head emptied into the Inbox, tomorrow's first action chosen, day fully closed.",
  },
  {
    name: "Money/Admin Container",
    description: "One bounded weekly container for bills, taxes, and scary unknowns.",
    category: "Money/Admin",
    cadence: "weekly",
    timeOfDay: "anytime",
    steps: [
      "Review money/admin inbox items.",
      "Identify bills, taxes, receipts, or scary unknowns.",
      "Choose one next action.",
      "Draft any needed email.",
      "Schedule follow-up.",
    ],
    minimumVersion: "Open the list and identify one next action.",
    idealVersion: "Money items reviewed, bills handled or scheduled, one scary unknown made concrete.",
  },
  {
    name: "House Reset",
    description: "Bring the space back to baseline — not perfect, just workable.",
    category: "House",
    cadence: "weekly",
    timeOfDay: "anytime",
    steps: [
      "Walk each room with a basket and collect strays.",
      "Return things to where they live.",
      "Clear one surface completely.",
      "Capture any repairs or supplies into the Inbox.",
    ],
    minimumVersion: "Clear one surface.",
    idealVersion: "Every room walkably tidy and repairs captured as items.",
  },
  {
    name: "Work Delivery",
    description: "Keep commitments visible and pick the one deliverable that matters.",
    category: "Work",
    cadence: "weekly",
    timeOfDay: "anytime",
    steps: [
      "Review active commitments and deadlines.",
      "Check Waiting On items; draft a nudge if needed (drafts are never auto-sent).",
      "Pick the single most important deliverable this week.",
      "Break it into a 5-minute start.",
    ],
    minimumVersion: "Name the one deliverable that matters most this week.",
    idealVersion: "Commitments reviewed, nudges drafted, top deliverable has a concrete next step.",
  },
  {
    name: "Body Check",
    description: "A small daily signal check — water, movement, honesty.",
    category: "Health",
    cadence: "daily",
    timeOfDay: "anytime",
    steps: [
      "Drink a glass of water.",
      "Two minutes of stretching or a short walk.",
      "Notice your energy level; capture anything your body is flagging.",
    ],
    minimumVersion: "Drink water and take three slow breaths.",
    idealVersion: "Water, a little movement, and an honest note about energy.",
  },
  {
    name: "Relationship Touchpoint",
    description: "Small, real contact with people who matter — before it becomes guilt.",
    category: "Relationship",
    cadence: "weekly",
    timeOfDay: "anytime",
    steps: [
      "Think of one person who matters right now.",
      "Send or draft a short, real check-in message.",
      "Note any upcoming dates that need attention.",
    ],
    minimumVersion: "Think of one person and write them one honest sentence.",
    idealVersion: "One real check-in sent and upcoming dates captured.",
  },
  {
    name: "Product Ideas Review",
    description: "Tend the idea garden weekly so it stays a garden, not a landfill.",
    category: "Product",
    cadence: "weekly",
    timeOfDay: "anytime",
    steps: [
      "Review items in Product and Idea categories.",
      "Archive what no longer sparks anything.",
      "Pick at most one idea to push forward.",
      "Give it a 5-minute start.",
    ],
    minimumVersion: "Skim the idea list and archive one dead idea.",
    idealVersion: "Idea list pruned and exactly one idea has a real next step.",
  },
];
