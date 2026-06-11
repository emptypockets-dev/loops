import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Orbit } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/today");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex items-center gap-3">
        <Orbit className="h-10 w-10 text-primary" aria-hidden="true" />
        <span className="text-3xl font-semibold tracking-tight">Loops</span>
      </div>
      <div className="max-w-xl space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your calm command center
        </h1>
        <p className="text-lg text-muted-foreground">
          Capture everything swirling in your head. Loops organizes it, suggests the smallest
          honest next action, and drafts what needs drafting — while you stay in control of
          everything that matters.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/sign-up">Create an account</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        AI suggests. You approve. Nothing is ever sent without you.
      </p>
    </main>
  );
}
