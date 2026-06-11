import { ErrorBoundary } from "@/components/app/error-boundary";
import { InboxView } from "@/components/inbox/inbox-view";

export default function InboxPage() {
  return (
    <ErrorBoundary label="your inbox">
      <InboxView />
    </ErrorBoundary>
  );
}
