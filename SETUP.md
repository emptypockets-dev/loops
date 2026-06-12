# Loops setup — the check-as-you-go version

Built to be ADHD-friendly: **one action per step**, a checkpoint after every phase so you know it worked, and a clearly marked **STOP** point at the end of every tier. Each tier ends with a working app. Stopping early is a valid finish, not a failure.

> Stuck mid-setup? Run `npm run doctor` — it tells you what's configured and which step to do next.

---

## Before you start (2 min)

- [ ] Open a terminal in this repo.
- [ ] Open a browser with one empty tab. (You'll be told exactly when to open each site — no need to pre-open five dashboards.)
- [ ] Optional: paper or a scratch note for ONE value you'll carry between tabs (the Clerk "Issuer URL").

**The whole map** (you can stop after any tier):

| Tier | What you get | Time |
| --- | --- | --- |
| 1 | The full app, with AI, running locally | ~20 min |
| 2 | Forward emails into your Inbox | ~10 min |
| 3 | Morning brief in your email | ~5 min |
| 4 | Google Calendar read + time-blocking | ~20 min |
| 5 | Deployed to the internet (Vercel) | ~15 min |
| 6 | On your phone + first ritual | ~5 min |

---

## Tier 1 — The app works (~20 min)

### Phase A: Clerk (browser)

- [ ] 1. Go to **dashboard.clerk.com** → sign up / sign in → **Create application**. Name: `Loops`. Enable **Google** (you'll want it for Tier 4) and/or email.
- [ ] 2. You land on the app's dashboard. In the left sidebar: **Configure → API Keys**. Leave this tab open.
- [ ] 3. Same sidebar: **Configure → JWT templates → New template → Convex** (it's a preset). Click Save. **Do not rename it** — it must be called exactly `convex`.
- [ ] 4. On that template page, copy the **Issuer** URL (looks like `https://something.clerk.accounts.dev`) into your scratch note. This is the ONE value you carry around.

**Done when:** you have a Clerk app, a JWT template named `convex`, and the Issuer URL written down.

### Phase B: Terminal

- [ ] 5. ```bash
      cp .env.example .env.local
      ```
- [ ] 6. Open `.env.local` in your editor. From the Clerk **API Keys** tab, paste:
      - the key starting `pk_test_` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=`
      - the key starting `sk_test_` → `CLERK_SECRET_KEY=`
      (The two `SIGN_IN`/`SIGN_UP` lines are already correct. Leave `NEXT_PUBLIC_CONVEX_URL` empty — it fills itself in step 8.)
- [ ] 7. ```bash
      npm install
      ```
      **Done when:** it ends without red errors.
- [ ] 8. ```bash
      npx convex dev
      ```
      Log in / create a project when prompted, then **leave this running**.
      **Done when:** it's watching for changes. It auto-wrote `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` into `.env.local`.
      ⚠️ It will probably show an error about `CLERK_JWT_ISSUER_DOMAIN` — **that's expected**, step 9 fixes it.
- [ ] 9. Open a **second terminal** (keep the first running) and paste your scratch-note URL:
      ```bash
      npx convex env set CLERK_JWT_ISSUER_DOMAIN https://YOUR-VALUE.clerk.accounts.dev
      ```
- [ ] 10. Get an OpenAI key: **platform.openai.com → API keys → Create new secret key**, then:
      ```bash
      npx convex env set OPENAI_API_KEY sk-YOUR-KEY
      ```
- [ ] 11. In the second terminal:
      ```bash
      npm run dev
      ```
- [ ] 12. Open **http://localhost:3000** → click **Get started** → sign up.

**🟢 TIER 1 DONE WHEN:** you see the Today screen with a "Getting the hang of Loops" checklist, and the Loops page shows 8 pre-made loops.

**✋ STOP HERE IF YOU WANT.** Everything core works — capture, AI classify, briefs, loops, reviews, the Unstuck button. Tiers 2–6 are amplifiers. Honestly, consider doing the in-app onboarding checklist now and coming back to Tier 2 another day.

---

## Tier 2 — Forward emails into Loops (~10 min)

- [ ] 1. Go to **postmarkapp.com** → sign up (free) → create a **Server**.
- [ ] 2. Open the server's **Default Inbound Stream → Settings**.
- [ ] 3. Copy the **inbound email address** (looks like `a1b2c3d4@inbound.postmarkapp.com`). Paste it into `.env.local`:
      ```
      NEXT_PUBLIC_INBOUND_EMAIL_BASE=a1b2c3d4@inbound.postmarkapp.com
      ```
- [ ] 4. Make up a password-ish secret (anything, e.g. `loops-hook-29481`). Set the inbound stream's **Webhook URL** to:
      ```
      https://YOUR-DEPLOYMENT.convex.site/inbound-email?secret=YOUR-MADE-UP-SECRET
      ```
      `YOUR-DEPLOYMENT` = the subdomain from `NEXT_PUBLIC_CONVEX_URL` in `.env.local`, but note the ending: **`.convex.site`**, not `.convex.cloud`.
- [ ] 5. Tell Convex the same secret:
      ```bash
      npx convex env set INBOUND_EMAIL_WEBHOOK_SECRET YOUR-MADE-UP-SECRET
      ```
- [ ] 6. Restart `npm run dev` (Ctrl-C, run again) so it picks up the new `.env.local` line.
- [ ] 7. In the app: **Settings → Integrations** → copy your personal address (it has a `+token` in the middle).
- [ ] 8. Forward any email to that address from your normal mail app.

**🟢 TIER 2 DONE WHEN:** within ~a minute, the forwarded email appears in your Inbox tagged “forwarded email”, already classified.
(Postmark's dashboard "Check" button counts as passing even though it shows `ignored` — it sends a sample with no token. Test with a real forward.)

**✋ STOP POINT.**

---

## Tier 3 — Morning brief in your email (~5 min)

- [ ] 1. In Postmark: **Sender Signatures → Add a signature** for the address you want Loops to send FROM (your own email works). Click the confirmation link Postmark emails you.
      ⚠️ New Postmark accounts can only send to addresses on the **same domain** until approved — sending to yourself from yourself is the easy case.
- [ ] 2. In Postmark: **Your server → API Tokens** → copy the **Server API token**, then:
      ```bash
      npx convex env set POSTMARK_SERVER_TOKEN YOUR-TOKEN
      npx convex env set EMAIL_FROM you@yourdomain.com
      npx convex env set APP_BASE_URL http://localhost:3000
      ```
      (Update `APP_BASE_URL` to your Vercel URL after Tier 5 so email links point somewhere real.)

**🟢 TIER 3 DONE WHEN:** tomorrow at your local 5:00am there's a "Your brief for …" email waiting. (No way to see it tonight — that's the point. Toggles live in Settings → Profile.)

**✋ STOP POINT.**

---

## Tier 4 — Google Calendar (~20 min, the fiddliest one)

### Phase A: Google Cloud (browser)

- [ ] 1. Go to **console.cloud.google.com** → create a project (name: `Loops`).
- [ ] 2. **APIs & Services → Library** → search “Google Calendar API” → **Enable**.
- [ ] 3. **APIs & Services → OAuth consent screen** → External → fill the 3 required fields → add **yourself as a test user**. (Testing mode = up to 100 users, no Google review needed.)
- [ ] 4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**. Leave it open — the redirect URI comes from Clerk in the next phase.

### Phase B: Clerk (browser)

- [ ] 5. Clerk dashboard → **Configure → SSO connections → Google** → enable **Use custom credentials**.
- [ ] 6. Copy Clerk's **redirect URI** → paste into the Google OAuth client from step 4 (Authorized redirect URIs) → Save in Google.
- [ ] 7. Copy the Google **Client ID** and **Client secret** → paste into Clerk → in Clerk's **Scopes** field, add:
      ```
      https://www.googleapis.com/auth/calendar.events
      ```
      → Save.

### Phase C: Terminal + app

- [ ] 8. Give Convex your Clerk secret key (same `sk_test_…` value already in `.env.local`):
      ```bash
      npx convex env set CLERK_SECRET_KEY sk_test_YOUR-KEY
      ```
- [ ] 9. In the app: avatar menu (top right) → **Manage account → Connected accounts**. If Google is already connected, **disconnect it once**. Then **Connect Google** — the consent screen should now ask for calendar access.

**🟢 TIER 4 DONE WHEN:** Today's calendar section shows your real events, and **Block time** creates an event you can see in Google Calendar.

**✋ STOP POINT.**

---

## Tier 5 — Deploy to Vercel (~15 min)

- [ ] 1. Push this repo to GitHub (already done if you're reading this there).
- [ ] 2. **vercel.com → Add New → Project** → import the repo. Don't deploy yet.
- [ ] 3. Convex dashboard (**dashboard.convex.dev**) → your project → **Settings → Deploy keys → Generate production deploy key** → copy.
- [ ] 4. In Vercel's project settings, set **Build Command** to:
      ```
      npx convex deploy --cmd 'npm run build'
      ```
- [ ] 5. Add these **Environment Variables** in Vercel (values from your `.env.local`, plus the deploy key):
      - `CONVEX_DEPLOY_KEY` ← step 3
      - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
      - `CLERK_SECRET_KEY`
      - `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`
      - `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-up`
      - `NEXT_PUBLIC_INBOUND_EMAIL_BASE` (if you did Tier 2)
- [ ] 6. Deploy. **Done when:** the build is green and the URL loads the landing page.
- [ ] 7. Production Convex is a separate deployment — copy the server-side vars to it (run each line you previously set, with `--prod`):
      ```bash
      npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN ...
      npx convex env set --prod OPENAI_API_KEY ...
      npx convex env set --prod INBOUND_EMAIL_WEBHOOK_SECRET ...   # Tier 2
      npx convex env set --prod POSTMARK_SERVER_TOKEN ...          # Tier 3
      npx convex env set --prod EMAIL_FROM ...                     # Tier 3
      npx convex env set --prod APP_BASE_URL https://your-app.vercel.app
      npx convex env set --prod CLERK_SECRET_KEY ...               # Tier 4
      ```
- [ ] 8. If you did Tier 2: point Postmark's webhook at the **production** `.convex.site` URL (Convex dashboard shows the production deployment name).

**🟢 TIER 5 DONE WHEN:** you can sign in on the Vercel URL and your data is there (note: production Convex starts empty — your local data stays in the dev deployment).

*Fine print: Clerk dev keys (`pk_test_`) work on Vercel for personal use with a "development" watermark. Create a Clerk production instance later if you add a custom domain.*

---

## Tier 6 — Phone + the first ritual (~5 min)

- [ ] 1. Open your Vercel URL on your phone → sign in.
- [ ] 2. Browser menu → **Add to Home Screen**. The icon opens straight into Capture.
- [ ] 3. Add your capture email address (Settings → Integrations) to your contacts as “Loops”.
- [ ] 4. Tonight: press **Run Evening Shutdown** on Today and let it walk you through.

**🟢 SETUP COMPLETE.** From here, the [two-week protocol](README.md#9-the-two-week-protocol-the-part-software-cant-do) is three tiny habits — the in-app checklist and `/help` page have your back.

---

## When something breaks (the 5 likely suspects)

| Symptom | Cause → fix |
| --- | --- |
| Signed in but Today spins forever / everything's empty | The Clerk↔Convex handshake. Check: JWT template is named exactly `convex` (Tier 1 step 3) and `CLERK_JWT_ISSUER_DOMAIN` matches the Issuer URL (step 9). Then restart `npx convex dev`. |
| “AI isn't configured yet” toasts | `OPENAI_API_KEY` missing on **Convex** (it does NOT go in `.env.local`) — Tier 1 step 10. |
| Forwarded email never appears | Webhook URL ends in `.convex.site` (not `.cloud`)? Secret in the URL matches `INBOUND_EMAIL_WEBHOOK_SECRET`? Forwarding to the address **with** the `+token`? |
| Settings says “Almost there — one config step left” | `NEXT_PUBLIC_INBOUND_EMAIL_BASE` isn't set, or you didn't restart `npm run dev` after setting it. |
| Calendar says Google declined access | The scope was added after you connected. Avatar menu → Manage account → disconnect Google → reconnect (Tier 4 step 9). |

Still stuck? `npm run doctor` and read what it says.
