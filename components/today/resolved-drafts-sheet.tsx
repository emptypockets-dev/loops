"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Check, ClipboardCopy, ExternalLink, History, Mail, X } from "lucide-react";
import type { DraftStatus } from "@/lib/constants";
import { buildGmailComposeUrl } from "@/lib/email/compose-link";
import { formatAgo } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";

function StatusBadge({ status }: { status: DraftStatus }) {
  if (status === "approved") {
    return (
      <Badge variant="outline" className="border-emerald-700/40 bg-emerald-50 text-emerald-900">
        <Check aria-hidden="true" /> approved
      </Badge>
    );
  }
  if (status === "sent") {
    return (
      <Badge variant="outline" className="border-emerald-700/40 bg-emerald-50 text-emerald-900">
        <Check aria-hidden="true" /> on your calendar
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <X aria-hidden="true" /> rejected
    </Badge>
  );
}

function ResolvedDraftRow({ draft }: { draft: Doc<"drafts"> }) {
  const gmailUrl = draft.type === "email" ? buildGmailComposeUrl(draft.title, draft.body) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.body);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Couldn't copy — select the text manually.");
    }
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={draft.status as DraftStatus} />
        <Badge variant="secondary">{draft.type}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{formatAgo(draft.updatedAt)}</span>
      </div>
      <p className="text-sm font-medium leading-snug">{draft.title}</p>
      <p className="line-clamp-2 text-sm text-muted-foreground">{draft.body}</p>
      {draft.status !== "rejected" && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => void copy()}>
            <ClipboardCopy aria-hidden="true" /> Copy
          </Button>
          {gmailUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={gmailUrl} target="_blank" rel="noopener noreferrer">
                <Mail aria-hidden="true" /> Compose in Gmail
              </a>
            </Button>
          )}
          {draft.calendarEventLink && (
            <Button size="sm" variant="outline" asChild>
              <a href={draft.calendarEventLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" /> View event
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Where approved/rejected drafts live on — nothing you approved disappears. */
export function ResolvedDraftsSheet() {
  const [open, setOpen] = useState(false);
  const resolved = useQuery(api.drafts.listResolved, open ? {} : "skip");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <History aria-hidden="true" /> History
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Resolved drafts</SheetTitle>
          <SheetDescription>
            Approved drafts stay here so you can copy or send them whenever you're ready.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {resolved === undefined ? (
            <LoadingState label="Loading history…" rows={2} />
          ) : resolved.length === 0 ? (
            <EmptyState
              icon={History}
              title="No resolved drafts yet"
              description="Approve or reject a draft and it lands here for later."
            />
          ) : (
            resolved.map((draft) => <ResolvedDraftRow key={draft._id} draft={draft} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
