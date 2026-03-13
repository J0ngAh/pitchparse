"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-orange-950/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/8 via-transparent to-transparent" />
      <div className="relative flex flex-col items-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none" className="text-primary">
            <rect x="1" y="10" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.6" />
            <rect x="5" y="6" width="2" height="8" rx="0.5" fill="currentColor" opacity="0.8" />
            <rect x="9" y="4" width="2" height="10" rx="0.5" fill="currentColor" />
            <rect x="13" y="7" width="2" height="6" rx="0.5" fill="currentColor" opacity="0.7" />
          </svg>
        </div>
        <div>
          <p className="font-mono text-6xl font-bold text-primary text-glow-signal">404</p>
          <h1 className="mt-2 font-display text-xl font-semibold">Page not found</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
