import { z } from "zod";
import {
  CATEGORIES,
  DRAFT_TYPES,
  EMOTIONAL_WEIGHTS,
  RISK_LEVELS,
  URGENCY_LEVELS,
} from "../constants";

/**
 * zod schemas that every AI response must pass before anything is persisted.
 * Invalid output → typed failure → toast. Never a crash, never bad data.
 */

const trimmed = z.string().transform((s) => s.trim());

/** Tolerate over-eager models: cap list lengths instead of failing validation. */
const stringList = (max: number) =>
  z.array(z.string()).default([]).transform((arr) =>
    arr.map((s) => s.trim()).filter(Boolean).slice(0, max)
  );

export const classificationSchema = z.object({
  cleanedTitle: trimmed.pipe(z.string().min(1).max(120)),
  summary: trimmed.pipe(z.string().max(500)),
  category: z.enum(CATEGORIES),
  urgency: z.enum(URGENCY_LEVELS),
  emotionalWeight: z.enum(EMOTIONAL_WEIGHTS),
  suggestedNextAction: trimmed.pipe(z.string().max(300)),
  suggestedFiveMinuteStart: trimmed.pipe(z.string().max(300)),
});
export type Classification = z.infer<typeof classificationSchema>;

export const dailyBriefSchema = z.object({
  summary: trimmed.pipe(z.string().min(1).max(1200)),
  topOutcomes: stringList(3),
  fiveMinuteStarts: stringList(5),
  canWait: stringList(6),
  avoidanceWarning: z
    .string()
    .nullish()
    .transform((s) => {
      const t = s?.trim();
      return t ? t : undefined;
    }),
});
export type DailyBriefPayload = z.infer<typeof dailyBriefSchema>;

export const weeklyReviewSchema = z.object({
  completed: stringList(15),
  stillOpen: stringList(15),
  dropped: stringList(10),
  needsNextAction: stringList(10),
  patterns: stringList(6),
  suggestedLoopChanges: stringList(6),
});
export type WeeklyReviewPayload = z.infer<typeof weeklyReviewSchema>;

export const draftSchema = z.object({
  type: z.enum(DRAFT_TYPES),
  title: trimmed.pipe(z.string().min(1).max(140)),
  body: trimmed.pipe(z.string().min(1).max(4000)),
  riskLevel: z.enum(RISK_LEVELS),
  requiresApproval: z.boolean(),
});
export type DraftPayload = z.infer<typeof draftSchema>;
