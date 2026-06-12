import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Orbit,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqSection } from "@/components/marketing/faq-section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { HowItWorks } from "@/components/marketing/how-it-works";

/** Decorative product glimpse, built from real UI styles — no screenshots. */
function ProductPreview() {
  return (
    <div className="mx-auto w-full max-w-md space-y-3 text-left" aria-hidden="true">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-600/60 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-400/50 dark:bg-amber-950 dark:text-amber-200">
            <Sparkles className="h-3 w-3" /> AI generated
          </span>
          <span className="text-xs text-muted-foreground">Daily Brief</span>
        </div>
        <p className="mt-2 text-sm">
          Two meetings today, so one real outcome is plenty: send the lease reply. The garage can
          wait — truly.
        </p>
        <p className="mt-2 text-xs italic text-muted-foreground">This is enough for today.</p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-primary" /> Reply to the lease email
        </div>
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          5-min start: open the draft Loops already wrote and read it once.
        </p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            Approve
          </span>
          <span className="rounded-md border px-2.5 py-1 text-xs font-medium">Edit first</span>
          <span className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Reject
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border bg-accent/40 p-3">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Evening Shutdown — This counted.</span>
      </div>
    </div>
  );
}

function SectionTitle({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <h2 id={id} className="scroll-mt-24 text-3xl font-semibold tracking-tight">
        {title}
      </h2>
      {lead && <p className="text-muted-foreground">{lead}</p>}
    </div>
  );
}

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/today");
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Orbit className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight">Loops</span>
        </div>
        <nav aria-label="Landing" className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href="#how">How it works</a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href="#faq">FAQ</a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Too many open loops?
              <br />
              Close them calmly.
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Loops is a personal AI command center. It catches everything swirling in your head,
              names the smallest honest next action, and drafts what needs drafting — while every
              meaningful decision stays yours.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Start with a brain dump <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              AI suggests. You approve. Nothing is ever sent without you.
            </p>
          </div>
          <ProductPreview />
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/40 px-6 py-16 md:py-20">
          <div className="mx-auto max-w-5xl space-y-10">
            <SectionTitle
              id="how"
              title="One calm loop, on repeat"
              lead="Capture → Classify → Decide → Schedule & review → Draft → Approve → Repeat. The AI does the catching and organizing; you make the calls."
            />
            <HowItWorks />
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-5xl space-y-10">
            <SectionTitle
              id="features"
              title="Built for overwhelmed humans"
              lead="Not another productivity system to maintain — a place that catches things when you can't."
            />
            <FeatureGrid />
          </div>
        </section>

        {/* Principles */}
        <section className="border-t bg-muted/40 px-6 py-16 md:py-20">
          <div className="mx-auto max-w-3xl space-y-8">
            <SectionTitle id="principles" title="The rules it lives by" />
            <ul className="space-y-4">
              {[
                {
                  title: "Approval-first.",
                  body: "AI may classify, summarize, suggest, and draft on its own. Sending, deleting, spending, and calendar changes always wait for your explicit yes.",
                },
                {
                  title: "Everything is editable.",
                  body: "AI output never takes effect as-is unless you say so. Suggestions are visibly marked until you confirm them.",
                },
                {
                  title: "Works with nothing connected.",
                  body: "Email and calendar are optional amplifiers. Your data lives in your own deployment and exports in one click.",
                },
                {
                  title: "Calm, not punitive.",
                  body: "No streaks. No scores. No “you failed.” Just the smallest honest next action, and a system that expects life to keep happening.",
                },
              ].map((principle) => (
                <li key={principle.title} className="flex gap-3">
                  <Eye className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <p className="leading-relaxed">
                    <span className="font-semibold">{principle.title}</span>{" "}
                    <span className="text-muted-foreground">{principle.body}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-3xl space-y-10">
            <SectionTitle id="faq" title="Questions, answered plainly" />
            <FaqSection />
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t bg-muted/40 px-6 py-16 text-center md:py-20">
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              Two minutes from now, your head could be emptier.
            </h2>
            <p className="text-muted-foreground">
              Sign in, dump everything circling in your mind, and let the sorting be someone
              else&apos;s job for once.
            </p>
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Get started <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Orbit className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Loops — your calm command center</span>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-4">
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
          <p>Self-hosted · your data, your accounts</p>
        </div>
      </footer>
    </div>
  );
}
