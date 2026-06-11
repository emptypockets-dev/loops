import type { DraftType, RiskLevel } from "./enums";

export interface ApprovalRule {
  type: DraftType;
  label: string;
  requiresApproval: boolean;
  description: string;
}

/**
 * Approval-rules matrix: which draft/action types always need an explicit
 * human approval before they "take effect". Anything outward-facing
 * (messages, calendars, external syncs) requires approval; purely internal
 * artifacts (tasks, notes) can be applied directly but still arrive as
 * editable drafts.
 */
export const APPROVAL_RULES: ApprovalRule[] = [
  {
    type: "email",
    label: "Email / message",
    requiresApproval: true,
    description: "Anything that would be sent to another person. Loops never sends it for you — you approve, copy, and send.",
  },
  {
    type: "calendar",
    label: "Calendar change",
    requiresApproval: true,
    description: "Creating or changing calendar events. Approved drafts are blocks you add yourself (sync is coming later).",
  },
  {
    type: "integration",
    label: "External sync",
    requiresApproval: true,
    description: "Pushing anything to Notion, Todoist, Google Calendar, or Gmail. Always opt-in, per item.",
  },
  {
    type: "task",
    label: "Internal task",
    requiresApproval: false,
    description: "A task inside Loops. Low risk — approving it simply creates the task, and you can edit it first.",
  },
  {
    type: "note",
    label: "Internal note",
    requiresApproval: false,
    description: "A note inside Loops. Low risk, fully editable.",
  },
];

/**
 * Final gate used by the AI layer: a draft requires approval when its type is
 * outward-facing OR the model flagged it medium/high risk (money, clients,
 * medical/legal/financial territory).
 */
export function requiresApproval(type: DraftType, riskLevel: RiskLevel): boolean {
  const rule = APPROVAL_RULES.find((r) => r.type === type);
  return (rule?.requiresApproval ?? true) || riskLevel !== "low";
}
