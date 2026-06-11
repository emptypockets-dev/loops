"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Inbox as InboxIcon, Archive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { CaptureBox } from "./capture-box";
import { InboxItemCard } from "./inbox-item-card";

export function InboxView() {
  const items = useQuery(api.inboxItems.list);

  const active = items?.filter((i) => i.status !== "archived") ?? [];
  const archived = items?.filter((i) => i.status === "archived") ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground">
          Get it out of your head. Classify it when you're ready — or let AI take a first pass.
        </p>
      </header>

      <CaptureBox />

      {items === undefined ? (
        <LoadingState label="Loading your inbox…" />
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-3">
            {active.length === 0 ? (
              <EmptyState
                icon={InboxIcon}
                title="Inbox zero — genuinely."
                description="Nothing is waiting on you here. When something pops into your head, capture it above."
              />
            ) : (
              active.map((item) => <InboxItemCard key={item._id} item={item} />)
            )}
          </TabsContent>
          <TabsContent value="archived" className="space-y-3">
            {archived.length === 0 ? (
              <EmptyState
                icon={Archive}
                title="Nothing archived yet"
                description="Archived items rest here in case you ever need them back."
              />
            ) : (
              archived.map((item) => <InboxItemCard key={item._id} item={item} />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
