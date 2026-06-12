import assert from "node:assert";
import {
  parseClerkTokenResponse,
  parseGoogleEventsResponse,
} from "../convex/lib/googleCalendar.ts";

// Clerk token: bare-array shape
const bare = parseClerkTokenResponse([
  {
    object: "oauth_access_token",
    token: "ya29.abc",
    provider: "oauth_google",
    scopes: ["openid", "https://www.googleapis.com/auth/calendar.events"],
  },
]);
assert.equal(bare.token, "ya29.abc");
assert.ok(bare.scopes.some((s) => s.includes("auth/calendar")));

// Clerk token: { data: [...] } envelope
const wrapped = parseClerkTokenResponse({ data: [{ token: "ya29.xyz", scopes: null }], total_count: 1 });
assert.equal(wrapped.token, "ya29.xyz");
assert.equal(wrapped.scopes, null);

// No connection
assert.equal(parseClerkTokenResponse([]), null);
assert.equal(parseClerkTokenResponse({ data: [] }), null);
assert.equal(parseClerkTokenResponse({ errors: [] }), null);
assert.equal(parseClerkTokenResponse(null), null);

// Google events mapping
const events = parseGoogleEventsResponse({
  items: [
    {
      id: "e1",
      status: "confirmed",
      summary: "Standup",
      htmlLink: "https://cal/e1",
      start: { dateTime: "2026-06-12T09:00:00-04:00" },
      end: { dateTime: "2026-06-12T09:30:00-04:00" },
    },
    {
      id: "e2",
      status: "cancelled",
      summary: "Ghost",
      start: { dateTime: "2026-06-12T10:00:00Z" },
      end: { dateTime: "2026-06-12T11:00:00Z" },
    },
    { id: "e3", summary: "Company holiday", start: { date: "2026-06-12" }, end: { date: "2026-06-13" } },
    {
      id: "e4",
      start: { dateTime: "2026-06-12T13:00:00Z" },
      end: { dateTime: "2026-06-12T14:00:00Z" },
      location: "  Room 4 ",
    },
    { id: "e5" }, // no start → skipped
    "garbage",
  ],
});
assert.equal(events.length, 3);
assert.equal(events[0].title, "Standup");
assert.equal(events[0].allDay, false);
assert.equal(events[1].title, "Company holiday");
assert.equal(events[1].allDay, true);
assert.equal(events[2].title, "(untitled)");
assert.equal(events[2].location, "Room 4");

// Defensive on junk
assert.deepEqual(parseGoogleEventsResponse(null), []);
assert.deepEqual(parseGoogleEventsResponse({}), []);
assert.deepEqual(parseGoogleEventsResponse({ items: "nope" }), []);
