import {
  CalendarCheck,
  Inbox,
  Lock,
  NotebookPen,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { FEATURES } from "@/lib/content/site";

const FEATURE_ICONS: LucideIcon[] = [Inbox, CalendarCheck, RefreshCw, ShieldCheck, NotebookPen, Lock];

export function FeatureGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature, index) => {
        const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
        return (
          <div key={feature.title} className="rounded-xl border bg-card p-5">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
