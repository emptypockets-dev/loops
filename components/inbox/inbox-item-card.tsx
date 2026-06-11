"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CheckSquare,
  Loader2,
  MoreHorizontal,
  PenLine,
  Sparkles,
  Timer,
  Trash2,
} from "lucide-react";
import { formatAgo } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClassificationBadge } from "@/components/app/classification-badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EditInboxItemDialog } from "./edit-inbox-item-dialog";

export function InboxItemCard({ item }: { item: Doc<"inboxItems"> }) {
  const classify = useAction(api.ai.classifyInboxItem);
  const draftAction = useAction(api.ai.draftResponseOrAction);
  const convert = useMutation(api.inboxItems.convertToTask);
  const archive = useMutation(api.inboxItems.archive);
  const unarchive = useMutation(api.inboxItems.unarchive);
  const remove = useMutation(api.inboxItems.remove);

  const [classifying, setClassifying] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isArchived = item.status === "archived";
  const isConverted = item.status === "converted";
  const hasClassification = item.classifiedBy !== undefined;

  const runClassify = async () => {
    setClassifying(true);
    try {
      const result = await classify({ inboxItemId: item._id });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Classified — review and adjust anything that's off.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Classification didn't go through. The item is unchanged.");
    } finally {
      setClassifying(false);
    }
  };

  const runDraft = async () => {
    setDrafting(true);
    try {
      const result = await draftAction({ inboxItemId: item._id });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Draft ready — it's waiting for your approval on Today.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Couldn't create a draft. Nothing was saved.");
    } finally {
      setDrafting(false);
    }
  };

  const runConvert = async () => {
    try {
      await convert({ id: item._id });
      toast.success("Task created. It'll show up on Today.");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't convert to a task.");
    }
  };

  return (
    <Card className={isArchived ? "opacity-70" : undefined}>
      <CardHeader className="space-y-2 p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {hasClassification && <ClassificationBadge by={item.classifiedBy!} />}
          {hasClassification && <Badge variant="secondary">{item.category}</Badge>}
          {hasClassification && (
            <Badge variant="outline">urgency: {item.urgency}</Badge>
          )}
          {hasClassification && (
            <Badge variant="outline">weight: {item.emotionalWeight}</Badge>
          )}
          {isConverted && (
            <Badge variant="outline">
              <CheckSquare aria-hidden="true" /> task created
            </Badge>
          )}
          {isArchived && (
            <Badge variant="outline">
              <Archive aria-hidden="true" /> archived
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{formatAgo(item.createdAt)}</span>
        </div>
        <h3 className="font-medium leading-snug">{item.cleanedTitle || item.rawText}</h3>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {item.summary && <p className="text-sm text-muted-foreground">{item.summary}</p>}
        {item.suggestedNextAction && (
          <p className="flex items-start gap-2 text-sm">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="font-medium">Next:</span> {item.suggestedNextAction}
            </span>
          </p>
        )}
        {item.suggestedFiveMinuteStart && (
          <p className="flex items-start gap-2 text-sm">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="font-medium">5-min start:</span> {item.suggestedFiveMinuteStart}
            </span>
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 p-4 pt-0">
        {!isArchived && (
          <>
            <Button size="sm" variant="secondary" onClick={() => void runClassify()} disabled={classifying}>
              {classifying ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              {hasClassification ? "Re-classify" : "AI classify"}
            </Button>
            {!isConverted && (
              <Button size="sm" variant="outline" onClick={() => void runConvert()}>
                <CheckSquare aria-hidden="true" />
                Make it a task
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => void runDraft()} disabled={drafting}>
              {drafting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <PenLine aria-hidden="true" />
              )}
              Draft action
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="ml-auto" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <PenLine /> Edit / override
            </DropdownMenuItem>
            {isArchived ? (
              <DropdownMenuItem onSelect={() => void unarchive({ id: item._id })}>
                <ArchiveRestore /> Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => void archive({ id: item._id })}>
                <Archive /> Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>

      {editOpen && <EditInboxItemDialog item={item} open={editOpen} onOpenChange={setEditOpen} />}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this item?"
        description="This permanently removes it. Archiving is gentler if you might want it back."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          void remove({ id: item._id })
            .then(() => toast.success("Deleted."))
            .catch(() => toast.error("Couldn't delete it. Try again."));
        }}
      />
    </Card>
  );
}
