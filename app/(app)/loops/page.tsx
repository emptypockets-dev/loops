import { ErrorBoundary } from "@/components/app/error-boundary";
import { LoopsView } from "@/components/loops/loops-view";

export default function LoopsPage() {
  return (
    <ErrorBoundary label="your loops">
      <LoopsView />
    </ErrorBoundary>
  );
}
