import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { parseInboundEmail } from "../lib/email/parse-inbound";

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const http = httpRouter();

/**
 * Inbound-email webhook (POST https://<deployment>.convex.site/inbound-email).
 * Point Postmark's inbound stream (or any provider that can POST JSON) here.
 *
 * Auth model, two layers:
 * 1. Optional shared secret — if INBOUND_EMAIL_WEBHOOK_SECRET is set on the
 *    deployment, the request must carry it (x-webhook-secret header or
 *    ?secret= query param).
 * 2. Per-user capture token in the recipient address (capture+<token>@…) —
 *    unguessable, rotatable from Settings. Unknown tokens are ignored with a
 *    200 so providers don't retry what can never succeed.
 */
http.route({
  path: "/inbound-email",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const configuredSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    if (configuredSecret) {
      const provided =
        request.headers.get("x-webhook-secret") ??
        new URL(request.url).searchParams.get("secret");
      if (provided !== configuredSecret) {
        return json(401, { ok: false, error: "unauthorized" });
      }
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json(400, { ok: false, error: "invalid JSON body" });
    }

    const email = parseInboundEmail(payload);
    if (!email) {
      return json(400, { ok: false, error: "unrecognized payload shape" });
    }
    if (!email.token) {
      // E.g. the provider's dashboard test payload — nothing to route to.
      return json(200, { ok: true, status: "ignored", reason: "no capture token in recipient" });
    }

    const result = await ctx.runMutation(internal.inboxItems.captureFromEmail, {
      captureToken: email.token,
      fromAddress: email.from,
      subject: email.subject,
      body: email.body,
      messageId: email.messageId ?? undefined,
    });

    if (!result.ok) {
      // Unknown or rotated token: acknowledge so the provider stops retrying.
      return json(200, { ok: true, status: "ignored", reason: result.reason });
    }
    return json(200, {
      ok: true,
      status: result.deduplicated ? "duplicate" : "captured",
    });
  }),
});

export default http;
