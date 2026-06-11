"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  CATEGORIES,
  EMOTIONAL_WEIGHTS,
  URGENCY_LEVELS,
  type Category,
  type EmotionalWeight,
  type Urgency,
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

/**
 * Manual edit / classification override. Saving marks the classification as
 * confirmed by the user — AI output is always editable before it sticks.
 */
export function EditInboxItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: Doc<"inboxItems">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useMutation(api.inboxItems.update);
  const [title, setTitle] = useState(item.cleanedTitle);
  const [summary, setSummary] = useState(item.summary);
  const [category, setCategory] = useState<Category>(item.category);
  const [urgency, setUrgency] = useState<Urgency>(item.urgency);
  const [weight, setWeight] = useState<EmotionalWeight>(item.emotionalWeight);
  const [nextAction, setNextAction] = useState(item.suggestedNextAction);
  const [fiveMinuteStart, setFiveMinuteStart] = useState(item.suggestedFiveMinuteStart);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Give it a title — even a rough one.");
      return;
    }
    setSaving(true);
    try {
      await update({
        id: item._id,
        cleanedTitle: title.trim(),
        summary,
        category,
        urgency,
        emotionalWeight: weight,
        suggestedNextAction: nextAction,
        suggestedFiveMinuteStart: fiveMinuteStart,
      });
      toast.success("Saved and confirmed.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>
            Adjust anything — your edits override AI suggestions and count as confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-summary">Summary</Label>
            <Textarea
              id="edit-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger id="edit-category">
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
              <Label htmlFor="edit-urgency">Urgency</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
                <SelectTrigger id="edit-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-weight">Emotional weight</Label>
              <Select value={weight} onValueChange={(v) => setWeight(v as EmotionalWeight)}>
                <SelectTrigger id="edit-weight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMOTIONAL_WEIGHTS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-next-action">Next action</Label>
            <Input
              id="edit-next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="The smallest honest next action"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-five-minute">5-minute start</Label>
            <Input
              id="edit-five-minute"
              value={fiveMinuteStart}
              onChange={(e) => setFiveMinuteStart(e.target.value)}
              placeholder="A version you could start in 5 minutes"
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Original capture: </span>
            {item.rawText}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save & confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
