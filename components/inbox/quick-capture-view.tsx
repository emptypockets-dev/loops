"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaptureBox } from "./capture-box";

/**
 * The fast path: nothing on this screen but the capture box. It's the PWA
 * start screen and the share-target destination (?title=&text=&url= are
 * prefilled when another app shares into Loops).
 */
export function QuickCaptureView() {
  const params = useSearchParams();
  const initialText = useMemo(() => {
    const parts = [params.get("title"), params.get("text"), params.get("url")]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));
    // Dedupe the common case where title and text arrive identical.
    return [...new Set(parts)].join("\n");
  }, [params]);
  const [capturedCount, setCapturedCount] = useState(0);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Capture</h1>
        <p className="text-muted-foreground">
          Get it out of your head. Sorting is the app's job, not yours.
        </p>
      </header>

      <CaptureBox autoFocus initialText={initialText} onCaptured={() => setCapturedCount((c) => c + 1)} />

      <div className="flex flex-wrap items-center gap-2">
        {capturedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {capturedCount} captured this visit. Keep going or close the app — both are wins.
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/inbox">
              <Inbox aria-hidden="true" /> Inbox
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/today">
              Today <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
