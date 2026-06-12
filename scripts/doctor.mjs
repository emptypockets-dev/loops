/**
 * `npm run doctor` — answers "where am I in setup?" without judgement.
 * Checks what's verifiable locally and points at the exact SETUP.md step
 * for anything missing. Zero dependencies.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const GREEN = "\x1b[32m✔\x1b[0m";
const RED = "\x1b[31m✘\x1b[0m";
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

function parseEnvFile(path) {
  if (!existsSync(path)) return null;
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !line.trim().startsWith("#")) env[match[1]] = match[2];
  }
  return env;
}

const checks = [];
function check(ok, label, fix) {
  checks.push({ ok, label, fix });
  console.log(`${ok ? GREEN : RED} ${label}${ok || !fix ? "" : `\n    ${DIM(`→ ${fix}`)}`}`);
}

console.log("\nLoops doctor — where you are in setup\n");

// ── Basics ───────────────────────────────────────────────────────────────────
const nodeMajor = Number(process.versions.node.split(".")[0]);
check(nodeMajor >= 18, `Node ${process.versions.node} (need ≥ 18)`, "Install a newer Node from nodejs.org");
check(
  existsSync(join(root, "node_modules", "next")),
  "Dependencies installed",
  "Run: npm install  (SETUP.md Tier 1, step 7)"
);

// ── .env.local / Tier 1 ──────────────────────────────────────────────────────
const env = parseEnvFile(join(root, ".env.local"));
check(env !== null, ".env.local exists", "Run: cp .env.example .env.local  (Tier 1, step 5)");

if (env) {
  check(
    (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").startsWith("pk_"),
    "Clerk publishable key set",
    "Paste the pk_test_… key from Clerk → API Keys  (Tier 1, step 6)"
  );
  check(
    (env.CLERK_SECRET_KEY ?? "").startsWith("sk_"),
    "Clerk secret key set",
    "Paste the sk_test_… key from Clerk → API Keys  (Tier 1, step 6)"
  );
  check(
    (env.NEXT_PUBLIC_CONVEX_URL ?? "").includes("convex.cloud"),
    "Convex URL set (written automatically by `npx convex dev`)",
    "Run: npx convex dev — and leave it running  (Tier 1, step 8)"
  );
  check(
    Boolean(env.CONVEX_DEPLOYMENT),
    "Convex deployment linked",
    "Run: npx convex dev  (Tier 1, step 8)"
  );

  // ── Optional tiers ─────────────────────────────────────────────────────────
  console.log(`\n${DIM("Optional tiers (skipping these is a valid choice):")}`);
  const inbound = Boolean(env.NEXT_PUBLIC_INBOUND_EMAIL_BASE);
  console.log(
    `${inbound ? GREEN : DIM("·")} Email-in capture ${inbound ? "configured" : DIM("not set up — SETUP.md Tier 2")}`
  );
}

// ── Convex-side vars (not checkable from here) ───────────────────────────────
console.log(`\n${DIM("Lives on the Convex deployment (this script can't see them):")}`);
console.log(
  DIM(
    [
      "  CLERK_JWT_ISSUER_DOMAIN (Tier 1, step 9)   OPENAI_API_KEY (Tier 1, step 10)",
      "  INBOUND_EMAIL_WEBHOOK_SECRET (Tier 2)      POSTMARK_SERVER_TOKEN + EMAIL_FROM + APP_BASE_URL (Tier 3)",
      "  CLERK_SECRET_KEY (Tier 4)",
      "  Check them with: npx convex env list",
    ].join("\n")
  )
);

// ── Verdict ──────────────────────────────────────────────────────────────────
const failed = checks.filter((c) => !c.ok);
console.log("");
if (failed.length === 0) {
  console.log(`${GREEN} Local setup looks complete. Start it with:`);
  console.log("    npx convex dev     (terminal 1)");
  console.log("    npm run dev        (terminal 2)\n");
} else {
  console.log(`${RED} ${failed.length} thing(s) to do — the arrows above point at the exact SETUP.md step.`);
  console.log(DIM("  One step at a time is the whole method.\n"));
}
