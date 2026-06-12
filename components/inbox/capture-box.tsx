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
          <Button onClick={() => void submit()} disabled={!text.trim() || saving}>
            <Plus aria-hidden="true" />
            {saving ? "Capturing…" : "Capture"}
          </Button>
        </div>
      </div>
    </div>
  );
}
