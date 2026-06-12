import type { MetadataRoute } from "next";

/**
 * PWA manifest: installable from the browser menu, opens straight into
 * capture (the habit we're engineering), and registers as an Android/Chrome
 * share target so any text/link can be shared into the Inbox.
 */
export default function manifest(): MetadataRoute.Manifest {
  const base: MetadataRoute.Manifest = {
    name: "Loops — your calm command center",
    short_name: "Loops",
    description:
      "Capture everything, let it get organized, and do the smallest honest next action.",
    start_url: "/capture",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#266e73",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  // share_target is a standard manifest member Next's type doesn't model yet.
  return {
    ...base,
    share_target: {
      action: "/capture",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
