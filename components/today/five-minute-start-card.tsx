import { Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** A tiny, doable entry point. The whole point is that it's small. */
export function FiveMinuteStartCard({ text }: { text: string }) {
  return (
    <Card className="border-accent bg-accent/40">
      <CardContent className="flex items-start gap-3 p-4">
        <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-snug">{text}</p>
      </CardContent>
    </Card>
  );
}
