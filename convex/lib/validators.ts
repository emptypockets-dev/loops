import { v, type Validator } from "convex/values";
import {
  CATEGORIES,
  EMOTIONAL_WEIGHTS,
  URGENCY_LEVELS,
} from "../../lib/constants";

/**
 * Build a v.union of v.literal(...) from a constant string array, preserving
 * the literal union type. Keeps the canonical lists in lib/constants as the
 * single source of truth for schema validators too.
 */
export function literals<T extends string>(values: readonly T[]): Validator<T> {
  if (values.length === 0) {
    throw new Error("literals() requires at least one value");
  }
  const members = values.map((value) => v.literal(value));
  if (members.length === 1) {
    return members[0] as unknown as Validator<T>;
  }
  return v.union(
    ...(members as unknown as [
      Validator<string>,
      Validator<string>,
      ...Validator<string>[],
    ])
  ) as unknown as Validator<T>;
}

/** Classification fields written by AI classify / user override — shared shape. */
export const classificationFields = {
  cleanedTitle: v.string(),
  summary: v.string(),
  category: literals(CATEGORIES),
  urgency: literals(URGENCY_LEVELS),
  emotionalWeight: literals(EMOTIONAL_WEIGHTS),
  suggestedNextAction: v.string(),
  suggestedFiveMinuteStart: v.string(),
};
