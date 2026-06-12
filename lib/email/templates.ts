/**
 * Pure builders for the notification emails (daily brief, weekly review).
 * No Convex imports — unit-testable. Keep the HTML boring: inline styles,
 * single column, calm colors, readable in every client.
 */

export interface EmailContent {
  subject: string;
  textBody: string;
  htmlBody: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "YYYY-MM-DD" → "Thursday, June 12" without timezone drift. */
export function formatBriefDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const WRAPPER_STYLE =
  "margin:0 auto;max-width:560px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f242b;line-height:1.55;";
const MUTED = "color:#6b7280;";
const H2 = "font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;margin:24px 0 8px;";

function htmlList(items: string[]): string {
  return `<ul style="margin:0;padding-left:20px;">${items
    .map((item) => `<li style="margin:4px 0;">${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function textList(items: string[]): string {
  return items.map((item) => `  • ${item}`).join("\n");
}

function ctaButton(url: string, label: string): string {
  return `<p style="margin:28px 0;"><a href="${escapeHtml(url)}" style="background:#266e73;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;display:inline-block;">${escapeHtml(label)}</a></p>`;
}

export interface DailyBriefEmailInput {
  date: string; // YYYY-MM-DD
  summary: string;
  topOutcomes: string[];
  fiveMinuteStarts: string[];
  canWait: string[];
  avoidanceWarning?: string;
  closingLine: string;
  /** e.g. https://loops.example.com — links omitted when null. */
  appUrl: string | null;
}

export function buildDailyBriefEmail(input: DailyBriefEmailInput): EmailContent {
  const dateLabel = formatBriefDate(input.date);
  const subject = `Your brief for ${dateLabel} — Loops`;
  const todayUrl = input.appUrl ? `${input.appUrl}/today` : null;

  const textParts: string[] = [`Loops — ${dateLabel}`, "", input.summary];
  if (input.topOutcomes.length > 0) {
    textParts.push("", "Top outcomes:", textList(input.topOutcomes));
  }
  if (input.fiveMinuteStarts.length > 0) {
    textParts.push("", "5-minute starts (pick one):", textList(input.fiveMinuteStarts));
  }
  if (input.canWait.length > 0) {
    textParts.push("", "Can wait — really:", textList(input.canWait));
  }
  if (input.avoidanceWarning) {
    textParts.push("", `Gently: ${input.avoidanceWarning}`);
  }
  if (todayUrl) {
    textParts.push("", `Open Today: ${todayUrl}`);
  }
  textParts.push("", input.closingLine);

  const htmlSections: string[] = [
    `<p style="${MUTED}margin:0 0 4px;">Loops · ${escapeHtml(dateLabel)}</p>`,
    `<p style="font-size:17px;margin:0 0 8px;">${escapeHtml(input.summary)}</p>`,
  ];
  if (input.topOutcomes.length > 0) {
    htmlSections.push(`<h2 style="${H2}">Top outcomes</h2>`, htmlList(input.topOutcomes));
  }
  if (input.fiveMinuteStarts.length > 0) {
    htmlSections.push(
      `<h2 style="${H2}">5-minute starts — pick one</h2>`,
      htmlList(input.fiveMinuteStarts)
    );
  }
  if (input.canWait.length > 0) {
    htmlSections.push(`<h2 style="${H2}">Can wait — really</h2>`, htmlList(input.canWait));
  }
  if (input.avoidanceWarning) {
    htmlSections.push(
      `<p style="background:#f4f1ec;border-radius:8px;padding:12px;margin:20px 0;">Gently: ${escapeHtml(input.avoidanceWarning)}</p>`
    );
  }
  if (todayUrl) {
    htmlSections.push(ctaButton(todayUrl, "Open Today"));
  }
  htmlSections.push(
    `<p style="${MUTED}font-style:italic;margin-top:24px;">${escapeHtml(input.closingLine)}</p>`
  );

  return {
    subject,
    textBody: textParts.join("\n"),
    htmlBody: `<!doctype html><html><body style="margin:0;background:#faf9f7;"><div style="${WRAPPER_STYLE}">${htmlSections.join("")}</div></body></html>`,
  };
}

export interface WeeklyReviewEmailInput {
  weekStart: string;
  weekEnd: string;
  completed: string[];
  patterns: string[];
  needsNextAction: string[];
  appUrl: string | null;
}

export function buildWeeklyReviewEmail(input: WeeklyReviewEmailInput): EmailContent {
  const subject = "Your week, gently — Loops review";
  const reviewUrl = input.appUrl ? `${input.appUrl}/review` : null;
  const completed = input.completed.slice(0, 8);
  const patterns = input.patterns.slice(0, 4);
  const needsAction = input.needsNextAction.slice(0, 5);

  const textParts: string[] = [
    "Loops — weekly review",
    "",
    completed.length > 0
      ? `Things that actually happened this week:\n${textList(completed)}`
      : "A quiet week on the record. That's information, not a verdict.",
  ];
  if (patterns.length > 0) {
    textParts.push("", "Patterns noticed:", textList(patterns));
  }
  if (needsAction.length > 0) {
    textParts.push("", "Waiting on a next action:", textList(needsAction));
  }
  if (reviewUrl) {
    textParts.push("", `Read the full review: ${reviewUrl}`);
  }
  textParts.push("", "Five minutes with this is plenty. Drop one thing guilt-free.");

  const htmlSections: string[] = [
    `<p style="${MUTED}margin:0 0 4px;">Loops · weekly review</p>`,
  ];
  if (completed.length > 0) {
    htmlSections.push(`<h2 style="${H2}">Things that actually happened</h2>`, htmlList(completed));
  } else {
    htmlSections.push(
      `<p style="font-size:17px;margin:0 0 8px;">A quiet week on the record. That's information, not a verdict.</p>`
    );
  }
  if (patterns.length > 0) {
    htmlSections.push(`<h2 style="${H2}">Patterns noticed</h2>`, htmlList(patterns));
  }
  if (needsAction.length > 0) {
    htmlSections.push(`<h2 style="${H2}">Waiting on a next action</h2>`, htmlList(needsAction));
  }
  if (reviewUrl) {
    htmlSections.push(ctaButton(reviewUrl, "Read the full review"));
  }
  htmlSections.push(
    `<p style="${MUTED}font-style:italic;margin-top:24px;">Five minutes with this is plenty. Drop one thing guilt-free.</p>`
  );

  return {
    subject,
    textBody: textParts.join("\n"),
    htmlBody: `<!doctype html><html><body style="margin:0;background:#faf9f7;"><div style="${WRAPPER_STYLE}">${htmlSections.join("")}</div></body></html>`,
  };
}
