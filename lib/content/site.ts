/**
 * Marketing & help content — single source for the landing page and the
 * in-app /help page. Voice: calm, direct, non-shaming.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is Loops, actually?",
    answer:
      "A personal command center for people with too many open loops. You capture everything that's circling in your head; AI organizes it, names the smallest honest next action, writes a short daily brief, and drafts whatever needs drafting. You stay in charge of every decision that matters.",
  },
  {
    question: "Will the AI do things without me?",
    answer:
      "It classifies, summarizes, and drafts on its own — that's its job. It never sends a message, deletes anything important, spends money, or changes your calendar without your explicit approval. Anything outward-facing is created as a draft you approve, edit, or reject. Even an approved email is sent by you, from your own mail app: Loops just hands you a prefilled compose window.",
  },
  {
    question: "What happens when I fall behind?",
    answer:
      "Nothing punitive. There are no streaks, scores, or red badges anywhere in the product. Every loop has a minimum version that genuinely counts, the daily brief explicitly names what can wait, and the weekly review treats dropping something as a decision, not a failure.",
  },
  {
    question: "What's a loop?",
    answer:
      "A repeatable protocol for an area of life that keeps coming back — a Morning Command Center, a weekly Money/Admin container, a House Reset. You run it, check off what you did, and it ends with the words “This counted.” — whether you did the full version, part of it, or just the minimum.",
  },
  {
    question: "Where does my data live, and what does the AI see?",
    answer:
      "Your data lives in your own Convex deployment, under your own accounts — this is self-hosted software. Text is sent to OpenAI only when you trigger classification, a brief, a review, or a draft (or when a scheduled brief runs). If you connect Google Calendar, today's event titles are included in brief generation. You can export everything as one JSON file from Settings, and an audit log records every consequential action.",
  },
  {
    question: "Do I have to connect email or calendar?",
    answer:
      "No. Loops is fully usable with zero integrations — capture by typing, run your loops, get your briefs. Email-in capture and Google Calendar are optional amplifiers you can add in minutes when you're ready.",
  },
  {
    question: "How does the email capture address work?",
    answer:
      "You get a private address. Forward any email to it and it lands in your Inbox as a captured item — auto-classified, with a suggested next action. It's strictly one-way (Loops never replies to anyone), attachments are ignored, and you can rotate the address with one click if it ever leaks.",
  },
  {
    question: "Can it send emails for me?",
    answer:
      "No — and that's a design decision, not a missing feature. Loops drafts the email; approving it gives you a copy button and a prefilled Gmail compose link. The send button stays yours. The only email Loops itself sends is your own daily brief, to you.",
  },
  {
    question: "Is this a team tool?",
    answer:
      "No. Loops is deliberately single-player: no sharing, no collaborators, no one watching your open loops. It's a command center for one nervous system.",
  },
];

export interface HowItWorksStep {
  title: string;
  description: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "Capture",
    description:
      "Everything lands in one inbox: typed in two keystrokes, shared from your phone, or forwarded by email the moment your stomach drops.",
  },
  {
    title: "Classify",
    description:
      "AI sorts each item: category, urgency, emotional weight, and the smallest honest next action — plus a version you can start in five minutes.",
  },
  {
    title: "Decide",
    description:
      "You confirm or override everything. AI suggestions are visibly marked until you've made them yours.",
  },
  {
    title: "Schedule & review",
    description:
      "A calendar-aware brief lands at your 5am, due loops surface gently, and Sunday brings a review with no grades on it.",
  },
  {
    title: "Draft",
    description:
      "The reply you're avoiding, the task, the time block — AI writes a usable first version. Always a draft, never an action.",
  },
  {
    title: "Approve",
    description:
      "Edit it, approve it, or reject it. Nothing is sent, scheduled, or spent without your explicit yes.",
  },
  {
    title: "Repeat",
    description:
      "Loops, not lists. The system expects life to keep happening — and gives you a calm re-entry point every single day.",
  },
];

export interface Feature {
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    title: "Universal capture",
    description:
      "Press “c” anywhere, share from any app on your phone, forward an email, or brain-dump ten lines into ten items. Getting it out of your head is never more than two taps away.",
  },
  {
    title: "A brief that comes to you",
    description:
      "Every morning at your 5am: what matters, what can wait, what you might be avoiding, and one 5-minute start. It always ends the same way — “This is enough for today.”",
  },
  {
    title: "Loops, not lists",
    description:
      "Repeatable protocols for the areas of life that keep coming back, each with a minimum version for bad days. Every run ends with “This counted.”",
  },
  {
    title: "Approval-first AI drafts",
    description:
      "Emails, tasks, and calendar blocks arrive as risk-labeled drafts in your approval queue. High-consequence things always wait for you.",
  },
  {
    title: "A review without shame",
    description:
      "Sundays bring a calm accounting: what happened, what's still open, what can be dropped guilt-free, and the patterns worth noticing.",
  },
  {
    title: "Yours, completely",
    description:
      "Self-hosted on your own accounts. One-click JSON export, a full audit log, a rotatable capture address, and dark mode for the evening shutdown.",
  },
];

/** The two-week protocol — the human side the software exists to support. */
export const PROTOCOL_STEPS: string[] = [
  "Morning (2 min): read the brief, pick one 5-minute start, do it before anything else opens.",
  "The forwarding reflex: the instant an email makes your stomach drop, forward it to Loops instead of re-reading it.",
  "Sunday (5 min): read the review and drop one thing guilt-free.",
];
