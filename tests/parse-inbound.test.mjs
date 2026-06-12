import assert from "node:assert";
import {
  cleanSubjectForTitle,
  htmlToText,
  parseInboundEmail,
  tokenFromAddress,
} from "../lib/email/parse-inbound.ts";

// Postmark payload with MailboxHash (the canonical path)
const postmark = parseInboundEmail({
  FromFull: { Email: "landlord@example.com", Name: "Pat Landlord" },
  From: "Pat Landlord <landlord@example.com>",
  Subject: "Fwd: Lease renewal",
  MessageID: "msg-123",
  TextBody: "Your lease ends June 30. Let me know by Friday.",
  HtmlBody: "<p>ignored when TextBody exists</p>",
  ToFull: [{ Email: "a1b2+tok_abc123@inbound.postmarkapp.com", MailboxHash: "tok_abc123" }],
});
assert.equal(postmark.token, "tok_abc123");
assert.equal(postmark.from, "landlord@example.com");
assert.equal(postmark.subject, "Fwd: Lease renewal");
assert.equal(postmark.messageId, "msg-123");
assert.ok(postmark.body.includes("June 30"));

// Empty MailboxHash → token from plus address
const plusOnly = parseInboundEmail({
  FromFull: { Email: "a@b.com" },
  Subject: "Hi",
  TextBody: "Body",
  ToFull: [{ Email: "capture+secret99@in.example.com", MailboxHash: "" }],
});
assert.equal(plusOnly.token, "secret99");

// Generic curl-style payload
const generic = parseInboundEmail({
  to: "capture+mytoken@example.com",
  from: "boss@work.com",
  subject: "Q3 report",
  text: "Need the numbers by Tuesday.",
});
assert.equal(generic.token, "mytoken");
assert.equal(generic.from, "boss@work.com");

// HTML-only email → stripped text
const htmlOnly = parseInboundEmail({
  token: "t1",
  from: "news@letter.com",
  subject: "S",
  html: "<div><style>p{color:red}</style><p>Hello &amp; welcome</p><br><p>Second line</p></div>",
});
assert.ok(htmlOnly.body.includes("Hello & welcome"));
assert.ok(htmlOnly.body.includes("Second line"));
assert.ok(!htmlOnly.body.includes("<p>"));
assert.ok(!htmlOnly.body.includes("color:red"));

// No token anywhere → token null (webhook ignores politely)
assert.equal(parseInboundEmail({ from: "x@y.com", subject: "t", text: "hello" }).token, null);

// Nothing capturable → null
assert.equal(parseInboundEmail({ token: "t", from: "a@b.com" }), null);
assert.equal(parseInboundEmail("not an object"), null);
assert.equal(parseInboundEmail(null), null);

// Truncation at 15k
const long = parseInboundEmail({ token: "t", from: "a@b.com", subject: "s", text: "x".repeat(40000) });
assert.equal(long.body.length, 15000);

// Helpers
assert.equal(tokenFromAddress("capture+abc123@x.com"), "abc123");
assert.equal(tokenFromAddress("plain@x.com"), null);
assert.equal(cleanSubjectForTitle("Fwd: FW: re: Lease renewal"), "Lease renewal");
assert.equal(cleanSubjectForTitle("Normal subject"), "Normal subject");
assert.ok(htmlToText("<tr><td>a</td></tr>").includes("a"));
