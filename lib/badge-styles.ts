/**
 * Shared badge color treatments (light + dark variants) so the
 * AI-suggested / confirmed / risk semantics look identical everywhere.
 * Always paired with an icon or text — never color alone.
 */

/** AI-generated content awaiting human judgement: dashed amber. */
export const AI_BADGE_CLASS =
  "border-dashed border-amber-600/60 bg-amber-50 text-amber-900 dark:border-amber-400/50 dark:bg-amber-950 dark:text-amber-200";

/** Human-confirmed / live / pushed successfully: solid emerald. */
export const CONFIRMED_BADGE_CLASS =
  "border-emerald-700/40 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950 dark:text-emerald-200";

/** Medium-risk attention: solid amber. */
export const WARN_BADGE_CLASS =
  "border-amber-700/40 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950 dark:text-amber-200";

/** High-risk — needs the human: red. */
export const DANGER_BADGE_CLASS =
  "border-red-700/40 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-950 dark:text-red-200";
