"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  PenLine,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import type { DraftType, RiskLevel } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const TYPE_LABELS: Record<DraftType, string> = {
  email: "Email draft",
  task: "Task draft",
  calendar: "Calendar block",
  note: "Note",
  integration: "External sync",
};

function RiskBadge({ level }: { level: RiskLevel }) {
  if (level === "high") {
    return (
      <Badge variant="outline" className="border-red-700/40 bg-red-50 text-red-900">
        <ShieldAlert aria-hidden="true" /> high risk — needs you
      </Badge>
    );
  }
  if (level === "medium") {
    return (
      <Badge variant="outline" className="border-amber-700/40 bg-amber-50 text-amber-900">
        <AlertTriangle aria-hidden="true" /> medium risk
      </Badge>
    );
  }
  return <Badge variant="outline">low risk</Badge>;
}

/**
 * An AI draft awaiting a human decision. Approving never sends anything —
 * email/calendar/note drafts become ready-to-use text; task drafts create a
 * task inside Loops.
 */
export function ApprovalDraftCard({ draft }: { draft: Doc<"drafts"> }) {
  const approve = useMutation(api.drafts.approve);
  const reject = useMutation(api.drafts.reject);
  const updateContent = useMutation(api.drafts.updateContent);

  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [busy, setBusy] = useState(false);

  const onApprove = async () => {
    setBusy(true);
    try {
      const { createdTaskId } = await approve({ id: draft._id });
      toast.success(
        draft.type === "task" && createdTaskId
          ? "Approved — task created."
          : "Approved. Copy it and use it whenever you're ready — Loops never sends for you."
      );
    } catch (error) {
      console.error(error);
      toast.error("Couldn't approve the draft.");
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      await reject({ id: draft._id });
      toast.success("Rejected. Nothing happened — exactly as designed.");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't reject the draft.");
    } finally {
      setBusy(false);
    }
  };

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(draft.body);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Couldn't copy — select the text manually.");
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-2 p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-dashed border-amber-600/60 bg-amber-50 text-amber-900">
            <Sparkles aria-hidden="true" /> AI draft
          </Badge>
          <Badge variant="secondary">{TYPE_LABELS[draft.type]}</Badge>
          <RiskBadge level={draft.riskLevel} />
        </div>
        <h3 className="font-medium leading-snug">{draft.title}</h3>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {draft.body.length > 400 ? `${draft.body.slice(0, 400)}…` : draft.body}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 p-4 pt-0">
        <Button size="sm" onClick={() => void onApprove()} disabled={busy}>
          <Check aria-hidden="true" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={busy}>
          <PenLine aria-hidden="true" /> Edit first
        </Button>
        <Button size="sm" variant="outline" onClick={() => void copyBody()}>
          <ClipboardCopy aria-hidden="true" /> Copy
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          onClick={() => void onReject()}
          disabled={busy}
        >
          <X aria-hidden="true" /> Reject
        </Button>
      </CardFooter>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit draft</DialogTitle>
            <DialogDescription>
              Make it yours before approving — AI output never takes effect unedited unless you say
              so.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`draft-title-${draft._id}`}>Title</Label>
              <Input
                id={`draft-title-${draft._id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`draft-body-${draft._id}`}>Body</Label>
              <Textarea
                id={`draft-body-${draft._id}`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void updateContent({ id: draft._id, title, body })
                  .then(() => {
                    toast.success("Draft updated.");
                    setEditOpen(false);
                  })
                  .catch(() => toast.error("Couldn't save the draft."));
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
