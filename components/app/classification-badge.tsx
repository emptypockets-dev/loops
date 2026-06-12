import { Sparkles, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AI_BADGE_CLASS, CONFIRMED_BADGE_CLASS } from "@/lib/badge-styles";
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
      <Badge variant="outline" className={cn(AI_BADGE_CLASS, className)}>
        <Sparkles aria-hidden="true" />
        AI suggested
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn(CONFIRMED_BADGE_CLASS, className)}>
      <UserCheck aria-hidden="true" />
      Confirmed by you
    </Badge>
  );
}
