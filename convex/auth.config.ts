/**
 * Clerk ↔ Convex wiring. Requires a Clerk JWT template named exactly "convex"
 * and the CLERK_JWT_ISSUER_DOMAIN env var on the Convex deployment
 * (your Clerk Frontend API URL, e.g. https://your-app.clerk.accounts.dev).
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
