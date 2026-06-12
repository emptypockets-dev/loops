"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Check, Download, Loader2, ShieldCheck } from "lucide-react";
import { APPROVAL_RULES, OPENAI_MODEL, TONE_PREAMBLE } from "@/lib/constants";
import { CONFIRMED_BADGE_CLASS, WARN_BADGE_CLASS } from "@/lib/badge-styles";
import { INTEGRATION_DESCRIPTORS } from "@/lib/integrations/provider";
import { formatAgo, localToday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/app/loading-state";
import { EmailCaptureCard } from "./email-capture-card";

function ProfileSection() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.current);

  if (convexUser === undefined) return <LoadingState label="Loading profile…" rows={1} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Managed through your Clerk account (avatar menu, top right).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-medium">Name: </span>
          {convexUser?.name || user?.fullName || "—"}
        </p>
        <p>
          <span className="font-medium">Email: </span>
          {convexUser?.email || user?.primaryEmailAddress?.emailAddress || "—"}
        </p>
        {convexUser && (
          <p className="text-muted-foreground">
            Command center since {new Date(convexUser.createdAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationsSection() {
  const convexUser = useQuery(api.users.current);
  const updatePreferences = useMutation(api.users.updatePreferences);

  if (convexUser === undefined) return <LoadingState label="Loading notifications…" rows={1} />;

  const toggle = (key: "briefEmailEnabled" | "reviewEmailEnabled", value: boolean) => {
    void updatePreferences({ [key]: value })
      .then(() => toast.success("Preference saved."))
      .catch(() => toast.error("Couldn't save that preference."));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email delivery</CardTitle>
        <CardDescription>
          The app comes to you: scheduled briefs and reviews are emailed to{" "}
          {convexUser?.email || "your account address"} so they land in your morning, not in a tab
          you forgot. Requires outbound email configuration (README).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="brief-email"
            className="mt-0.5"
            checked={convexUser?.briefEmailEnabled !== false}
            onCheckedChange={(value) => toggle("briefEmailEnabled", value === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="brief-email" className="cursor-pointer">
              Email me the Daily Brief each morning
            </Label>
            <p className="text-sm text-muted-foreground">
              Summary, top 3 outcomes, and one 5-minute start — readable in 60 seconds.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="review-email"
            className="mt-0.5"
            checked={convexUser?.reviewEmailEnabled !== false}
            onCheckedChange={(value) => toggle("reviewEmailEnabled", value === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="review-email" className="cursor-pointer">
              Email me the Weekly Review on Sundays
            </Label>
            <p className="text-sm text-muted-foreground">
              What happened, what can be dropped, and patterns worth noticing. No grades.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AiPreferencesSection() {
  const convexUser = useQuery(api.users.current);
  const updatePreferences = useMutation(api.users.updatePreferences);

  if (convexUser === undefined) return <LoadingState label="Loading AI preferences…" rows={1} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI preferences</CardTitle>
        <CardDescription>
          AI classifies, summarizes, and drafts. It never sends, deletes, or spends — those are
          always yours to approve.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="auto-archive"
            className="mt-0.5"
            checked={convexUser?.autoArchiveEnabled === true}
            onCheckedChange={(value) => {
              void updatePreferences({ autoArchiveEnabled: value === true })
                .then(() => toast.success("Preference saved."))
                .catch(() => toast.error("Couldn't save that preference."));
            }}
          />
          <div className="space-y-1">
            <Label htmlFor="auto-archive" className="cursor-pointer">
              Let AI auto-archive obvious junk
            </Label>
            <p className="text-sm text-muted-foreground">
              Applies only to items classified as low-urgency, low-weight “Trash”. Everything else
              always waits for you. Archived items stay recoverable in the Inbox.
            </p>
          </div>
        </div>
        <Separator />
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">Model: </span>
            <code className="rounded bg-muted px-1.5 py-0.5">{OPENAI_MODEL}</code>
          </p>
          <p className="text-muted-foreground">
            Your data goes to OpenAI only when you press an AI button or a scheduled brief runs.
          </p>
        </div>
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">The voice every AI feature uses:</p>
          {TONE_PREAMBLE}
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalRulesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval rules</CardTitle>
        <CardDescription>
          What AI may do on its own vs. what always waits for your explicit yes. Medium- and
          high-risk drafts always require approval, whatever their type.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {APPROVAL_RULES.map((rule) => (
          <div key={rule.type} className="flex items-start gap-3 rounded-md border p-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium">{rule.label}</p>
              <p className="text-sm text-muted-foreground">{rule.description}</p>
            </div>
            {rule.requiresApproval ? (
              <Badge variant="outline" className={cn("shrink-0", WARN_BADGE_CLASS)}>
                <ShieldCheck aria-hidden="true" /> approval required
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0">
                <Check aria-hidden="true" /> applies on approve
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IntegrationsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected apps</CardTitle>
        <CardDescription>
          Loops is fully usable without any of these. They're optional sync surfaces — Convex stays
          the source of truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {INTEGRATION_DESCRIPTORS.map((integration) => (
          <div key={integration.id} className="space-y-2 rounded-md border p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{integration.name}</p>
              {integration.status === "live" ? (
                <Badge variant="outline" className={CONFIRMED_BADGE_CLASS}>
                  live
                </Badge>
              ) : (
                <Badge variant="secondary">Coming soon</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{integration.description}</p>
            {integration.status !== "live" && (
              <Button variant="outline" size="sm" disabled aria-disabled="true" title="Coming soon">
                Connect
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AuditLogSection() {
  const entries = useQuery(api.users.recentAudit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          The audit log: every consequential action — yours and the AI's — with nothing hidden.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries === undefined ? (
          <LoadingState label="Loading activity…" rows={1} />
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li
                key={entry._id}
                className="flex items-baseline justify-between gap-3 border-b py-1.5 text-sm last:border-b-0"
              >
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{entry.action}</code>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatAgo(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DataSection() {
  const convex = useConvex();
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      const data = await convex.query(api.users.exportData, {});
      if (!data) {
        toast.error("Nothing to export yet.");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `loops-export-${localToday()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't export your data. Try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data & export</CardTitle>
        <CardDescription>
          Your data is yours. Download everything — inbox, loops, runs, tasks, briefs, reviews,
          drafts, and the audit log — as one JSON file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => void onExport()} disabled={exporting}>
          {exporting ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {exporting ? "Preparing…" : "Export all data (JSON)"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SettingsView() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Your command center, your rules.</p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="ai">AI preferences</TabsTrigger>
          <TabsTrigger value="approvals">Approval rules</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <ProfileSection />
          <NotificationsSection />
        </TabsContent>
        <TabsContent value="ai">
          <AiPreferencesSection />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalRulesSection />
        </TabsContent>
        <TabsContent value="integrations" className="space-y-4">
          <EmailCaptureCard />
          <IntegrationsSection />
        </TabsContent>
        <TabsContent value="data" className="space-y-4">
          <DataSection />
          <AuditLogSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
