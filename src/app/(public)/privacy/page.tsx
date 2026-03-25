import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Vernix",
  description:
    "Vernix Privacy Policy — what data we collect, how we use it, third-party services, your rights, and cookies.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="text-muted-foreground mb-12 text-sm">
        Last updated: March 2026
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">
            1. Information We Collect
          </h2>
          <p className="text-muted-foreground text-sm">
            We collect information you provide directly: account details (name,
            email), meeting data (transcripts, summaries, action items), and
            uploaded documents. We also collect usage data such as page views
            and feature usage to improve the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            2. How We Use Your Information
          </h2>
          <p className="text-muted-foreground text-sm">
            We use your information to provide and improve the Service,
            including transcription, summarization, and AI-powered search. We do
            not sell your personal data or meeting content to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            3. Data Storage & Security
          </h2>
          <p className="text-muted-foreground text-sm">
            Your data is stored securely using industry-standard encryption.
            Meeting transcripts are stored in a vector database for search
            functionality. Uploaded documents are stored in encrypted object
            storage. All data is scoped to your account and not accessible by
            other users.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            4. Third-Party Services
          </h2>
          <p className="text-muted-foreground text-sm">
            We use third-party services to provide the Service, including
            Recall.ai for meeting bot functionality, OpenAI for transcription
            and AI capabilities, and cloud infrastructure providers for hosting
            and storage. These services process your data in accordance with
            their own privacy policies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. Your Rights</h2>
          <p className="text-muted-foreground text-sm">
            You can access, update, or delete your account data at any time
            through the Service. You can export your meeting data in standard
            formats. You can request deletion of all your data by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">6. Cookies</h2>
          <p className="text-muted-foreground text-sm">
            We use essential cookies for authentication and session management.
            We do not use third-party tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            7. Changes to This Policy
          </h2>
          <p className="text-muted-foreground text-sm">
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by posting the updated policy on the
            Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">8. Contact</h2>
          <p className="text-muted-foreground text-sm">
            For privacy-related questions, contact us at{" "}
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
