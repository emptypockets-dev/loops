import type { MetadataRoute } from "next";

/** Index the landing page; keep the private app surface out of crawlers. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/today",
        "/inbox",
        "/loops",
        "/review",
        "/settings",
        "/capture",
        "/help",
        "/sign-in",
        "/sign-up",
      ],
    },
  };
}
