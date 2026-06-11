import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Shared loading treatment: skeleton card rows + an accessible status label. */
export function LoadingState({
  label = "Loading…",
  rows = 3,
  fullPage = false,
  className,
}: {
  label?: string;
  rows?: number;
  fullPage?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(fullPage && "flex min-h-screen flex-col items-center justify-center p-6", className)}
    >
      <span className="sr-only">{label}</span>
      <div className={cn("space-y-3", fullPage && "w-full max-w-md")} aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        ))}
      </div>
      {fullPage && <p className="mt-4 text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}
