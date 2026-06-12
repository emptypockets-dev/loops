import { Suspense } from "react";
import { ErrorBoundary } from "@/components/app/error-boundary";
import { LoadingState } from "@/components/app/loading-state";
import { QuickCaptureView } from "@/components/inbox/quick-capture-view";

export default function CapturePage() {
  return (
    <ErrorBoundary label="capture">
      {/* Suspense required: QuickCaptureView reads search params (share target). */}
      <Suspense fallback={<LoadingState label="Loading capture…" rows={1} />}>
        <QuickCaptureView />
      </Suspense>
    </ErrorBoundary>
  );
}
