"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionWrapper } from "./section-wrapper";
import type { ReactNode } from "react";

const faqs: { question: string; answer: ReactNode }[] = [
  {
    question: "How does the scoring work?",
    answer:
      "Each call is evaluated against 10 KPIs (7 core + 3 BANT sub-items) with configurable weights that sum to 100%. Scores are normalized to a 0-100 scale. Every score cites specific transcript evidence with timestamps so you can verify the rating.",
  },
  {
    question: "What audio formats are supported?",
    answer:
      "We support all major audio and video formats including MP3, WAV, M4A, MP4, WebM, and OGG. Files are transcribed using Deepgram Nova-2 with automatic speaker diarization.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. All data is stored in your isolated Supabase instance with row-level security. Transcripts are treated as data, never as instructions. We follow OWASP security best practices and all API endpoints require authentication.",
  },
  {
    question: "Can I customize the KPI weights?",
    answer:
      "Absolutely. On the Starter plan and above, you can configure custom weights for each of the 10 KPIs via the Settings page. You can also customize the call script phases and coaching frameworks.",
  },
  {
    question: "How does billing work?",
    answer:
      "Start with a free trial — 5 calls, no credit card required. When you upgrade, billing is handled through Stripe with monthly or annual plans. Annual plans save you 2 months. You can cancel anytime.",
  },
  {
    question: "Can I use PitchParse with my existing tools?",
    answer: (
      <>
        Yes. The Team plan includes full API access, so you can integrate PitchParse into your CRM,
        dialer, or internal tools. We also offer a{" "}
        <Link
          href="/cli"
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Claude Code plugin
        </Link>{" "}
        for CLI power users.
      </>
    ),
  },
];

export function FAQ() {
  return (
    <SectionWrapper className="py-24" id="faq">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">FAQ</p>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <Accordion className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-border bg-card/60 px-4"
            >
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionWrapper>
  );
}
