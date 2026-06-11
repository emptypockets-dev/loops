import { Sparkles, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Visually distinguishes AI suggestions from user-approved state.
 * Icon + text (never color alone) for accessibility.
 */
export function ClassificationBadge({
  by,
  className,
}: {
  by: "ai" | "user";
  className?: string;
}) {
  if (by === "ai") {
    return (
      <Badge
        variant="outline"
        className={cn("border-dashed border-amber-600/60 bg-amber-50 text-amber-900", className)}
      >
        <Sparkles aria-hidden="true" />
        AI suggested
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn("border-emerald-700/40 bg-emerald-50 text-emerald-900", className)}
    >
      <UserCheck aria-hidden="true" />
      Confirmed by you
    </Badge>
  );
}
