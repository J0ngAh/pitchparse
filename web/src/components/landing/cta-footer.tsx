"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PulseGlow } from "@/components/effects/pulse-glow";
import { WaveformBg } from "@/components/effects/waveform-bg";
import { COLORS } from "@/lib/constants";
import { SectionWrapper } from "./section-wrapper";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Security", href: "/security" },
  ],
};

export function CTAFooter() {
  return (
    <>
      {/* CTA Section */}
      <SectionWrapper className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 opacity-15">
          <WaveformBg height={300} barCount={100} />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold md:text-5xl">
            Ready to sharpen your team&apos;s calls?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start analyzing calls in minutes. No credit card required.
          </p>
          <div className="mt-8 flex justify-center">
            <PulseGlow color={COLORS.signal} intensity={0.6} className="rounded-xl">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-primary px-8 text-lg text-primary-foreground hover:bg-primary/90"
                >
                  Start Your Free Trial
                </Button>
              </Link>
            </PulseGlow>
          </div>
        </div>
      </SectionWrapper>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-primary"
                  >
                    <rect
                      x="1"
                      y="10"
                      width="2"
                      height="4"
                      rx="0.5"
                      fill="currentColor"
                      opacity="0.6"
                    />
                    <rect
                      x="5"
                      y="6"
                      width="2"
                      height="8"
                      rx="0.5"
                      fill="currentColor"
                      opacity="0.8"
                    />
                    <rect x="9" y="4" width="2" height="10" rx="0.5" fill="currentColor" />
                    <rect
                      x="13"
                      y="7"
                      width="2"
                      height="6"
                      rx="0.5"
                      fill="currentColor"
                      opacity="0.7"
                    />
                  </svg>
                </div>
                <span className="font-display text-sm font-bold">
                  Pitch<span className="text-primary">Parse</span>
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Every call, parsed. Every rep, sharper.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {title}
                </p>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/") ? (
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PitchParse. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
