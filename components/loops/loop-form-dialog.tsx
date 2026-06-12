"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  CADENCES,
  CATEGORIES,
  LOOP_TIMES_OF_DAY,
  type Cadence,
  type Category,
  type LoopTimeOfDay,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const CADENCE_LABELS: Record<Cadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  ad_hoc: "Ad hoc (run when needed)",
};

const TIME_OF_DAY_LABELS: Record<LoopTimeOfDay, string> = {
  anytime: "Anytime",
  morning: "Morning (from 5am)",
  afternoon: "Afternoon (from noon)",
  evening: "Evening (from 5pm)",
};

export interface LoopFormDefaults {
  name?: string;
  description?: string;
  category?: Category;
  cadence?: Cadence;
  timeOfDay?: LoopTimeOfDay;
  steps?: string[];
  minimumVersion?: string;
  idealVersion?: string;
}

/** Create or edit a loop. Steps are one per line — simple and shippable. */
export function LoopFormDialog({
  loop,
  defaults,
  open,
  onOpenChange,
  onSaved,
}: {
  loop?: Doc<"loops">;
  /** Prefill for create mode (e.g. converting an inbox item into a loop). */
  defaults?: LoopFormDefaults;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save; create mode passes the new loop id. */
  onSaved?: (loopId: Id<"loops"> | null) => void;
}) {
  const create = useMutation(api.loops.create);
  const update = useMutation(api.loops.update);

  const [name, setName] = useState(loop?.name ?? defaults?.name ?? "");
  const [description, setDescription] = useState(loop?.description ?? defaults?.description ?? "");
  const [category, setCategory] = useState<Category>(loop?.category ?? defaults?.category ?? "Work");
  const [cadence, setCadence] = useState<Cadence>(loop?.cadence ?? defaults?.cadence ?? "weekly");
  const [timeOfDay, setTimeOfDay] = useState<LoopTimeOfDay>(
    loop?.timeOfDay ?? defaults?.timeOfDay ?? "anytime"
  );
  const [stepsText, setStepsText] = useState(
    loop?.steps.join("\n") ?? defaults?.steps?.join("\n") ?? ""
  );
  const [minimumVersion, setMinimumVersion] = useState(
    loop?.minimumVersion ?? defaults?.minimumVersion ?? ""
  );
  const [idealVersion, setIdealVersion] = useState(
    loop?.idealVersion ?? defaults?.idealVersion ?? ""
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const steps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!name.trim()) {
      toast.error("Give the loop a name.");
      return;
    }
    if (steps.length === 0) {
      toast.error("Add at least one step (one per line).");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        category,
        cadence,
        timeOfDay,
        steps,
        minimumVersion,
        idealVersion,
      };
      if (loop) {
        await update({ id: loop._id, ...payload });
        toast.success("Loop updated.");
        onSaved?.(null);
      } else {
        const { id } = await create(payload);
        toast.success("Loop created.");
        onSaved?.(id);
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save the loop. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{loop ? "Edit loop" : "New loop"}</DialogTitle>
          <DialogDescription>
            A loop is a repeatable protocol for one area of life. Small and honest beats grand and
            abandoned.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="loop-name">Name</Label>
            <Input
              id="loop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunday Reset"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loop-description">Description</Label>
            <Textarea
              id="loop-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this loop is for"
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="loop-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger id="loop-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loop-cadence">Cadence</Label>
              <Select value={cadence} onValueChange={(v) => setCadence(v as Cadence)}>
                <SelectTrigger id="loop-cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CADENCES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CADENCE_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loop-time-of-day">Best time of day</Label>
            <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as LoopTimeOfDay)}>
              <SelectTrigger id="loop-time-of-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOOP_TIMES_OF_DAY.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIME_OF_DAY_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              It won't show as “due now” before its window opens — and running late is always
              allowed.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loop-steps">Steps — one per line</Label>
            <Textarea
              id="loop-steps"
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder={"Review the list\nPick one next action\nDo the smallest piece"}
              rows={5}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loop-minimum">Minimum version</Label>
            <Input
              id="loop-minimum"
              value={minimumVersion}
              onChange={(e) => setMinimumVersion(e.target.value)}
              placeholder="The version that still counts on a bad day"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loop-ideal">Ideal version</Label>
            <Input
              id="loop-ideal"
              value={idealVersion}
              onChange={(e) => setIdealVersion(e.target.value)}
              placeholder="What a great run looks like"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : loop ? "Save changes" : "Create loop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
