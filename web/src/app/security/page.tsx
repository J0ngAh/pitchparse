import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Security | Pitch|Parse",
  description:
    "How Pitch|Parse protects your data — infrastructure, authentication, and security practices.",
};

export default function SecurityPage() {
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

        <h1 className="font-display text-3xl font-bold md:text-4xl">Security</h1>
        <p className="mt-3 text-muted-foreground">
          An honest overview of how we protect your data. No overclaiming — just what we actually
          do.
        </p>

        <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              Infrastructure
            </h2>
            <p>
              Pitch|Parse runs on Supabase-hosted PostgreSQL. All data is encrypted at rest
              (AES-256) and in transit (TLS 1.2+). Database backups are automated and encrypted. Our
              application server runs in a containerized environment with no direct database access
              from the public internet.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              Authentication
            </h2>
            <p>
              User authentication is handled by Supabase Auth. Passwords are hashed using bcrypt
              before storage — we never store plaintext passwords. Sessions use short-lived JWT
              tokens with automatic refresh. Rate limiting is enforced on login and signup endpoints
              to prevent brute-force attacks.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              Data Isolation
            </h2>
            <p>
              Every database query is scoped to your organization using PostgreSQL Row Level
              Security (RLS) policies. This means your data is isolated at the database level — not
              just the application level. One organization cannot access another&apos;s transcripts,
              analyses, or reports, even if a bug exists in the application code.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              Payment Security
            </h2>
            <p>
              All payment processing is handled by{" "}
              <strong className="text-foreground">Stripe</strong>, which is PCI DSS Level 1
              compliant. We never see, store, or process your credit card numbers. Payment
              information goes directly from your browser to Stripe&apos;s servers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              API Security
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Rate limiting:</strong> Authentication endpoints
                are rate-limited (5 signups/min, 10 logins/min) to prevent abuse.
              </li>
              <li>
                <strong className="text-foreground">CORS:</strong> Cross-origin requests are
                restricted to allowed origins only.
              </li>
              <li>
                <strong className="text-foreground">Security headers:</strong> HSTS,
                X-Content-Type-Options, X-Frame-Options, and Referrer-Policy headers are set on all
                responses.
              </li>
              <li>
                <strong className="text-foreground">Input validation:</strong> All API inputs are
                validated using Pydantic models before processing.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              Data Processing
            </h2>
            <p>
              When you submit a call for analysis, transcript content is sent to Anthropic&apos;s
              Claude API for scoring and coaching generation. If you upload audio, it is sent to
              Deepgram for transcription. Both processors handle data under strict data processing
              agreements and do not use your data for model training.
            </p>
            <p className="mt-3">
              Transcripts are treated as data, not instructions — we maintain separation between
              user content and system prompts to mitigate prompt injection risks.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              Responsible Disclosure
            </h2>
            <p>
              If you discover a security vulnerability, please report it responsibly. Contact us at{" "}
              <a href="mailto:security@pitchparse.com" className="text-primary hover:underline">
                security@pitchparse.com
              </a>
              . We will acknowledge your report within 48 hours and work with you to understand and
              address the issue.
            </p>
            <p className="mt-3">
              Please do not publicly disclose vulnerabilities until we have had a reasonable
              opportunity to address them.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">Questions?</h2>
            <p>
              For security-related inquiries, reach out to{" "}
              <a href="mailto:security@pitchparse.com" className="text-primary hover:underline">
                security@pitchparse.com
              </a>
              . For general data privacy questions, see our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
