"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** Universal capture: type it, dump it, sort later. Voice is a future feature. */
export function CaptureBox({
  autoFocus = false,
  initialText = "",
  onCaptured,
}: {
  autoFocus?: boolean;
  /** Prefill (e.g. from the PWA share target). */
  initialText?: string;
  onCaptured?: () => void;
} = {}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const capture = useMutation(api.inboxItems.capture);
  const captureMany = useMutation(api.inboxItems.captureMany);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const submitMany = async () => {
    if (lines.length < 2 || saving) return;
    setSaving(true);
    try {
      const { count } = await captureMany({ lines });
      setText("");
      toast.success(`${count} items captured. That's a real brain dump.`);
      onCaptured?.();
    } catch (error) {
      console.error(error);
      toast.error("Couldn't capture those. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    const rawText = text.trim();
    if (!rawText || saving) return;
    setSaving(true);
    try {
      await capture({ rawText });
      setText("");
      toast.success("Captured. It's out of your head now.");
      onCaptured?.();
    } catch (error) {
      console.error(error);
      toast.error("Couldn't capture that. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
      <Label htmlFor="capture-input" className="sr-only">
        Capture something
      </Label>
      <Textarea
        id="capture-input"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="What's on your mind? Dump it here — sorting comes later."
        rows={3}
        className="resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          aria-disabled="true"
          title="Voice capture — coming soon"
        >
          <Mic className="h-4 w-4" />
          <span className="sr-only">Voice capture (coming soon)</span>
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">⌘/Ctrl + Enter</span>
          {lines.length >= 2 && (
            <Button variant="outline" onClick={() => void submitMany()} disabled={saving}>
              {lines.length} separate items
            </Button>
          )}
          <Button onClick={() => void submit()} disabled={!text.trim() || saving}>
            <Plus aria-hidden="true" />
            {saving ? "Capturing…" : lines.length >= 2 ? "One item" : "Capture"}
          </Button>
        </div>
      </div>
    </div>
  );
}
