import type { Metadata } from "next";
import Link from "next/link";

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
          <h2 className="mb-2 text-lg font-semibold">1. Data Controller</h2>
          <p className="text-muted-foreground text-sm">
            Vernix (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is the data
            controller for the personal data processed through this service. For
            any data-protection enquiries, contact us at{" "}
            <a
              href="mailto:hello@vernix.app"
              className="text-foreground underline"
            >
              hello@vernix.app
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            2. Personal Data We Collect
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            We collect and process the following categories of personal data:
          </p>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Account data</strong> — name, email address, and hashed
              password, collected at registration.
            </li>
            <li>
              <strong>Meeting content</strong> — audio streams, transcripts,
              AI-generated summaries, and extracted action items produced when a
              meeting bot joins a call.
            </li>
            <li>
              <strong>Uploaded documents</strong> — files you upload to the
              knowledge base (PDF, DOCX, TXT, MD).
            </li>
            <li>
              <strong>Usage and diagnostic data</strong> — IP address, browser
              type, pages visited, feature interactions, error reports, and
              performance metrics.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            3. Legal Bases for Processing (GDPR Art. 6)
          </h2>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Performance of a contract (Art. 6(1)(b))</strong> —
              processing account data, meeting content, and uploaded documents
              is necessary to provide the Service you have signed up for.
            </li>
            <li>
              <strong>Legitimate interest (Art. 6(1)(f))</strong> — error
              monitoring via Sentry, infrastructure logging, and security
              measures, where our interest does not override your fundamental
              rights.
            </li>
            <li>
              <strong>Consent (Art. 6(1)(a))</strong> — analytics cookies
              (Google Analytics) are only activated after you grant explicit
              consent via our cookie banner. You may withdraw consent at any
              time.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            4. How We Use Your Data
          </h2>
          <p className="text-muted-foreground text-sm">
            We use your data to operate, maintain, and improve the Service —
            including real-time transcription, AI-powered summarisation,
            semantic search, and the voice agent. We do not sell your personal
            data or meeting content to third parties, nor do we use it for
            advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            5. Sub-Processors and Third-Party Services
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            We share personal data with the following sub-processors, each
            acting under a Data Processing Agreement (DPA) or equivalent
            contractual safeguards:
          </p>
          <div className="overflow-x-auto">
            <table className="text-muted-foreground w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pr-4 pb-2 font-semibold">Sub-Processor</th>
                  <th className="pr-4 pb-2 font-semibold">Purpose</th>
                  <th className="pr-4 pb-2 font-semibold">Data Processed</th>
                  <th className="pb-2 font-semibold">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4">
                    <a
                      href="https://www.recall.ai/privacy"
                      className="text-foreground underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Recall.ai
                    </a>{" "}
                    (Hyperdoc Inc.)
                  </td>
                  <td className="py-2 pr-4">Meeting bot and call capture</td>
                  <td className="py-2 pr-4">
                    Audio streams, video metadata, transcript segments
                  </td>
                  <td className="py-2">United States</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    <a
                      href="https://openai.com/policies/privacy-policy/"
                      className="text-foreground underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      OpenAI
                    </a>
                  </td>
                  <td className="py-2 pr-4">
                    Transcription, embeddings, summarisation, voice agent
                  </td>
                  <td className="py-2 pr-4">
                    Transcript text, document chunks, user queries
                  </td>
                  <td className="py-2">United States</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Railway</td>
                  <td className="py-2 pr-4">
                    Application hosting and managed PostgreSQL database
                  </td>
                  <td className="py-2 pr-4">
                    All account, meeting, and application data
                  </td>
                  <td className="py-2">United States</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    <a
                      href="https://sentry.io/privacy/"
                      className="text-foreground underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Sentry
                    </a>
                  </td>
                  <td className="py-2 pr-4">
                    Error monitoring and performance diagnostics
                  </td>
                  <td className="py-2 pr-4">
                    IP address, browser metadata, error stack traces
                  </td>
                  <td className="py-2">United States</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    <a
                      href="https://policies.google.com/privacy"
                      className="text-foreground underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Analytics
                    </a>
                  </td>
                  <td className="py-2 pr-4">
                    Website analytics (consent-based only)
                  </td>
                  <td className="py-2 pr-4">
                    Pseudonymised usage data, device info, page views
                  </td>
                  <td className="py-2">United States / EU</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            We maintain DPAs with each sub-processor and conduct periodic
            reviews to verify compliance. An up-to-date sub-processor list is
            available upon request.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">6. Data Retention</h2>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Account data</strong> — retained for the lifetime of your
              account, plus 30 days after deletion to allow recovery.
            </li>
            <li>
              <strong>Meeting content</strong> — transcripts, summaries, and
              action items are retained until you delete the meeting or your
              account.
            </li>
            <li>
              <strong>Uploaded documents</strong> — retained until you delete
              them or your account.
            </li>
            <li>
              <strong>Recall.ai</strong> — media associated with recordings may
              be retained by Recall.ai in accordance with their retention
              policy. We configure the shortest retention window available.
            </li>
            <li>
              <strong>OpenAI (API)</strong> — API inputs and outputs may be
              retained by OpenAI for up to 30 days for abuse and safety
              monitoring, after which they are deleted. OpenAI does not use API
              data to train models.
            </li>
            <li>
              <strong>Sentry</strong> — error and performance data is retained
              for up to 90 days.
            </li>
            <li>
              <strong>Google Analytics</strong> — data retention is configured
              to 14 months; IP anonymisation is enabled.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            7. International Data Transfers
          </h2>
          <p className="text-muted-foreground text-sm">
            Your data is processed primarily in the United States. Where
            personal data is transferred outside the European Economic Area
            (EEA), United Kingdom, or Switzerland, we rely on (a) European
            Commission Standard Contractual Clauses (SCCs), (b) the UK
            International Data Transfer Addendum, or (c) an adequacy decision,
            as applicable. Copies of the relevant transfer mechanisms are
            available upon request.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            8. Data Storage and Security
          </h2>
          <p className="text-muted-foreground text-sm">
            Personal data is stored in an encrypted PostgreSQL database hosted
            on Railway. Meeting transcripts are additionally indexed in a vector
            database (Qdrant) for search functionality, scoped to your account.
            Uploaded documents are held in encrypted S3-compatible object
            storage. All connections use TLS encryption in transit. Passwords
            are hashed with bcrypt. Access to production systems is restricted
            to authorised personnel.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            9. Your Rights (GDPR / UK GDPR)
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Depending on your jurisdiction, you have the following rights with
            respect to your personal data:
          </p>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Access</strong> — request a copy of the personal data we
              hold about you.
            </li>
            <li>
              <strong>Rectification</strong> — correct inaccurate or incomplete
              data.
            </li>
            <li>
              <strong>Erasure</strong> — request deletion of your personal data
              (&quot;right to be forgotten&quot;). See Section 10 below.
            </li>
            <li>
              <strong>Restriction</strong> — request that we restrict processing
              in certain circumstances.
            </li>
            <li>
              <strong>Portability</strong> — receive your data in a structured,
              machine-readable format (JSON or Markdown export is available
              through the Service).
            </li>
            <li>
              <strong>Objection</strong> — object to processing based on
              legitimate interest.
            </li>
            <li>
              <strong>Withdraw consent</strong> — where processing is based on
              consent (e.g. analytics cookies), you may withdraw at any time
              without affecting the lawfulness of prior processing.
            </li>
          </ul>
          <p className="text-muted-foreground mt-3 text-sm">
            To exercise any of these rights, email{" "}
            <a
              href="mailto:hello@vernix.app"
              className="text-foreground underline"
            >
              hello@vernix.app
            </a>
            . We will respond within 30 days. You also have the right to lodge a
            complaint with your local supervisory authority.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            10. Personal Data Removal Requests
          </h2>
          <p className="text-muted-foreground text-sm">
            Upon receiving a verified erasure request, we will: (a) delete your
            account and all associated data from our database within 30 days;
            (b) remove your meeting transcripts and document embeddings from the
            vector database; (c) delete uploaded files from object storage; and
            (d) instruct our sub-processors (Recall.ai, OpenAI, Railway, Sentry)
            to delete any personal data they hold on your behalf, to the extent
            technically feasible. Some data may persist in encrypted backups for
            up to 90 days before being overwritten.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">11. Cookies</h2>
          <p className="text-muted-foreground text-sm">
            We use essential cookies for authentication and session management.
            We also use essential monitoring technologies from Sentry to detect
            errors and maintain service reliability. Optional Google Analytics
            cookies are only activated after you provide explicit consent via
            our cookie banner. For full details, see our{" "}
            <Link href="/cookie-policy" className="text-foreground underline">
              Cookie Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            12. Changes to This Policy
          </h2>
          <p className="text-muted-foreground text-sm">
            We may update this Privacy Policy from time to time. Material
            changes will be communicated by posting the updated policy on the
            Service and updating the &quot;Last updated&quot; date above. Where
            required by law, we will seek your renewed consent.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">13. Contact</h2>
          <p className="text-muted-foreground text-sm">
            For privacy-related questions or to exercise your data rights,
            contact us at{" "}
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
