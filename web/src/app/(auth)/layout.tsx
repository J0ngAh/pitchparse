import { BarChart3, MessageSquare, Users } from "lucide-react";
import { HeroVisual } from "@/components/landing/animated-icons";

const features = [
  {
    icon: BarChart3,
    label: "10 KPI scoring",
    description: "Weighted scorecard with evidence-backed ratings",
  },
  {
    icon: MessageSquare,
    label: "AI coaching",
    description: "Actionable feedback from every conversation",
  },
  {
    icon: Users,
    label: "Team analytics",
    description: "Track rep performance and spot trends",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — desktop only */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-orange-950/20 lg:flex">
        {/* Radial glow backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex max-w-md flex-col items-center gap-10 px-12">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="glow-signal-sm flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="text-primary">
                <rect
                  x="1"
                  y="10"
                  width="2"
                  height="4"
                  rx="0.5"
                  fill="currentColor"
                  opacity="0.6"
                />
                <rect x="5" y="6" width="2" height="8" rx="0.5" fill="currentColor" opacity="0.8" />
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
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Pitch|<span className="text-primary text-glow-signal">Parse</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Every call, parsed. Every rep, sharper.
              </p>
            </div>
          </div>

          {/* Waveform visual */}
          <div className="opacity-80">
            <HeroVisual />
          </div>

          {/* Feature bullets */}
          <div className="flex flex-col gap-4">
            {features.map((feature) => (
              <div key={feature.label} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">
                    {feature.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right edge divider glow */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
      </div>

      {/* Right form panel — always visible */}
      <div className="relative flex w-full flex-col items-center justify-center bg-gradient-to-br from-background via-background to-orange-950/10 p-8 lg:w-1/2 lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/8 via-transparent to-transparent" />

        <div className="relative w-full max-w-md">
          {/* Mobile-only logo + tagline */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-primary">
                <rect
                  x="1"
                  y="10"
                  width="2"
                  height="4"
                  rx="0.5"
                  fill="currentColor"
                  opacity="0.6"
                />
                <rect x="5" y="6" width="2" height="8" rx="0.5" fill="currentColor" opacity="0.8" />
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
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Pitch|<span className="text-primary">Parse</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Every call, parsed. Every rep, sharper.
              </p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
