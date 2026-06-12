import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  CADENCES,
  CATEGORIES,
  CLASSIFIED_BY,
  DRAFT_STATUSES,
  DRAFT_TYPES,
  EMOTIONAL_WEIGHTS,
  INBOX_SOURCES,
  INBOX_STATUSES,
  INTEGRATION_PROVIDERS,
  LOOP_OUTCOMES,
  RISK_LEVELS,
  SYNC_DIRECTIONS,
  TASK_STATUSES,
  URGENCY_LEVELS,
} from "../lib/constants";
import { literals } from "./lib/validators";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    // AI preference: allow auto-archiving of low-risk "Trash" classifications.
    autoArchiveEnabled: v.optional(v.boolean()),
    // Notification emails (to the user themselves). Undefined = enabled.
    briefEmailEnabled: v.optional(v.boolean()),
    reviewEmailEnabled: v.optional(v.boolean()),
    // Captured from the browser on sign-in so scheduled briefs land at the
    // user's actual 5am. Offset is Date.prototype.getTimezoneOffset().
    timezoneOffsetMinutes: v.optional(v.number()),
    timezone: v.optional(v.string()),
    // Idempotency marker for default-loop seeding — set once, never re-seeded.
    defaultLoopsSeededAt: v.optional(v.number()),
    // Secret for the email-in capture address (capture+<token>@…). Rotatable.
    captureToken: v.optional(v.string()),
    // Set when the user hides the getting-started checklist (or finishes it).
    onboardingDismissedAt: v.optional(v.number()),
    // Chosen during Evening Shutdown; surfaced the next morning and honored
    // as outcome #1 by that day's brief. forDate is a local YYYY-MM-DD.
    nextFirstAction: v.optional(
      v.object({
        text: v.string(),
        forDate: v.string(),
        taskId: v.optional(v.id("tasks")),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_capture_token", ["captureToken"]),

  inboxItems: defineTable({
    userId: v.id("users"),
    rawText: v.string(),
    cleanedTitle: v.string(),
    summary: v.string(),
    // Defaults to "Someday" until classified; the UI hides it while unprocessed.
    category: literals(CATEGORIES),
    urgency: literals(URGENCY_LEVELS),
    emotionalWeight: literals(EMOTIONAL_WEIGHTS),
    suggestedNextAction: v.string(),
    suggestedFiveMinuteStart: v.string(),
    source: literals(INBOX_SOURCES),
    status: literals(INBOX_STATUSES),
    // Distinguishes "AI suggested" from "Confirmed by you" in the UI.
    classifiedBy: v.optional(literals(CLASSIFIED_BY)),
    // Present when the item arrived via the email-in capture address.
    emailFrom: v.optional(v.string()),
    emailSubject: v.optional(v.string()),
    emailMessageId: v.optional(v.string()),
    // "Not now" without guilt: hidden from the active list until this time.
    snoozedUntil: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .searchIndex("search_text", {
      searchField: "rawText",
      filterFields: ["userId"],
    }),

  loops: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    category: literals(CATEGORIES),
    cadence: literals(CADENCES),
    steps: v.array(v.string()),
    minimumVersion: v.string(),
    idealVersion: v.string(),
    lastRunAt: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  loopRuns: defineTable({
    userId: v.id("users"),
    loopId: v.id("loops"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    notes: v.string(),
    completedSteps: v.array(v.string()),
    outcome: literals(LOOP_OUTCOMES),
    counted: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_loop", ["loopId"]),

  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: literals(CATEGORIES),
    status: literals(TASK_STATUSES),
    dueAt: v.optional(v.number()),
    sourceInboxItemId: v.optional(v.id("inboxItems")),
    loopId: v.optional(v.id("loops")),
    fiveMinuteStart: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  dailyBriefs: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    summary: v.string(),
    topOutcomes: v.array(v.string()),
    fiveMinuteStarts: v.array(v.string()),
    canWait: v.array(v.string()),
    avoidanceWarning: v.optional(v.string()),
    closingLine: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  reviews: defineTable({
    userId: v.id("users"),
    weekStart: v.string(), // YYYY-MM-DD, Monday
    weekEnd: v.string(),
    completed: v.array(v.string()),
    stillOpen: v.array(v.string()),
    dropped: v.array(v.string()),
    // Extra section required by the Review screen ("Needs a next action").
    needsNextAction: v.array(v.string()),
    patterns: v.array(v.string()),
    suggestedLoopChanges: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_week", ["userId", "weekStart"]),

  drafts: defineTable({
    userId: v.id("users"),
    type: literals(DRAFT_TYPES),
    title: v.string(),
    body: v.string(),
    status: literals(DRAFT_STATUSES),
    riskLevel: literals(RISK_LEVELS),
    relatedInboxItemId: v.optional(v.id("inboxItems")),
    relatedTaskId: v.optional(v.id("tasks")),
    // Set when a calendar draft is approved and pushed to Google Calendar.
    calendarEventId: v.optional(v.string()),
    calendarEventLink: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  integrations: defineTable({
    userId: v.id("users"),
    provider: literals(INTEGRATION_PROVIDERS),
    enabled: v.boolean(),
    // Placeholder fields only — real encryption is out of scope for the MVP.
    accessTokenEncrypted: v.string(),
    refreshTokenEncrypted: v.string(),
    syncDirection: literals(SYNC_DIRECTIONS),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  auditLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.any(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // "I'm stuck" moments: one pressed button → one suggested action.
  // Kept as data so the weekly review can notice hard moments kindly.
  nudges: defineTable({
    userId: v.id("users"),
    suggestion: v.string(),
    reason: v.string(),
    fiveMinuteVersion: v.string(),
    reassurance: v.string(),
    acted: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
