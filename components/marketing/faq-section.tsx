import { ChevronDown } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/content/site";

/**
 * Native <details>/<summary> accordion — keyboard-accessible with zero JS.
 * Shared by the public landing page and the in-app /help page.
 */
export function FaqSection() {
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item) => (
        <details key={item.question} className="group rounded-xl border bg-card p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="pt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
