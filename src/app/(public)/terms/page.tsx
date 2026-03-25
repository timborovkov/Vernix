import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Vernix",
  description:
    "Vernix Terms of Service — acceptable use, intellectual property, liability, and termination.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground mb-12 text-sm">
        Last updated: March 2026
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground text-sm">
            By accessing or using Vernix (&quot;the Service&quot;), you agree to
            be bound by these Terms of Service. If you do not agree to these
            terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            2. Description of Service
          </h2>
          <p className="text-muted-foreground text-sm">
            Vernix is an AI-powered meeting assistant that joins video calls,
            transcribes conversations, generates summaries, and provides
            AI-powered question answering. The Service integrates with
            third-party video conferencing platforms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">3. User Accounts</h2>
          <p className="text-muted-foreground text-sm">
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You must provide accurate and complete information when
            creating an account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">4. Acceptable Use</h2>
          <p className="text-muted-foreground text-sm">
            You agree not to use the Service for any unlawful purpose or in any
            way that could damage, disable, or impair the Service. You must
            comply with all applicable laws regarding recording and
            transcription of conversations, including obtaining necessary
            consent from all participants.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            5. Intellectual Property
          </h2>
          <p className="text-muted-foreground text-sm">
            You retain ownership of your content, including meeting recordings,
            transcripts, and uploaded documents. Vernix retains ownership of the
            Service, including its software, design, and branding.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            6. Limitation of Liability
          </h2>
          <p className="text-muted-foreground text-sm">
            The Service is provided &quot;as is&quot; without warranties of any
            kind. Vernix shall not be liable for any indirect, incidental,
            special, or consequential damages arising from your use of the
            Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">7. Termination</h2>
          <p className="text-muted-foreground text-sm">
            We may suspend or terminate your access to the Service at any time
            for violation of these terms. You may delete your account at any
            time. Upon termination, your data will be deleted in accordance with
            our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">8. Changes to Terms</h2>
          <p className="text-muted-foreground text-sm">
            We may update these terms from time to time. We will notify you of
            material changes by posting the updated terms on the Service.
            Continued use of the Service after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">9. Contact</h2>
          <p className="text-muted-foreground text-sm">
            For questions about these terms, contact us at{" "}
            <a
              href="mailto:hello@vernix.app"
              className="text-foreground underline"
            >
              hello@vernix.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
