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
| **Today** | Daily Brief, Top 3 outcomes, 5-minute starts, open loops needing attention, drafts awaiting approval, calendar placeholder, Evening Shutdown CTA |
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

### 5. Deploy to Vercel

1. Push the repo and import it into Vercel.
2. **Vercel env vars** (Production + Preview):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CONVEX_URL` — your **production** Convex URL (from `npx convex deploy`)
   - `CONVEX_DEPLOY_KEY` — if you use the build-command integration below
3. **Convex production deployment**: either run `npx convex deploy` manually before each release, or set Vercel's build command to:
   ```bash
   npx convex deploy --cmd 'npm run build'
   ```
   so the schema/functions deploy in lockstep with the frontend.
4. Set `CLERK_JWT_ISSUER_DOMAIN` and `OPENAI_API_KEY` on the **production** Convex deployment too (`npx convex env set --prod …`).
5. In Clerk, add your Vercel domain to the allowed origins (and switch to production keys when you go live).

---

## Architecture notes

- **Auth flow**: `ConvexProviderWithClerk` + Clerk's `useAuth` (never the plain `ConvexProvider`). Every Convex function derives identity via `ctx.auth.getUserIdentity()` and resolves the internal `users` record from the Clerk subject — **no function ever accepts a userId from the client** (internal functions called by crons take a userId, but they're not client-callable).
- **AI layer**: one shared helper (`lib/ai/openai.ts`) takes a system prompt + payload, requests JSON output, parses, and validates with zod. Failures return `{ ok: false, error }` → the UI shows a toast; nothing invalid is ever persisted and no screen crashes. The model is centralized in `lib/constants/ai.ts`.
- **Approval-first**: `draftResponseOrAction` always persists a `draft`; nothing is ever sent. The approval matrix lives in `lib/constants/approval.ts` (outward-facing types + any medium/high-risk draft require explicit approval). Approving an email/calendar/note marks it ready for *you* to use (with a copy button); approving a task draft creates the task.
- **AI vs. user state** is visually distinct everywhere via `ClassificationBadge` — “AI suggested” (sparkles, dashed) vs. “Confirmed by you” (check), icon + text, never color alone.
- **Constants** (`lib/constants/`): canonical categories, enums, tone preamble, default-loop seeds, approval rules. Convex schema validators, zod schemas, prompts, and screens all read from these.
- **Crons** (`convex/crons.ts`): daily-brief generation (05:00 UTC) and the Sunday weekly-review generation (16:00 UTC).
- **Audit log**: consequential mutations (convert, delete, approve/reject, loop runs, seeding, AI writes) append `auditLog` entries.
- **Integrations** are scaffolding only: `lib/integrations/provider.ts` defines the `IntegrationProvider` interface; Settings shows Notion / Todoist / Google Calendar / Gmail as “Coming soon”. The app is fully usable with zero integrations. Token fields are placeholders — no encryption implemented.

## Assumptions (chosen for shippability)

- **Dates**: calendar days are `YYYY-MM-DD` strings. On-demand briefs/reviews use the browser's local date; cron-generated ones use the UTC day. Weeks start Monday.
- Unclassified inbox items carry a placeholder category (`Someday`) that the UI hides until the item is classified (schema requires the field).
- The reviews table includes a `needsNextAction` array beyond the original spec because the Review screen has that section.
- An extra optional `classifiedBy` (`ai` | `user`) field on inbox items drives the AI-suggested vs. confirmed distinction.
- Monthly loop cadence approximates to 30 days for the next-run nudge.
- “Voice note” capture is a disabled placeholder button; real capture is text-only.
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
