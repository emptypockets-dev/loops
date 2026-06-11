import { ErrorBoundary } from "@/components/app/error-boundary";
import { ReviewView } from "@/components/review/review-view";

export default function ReviewPage() {
  return (
    <ErrorBoundary label="your review">
      <ReviewView />
    </ErrorBoundary>
  );
}
