"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { LoopCard } from "./loop-card";
import { LoopFormDialog } from "./loop-form-dialog";

export function LoopsView() {
  const loops = useQuery(api.loops.list);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Loops</h1>
          <p className="text-muted-foreground">
            Repeatable protocols for the areas of life that keep coming back. Run them imperfectly
            — every run counts.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden="true" />
          New loop
        </Button>
      </header>

      {loops === undefined ? (
        <LoadingState label="Loading your loops…" rows={4} />
      ) : loops.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No loops yet"
          description="Loops are repeatable protocols — a morning reset, a weekly money container. Create your first one."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" /> New loop
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {loops.map((loop) => (
            <LoopCard key={loop._id} loop={loop} />
          ))}
        </div>
      )}

      {createOpen && <LoopFormDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  );
}
