"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  CADENCES,
  CATEGORIES,
  type Cadence,
  type Category,
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

/** Create or edit a loop. Steps are one per line — simple and shippable. */
export function LoopFormDialog({
  loop,
  open,
  onOpenChange,
}: {
  loop?: Doc<"loops">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useMutation(api.loops.create);
  const update = useMutation(api.loops.update);

  const [name, setName] = useState(loop?.name ?? "");
  const [description, setDescription] = useState(loop?.description ?? "");
  const [category, setCategory] = useState<Category>(loop?.category ?? "Work");
  const [cadence, setCadence] = useState<Cadence>(loop?.cadence ?? "weekly");
  const [stepsText, setStepsText] = useState(loop?.steps.join("\n") ?? "");
  const [minimumVersion, setMinimumVersion] = useState(loop?.minimumVersion ?? "");
  const [idealVersion, setIdealVersion] = useState(loop?.idealVersion ?? "");
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
        steps,
        minimumVersion,
        idealVersion,
      };
      if (loop) {
        await update({ id: loop._id, ...payload });
        toast.success("Loop updated.");
      } else {
        await create(payload);
        toast.success("Loop created.");
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
