"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Archive, Clock, Inbox as InboxIcon, Search, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { CaptureBox } from "./capture-box";
import { InboxItemCard } from "./inbox-item-card";

export function InboxView() {
  const items = useQuery(api.inboxItems.list);
  const [searchText, setSearchText] = useState("");
  const searchQuery = searchText.trim();
  const searchResults = useQuery(
    api.inboxItems.search,
    searchQuery ? { query: searchQuery } : "skip"
  );

  const now = Date.now();
  const isSnoozed = (item: NonNullable<typeof items>[number]) =>
    item.snoozedUntil !== undefined && item.snoozedUntil > now;

  const active = items?.filter((i) => i.status !== "archived" && !isSnoozed(i)) ?? [];
  const snoozed = items?.filter((i) => i.status !== "archived" && isSnoozed(i)) ?? [];
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

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Label htmlFor="inbox-search" className="sr-only">
          Search everything you've captured
        </Label>
        <Input
          id="inbox-search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search everything you've captured…"
          className="pl-9 pr-9"
        />
        {searchText && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setSearchText("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {searchQuery ? (
        searchResults === undefined ? (
          <LoadingState label="Searching…" rows={2} />
        ) : searchResults.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No matches"
            description={`Nothing captured matches “${searchQuery}”. It might be archived under different words — or it never made it in.`}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {searchResults.length} match{searchResults.length === 1 ? "" : "es"}
            </p>
            {searchResults.map((item) => (
              <InboxItemCard key={item._id} item={item} />
            ))}
          </div>
        )
      ) : items === undefined ? (
        <LoadingState label="Loading your inbox…" />
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="snoozed">Snoozed ({snoozed.length})</TabsTrigger>
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
          <TabsContent value="snoozed" className="space-y-3">
            {snoozed.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Nothing snoozed"
                description="Snoozing parks an item until later — it comes back on its own, no guilt attached."
              />
            ) : (
              snoozed.map((item) => <InboxItemCard key={item._id} item={item} />)
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
