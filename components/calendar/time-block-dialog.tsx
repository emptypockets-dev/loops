"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { localToday } from "@/lib/dates";
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

const DURATIONS = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 45, label: "45 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1.5 hours" },
  { minutes: 120, label: "2 hours" },
];

/** Next round half hour, as an HH:MM string for <input type="time">. */
function nextHalfHour(): string {
  const d = new Date(Date.now() + 5 * 60_000);
  d.setMinutes(d.getMinutes() <= 30 ? 30 : 60, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Pick a date, start time, and duration for a calendar write. Used for manual
 * time blocks and for approving AI calendar drafts (where the title is fixed).
 * onSubmit returns true on success → the dialog closes.
 */
export function TimeBlockDialog({
  open,
  onOpenChange,
  heading,
  description,
  defaultTitle,
  lockTitle = false,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  description: string;
  defaultTitle: string;
  lockTitle?: boolean;
  submitLabel: string;
  onSubmit: (input: { title: string; startIso: string; endIso: string }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState(() => localToday());
  const [time, setTime] = useState(() => nextHalfHour());
  const [duration, setDuration] = useState("30");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Give the block a title.");
      return;
    }
    const start = new Date(`${date}T${time}`);
    if (!date || !time || Number.isNaN(start.getTime())) {
      toast.error("Pick a valid date and time.");
      return;
    }
    const end = new Date(start.getTime() + Number(duration) * 60_000);
    setSaving(true);
    try {
      const ok = await onSubmit({
        title: trimmed,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
      });
      if (ok) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="block-title">Title</Label>
            <Input
              id="block-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={lockTitle}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="block-date">Date</Label>
              <Input
                id="block-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="block-time">Start</Label>
              <Input
                id="block-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="block-duration">Length</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="block-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.minutes} value={String(d.minutes)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            {saving ? "Adding…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
