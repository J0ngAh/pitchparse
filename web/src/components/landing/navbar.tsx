"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "/cli", label: "CLI" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <motion.header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "glass-card shadow-lg" : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
              <rect x="1" y="10" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.6">
                <animate
                  attributeName="height"
                  values="4;8;4"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0s"
                />
                <animate
                  attributeName="y"
                  values="10;6;10"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0s"
                />
              </rect>
              <rect x="5" y="6" width="2" height="8" rx="0.5" fill="currentColor" opacity="0.8">
                <animate
                  attributeName="height"
                  values="8;4;8"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0.2s"
                />
                <animate
                  attributeName="y"
                  values="6;10;6"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0.2s"
                />
              </rect>
              <rect x="9" y="4" width="2" height="10" rx="0.5" fill="currentColor">
                <animate
                  attributeName="height"
                  values="10;6;10"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0.4s"
                />
                <animate
                  attributeName="y"
                  values="4;8;4"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0.4s"
                />
              </rect>
              <rect x="13" y="7" width="2" height="6" rx="0.5" fill="currentColor" opacity="0.7">
                <animate
                  attributeName="height"
                  values="6;10;6"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0.6s"
                />
                <animate
                  attributeName="y"
                  values="7;3;7"
                  dur="1.5s"
                  repeatCount="indefinite"
                  begin="0.6s"
                />
              </rect>
            </svg>
          </div>
          <span className="font-display text-base font-bold tracking-tight">
            Pitch<span className="text-primary">Parse</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) =>
            link.href.startsWith("/") ? (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ),
          )}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-signal-sm"
            >
              Start Free Trial
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-t border-border md:hidden"
        >
          <div className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                </a>
              ),
            )}
            <hr className="my-2 border-border" />
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Log In
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
