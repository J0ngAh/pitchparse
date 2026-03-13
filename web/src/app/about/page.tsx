import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "About | Pitch|Parse",
  description:
    "The story behind Pitch|Parse — why we built AI-powered sales call quality assurance.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="font-display text-3xl font-bold md:text-4xl">
          About Pitch|<span className="text-primary">Parse</span>
        </h1>

        <div className="mt-10 space-y-6 text-muted-foreground leading-relaxed">
          <p>
            I&apos;ve spent over 15 years in sales — dialing, pitching, closing, and coaching reps
            to do the same. Over that time, one thing became painfully clear: the gap between what
            managers <em>think</em> happens on calls and what <em>actually</em> happens is enormous.
          </p>

          <p>
            Call reviews were always the bottleneck. Listening to full recordings, scribbling notes,
            trying to remember which rep said what three calls ago. At scale, it&apos;s impossible.
            Most calls never get reviewed at all. The ones that do get surface-level feedback at
            best.
          </p>

          <p>
            Pitch|Parse was born from frustration with that status quo. I wanted a tool that could
            listen to every single call, score it against a consistent framework, and give reps
            actionable coaching — not generic platitudes, but specific feedback tied to what they
            actually said.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground pt-4">What we built</h2>

          <p>
            Pitch|Parse uses AI to analyze sales calls against a structured KPI framework. Upload a
            recording or paste a transcript, and you get a detailed scorecard with evidence-backed
            ratings, phase-by-phase breakdown, and personalized coaching recommendations.
          </p>

          <p>
            It&apos;s not about replacing managers — it&apos;s about giving them superpowers. When
            every call gets reviewed, patterns emerge. You spot the rep who crushes discovery but
            fumbles the close. You find the objection that&apos;s derailing 40% of calls. You build
            a coaching culture where feedback is data-driven, not anecdotal.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground pt-4">The vision</h2>

          <p>
            We believe every sales team deserves the kind of call analysis that used to require a
            dedicated QA team. Pitch|Parse makes that accessible to teams of any size — from solo
            founders validating their pitch to enterprise teams scaling their coaching programs.
          </p>

          <p>Every call, parsed. Every rep, sharper. That&apos;s the mission.</p>

          <div className="border-t border-border pt-8 mt-8">
            <p className="text-sm">
              Pitch|Parse is built by <span className="text-foreground font-medium">JINGA SIA</span>
              , a company registered in Latvia, EU.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
