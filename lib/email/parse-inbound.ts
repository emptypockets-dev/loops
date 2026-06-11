/**
 * Provider-agnostic parsing for inbound-email webhooks. Pure functions, no
 * Convex imports — easy to test and to extend with new providers.
 *
 * Supported payloads:
 * 1. Postmark inbound (the documented happy path): FromFull/Subject/TextBody/
 *    HtmlBody/ToFull[].MailboxHash/MessageID.
 * 2. Generic JSON (curl tests, other providers): { token | captureToken | to,
 *    from, subject, text | body | html, messageId }.
 */

export const MAX_EMAIL_BODY_CHARS = 15_000;

export interface InboundEmail {
  /** The per-user capture token, or null when the payload has none. */
  token: string | null;
  from: string;
  subject: string;
  body: string;
  messageId: string | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/** Extract the +tag from a plus-addressed recipient like capture+TOKEN@domain. */
export function tokenFromAddress(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/^[^+@\s]+\+([^+@\s]+)@/);
  return match ? match[1] : null;
}

/** Cheap HTML→text for emails that arrive without a plain-text part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Strip "Fwd:"/"Re:" stacks for display titles; the raw subject is kept separately. */
export function cleanSubjectForTitle(subject: string): string {
  return subject.replace(/^(\s*(fwd?|fw|re)\s*:\s*)+/i, "").trim();
}

export function parseInboundEmail(payload: unknown): InboundEmail | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;

  // Token: Postmark MailboxHash first, then explicit fields, then plus-addressing.
  let token: string | null = null;
  if (Array.isArray(p.ToFull)) {
    for (const entry of p.ToFull) {
      if (typeof entry !== "object" || entry === null) continue;
      const recipient = entry as Record<string, unknown>;
      token = asString(recipient.MailboxHash) ?? tokenFromAddress(asString(recipient.Email));
      if (token) break;
    }
  }
  token =
    token ??
    asString(p.MailboxHash) ??
    asString(p.captureToken) ??
    asString(p.token) ??
    tokenFromAddress(asString(p.OriginalRecipient)) ??
    tokenFromAddress(asString(p.To)) ??
    tokenFromAddress(asString(p.to));

  const fromFull =
    typeof p.FromFull === "object" && p.FromFull !== null
      ? (p.FromFull as Record<string, unknown>)
      : null;
  const from =
    asString(fromFull?.Email) ?? asString(p.From) ?? asString(p.from) ?? "unknown sender";

  const subject = (asString(p.Subject) ?? asString(p.subject) ?? "").trim();

  const textBody = asString(p.TextBody) ?? asString(p.text) ?? asString(p.body);
  const htmlBody = asString(p.HtmlBody) ?? asString(p.html);
  const body = (textBody ?? (htmlBody ? htmlToText(htmlBody) : ""))
    .slice(0, MAX_EMAIL_BODY_CHARS)
    .trim();

  const messageId = asString(p.MessageID) ?? asString(p.messageId) ?? null;

  // An email with neither subject nor body has nothing to capture.
  if (!subject && !body) return null;

  return { token, from: from.trim(), subject, body, messageId };
}
