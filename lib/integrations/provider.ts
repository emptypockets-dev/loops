import type { IntegrationProviderId, SyncDirection } from "../constants";

/**
 * Integration scaffolding only — no real OAuth or network calls in the MVP.
 * Convex stays the source of truth; integrations are optional sync surfaces.
 * A future provider implements this interface and drops in without touching
 * the core data model.
 */
export interface IntegrationProvider {
  importItems(): Promise<void>;
  exportTask(taskId: string): Promise<void>;
  sync(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface IntegrationDescriptor {
  id: IntegrationProviderId;
  name: string;
  description: string;
  defaultSyncDirection: SyncDirection;
}

export const INTEGRATION_DESCRIPTORS: IntegrationDescriptor[] = [
  {
    id: "notion",
    name: "Notion",
    description: "Import pages and databases as inbox items.",
    defaultSyncDirection: "import_only",
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Two-way sync for tasks you want everywhere.",
    defaultSyncDirection: "two_way",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "See your day on Today and export approved time blocks.",
    defaultSyncDirection: "import_only",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Turn starred emails into inbox items; export approved drafts.",
    defaultSyncDirection: "import_only",
  },
];

class ComingSoonProvider implements IntegrationProvider {
  constructor(private readonly id: IntegrationProviderId) {}
  private fail(): never {
    throw new Error(`The ${this.id} integration isn't available yet.`);
  }
  async importItems(): Promise<void> {
    this.fail();
  }
  async exportTask(_taskId: string): Promise<void> {
    this.fail();
  }
  async sync(): Promise<void> {
    this.fail();
  }
  async disconnect(): Promise<void> {
    this.fail();
  }
}

export function getProvider(id: IntegrationProviderId): IntegrationProvider {
  return new ComingSoonProvider(id);
}
