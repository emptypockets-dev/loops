import { HOW_IT_WORKS_STEPS } from "@/lib/content/site";

/** The core loop, step by step. Shared by the landing page and /help. */
export function HowItWorks() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {HOW_IT_WORKS_STEPS.map((step, index) => (
        <li key={step.title} className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <h3 className="font-semibold">{step.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
