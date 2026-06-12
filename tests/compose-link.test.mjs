import assert from "node:assert";
import {
  buildGmailComposeUrl,
  buildMailtoUrl,
  splitSubjectFromBody,
} from "../lib/email/compose-link.ts";

// Subject extracted from a conventional first line
const split = splitSubjectFromBody("Draft title", "Subject: Lease renewal\nHi Pat,\n\nYes to renewing.");
assert.equal(split.subject, "Lease renewal");
assert.ok(split.body.startsWith("Hi Pat,"));
assert.ok(!split.body.includes("Subject:"));

// No subject line → title becomes the subject
const noLine = splitSubjectFromBody("Quick nudge", "Hey — any update?");
assert.equal(noLine.subject, "Quick nudge");
assert.equal(noLine.body, "Hey — any update?");

// Gmail URL is well-formed and encoded
const url = buildGmailComposeUrl("T", "Subject: Hello & welcome\nLine one");
assert.ok(url.startsWith("https://mail.google.com/mail/?view=cm&fs=1"));
assert.ok(url.includes("su=Hello%20%26%20welcome"));
assert.ok(url.includes("body=Line%20one"));

// Oversized bodies refuse to build a URL instead of producing a broken one
assert.equal(buildGmailComposeUrl("T", "x".repeat(5000)), null);
assert.equal(buildMailtoUrl("T", "x".repeat(5000)), null);

// mailto fallback
const mailto = buildMailtoUrl("Subj", "Body here");
assert.ok(mailto.startsWith("mailto:?subject=Subj"));
