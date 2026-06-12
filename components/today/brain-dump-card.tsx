"use client";

import Link from "next/link";
import { ArrowRight, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * First-run anchor, shown only while the account has zero captures and zero
 * tasks. The first brain dump is the moment the product proves itself.
 */
export function BrainDumpCard() {
  return (
    <Card className="border-primary/40 bg-accent/40">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <Wind className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg font-semibold">Start here: empty your head</h2>
          <p className="text-sm text-muted-foreground">
            Take two minutes and dump everything circling in your mind — bills, that email, the
            squeaky door, the idea you keep losing. One thing per capture, no order, no editing.
            Sorting is the app's job, not yours.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href="/capture">
            Brain dump <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
