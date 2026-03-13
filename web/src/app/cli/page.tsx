"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Terminal, Copy, Check } from "lucide-react";

const INSTALL_COMMAND = "curl -fsSL https://pitchparse.com/install.sh | sh";

const COMMANDS = [
  {
    name: "/sales-qa:transcribe",
    description: "Transcribe audio/video with speaker diarization",
  },
  {
    name: "/sales-qa:analyze",
    description: "Score a transcript against 10 KPIs",
  },
  {
    name: "/sales-qa:report",
    description: "Generate a coaching report for a consultant",
  },
  {
    name: "/sales-qa:manager-overview",
    description: "Aggregate dashboard across multiple calls",
  },
  {
    name: "/sales-qa:generate-synthetic",
    description: "Create test transcripts for pipeline testing",
  },
  {
    name: "/sales-qa:pipeline",
    description: "Full end-to-end: transcribe, analyze, and dashboard",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function CLIPage() {
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

        {/* Hero */}
        <section className="mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
            <Terminal className="h-4 w-4" />
            CLI Plugin
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Pitch|<span className="text-primary">Parse</span> CLI
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            AI-powered sales call QA in your terminal. A Claude Code plugin that transcribes,
            scores, and coaches — all through slash commands.
          </p>
        </section>

        {/* Install */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold mb-4">Install</h2>
          <div className="bg-card/80 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <code className="font-mono text-sm text-foreground overflow-x-auto">
                {INSTALL_COMMAND}
              </code>
              <CopyButton text={INSTALL_COMMAND} />
            </div>
          </div>
        </section>

        {/* Manual Install */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold mb-4">Manual Install</h2>
          <div className="bg-card/80 border border-border rounded-lg p-4 space-y-2">
            <pre className="font-mono text-sm text-muted-foreground overflow-x-auto">
              <code>
                {`git clone https://github.com/jinga-lala/pitchparse-cli.git
cd pitchparse-cli
sh install.sh`}
              </code>
            </pre>
          </div>
        </section>

        {/* Commands */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold mb-4">Commands</h2>
          <div className="bg-card/80 border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-display font-semibold">Command</th>
                  <th className="px-4 py-3 text-left font-display font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {COMMANDS.map((cmd) => (
                  <tr key={cmd.name} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <code className="font-mono text-primary text-xs">{cmd.name}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{cmd.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold mb-4">Requirements</h2>
          <div className="bg-card/80 border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-xs text-primary">
                required
              </span>
              <div>
                <p className="font-mono text-sm text-foreground">ANTHROPIC_API_KEY</p>
                <p className="text-sm text-muted-foreground">
                  Claude API key for transcript analysis
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                optional
              </span>
              <div>
                <p className="font-mono text-sm text-foreground">DEEPGRAM_API_KEY</p>
                <p className="text-sm text-muted-foreground">
                  Required only for audio/video transcription via Deepgram
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <Link href="/about" className="text-primary hover:underline">
              Learn more about Pitch|Parse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
