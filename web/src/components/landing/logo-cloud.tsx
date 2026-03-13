"use client";

import { SectionWrapper } from "./section-wrapper";

const logos = ["Acme Corp", "Globex", "Initech", "Hooli", "Pied Piper", "Massive Dynamic"];

export function LogoCloud() {
  return (
    <SectionWrapper className="border-y border-border bg-card/30 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
          Powering sales teams at innovative companies
        </p>
        {/* Infinite scroll marquee with edge masks */}
        <div
          className="relative overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div className="flex animate-[marquee_30s_linear_infinite] gap-16">
            {[...logos, ...logos].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex shrink-0 items-center gap-2 text-muted-foreground/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <span className="text-xs font-bold">{name[0]}</span>
                </div>
                <span className="whitespace-nowrap font-display text-sm font-semibold">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
