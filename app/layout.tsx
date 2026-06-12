import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loops — your calm command center",
  description:
    "Turn life chaos into structured loops. Capture, classify, decide the next action — you stay in control.",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#266e73",
};

// Applies the stored theme before first paint (parser-blocking, so no flash).
const themeInitScript = `(function(){try{var t=localStorage.getItem("loops-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen font-sans">
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
