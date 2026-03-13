import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | PitchParse",
  description: "Terms and conditions for using the PitchParse service.",
};

export default function TermsPage() {
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

        <h1 className="font-display text-3xl font-bold md:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: March 13, 2026</p>

        <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using PitchParse (&quot;the Service&quot;), operated by JINGA SIA
              (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), a company registered in Latvia,
              European Union, you agree to be bound by these Terms of Service. If you do not agree,
              do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              2. Service Description
            </h2>
            <p>
              PitchParse is an AI-powered sales call quality assurance platform. The Service allows
              you to upload call recordings or transcripts for automated analysis, scoring against a
              structured KPI framework, and generation of coaching recommendations.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              3. Account Registration & Security
            </h2>
            <p>
              You must provide accurate information when creating an account. You are responsible
              for maintaining the confidentiality of your account credentials and for all activity
              under your account. Notify us immediately at{" "}
              <a href="mailto:support@pitchparse.com" className="text-primary hover:underline">
                support@pitchparse.com
              </a>{" "}
              if you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              4. Subscription & Billing
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Paid subscriptions are billed in advance on a monthly or annual basis through
                Stripe.
              </li>
              <li>
                You may cancel your subscription at any time. Cancellation takes effect at the end
                of the current billing period — no partial refunds are issued.
              </li>
              <li>
                We reserve the right to change pricing with 30 days&apos; notice. Continued use
                after a price change constitutes acceptance.
              </li>
              <li>
                Free trial periods, if offered, convert to paid subscriptions unless cancelled
                before the trial ends.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              5. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                Upload content that you do not have the right to share, including recordings made
                without proper consent
              </li>
              <li>
                Use the Service to process data in violation of applicable laws, including privacy
                and wiretapping laws
              </li>
              <li>
                Attempt to reverse-engineer, decompile, or extract the underlying models or
                algorithms
              </li>
              <li>Use automated tools to scrape, crawl, or overload the Service</li>
              <li>Share account access with unauthorized individuals</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              6. Intellectual Property
            </h2>
            <p>
              The PitchParse platform, including its design, code, scoring frameworks, and
              documentation, is the intellectual property of JINGA SIA. You may not copy, modify, or
              distribute any part of the Service without written permission.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              7. User Content & Data
            </h2>
            <p>
              You retain full ownership of all content you upload to PitchParse, including call
              recordings, transcripts, and any associated metadata. We do not claim ownership of
              your data.
            </p>
            <p className="mt-3">
              You grant us a limited license to process your content solely for the purpose of
              providing the Service (transcription, analysis, scoring, and report generation). We do
              not use your content to train AI models or share it with other customers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">8. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your personal data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              9. Disclaimers
            </h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, express or implied. We do not guarantee that AI-generated
              analyses, scores, or coaching recommendations are accurate, complete, or suitable for
              any particular purpose. The Service is a tool to assist sales management — it does not
              replace professional judgment.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              10. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, JINGA SIA shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your
              use of the Service. Our total liability is limited to the amount you paid us in the 12
              months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              11. Termination
            </h2>
            <p>
              We may suspend or terminate your account if you violate these Terms. You may delete
              your account at any time through the settings page or by contacting support. Upon
              termination, your data will be permanently deleted within 30 days, subject to any
              legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              12. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of the Republic of Latvia and applicable European
              Union regulations. Any disputes shall be resolved in the courts of Latvia, unless
              mandatory consumer protection laws in your jurisdiction provide otherwise.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              13. Dispute Resolution
            </h2>
            <p>
              Before initiating formal proceedings, both parties agree to attempt to resolve
              disputes through good-faith negotiation. If unresolved within 30 days, disputes may be
              submitted to mediation or the competent courts of Latvia. EU consumers may also use
              the European Commission&apos;s Online Dispute Resolution platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              14. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated via
              email or a notice on the Service at least 30 days before taking effect. Continued use
              after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">15. Contact</h2>
            <p>For questions about these Terms, contact:</p>
            <div className="mt-3 rounded-lg border border-border bg-card/80 p-4 text-sm">
              <p className="text-foreground font-medium">JINGA SIA</p>
              <p>Latvia, European Union</p>
              <p>
                Email:{" "}
                <a href="mailto:support@pitchparse.com" className="text-primary hover:underline">
                  support@pitchparse.com
                </a>
              </p>
            </div>
          </section>

          <div className="border-t border-border pt-6 mt-4 text-sm italic">
            Note: These terms are provided for informational purposes. We recommend having them
            reviewed by a qualified legal professional before relying on them.
          </div>
        </div>
      </div>
    </div>
  );
}
