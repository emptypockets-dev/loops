import { ErrorBoundary } from "@/components/app/error-boundary";
import { TodayView } from "@/components/today/today-view";

export default function TodayPage() {
  return (
    <ErrorBoundary label="Today">
      <TodayView />
    </ErrorBoundary>
  );
}
