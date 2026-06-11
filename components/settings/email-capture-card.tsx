"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { ClipboardCopy, Loader2, Mail, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { LoadingState } from "@/components/app/loading-state";

// The inbound mailbox this deployment forwards through, e.g.
// "a1b2c3d4@inbound.postmarkapp.com" or "capture@in.yourdomain.com".
// The per-user token is inserted as a +tag: local+TOKEN@domain.
const INBOUND_BASE = process.env.NEXT_PUBLIC_INBOUND_EMAIL_BASE;

function buildCaptureAddress(base: string, token: string): string | null {
  const at = base.indexOf("@");
  if (at <= 0 || at === base.length - 1) return null;
  return `${base.slice(0, at)}+${token}@${base.slice(at + 1)}`;
}

/** Live integration: forward any email to your private address → Inbox. */
export function EmailCaptureCard() {
  const user = useQuery(api.users.current);
  const regenerate = useMutation(api.users.regenerateCaptureToken);
  const [rotating, setRotating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (user === undefined) {
    return <LoadingState label="Loading email capture…" rows={1} />;
  }

  const token = user?.captureToken ?? null;
  const address = token && INBOUND_BASE ? buildCaptureAddress(INBOUND_BASE, token) : null;

  const copy = async (value: string, what: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${what} copied.`);
    } catch {
      toast.error("Couldn't copy — select it manually.");
    }
  };

  const rotate = async () => {
    setRotating(true);
    try {
      await regenerate({});
      toast.success("New capture address generated. The old one is dead.");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't regenerate the address.");
    } finally {
      setRotating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
          Email capture
          <Badge variant="outline" className="border-emerald-700/40 bg-emerald-50 text-emerald-900">
            live
          </Badge>
        </CardTitle>
        <CardDescription>
          Forward any email to your private Loops address and it lands in your Inbox — classified
          automatically, with a suggested next action. Nothing is ever sent back; this is a one-way
          drop box.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {token === null ? (
          <Button onClick={() => void rotate()} disabled={rotating}>
            {rotating ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            Generate my capture address
          </Button>
        ) : address ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Your private address</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded-md bg-muted px-3 py-2 text-sm">{address}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void copy(address, "Address")}
              >
                <ClipboardCopy aria-hidden="true" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: add it to your contacts as “Loops” so forwarding a scary email takes two taps.
            </p>
          </div>
        ) : (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium">Almost there — one config step left</p>
            <p className="text-sm text-muted-foreground">
              Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_INBOUND_EMAIL_BASE</code> to
              your inbound mailbox (e.g.{" "}
              <code className="rounded bg-muted px-1">xxxx@inbound.postmarkapp.com</code>) and
              redeploy — the README has the 5-minute Postmark walkthrough. Your personal token is
              ready meanwhile:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded-md bg-muted px-3 py-2 text-xs">{token}</code>
              <Button size="sm" variant="outline" onClick={() => void copy(token, "Token")}>
                <ClipboardCopy aria-hidden="true" /> Copy token
              </Button>
            </div>
          </div>
        )}

        {token !== null && (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Address leaked or getting junk? Rotate it — the old address stops working
                immediately.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                disabled={rotating}
              >
                {rotating ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw aria-hidden="true" />
                )}
                Regenerate address
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Regenerate your capture address?"
        description="The current address stops working immediately. Anything already captured stays in your Inbox."
        confirmLabel="Regenerate"
        onConfirm={() => void rotate()}
      />
    </Card>
  );
}
