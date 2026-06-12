import Link from "next/link";
import { Inbox, Mail, Settings as SettingsIcon, Sun } from "lucide-react";
import { PROTOCOL_STEPS } from "@/lib/content/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaqSection } from "@/components/marketing/faq-section";
import { HowItWorks } from "@/components/marketing/how-it-works";

export default function HelpPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">How Loops works</h1>
        <p className="text-muted-foreground">
          The whole system on one page — the loop, the protocol, and plain answers.
        </p>
      </header>

      <section aria-label="The loop" className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          The loop
        </h2>
        <HowItWorks />
      </section>

      <section aria-label="The two-week protocol" className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          The two-week protocol
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              The software makes these cheap. Doing them is what changes things.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
              {PROTOCOL_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Run it for two weeks before judging the app — or yourself.
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Quick links" className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Good next steps
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/capture">
              <Inbox aria-hidden="true" /> Do a brain dump
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/today">
              <Sun aria-hidden="true" /> Open Today
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">
              <Mail aria-hidden="true" /> Get your capture email
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">
              <SettingsIcon aria-hidden="true" /> Review approval rules
            </Link>
          </Button>
        </div>
      </section>

      <section aria-label="Frequently asked questions" className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Questions, answered plainly
        </h2>
        <FaqSection />
      </section>
    </div>
  );
}
