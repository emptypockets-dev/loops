/**
 * "Approve → send it yourself" helpers. Loops never sends email on the
 * user's behalf; instead an approved email draft opens a prefilled Gmail
 * compose window (or mailto:) and the user presses send.
 */

const MAX_URL_LENGTH = 1900; // stay well under common URL limits

/**
 * Email drafts conventionally carry their subject as a first line
 * ("Subject: …"). Split it out; fall back to the draft title.
 */
export function splitSubjectFromBody(
  title: string,
  body: string
): { subject: string; body: string } {
  const lines = body.split("\n");
  const match = lines[0]?.match(/^\s*subject\s*:\s*(.+)$/i);
  if (match) {
    return { subject: match[1].trim(), body: lines.slice(1).join("\n").trim() };
  }
  return { subject: title.trim(), body: body.trim() };
}

/** Prefilled Gmail compose URL, or null when the content won't fit in a URL. */
export function buildGmailComposeUrl(title: string, rawBody: string): string | null {
  const { subject, body } = splitSubjectFromBody(title, rawBody);
  const url =
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
  return url.length <= MAX_URL_LENGTH ? url : null;
}

/** mailto: fallback for non-Gmail users, same fitting rule. */
export function buildMailtoUrl(title: string, rawBody: string): string | null {
  const { subject, body } = splitSubjectFromBody(title, rawBody);
  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return url.length <= MAX_URL_LENGTH ? url : null;
}
