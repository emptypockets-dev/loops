/** Shared enums. Convex validators and zod schemas are both derived from these. */

export const URGENCY_LEVELS = ["low", "medium", "high"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

export const EMOTIONAL_WEIGHTS = ["low", "medium", "high"] as const;
export type EmotionalWeight = (typeof EMOTIONAL_WEIGHTS)[number];

export const CADENCES = ["daily", "weekly", "monthly", "ad_hoc"] as const;
export type Cadence = (typeof CADENCES)[number];

/** When in the day a loop makes sense — gates "due now" so an evening
 * ritual doesn't nag at breakfast. */
export const LOOP_TIMES_OF_DAY = ["morning", "afternoon", "evening", "anytime"] as const;
export type LoopTimeOfDay = (typeof LOOP_TIMES_OF_DAY)[number];

export const INBOX_SOURCES = ["manual", "ai", "integration"] as const;
export type InboxSource = (typeof INBOX_SOURCES)[number];

export const INBOX_STATUSES = ["unprocessed", "classified", "converted", "archived"] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

/** Who last set the classification fields — drives the "AI suggested" vs "Confirmed" marker. */
export const CLASSIFIED_BY = ["ai", "user"] as const;
export type ClassifiedBy = (typeof CLASSIFIED_BY)[number];

export const TASK_STATUSES = ["todo", "doing", "waiting", "done", "dropped"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const DRAFT_TYPES = ["email", "task", "calendar", "note", "integration"] as const;
export type DraftType = (typeof DRAFT_TYPES)[number];

export const DRAFT_STATUSES = ["draft", "approved", "rejected", "sent", "archived"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const INTEGRATION_PROVIDERS = ["notion", "todoist", "google_calendar", "gmail"] as const;
export type IntegrationProviderId = (typeof INTEGRATION_PROVIDERS)[number];

export const SYNC_DIRECTIONS = ["import_only", "export_only", "two_way"] as const;
export type SyncDirection = (typeof SYNC_DIRECTIONS)[number];

/** How a loop run ended. Every outcome counts — that is the point. */
export const LOOP_OUTCOMES = ["full", "partial", "minimum"] as const;
export type LoopOutcome = (typeof LOOP_OUTCOMES)[number];
