/**
 * Outbound transactional email via Postmark (the same account that handles
 * inbound capture). Only used for notifications **to the user themselves**
 * (daily brief, weekly review) — never for sending on the user's behalf,
 * which stays approval-gated and, in this MVP, never automated.
 *
 * Unconfigured deployments skip silently: email delivery is optional polish,
 * not a dependency.
 */

export type SendEmailResult =
  | { ok: true }
  | { ok: false; skipped: boolean; error: string };

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}): Promise<SendEmailResult> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.EMAIL_FROM;
  if (!token || !from) {
    return { ok: false, skipped: true, error: "Outbound email not configured." };
  }
  if (!input.to) {
    return { ok: false, skipped: true, error: "User has no email address." };
  }

  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: from,
        To: input.to,
        Subject: input.subject,
        TextBody: input.textBody,
        HtmlBody: input.htmlBody,
        MessageStream: "outbound",
      }),
    });
    if (!response.ok) {
      console.error("Postmark send failed", response.status, await response.text());
      return { ok: false, skipped: false, error: `Postmark returned ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Postmark send threw", err);
    return { ok: false, skipped: false, error: "Could not reach Postmark." };
  }
}

/** APP_BASE_URL without a trailing slash, or null when unset (links omitted). */
export function getAppBaseUrl(): string | null {
  const url = process.env.APP_BASE_URL;
  if (!url) return null;
  return url.replace(/\/+$/, "");
}
