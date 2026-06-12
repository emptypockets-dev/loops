# Loops — a personal AI operations app

Loops turns life chaos into structured loops: **Capture → Classify → Decide next action → Schedule/review → Draft → Approve → Repeat.**

The AI does **not** run your life. It catches, organizes, summarizes, drafts, reminds, and creates re-entry points. You stay in control of every meaningful action — anything consequential is a *draft you approve*, never an automatic execution.

## Stack

- **Next.js** (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui
- **Convex** — database, queries/mutations/actions, cron jobs (source of truth)
- **Clerk** — authentication
- **OpenAI API** — classification, daily briefs, weekly reviews, drafts (called only from Convex actions; the key never reaches the client)
- **zod** — every AI output is validated before anything is persisted

## Screens

| Screen | What it does |
| --- | --- |
| **Today** | Daily Brief (calendar-aware), Top 3 outcomes, 5-minute starts, open loops needing attention, drafts awaiting approval, today's Google Calendar + Block time, Evening Shutdown CTA |
| **Inbox** | Universal capture, AI classify (with manual override), convert to task, archive/delete |
| **Loops** | Recurring life protocols: create/edit/run, check off steps, every run ends with **“This counted.”** |
| **Review** | Calm weekly review: completed, still open, can be dropped, needs a next action, patterns, loop improvements |
| **Settings** | Profile, AI preferences (incl. opt-in auto-archive), approval rules, integrations (all “Coming soon”), data export |

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Clerk

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy the **Publishable key** and **Secret key** into `.env.local` (see `.env.example`):
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
   CLERK_SECRET_KEY=sk_test_…
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```
3. **Create the JWT template Convex needs** — this is required, not optional:
   - Clerk dashboard → **Configure → JWT templates → New template → Convex**.
   - The template must be named exactly **`convex`** (the Convex preset does this).
   - Note the **Issuer** URL shown on the template (looks like `https://your-app.clerk.accounts.dev`).

### 3. Convex

1. Run the dev process once to provision a deployment:
   ```bash
   npx convex dev
   ```
   This writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` into `.env.local`, pushes the schema/functions, and regenerates `convex/_generated/` (committed here so the repo typechecks without the CLI).
2. Set the two server-side environment variables **on the Convex deployment** (dashboard → Settings → Environment Variables, or CLI):
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
   npx convex env set OPENAI_API_KEY sk-…
   ```
   `convex/auth.config.ts` reads `CLERK_JWT_ISSUER_DOMAIN`; all OpenAI calls read `OPENAI_API_KEY` inside Convex actions. Neither belongs in `.env.local`.

### 4. Run locally

Two terminals:

```bash
npx convex dev   # terminal 1 — Convex functions + live schema push
npm run dev      # terminal 2 — Next.js on http://localhost:3000
```

Sign in → a Convex user record is upserted idempotently and the eight default loops are seeded exactly once (guarded by `users.defaultLoopsSeededAt`; repeat sign-ins never duplicate).

`npm run build` / `npm run typecheck` serve as the smoke test.

### 5. Email-in capture (forward anything to your Loops address) — optional

Every user gets a private capture address. Forward an email to it → it lands in the Inbox with `source: integration`, gets auto-classified, and shows up in the daily brief like anything else. One-way only: Loops never sends email.

**How it works**

- `convex/http.ts` exposes `POST /inbound-email` on your deployment's **`.convex.site`** domain (note: `.site`, not `.cloud`).
- The recipient address carries a per-user secret as a plus-tag: `local+<captureToken>@domain`. Tokens are random (122-bit), stored on the user record, and rotatable from **Settings → Integrations** (audit-logged).
- Payload parsing (`lib/email/parse-inbound.ts`) understands **Postmark inbound** JSON and a generic `{ to, from, subject, text }` shape; HTML-only emails are stripped to text, bodies truncated to 15k chars, and retries are deduplicated by Message-ID.
- Unknown/rotated tokens are acknowledged with 200 and ignored (so providers don't retry); an optional shared secret guards the endpoint itself.

**Postmark setup (~5 minutes)**

1. Create a [Postmark](https://postmarkapp.com) server → open its **Default Inbound Stream** → copy the server's inbound address (looks like `a1b2c3d4e5f6@inbound.postmarkapp.com`).
2. Set the stream's **webhook URL** to your Convex site URL, embedding a secret you make up:
   ```
   https://<your-deployment>.convex.site/inbound-email?secret=<make-something-up>
   ```
   (`<your-deployment>` is the subdomain from `NEXT_PUBLIC_CONVEX_URL`.)
3. Tell Convex the same secret:
   ```bash
   npx convex env set INBOUND_EMAIL_WEBHOOK_SECRET <the-same-secret>
   ```
4. Tell the app the inbound mailbox, in `.env.local` (and later in Vercel):
   ```
   NEXT_PUBLIC_INBOUND_EMAIL_BASE=a1b2c3d4e5f6@inbound.postmarkapp.com
   ```
5. Restart `npm run dev`, open **Settings → Integrations**, copy your personal address (`a1b2c3d4e5f6+<token>@inbound.postmarkapp.com`), and forward an email to it.

Postmark's dashboard "Check" button sends a sample payload without your token — the endpoint answers `200 ignored`, which counts as a passing check. Test for real by forwarding an actual email. A custom domain (`in.yourdomain.com` MX → Postmark) is optional polish.

**Testing without a provider**

```bash
curl -X POST "https://<your-deployment>.convex.site/inbound-email?secret=<secret>" \
  -H "Content-Type: application/json" \
  -d '{"to":"capture+<your-token>@example.com","from":"landlord@example.com","subject":"Lease renewal","text":"Your lease ends June 30. Let me know by Friday."}'
```

Your token is shown in Settings → Integrations even before `NEXT_PUBLIC_INBOUND_EMAIL_BASE` is configured.

### 6. Google Calendar — read + approved writes (Clerk-managed OAuth) — optional

Today shows your real calendar, the Daily Brief factors in actual meeting load, and time blocks can be written back — always with you as the approver. No Google tokens are ever stored in Convex: each call fetches a fresh access token from Clerk's Backend API (Clerk refreshes it), uses it once, and drops it.

**Write rules (approval-first):**
- *Block time* on Today writes immediately — the click is the approval, and it's audit-logged.
- AI `calendar` drafts never touch Google on their own. "Add to calendar…" on a draft asks you for the time, then writes; the draft becomes `sent`. "Approve only" keeps it internal.

**Setup (~15 minutes, all in dashboards):**

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
   - Create a project → *APIs & Services → Library* → enable **Google Calendar API**.
   - *OAuth consent screen*: External, fill in the basics, add yourself as a test user. (Testing mode supports up to 100 users with no verification; `calendar.events` is a "sensitive" scope, so Google review is only needed when you publish.)
   - *Credentials → Create OAuth client ID → Web application*. You'll paste the redirect URI from Clerk in the next step.
2. **Clerk dashboard** → *SSO connections → Google*:
   - Enable **Use custom credentials** (required for extra scopes), copy Clerk's **redirect URI** into the Google OAuth client, then paste the Google **Client ID/Secret** into Clerk.
   - Under **Scopes**, add: `https://www.googleapis.com/auth/calendar.events`
3. **Convex** needs your Clerk secret key to fetch Google tokens server-side:
   ```bash
   npx convex env set CLERK_SECRET_KEY sk_test_…   # same value as in .env.local
   ```
4. **Connect your account**: sign in with Google, or avatar menu → *Manage account → Connected accounts → Connect Google*. If Google was connected before you added the scope, disconnect and reconnect so the new permission is granted.

Privacy note: when the calendar is connected, event titles/times for today are included in the Daily Brief prompt sent to OpenAI (same as task titles).

### 7. Morning delivery — brief & review emails (optional)

The cron-generated Daily Brief and Sunday Weekly Review can be **emailed to you** (summary, top 3, a 5-minute start, deep link back to the app). This is the retention loop: the app reaches into your inbox instead of waiting in a tab. These are notifications *to yourself* — Loops still never sends anything on your behalf to other people.

On the same Postmark account as inbound capture:

1. Verify a **sender signature** (or your domain) in Postmark — the address Loops will send from. Note: brand-new Postmark accounts can only send to addresses on the same domain until approved, which is fine when you're emailing yourself.
2. Configure the Convex deployment:
   ```bash
   npx convex env set POSTMARK_SERVER_TOKEN <server API token>
   npx convex env set EMAIL_FROM loops@yourdomain.com
   npx convex env set APP_BASE_URL https://your-app.vercel.app   # for deep links (optional)
   ```
3. That's it — the existing crons now deliver. Toggles live in **Settings → Profile → Email delivery** (on by default; unset config just skips sending). Only *scheduled* generations email; pressing "Generate" in the app doesn't, since you're already looking at it.

### 8. Quick capture, PWA & share target

- **`/capture`** is a minimal page with nothing but an autofocused capture box — it's also the big **Capture** button in the nav.
- The app ships a **web manifest**: on your phone, *Add to Home Screen* installs Loops with `start_url: /capture`, so opening the app *is* starting a capture.
- On Android/Chrome the manifest registers a **share target**: share any text or link from another app → it lands prefilled in `/capture`.
- Icons are generated by `node scripts/generate-icons.mjs` (zero dependencies; committed under `public/icons/`). iOS uses the `apple-touch-icon`; share target is an Android/Chromium feature.

### 9. The two-week protocol (the part software can't do)

Loops only changes anything if two rituals get wired in. Everything above exists to make them nearly free:

1. **Morning (2 min):** read the brief email, pick one 5-minute start, do it before anything else opens.
2. **The forwarding reflex:** the moment an email makes your stomach drop, forward it to your capture address instead of re-reading it.
3. **Sunday (5 min):** read the review email, drop one thing guilt-free.

Run it for two weeks before judging the app.

### 10. Deploy to Vercel

1. Push the repo and import it into Vercel.
2. **Vercel env vars** (Production + Preview):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CONVEX_URL` — your **production** Convex URL (from `npx convex deploy`)
   - `NEXT_PUBLIC_INBOUND_EMAIL_BASE` — if you use email-in capture
   - `CONVEX_DEPLOY_KEY` — if you use the build-command integration below
3. **Convex production deployment**: either run `npx convex deploy` manually before each release, or set Vercel's build command to:
   ```bash
   npx convex deploy --cmd 'npm run build'
   ```
   so the schema/functions deploy in lockstep with the frontend.
4. Set `CLERK_JWT_ISSUER_DOMAIN`, `OPENAI_API_KEY`, `CLERK_SECRET_KEY` (for Google Calendar), `INBOUND_EMAIL_WEBHOOK_SECRET` (for email-in), and `POSTMARK_SERVER_TOKEN` / `EMAIL_FROM` / `APP_BASE_URL` (for notification emails) on the **production** Convex deployment too (`npx convex env set --prod …`), and point your email provider's webhook at the production `.convex.site` URL. Use your production Clerk secret key with production Google OAuth credentials.
5. In Clerk, add your Vercel domain to the allowed origins (and switch to production keys when you go live).

---

## Architecture notes

- **Auth flow**: `ConvexProviderWithClerk` + Clerk's `useAuth` (never the plain `ConvexProvider`). Every Convex function derives identity via `ctx.auth.getUserIdentity()` and resolves the internal `users` record from the Clerk subject — **no function ever accepts a userId from the client** (internal functions called by crons take a userId, but they're not client-callable).
- **AI layer**: one shared helper (`lib/ai/openai.ts`) takes a system prompt + payload, requests JSON output, parses, and validates with zod. Failures return `{ ok: false, error }` → the UI shows a toast; nothing invalid is ever persisted and no screen crashes. The model is centralized in `lib/constants/ai.ts`.
- **Approval-first**: `draftResponseOrAction` always persists a `draft`; nothing is ever sent. The approval matrix lives in `lib/constants/approval.ts` (outward-facing types + any medium/high-risk draft require explicit approval). Approving an email/calendar/note marks it ready for *you* to use (with a copy button); approving a task draft creates the task.
- **AI vs. user state** is visually distinct everywhere via `ClassificationBadge` — “AI suggested” (sparkles, dashed) vs. “Confirmed by you” (check), icon + text, never color alone.
- **Constants** (`lib/constants/`): canonical categories, enums, tone preamble, default-loop seeds, approval rules. Convex schema validators, zod schemas, prompts, and screens all read from these.
- **Crons** (`convex/crons.ts`): daily-brief generation (05:00 UTC) and the Sunday weekly-review generation (16:00 UTC). When outbound email is configured, both deliver to the user's own address (per-user opt-out in Settings → Profile); notification emails go only to the user, never on their behalf.
- **Audit log**: consequential mutations (convert, delete, approve/reject, loop runs, seeding, AI writes) append `auditLog` entries.
- **Email-in capture** is live: a Convex HTTP action (`convex/http.ts`) receives provider webhooks, resolves the user by their rotatable capture token, stores the email as an inbox item, and schedules auto-classification (which respects the auto-archive opt-in). Forwarded items are marked “forwarded email” in the Inbox.
- **Google Calendar** is live via Clerk-managed OAuth (`convex/lib/googleCalendar.ts` + `convex/calendar.ts`): tokens are fetched per-request from Clerk's Backend API and never stored. Reads power Today and the Daily Brief; writes are approval-first (manual Block time, or "Add to calendar…" on an approved AI draft → status `sent`). All outward writes are audit-logged.
- **Remaining integrations** (Notion / Todoist / Gmail) are scaffolding: `lib/integrations/provider.ts` defines the `IntegrationProvider` interface; Settings shows them as “Coming soon”. The app is fully usable with zero integrations. OAuth token fields in the `integrations` table are placeholders — no encryption implemented.

## Assumptions (chosen for shippability)

- **Dates**: calendar days are `YYYY-MM-DD` strings. On-demand briefs/reviews use the browser's local date; cron-generated ones use the UTC day. Weeks start Monday.
- Unclassified inbox items carry a placeholder category (`Someday`) that the UI hides until the item is classified (schema requires the field).
- The reviews table includes a `needsNextAction` array beyond the original spec because the Review screen has that section.
- An extra optional `classifiedBy` (`ai` | `user`) field on inbox items drives the AI-suggested vs. confirmed distinction.
- Monthly loop cadence approximates to 30 days for the next-run nudge.
- “Voice note” capture is a disabled placeholder button; real capture is text or forwarded email.
- Email-in attachments are ignored (text only); bodies are truncated at 15k characters; rate limiting beyond the unguessable token + optional webhook secret is future hardening.
- Forwarded emails auto-classify on arrival (the approval-first rules explicitly allow automatic classification; consequential actions still require approval).
- Calendar reads/writes use the **primary** calendar only; events created by Loops are simple timed blocks (no attendees, no recurrence). Cron-generated briefs window the calendar to the UTC day; on-demand briefs use the browser's timezone offset.
- The weekly cron *generates* the review (rather than only nudging) so it's waiting on the Review screen Sunday evening.

## Project layout

```
app/                    # Next.js App Router (landing, sign-in/up, (app)/today|inbox|loops|review|settings)
components/             # app shell, feature components, shadcn/ui primitives
convex/                 # schema, auth config, queries/mutations, AI actions, crons
  _generated/           # committed so the repo typechecks; regenerated by `npx convex dev`
lib/
  ai/                   # OpenAI helper, zod schemas, prompts
  constants/            # categories, enums, tone, default loops, approval rules, model
  integrations/         # IntegrationProvider interface + “coming soon” stubs
```
