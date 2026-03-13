import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | PitchParse",
  description: "How PitchParse collects, uses, and protects your data.",
};

export default function PrivacyPage() {
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

        <h1 className="font-display text-3xl font-bold md:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: March 13, 2026</p>

        <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              1. Data Controller
            </h2>
            <p>
              The data controller for PitchParse is{" "}
              <strong className="text-foreground">JINGA SIA</strong>, a company registered in
              Latvia, European Union. If you have questions about this policy or your personal data,
              contact us at{" "}
              <a href="mailto:privacy@pitchparse.com" className="text-primary hover:underline">
                privacy@pitchparse.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              2. Data We Collect
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Account information:</strong> name, email
                address, and password hash when you create an account.
              </li>
              <li>
                <strong className="text-foreground">Usage data:</strong> pages visited, features
                used, timestamps, and browser/device information.
              </li>
              <li>
                <strong className="text-foreground">Call transcripts and recordings:</strong> audio
                files and transcripts you upload for analysis. These are your data — we process them
                only to provide the service.
              </li>
              <li>
                <strong className="text-foreground">Payment information:</strong> billing details
                are collected and processed by Stripe. We do not store credit card numbers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              3. Legal Basis for Processing
            </h2>
            <p>We process your data under the following legal bases (GDPR Article 6):</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong className="text-foreground">Contract performance:</strong> processing
                necessary to provide the PitchParse service you signed up for.
              </li>
              <li>
                <strong className="text-foreground">Legitimate interest:</strong> analytics and
                service improvement, fraud prevention, and security.
              </li>
              <li>
                <strong className="text-foreground">Consent:</strong> marketing communications (you
                can withdraw consent at any time).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              4. How We Use Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain the PitchParse service</li>
              <li>To analyze call transcripts and generate scoring and coaching feedback</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send service-related communications (account updates, security alerts)</li>
              <li>To improve the service based on aggregated, anonymized usage patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              5. Third-Party Processors
            </h2>
            <p>We use the following third-party services to operate PitchParse:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong className="text-foreground">Supabase</strong> — database hosting,
                authentication, and file storage
              </li>
              <li>
                <strong className="text-foreground">Stripe</strong> — payment processing and
                subscription management
              </li>
              <li>
                <strong className="text-foreground">Anthropic (Claude)</strong> — AI-powered
                transcript analysis and coaching generation
              </li>
              <li>
                <strong className="text-foreground">Deepgram</strong> — audio transcription with
                speaker diarization
              </li>
            </ul>
            <p className="mt-3">
              Each processor is bound by data processing agreements and processes data only as
              instructed by us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              6. International Data Transfers
            </h2>
            <p>
              Some of our third-party processors are based in the United States. Where data is
              transferred outside the European Economic Area (EEA), we rely on Standard Contractual
              Clauses (SCCs) approved by the European Commission to ensure adequate data protection.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              7. Data Retention
            </h2>
            <p>
              We retain your account data for as long as your account is active. Call transcripts,
              analyses, and reports are retained until you delete them or close your account. Upon
              account deletion, all associated data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              8. Your Rights (GDPR)
            </h2>
            <p>Under the General Data Protection Regulation, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong className="text-foreground">Access</strong> — request a copy of the personal
                data we hold about you
              </li>
              <li>
                <strong className="text-foreground">Rectification</strong> — correct inaccurate or
                incomplete data
              </li>
              <li>
                <strong className="text-foreground">Erasure</strong> — request deletion of your
                personal data
              </li>
              <li>
                <strong className="text-foreground">Data portability</strong> — receive your data in
                a structured, machine-readable format
              </li>
              <li>
                <strong className="text-foreground">Objection</strong> — object to processing based
                on legitimate interest
              </li>
              <li>
                <strong className="text-foreground">Restriction</strong> — request restricted
                processing in certain circumstances
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@pitchparse.com" className="text-primary hover:underline">
                privacy@pitchparse.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">9. Cookies</h2>
            <p>
              PitchParse uses essential cookies for authentication and session management. We do not
              use third-party tracking cookies or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              10. Children&apos;s Privacy
            </h2>
            <p>
              PitchParse is not intended for use by individuals under 16. We do not knowingly
              collect personal data from children. If you believe a child has provided us with
              personal data, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this policy from time to time. We will notify you of material changes by
              email or through a notice on our website. Your continued use of PitchParse after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">12. Contact</h2>
            <p>For questions about this privacy policy or to exercise your data rights, contact:</p>
            <div className="mt-3 rounded-lg border border-border bg-card/80 p-4 text-sm">
              <p className="text-foreground font-medium">JINGA SIA</p>
              <p>Latvia, European Union</p>
              <p>
                Email:{" "}
                <a href="mailto:privacy@pitchparse.com" className="text-primary hover:underline">
                  privacy@pitchparse.com
                </a>
              </p>
            </div>
            <p className="mt-4 text-sm italic">
              You also have the right to lodge a complaint with the Latvian Data State Inspectorate
              (Datu valsts inspekcija) or your local supervisory authority.
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-4 text-sm italic">
            Note: This policy is provided for informational purposes. We recommend having it
            reviewed by a qualified legal professional before relying on it.
          </div>
        </div>
      </div>
    </div>
  );
}
