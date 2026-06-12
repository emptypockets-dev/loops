import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything inside the (app) group is private. The landing and auth pages are public.
const isProtectedRoute = createRouteMatcher([
  "/today(.*)",
  "/inbox(.*)",
  "/loops(.*)",
  "/review(.*)",
  "/settings(.*)",
  "/capture(.*)",
  "/help(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
