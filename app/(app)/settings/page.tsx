import { ErrorBoundary } from "@/components/app/error-boundary";
import { SettingsView } from "@/components/settings/settings-view";

export default function SettingsPage() {
  return (
    <ErrorBoundary label="settings">
      <SettingsView />
    </ErrorBoundary>
  );
}
